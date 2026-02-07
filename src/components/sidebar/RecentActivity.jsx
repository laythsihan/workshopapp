
import React from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export default function SidebarRecentActivity({ comments, allPieces, userEmail, isLoading }) {
  const getPieceTitle = (pieceId) => {
    const piece = allPieces.find(p => p.id === pieceId);
    return piece?.title || 'a piece';
  };

  const getPieceAuthor = (pieceId) => {
    const piece = allPieces.find(p => p.id === pieceId);
    return piece?.created_by || 'unknown';
  };

  const myPieceIds = allPieces.filter(p => p.created_by === userEmail).map(p => p.id);
  
  // Enhanced activity detection
  const activities = [];
  
  // Group comments by piece and commenter to detect review submissions
  const commentsByPieceAndCommenter = comments.reduce((acc, comment) => {
    const key = `${comment.piece_id}-${comment.commenter_email}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(comment);
    return acc;
  }, {});

  // Check for completed reviews (multiple submitted comments from same person)
  Object.entries(commentsByPieceAndCommenter).forEach(([key, commenterComments]) => {
    const [pieceId, commenterEmail] = key.split('-');
    const isMyPiece = myPieceIds.includes(pieceId);
    const submittedComments = commenterComments.filter(c => c.status === 'submitted');
    
    if (isMyPiece && commenterEmail !== userEmail && submittedComments.length >= 2) {
      // This looks like a completed review submission
      const latestComment = submittedComments.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )[0];
      
      // Check if this review was submitted recently (within last 24 hours)
      const reviewTime = new Date(latestComment.created_date);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      
      if (reviewTime >= dayAgo) {
        activities.push({
          id: `review-${key}`,
          type: 'review_submitted',
          pieceId,
          commenterEmail,
          commentCount: submittedComments.length,
          timestamp: latestComment.created_date,
          hasOverallFeedback: submittedComments.some(c => c.selected_text === 'Overall Feedback')
        });
      }
    }
  });

  // Add individual comment activities (for pieces I own or commented on)
  const relevantComments = comments.filter(comment => {
    const isMyPiece = myPieceIds.includes(comment.piece_id);
    const isMyComment = comment.commenter_email === userEmail;
    return (isMyPiece && !isMyComment) || (!isMyPiece && isMyComment);
  }).filter(comment => {
    // Only show if not part of a review submission we already detected
    const reviewKey = `review-${comment.piece_id}-${comment.commenter_email}`;
    return !activities.some(a => a.id === reviewKey);
  });

  relevantComments.forEach(comment => {
    activities.push({
      id: comment.id,
      type: 'individual_comment',
      pieceId: comment.piece_id,
      commenterEmail: comment.commenter_email,
      commentText: comment.comment_text,
      timestamp: comment.created_date
    });
  });

  // Sort all activities by timestamp
  const sortedActivities = activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5); // Show only most recent 5

  const renderActivity = (activity) => {
    if (activity.type === 'review_submitted') {
      return (
        <Link 
          key={activity.id}
          to={createPageUrl(`workshop?piece=${activity.pieceId}`)}
          className="block p-3 rounded-xl hover:bg-stone-100 transition-colors duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-700 font-medium">Review Completed</p>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  New
                </Badge>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                <span className="font-semibold">{activity.commenterEmail.split('@')[0]}</span> submitted 
                {activity.commentCount} comments on <span className="font-semibold">"{getPieceTitle(activity.pieceId)}"</span>
                {activity.hasOverallFeedback && ' with overall feedback'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        </Link>
      );
    }

    // Individual comment activity
    const commenterDisplayName = activity.commenterEmail === userEmail
      ? `${activity.commenterEmail.split('@')[0]} (You)`
      : activity.commenterEmail.split('@')[0];
    
    const isMyPiece = myPieceIds.includes(activity.pieceId);
    
    return (
      <Link 
        key={activity.id}
        to={createPageUrl(`workshop?piece=${activity.pieceId}`)}
        className="block p-3 rounded-xl hover:bg-stone-100 transition-colors duration-200"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center shrink-0 mt-1">
            <MessageSquare className="w-4 h-4 text-stone-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 line-clamp-2">
              <span className="font-semibold">{commenterDisplayName}</span> commented on 
              {isMyPiece ? ' your piece ' : ' '}
              <span className="font-semibold">"{getPieceTitle(activity.pieceId)}"</span>
              {!isMyPiece && activity.commenterEmail === userEmail && (
                <span> by {getPieceAuthor(activity.pieceId).split('@')[0]}</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <SidebarGroup className="mt-4">
      <SidebarGroupLabel className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 py-3">
        Recent Activity
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {isLoading ? (
          <div className="px-3 py-4 text-center">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto" />
          </div>
        ) : sortedActivities.length === 0 ? (
          <div className="px-3 text-center text-xs text-gray-500 py-4">
            <Clock className="w-6 h-6 mx-auto text-gray-300 mb-2"/>
            No recent activity.
          </div>
        ) : (
          <div className="space-y-1">
            {sortedActivities.map(renderActivity)}
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
