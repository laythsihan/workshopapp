import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MessageCircle, TrendingUp, Eye, Share2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PieceEngagementChart({ pieces, comments, user, onTimeRangeChange, timeRange = "30d" }) {
  const engagementData = useMemo(() => {
    if (!pieces || !comments || !user) return [];

    // Get user's pieces with comment counts
    const userPieces = pieces.filter(p => p.created_by === user.email);
    
    return userPieces.map(piece => {
      const pieceComments = comments.filter(c => c.piece_id === piece.id);
      const uniqueCommenters = new Set(pieceComments.map(c => c.commenter_email)).size;
      const totalReplies = pieceComments.reduce((sum, c) => sum + (c.replies?.length || 0), 0);
      
      return {
        id: piece.id,
        title: piece.title.length > 20 ? piece.title.substring(0, 20) + "..." : piece.title,
        fullTitle: piece.title,
        comments: pieceComments.length,
        collaborators: uniqueCommenters,
        replies: totalReplies,
        totalEngagement: pieceComments.length + totalReplies,
        status: piece.status,
        genre: piece.genre
      };
    }).sort((a, b) => b.totalEngagement - a.totalEngagement).slice(0, 6);
  }, [pieces, comments, user]);

  const handleDownload = () => {
    const csvContent = [
      "Title,Comments,Collaborators,Replies,Total Engagement,Status,Genre",
      ...engagementData.map(item => 
        `"${item.fullTitle}",${item.comments},${item.collaborators},${item.replies},${item.totalEngagement},${item.status},${item.genre}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `piece-engagement-${timeRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const topPiece = engagementData[0];
    if (topPiece && navigator.share) {
      try {
        await navigator.share({
          title: 'My Writing Workshop Stats',
          text: `My most engaging piece "${topPiece.fullTitle}" sparked ${topPiece.totalEngagement} interactions!`,
          url: window.location.href
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(`Check out my writing progress: My piece "${topPiece.fullTitle}" got ${topPiece.totalEngagement} workshop interactions!`);
      }
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-stone-200 rounded-lg shadow-lg min-w-48">
          <p className="font-semibold text-stone-800 mb-2">{data.fullTitle}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">💬 {data.comments} comments</p>
            <p className="text-green-600">👥 {data.collaborators} reviewers</p>
            <p className="text-purple-600">💭 {data.replies} replies</p>
            <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
              <Badge variant="outline" className="text-xs">{data.genre}</Badge>
              <Badge variant="outline" className="text-xs">{data.status.replace(/_/g, ' ')}</Badge>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxEngagement = Math.max(...engagementData.map(d => d.totalEngagement), 1);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-stone-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl text-stone-800">
            <MessageCircle className="w-5 h-5 text-stone-600" />
            Most Engaging Pieces
          </CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {timeRange === "7d" ? "7 days" : timeRange === "30d" ? "30 days" : "All time"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onTimeRangeChange("7d")}>Last 7 days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTimeRangeChange("30d")}>Last 30 days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTimeRangeChange("all")}>All time</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download CSV">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare} title="Share Stats">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {engagementData.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <MessageCircle className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No engagement data yet</h3>
            <p className="text-sm">Share your pieces to start getting feedback!</p>
          </div>
        ) : (
          <>
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis 
                    dataKey="title" 
                    stroke="#78716c"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#78716c" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="totalEngagement" 
                    fill="#000000"
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => {
                      window.location.href = createPageUrl(`workshop?piece=${data.id}`);
                    }}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Top piece highlight */}
            {engagementData[0] && (
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-stone-800 mb-1">🏆 Top Performer</h4>
                    <p className="text-sm text-stone-600">"{engagementData[0].fullTitle}" with {engagementData[0].totalEngagement} total interactions</p>
                  </div>
                  <Link to={createPageUrl(`workshop?piece=${engagementData[0].id}`)}>
                    <Button size="sm" variant="outline" className="border-stone-200 hover:bg-stone-100">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}