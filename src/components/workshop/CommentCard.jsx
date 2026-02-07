import React, { useState } from "react";
import { Comment } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, Send, UserX, MoreVertical, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import UserProfileCard from "../user/UserProfileCard";
import { useToast } from "@/components/ui/use-toast";

const cardStyles = {
  highlight: "border-blue-200 bg-blue-50 hover:border-blue-300",
  strikethrough: "border-red-200 bg-red-50 hover:border-red-300",
};

export default function CommentCard({
  piece,
  comment,
  colorInfo,
  currentUser,
  onCommentUpdate,
  isActive,
  onClick,
  isCompleted
}) {
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.comment_text || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const canEditOrDelete = !isCompleted && currentUser?.email === comment.commenter_email;
  const isMockComment = comment.id?.toString().startsWith('mock-comment-');

  // SAFE DATE FORMATTING
  const getFormattedDate = (dateValue) => {
    try {
      if (!dateValue) return "Just now";
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? "Just now" : formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return "Just now";
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || isMockComment) return;
    setIsReplying(true);
    try {
      const newReply = {
        text: replyText,
        author_email: currentUser.email,
        timestamp: new Date().toISOString()
      };
      await Comment.update(comment.id, {
        replies: [...(comment.replies || []), newReply]
      });
      setReplyText("");
      onCommentUpdate();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reply", variant: "destructive" });
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpdate = async () => {
    if (!editedText.trim() || isMockComment) return;
    setIsReplying(true);
    try {
      await Comment.update(comment.id, { comment_text: editedText });
      onCommentUpdate();
      setIsEditing(false);
    } catch (error) {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await Comment.delete(comment.id);
      onCommentUpdate();
    } catch (error) {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const commenterName = comment.commenter_email?.split('@')[0] || "User";

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl transition-all duration-300 w-full mb-3 cursor-pointer border ${
        isActive ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : 'bg-white border-stone-200 hover:border-stone-300'
      }`}
    >
      <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorInfo?.hex }}></div>
      
      <div className="flex items-start gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <div style={{ backgroundColor: colorInfo?.hex }} className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span style={{ color: colorInfo?.textColor }} className="text-xs font-bold">
                {commenterName[0]?.toUpperCase()}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none shadow-lg">
            <UserProfileCard email={comment.commenter_email} />
          </PopoverContent>
        </Popover>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-stone-900">{commenterName}</span>
              <span className="text-[11px] text-stone-500">
                {getFormattedDate(comment.created_at || comment.created_date)}
              </span>
            </div>
            {canEditOrDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6">
                    <MoreVertical className="w-4 h-4 text-stone-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {comment.selected_text && (
            <blockquote className="text-xs text-stone-500 italic border-l-2 pl-3 my-2 border-stone-200">
              "{comment.selected_text}"
            </blockquote>
          )}

          {isEditing ? (
            <div className="flex flex-col gap-2 mt-2">
              <Textarea 
                value={editedText} 
                onChange={(e) => setEditedText(e.target.value)} 
                className="text-sm min-h-[60px]" 
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="xs" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="xs" onClick={handleUpdate}>Save</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
              {comment.comment_text}
            </p>
          )}

          {/* Replies Section */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-2 mt-3 border-t border-stone-50 pt-2">
              {comment.replies.map((reply, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-stone-50 p-2 rounded-lg">
                  <div className="w-4 h-4 rounded-full bg-stone-200 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold">{reply.author_email?.[0]?.toUpperCase()}</span>
                  </div>
                  <p className="text-[12px] text-stone-600 leading-tight">{reply.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="mt-3 flex items-center gap-2">
            <Textarea 
                placeholder="Reply..." 
                value={replyText} 
                onChange={(e) => setReplyText(e.target.value)} 
                rows={1} 
                className="text-xs min-h-0 py-1.5 flex-1 bg-stone-50 border-none focus-visible:ring-1"
            />
            <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 hover:bg-stone-100" 
                onClick={handleReply} 
                disabled={!replyText.trim() || isReplying}
            >
              {isReplying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-stone-400" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}