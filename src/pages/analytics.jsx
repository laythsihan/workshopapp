import React, { useState, useEffect, useCallback } from "react";
import { Piece } from "@/api/entities";
import { User } from "@/api/entities";
import { Comment } from "@/api/entities";
import { BarChart as BarChartIcon } from "lucide-react";
import ActivityGraph from "../components/dashboard/ActivityGraph";
import PieceEngagementChart from "../components/dashboard/PieceEngagementChart";
import FeedbackThemesChart from "../components/dashboard/FeedbackThemesChart";
import CollaborationMilestones from "../components/dashboard/CollaborationMilestones";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Analytics() {
  const [pieces, setPieces] = useState([]);
  const [allPieces, setAllPieces] = useState([]);
  const [comments, setComments] = useState([]);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [timeRange, setTimeRange] = useState("30d");

  const loadData = useCallback(async () => {
    setStatus("loading");
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const [allAvailablePieces, allComments] = await Promise.all([
        Piece.list("-created_date", 500),
        Comment.list("-created_date", 1000)
      ]);
      
      setAllPieces(allAvailablePieces);
      setComments(allComments);

      // Get user's pieces
      const userPieces = allAvailablePieces.filter(p => p.created_by === currentUser.email);
      
      setPieces(userPieces);
      setStatus("success");
    } catch (error) {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleThemeClick = useCallback((theme) => {
    console.log("Theme clicked:", theme);
  }, []);

  const handleMilestoneClick = useCallback((milestone) => {
    console.log("Milestone clicked:", milestone);
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
        <div className="text-center text-stone-500">
            <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4" />
            <p className="text-lg font-semibold">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
      return (
        <div className="min-h-screen bg-transparent p-6 flex items-center justify-center">
            <div className="text-center text-red-600 bg-red-50 p-8 rounded-2xl border border-red-200">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p className="text-lg font-semibold">Something went wrong</p>
                <p className="text-sm mb-6">We couldn't load your analytics. Please try again later.</p>
                <Button onClick={loadData}>Try Again</Button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <BarChartIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-800">
              Analytics & Insights
            </h1>
            <p className="text-stone-600 text-lg">
              Track your writing progress and workshop engagement.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <ActivityGraph pieces={pieces} comments={comments} user={user} />
            <CollaborationMilestones 
              pieces={allPieces} 
              comments={comments} 
              user={user}
              onMilestoneClick={handleMilestoneClick}
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <PieceEngagementChart 
              pieces={pieces} 
              comments={comments} 
              user={user}
              onTimeRangeChange={setTimeRange}
              timeRange={timeRange}
            />
            <FeedbackThemesChart 
              comments={comments} 
              user={user}
              pieces={pieces}
              onThemeClick={handleThemeClick}
              timeRange={timeRange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}