import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { MessageSquare, Filter, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEME_KEYWORDS = {
  'Character Development': ['character', 'protagonist', 'development', 'personality', 'motivation', 'arc', 'growth'],
  'Plot Structure': ['plot', 'structure', 'pacing', 'beginning', 'middle', 'end', 'climax', 'resolution'],
  'Dialogue': ['dialogue', 'conversation', 'speech', 'voice', 'speaking', 'says', 'said'],
  'Setting & World': ['setting', 'world', 'place', 'environment', 'atmosphere', 'scene', 'location'],
  'Style & Voice': ['style', 'voice', 'tone', 'writing', 'flow', 'rhythm', 'language'],
  'Emotional Impact': ['emotion', 'feeling', 'impact', 'powerful', 'moving', 'touching', 'compelling'],
  'Clarity & Flow': ['clear', 'clarity', 'confusing', 'flow', 'smooth', 'transition', 'connection']
};

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4'  // cyan
];

export default function FeedbackThemesChart({ comments, user, pieces, onThemeClick, timeRange = "30d" }) {
  const [selectedGenre, setSelectedGenre] = useState("all");

  const themesData = useMemo(() => {
    if (!comments || !user || !pieces) return [];

    // Get comments on user's pieces
    const userPieceIds = pieces.filter(p => p.created_by === user.email).map(p => p.id);
    let relevantComments = comments.filter(c => userPieceIds.includes(c.piece_id));

    // Filter by genre if selected
    if (selectedGenre !== "all") {
      const genrePieceIds = pieces.filter(p => p.genre === selectedGenre && p.created_by === user.email).map(p => p.id);
      relevantComments = relevantComments.filter(c => genrePieceIds.includes(c.piece_id));
    }

    // Analyze comments for themes
    const themeCount = {};
    
    relevantComments.forEach(comment => {
      const text = (comment.comment_text + ' ' + (comment.selected_text || '')).toLowerCase();
      
      Object.entries(THEME_KEYWORDS).forEach(([theme, keywords]) => {
        const matches = keywords.filter(keyword => text.includes(keyword)).length;
        if (matches > 0) {
          themeCount[theme] = (themeCount[theme] || 0) + matches;
        }
      });
    });

    return Object.entries(themeCount)
      .map(([theme, count]) => ({
        name: theme,
        value: count,
        percentage: Math.round((count / Object.values(themeCount).reduce((a, b) => a + b, 0)) * 100)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // Top 7 themes
  }, [comments, user, pieces, selectedGenre]);

  const availableGenres = useMemo(() => {
    if (!pieces || !user) return [];
    return [...new Set(pieces.filter(p => p.created_by === user.email).map(p => p.genre))];
  }, [pieces, user]);

  const handleDownload = () => {
    const csvContent = [
      "Theme,Mentions,Percentage",
      ...themesData.map(item => `"${item.name}",${item.value},${item.percentage}%`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-themes-${selectedGenre}-${timeRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-stone-200 rounded-lg shadow-lg">
          <p className="font-semibold text-stone-800">{data.name}</p>
          <p className="text-sm text-stone-600">{data.value} mentions ({data.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  const totalMentions = themesData.reduce((sum, theme) => sum + theme.value, 0);

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-stone-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl text-stone-800">
            <MessageSquare className="w-5 h-5 text-stone-600" />
            Feedback Themes
          </CardTitle>
          <div className="flex items-center gap-2">
            {availableGenres.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-1" />
                    {selectedGenre === "all" ? "All Genres" : selectedGenre}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedGenre("all")}>All Genres</DropdownMenuItem>
                  {availableGenres.map(genre => (
                    <DropdownMenuItem key={genre} onClick={() => setSelectedGenre(genre)}>
                      {genre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download CSV">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-stone-600">
          {totalMentions} total mentions across {themesData.length} themes
          {selectedGenre !== "all" && <Badge variant="outline" className="ml-2">{selectedGenre} only</Badge>}
        </div>
      </CardHeader>
      
      <CardContent>
        {themesData.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <MessageSquare className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No feedback themes yet</h3>
            <p className="text-sm">Get more detailed feedback to see what areas reviewers focus on!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={themesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => onThemeClick && onThemeClick(data.name)}
                    className="cursor-pointer"
                  >
                    {themesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Theme List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-stone-800 mb-4">Top Areas of Focus</h4>
              {themesData.map((theme, index) => (
                <div 
                  key={theme.name}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                  onClick={() => onThemeClick && onThemeClick(theme.name)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-stone-800 text-sm">{theme.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-stone-800">{theme.value}</div>
                    <div className="text-xs text-stone-500">{theme.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}