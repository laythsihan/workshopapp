import React from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Clock, Loader2, CheckCircle2 } from "lucide-react";
// Removed createPageUrl as we can use standard relative paths with react-router-dom
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export default function SidebarRecentActivity({ comments = [], allPieces = [], userId, isLoading }) {
  
  // Helper to find piece title by ID
  const getPieceTitle = (pieceId) => {
    const piece = allPieces.find(p => p.id === pieceId);
    return piece?.title || 'a piece';
  };

  // Maps your pieces (where you are the owner)
  const myPieceIds = allPieces.filter(p => p.owner_id === userId).map(p => p.id);
  
  const activities = [];
  
  // 1. Group comments to detect "Review Submissions"
  const commentsByPieceAndCommenter = comments.reduce((acc, comment) => {
    const key = `${comment.piece_id}-${comment.author_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(comment);
    return acc;
  }, {});

  // 2. Identify bulk review activities
  Object.entries(commentsByPieceAndCommenter).forEach(([key, commenterComments]) => {
    const [pieceId, commenterId] = key.split('-');
    const isMyPiece = myPieceIds.includes(pieceId);
    
    // Logic: If someone else left 2+ comments on my piece, treat it as a "Review"
    if (isMyPiece && commenterId !== userId && commenterComments.length >= 2) {
      const latestComment = commenterComments.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0];
      
      activities.push({
        id: `review-${key}`,
        type: 'review_submitted',
        pieceId,
        commenterName: latestComment.profiles?.full_name || 'A critic',
        commentCount: commenterComments.length,
        timestamp: latestComment.created_at,
      });
    }
  });

  // 3. Add individual comments that aren't part of a bulk review
  comments.forEach(comment => {
    const reviewKey = `review-${comment.piece_id}-${comment.author_id}`;
    const isPartOfReview = activities.some(a => a.id === reviewKey);
    
    // Show if it's on my piece OR if I wrote it (and it's not a bulk review)
    const isRelevant = myPieceIds.includes(comment.piece_id) || comment.author_id === userId;

    if (isRelevant && !isPartOfReview) {
      activities.push({
        id: comment.id,
        type: 'individual_comment',
        pieceId: comment.piece_id,
        commenterName: comment.author_id === userId ? "You" : (comment.profiles?.full_name || "Someone"),
        timestamp: comment.created_at
      });
    }
  });

  // Sort and limit
  const sortedActivities = activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  const renderActivity = (activity) => {
    const timeAgo = activity.timestamp 
      ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) 
      : "recently";

    return (
      <Link 
        key={activity.id}
        to={`/workshop?piece=${activity.pieceId}`}
        className="block p-3 rounded-xl hover:bg-stone-100 transition-all duration-200 group"
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
            activity.type === 'review_submitted' ? 'bg-green-100' : 'bg-stone-100'
          }`}>
            {activity.type === 'review_submitted' 
              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
              : <MessageSquare className="w-4 h-4 text-stone-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-stone-800">
                {activity.type === 'review_submitted' ? 'Review Completed' : 'New Comment'}
              </p>
              {activity.type === 'review_submitted' && (
                <Badge variant="outline" className="text-[10px] h-4 bg-green-50 text-green-700 border-green-200">New</Badge>
              )}
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-900">{activity.commenterName}</span>
              {activity.type === 'review_submitted' 
                ? ` left ${activity.commentCount} notes on `
                : ` commented on `
              }
              <span className="italic">"{getPieceTitle(activity.pieceId)}"</span>
            </p>
            <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeAgo}
            </p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <SidebarGroup className="mt-4">
      <SidebarGroupLabel className="text-[11px] font-bold text-stone-400 uppercase tracking-widest px-3 mb-2">
        Recent Activity
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-stone-300 animate-spin" /></div>
        ) : sortedActivities.length === 0 ? (
          <div className="px-4 py-6 text-center border border-dashed border-stone-200 rounded-xl mx-2">
            <p className="text-xs text-stone-400 italic font-serif">Quiet in the library today...</p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {sortedActivities.map(renderActivity)}
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}