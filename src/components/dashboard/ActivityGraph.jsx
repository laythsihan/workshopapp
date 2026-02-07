
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";

export default function ActivityGraph({ pieces, comments, user }) {
  const activityData = useMemo(() => {
    if (!pieces || !comments || !user) return [];

    // Get the last 30 days
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    // Create activity data for each day
    const activityByDate = dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Count pieces created on this date
      const piecesCreated = pieces.filter(piece => {
        const pieceDate = format(parseISO(piece.created_date), 'yyyy-MM-dd');
        return pieceDate === dateStr;
      }).length;

      // Count comments made on this date by the user
      const commentsMade = comments.filter(comment => {
        if (comment.commenter_email !== user.email) return false;
        const commentDate = format(parseISO(comment.created_date), 'yyyy-MM-dd');
        return commentDate === dateStr;
      }).length;

      // Count comments received on user's pieces
      const userPieceIds = pieces.filter(p => p.created_by === user.email).map(p => p.id);
      const commentsReceived = comments.filter(comment => {
        if (comment.commenter_email === user.email) return false; // Don't count own comments
        if (!userPieceIds.includes(comment.piece_id)) return false;
        const commentDate = format(parseISO(comment.created_date), 'yyyy-MM-dd');
        return commentDate === dateStr;
      }).length;

      const totalActivity = piecesCreated + commentsMade + commentsReceived;

      return {
        date: dateStr,
        displayDate: format(date, 'MMM d'),
        piecesCreated,
        commentsMade,
        commentsReceived,
        totalActivity,
        fullDate: date
      };
    });

    return activityByDate;
  }, [pieces, comments, user]);

  const totalActivity = useMemo(() => {
    return activityData.reduce((sum, day) => sum + day.totalActivity, 0);
  }, [activityData]);

  const peakDay = useMemo(() => {
    return activityData.reduce((max, day) => 
      day.totalActivity > max.totalActivity ? day : max, 
      { totalActivity: 0, displayDate: '' }
    );
  }, [activityData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-stone-200 rounded-lg shadow-lg">
          <p className="font-semibold text-stone-800">{data.displayDate}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">Pieces Created: {data.piecesCreated}</p>
            <p className="text-green-600">Comments Made: {data.commentsMade}</p>
            <p className="text-purple-600">Comments Received: {data.commentsReceived}</p>
            <p className="font-semibold text-stone-800 border-t border-stone-200 pt-1">
              Total Activity: {data.totalActivity}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-stone-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl text-stone-800">
            <TrendingUp className="w-5 h-5 text-stone-600" />
            Writing Activity
          </CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold text-stone-800">{totalActivity}</div>
            <div className="text-sm text-stone-500">Last 30 days</div>
          </div>
        </div>
        
        {peakDay.totalActivity > 0 && (
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <Calendar className="w-4 h-4" />
            <span>Most active day: {peakDay.displayDate} ({peakDay.totalActivity} activities)</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {totalActivity === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <TrendingUp className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
            <p className="text-sm">Start creating pieces and giving feedback to see your activity graph!</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#78716c"
                  fontSize={12}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#78716c" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="totalActivity" 
                  stroke="#000000" 
                  strokeWidth={3}
                  dot={{ fill: '#000000', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#000000', strokeWidth: 2, fill: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        {totalActivity > 0 && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-stone-200">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-stone-600">Pieces Created</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-stone-600">Comments Made</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-stone-600">Comments Received</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
