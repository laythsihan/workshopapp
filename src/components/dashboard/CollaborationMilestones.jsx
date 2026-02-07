
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Award, Target, Star, TrendingUp, Share2, Download } from "lucide-react";

const MILESTONE_LEVELS = [
  { threshold: 1, title: "First Steps", icon: "🌱" },
  { threshold: 5, title: "Getting Started", icon: "✨" },
  { threshold: 10, title: "Community Helper", icon: "🤝" },
  { threshold: 25, title: "Workshop Contributor", icon: "📚" },
  { threshold: 50, title: "Feedback Champion", icon: "🏆" },
  { threshold: 100, title: "Master Collaborator", icon: "👑" }
];

// Custom circular progress component
const CircularProgress = ({ percentage, size = 80 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e7e5e4"
          strokeWidth="4"
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#000000"
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-stone-800">{percentage}%</span>
      </div>
    </div>
  );
};

export default function CollaborationMilestones({ pieces, comments, user, onMilestoneClick }) {
  const milestoneData = useMemo(() => {
    if (!pieces || !comments || !user) return null;

    // Calculate user's collaboration stats
    const userPieces = pieces.filter(p => p.created_by === user.email);
    const userPieceIds = userPieces.map(p => p.id);
    
    // Comments made by user on others' pieces
    const commentsMadeByUser = comments.filter(c => 
      c.commenter_email === user.email && 
      !userPieceIds.includes(c.piece_id)
    );
    
    // Pieces reviewed (unique pieces user has commented on)
    const piecesReviewedIds = [...new Set(commentsMadeByUser.map(c => c.piece_id))];
    
    // People helped (unique authors user has given feedback to)
    const authorsHelped = [...new Set(
      piecesReviewedIds.map(pieceId => {
        const piece = pieces.find(p => p.id === pieceId);
        return piece?.created_by;
      }).filter(Boolean)
    )];
    
    // Comments received on user's pieces
    const commentsReceived = comments.filter(c => 
      userPieceIds.includes(c.piece_id) && 
      c.commenter_email !== user.email
    );
    
    // Total collaboration score (weighted)
    const collaborationScore = (commentsMadeByUser.length * 2) + (piecesReviewedIds.length * 3) + (authorsHelped.length * 5);
    
    // Current milestone
    const currentMilestone = MILESTONE_LEVELS
      .slice()
      .reverse()
      .find(level => collaborationScore >= level.threshold) || MILESTONE_LEVELS[0];
    
    // Next milestone
    const nextMilestone = MILESTONE_LEVELS.find(level => level.threshold > collaborationScore);
    
    // Progress to next milestone
    const progressToNext = nextMilestone 
      ? Math.round((collaborationScore / nextMilestone.threshold) * 100)
      : 100;

    return {
      commentsMade: commentsMadeByUser.length,
      piecesReviewed: piecesReviewedIds.length,
      peopleHelped: authorsHelped.length,
      commentsReceived: commentsReceived.length,
      collaborationScore,
      currentMilestone,
      nextMilestone,
      progressToNext,
      // Recent activity (last 7 days)
      recentComments: commentsMadeByUser.filter(c => {
        const commentDate = new Date(c.created_date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return commentDate >= weekAgo;
      }).length
    };
  }, [pieces, comments, user]);

  const handleDownload = () => {
    if (!milestoneData) return;
    
    const data = {
      collaboration_score: milestoneData.collaborationScore,
      current_milestone: milestoneData.currentMilestone.title,
      comments_made: milestoneData.commentsMade,
      pieces_reviewed: milestoneData.piecesReviewed,
      people_helped: milestoneData.peopleHelped,
      comments_received: milestoneData.commentsReceived,
      recent_activity: milestoneData.recentComments,
      progress_to_next: milestoneData.progressToNext
    };
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collaboration-milestones.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!milestoneData) return;
    
    const shareText = `Check out my progress on Workshop: ${milestoneData.currentMilestone.icon} ${milestoneData.currentMilestone.title} - ${milestoneData.peopleHelped} writers helped!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Workshop Collaboration Stats',
          text: `I've reached ${milestoneData.currentMilestone.title} level on Workshop! I've helped ${milestoneData.peopleHelped} writers and reviewed ${milestoneData.piecesReviewed} pieces.` ,
          url: window.location.href
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard?.writeText(shareText);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard?.writeText(shareText);
    }
  };

  if (!milestoneData) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-stone-200">
        <CardContent className="p-6 text-center text-stone-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-stone-300" />
          <p>Loading collaboration data...</p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: "Comments Made", value: milestoneData.commentsMade, icon: "💬", color: "text-blue-600" },
    { label: "Pieces Reviewed", value: milestoneData.piecesReviewed, icon: "📄", color: "text-green-600" },
    { label: "Writers Helped", value: milestoneData.peopleHelped, icon: "👥", color: "text-purple-600" },
    { label: "Feedback Received", value: milestoneData.commentsReceived, icon: "⭐", color: "text-amber-600" }
  ];

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-stone-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl text-stone-800">
            <Award className="w-5 h-5 text-stone-600" />
            Collaboration Milestones
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download Stats">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare} title="Share Achievement">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Milestone & Progress */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{milestoneData.currentMilestone.icon}</span>
              <div>
                <h3 className="font-bold text-lg text-stone-800">{milestoneData.currentMilestone.title}</h3>
                <p className="text-sm text-stone-600">Score: {milestoneData.collaborationScore} points</p>
              </div>
            </div>
            {milestoneData.nextMilestone && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-stone-500">Next:</span>
                <Badge variant="outline" className="text-xs">
                  {milestoneData.nextMilestone.icon} {milestoneData.nextMilestone.title}
                </Badge>
                {milestoneData.recentComments > 0 && (
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {milestoneData.recentComments} this week
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Progress Circle */}
          <div className="ml-4">
            <CircularProgress percentage={milestoneData.progressToNext} size={80} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className="text-center p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              onClick={() => onMilestoneClick && onMilestoneClick(stat.label)}
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-xs text-stone-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Milestone Progress Bar */}
        {milestoneData.nextMilestone && (
          <div className="bg-stone-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-700">
                Progress to {milestoneData.nextMilestone.title}
              </span>
              <span className="text-sm text-stone-500">
                {milestoneData.collaborationScore} / {milestoneData.nextMilestone.threshold}
              </span>
            </div>
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div 
                className="bg-black h-2 rounded-full transition-all duration-500" 
                style={{ width: `${milestoneData.progressToNext}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Achievement Badge */}
        {milestoneData.collaborationScore >= 25 && (
          <div className="text-center p-3 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
            <Star className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <p className="text-sm font-semibold text-amber-800">Community Champion!</p>
            <p className="text-xs text-amber-600">Thank you for making the workshop better</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
