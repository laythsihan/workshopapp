import React from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Clock3, Loader2, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SidebarRecentActivity({ comments = [], allPieces = [], userId, isLoading }) {
  // Helper to find piece title by ID
  const getPieceTitle = (pieceId) => {
    const piece = allPieces.find(p => p.id === pieceId);
    return piece?.title || 'a manuscript';
  };

  // Maps your pieces (where you are the owner)
  const myPieceIds = allPieces.filter(p => p.owner_id === userId).map(p => p.id);
  
  const activities = [];
  
  // 1. Group comments to detect "review submissions"
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
    
    // If someone else left 2+ comments on my piece, treat it as a review activity.
    if (isMyPiece && commenterId !== userId && commenterComments.length >= 2) {
      const latestComment = commenterComments.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0];
      
      activities.push({
        id: `review-${key}`,
        type: 'review_submitted',
        pieceId,
        commenterName: latestComment.profiles?.full_name || 'Reviewer',
        commentCount: commenterComments.length,
        timestamp: latestComment.created_at,
      });
    }
  });

  // 3. Add individual comments that are not part of a bulk review
  comments.forEach(comment => {
    const reviewKey = `review-${comment.piece_id}-${comment.author_id}`;
    const isPartOfReview = activities.some(a => a.id === reviewKey);
    
    // Show if it's on my piece OR if I wrote it (and not bulk review).
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

  const renderActivity = (activity, index) => {
    const timeAgo = activity.timestamp 
      ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) 
      : "recently";

    return (
      <Link 
        key={activity.id}
        to={`/workshop?piece=${activity.pieceId}`}
        className="group block relative pl-6 pr-2 py-2 rounded-lg hover:bg-stone-100 transition-colors"
      >
        <span className="absolute left-2 top-4 h-2 w-2 rounded-full bg-stone-300 group-hover:bg-stone-500 transition-colors" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-stone-800 leading-tight">
              {activity.type === 'review_submitted' ? 'Review completed' : 'New comment'}
            </p>
            {index === 0 && (
              <Badge variant="outline" className="h-4 rounded-full border-stone-300 text-[10px] px-1.5">
                New
              </Badge>
            )}
          </div>
          <p className="text-xs text-stone-600 leading-snug">
            <span className="font-medium text-stone-800">{activity.commenterName}</span>
            {activity.type === 'review_submitted' 
              ? ` left ${activity.commentCount} notes on `
              : ` commented on `
            }
            <span className="italic">"{getPieceTitle(activity.pieceId)}"</span>
          </p>
          <p className="text-[11px] text-stone-400 flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            {timeAgo}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <section className="h-full flex flex-col">
      <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
        Recent Activity
      </h3>
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-3 min-h-[220px] overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
          </div>
        ) : sortedActivities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
            <MessageSquareText className="w-5 h-5 text-stone-400" />
            <p className="text-sm text-stone-500 font-serif">No recent activity yet.</p>
            <p className="text-xs text-stone-400">Comments and reviews will appear here.</p>
          </div>
        ) : (
          <div className="space-y-1 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-stone-200">
            {sortedActivities.map(renderActivity)}
          </div>
        )}
      </div>
    </section>
  );
}