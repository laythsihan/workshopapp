import React, { useState } from "react";
import { Comment } from "../../api/entities";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MoreVertical, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import UserProfileCard from "../user/UserProfileCard";
import { useToast } from "@/components/ui/use-toast";

export default function CommentCard({
  piece,
  comment,
  replies = [],
  colorInfo,
  currentUser,
  onCommentUpdate,
  isActive,
  onClick,
  isCompleted = false,
  canParticipate = false,
}) {
  const [replyText, setReplyText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.content || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isTogglingResolved, setIsTogglingResolved] = useState(false);
  const { toast } = useToast();

  const canEditOrDelete = !isCompleted && currentUser?.id === comment.author_id;
  const canResolve = !isCompleted && currentUser?.id === piece?.owner_id && !comment.parent_comment_id;
  const canReply = !isCompleted && canParticipate;
  const selectedText = comment.selection_json?.text || comment.selected_text;
  const displayName = comment.profiles?.full_name || comment.author_id?.substring(0, 8) || "Reviewer";
  const timestamp = comment.created_at
    ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
    : null;

  const handleReply = async () => {
    if (!replyText.trim() || !currentUser || !canReply) return;

    setIsProcessing(true);
    try {
      await Comment.create({
        piece_id: piece.id,
        parent_comment_id: comment.id,
        version_id: comment.version_id || null,
        content: replyText.trim()
      });

      setReplyText("");
      onCommentUpdate?.();
      toast({ title: "Reply posted" });
    } catch (error) {
      console.error("Reply error:", error);
      toast({ title: "Error", description: "Failed to post reply", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedText.trim()) return;

    setIsSavingEdit(true);
    try {
      await Comment.update(comment.id, { content: editedText.trim() });
      setIsEditing(false);
      onCommentUpdate?.();
      toast({ title: "Comment updated" });
    } catch (error) {
      console.error("Edit error:", error);
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    try {
      await Comment.delete(comment.id);
      onCommentUpdate?.();
      toast({ title: "Comment deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  };

  const handleToggleResolved = async () => {
    if (!canResolve) return;

    setIsTogglingResolved(true);
    try {
      if (comment.is_resolved) {
        await Comment.unresolve(comment.id);
        toast({ title: "Thread reopened" });
      } else {
        await Comment.resolve(comment.id);
        toast({ title: "Thread resolved" });
      }
      onCommentUpdate?.();
    } catch (error) {
      console.error("Resolve error:", error);
      toast({ title: "Error", description: "Could not update thread status", variant: "destructive" });
    } finally {
      setIsTogglingResolved(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl transition-all duration-300 w-full mb-3 cursor-pointer border ${
        isActive ? "ring-2 ring-amber-400 bg-amber-50/80 border-amber-200" : "bg-white border-stone-200"
      } ${comment.is_resolved ? "opacity-80" : ""}`}
    >
      <div
        className="absolute top-3 left-2 w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: colorInfo?.hex || "#a8a29e" }}
      ></div>
      
      <div className="flex items-start gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <div
              style={{ backgroundColor: colorInfo?.hex || "#e7e5e4" }}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 hover:opacity-80"
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ color: colorInfo?.textColor || "#44403c" }} className="text-[10px] font-bold">
                {displayName.substring(0, 1).toUpperCase()}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none shadow-xl">
            <UserProfileCard userId={comment.author_id} />
          </PopoverContent>
        </Popover>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm text-stone-900 truncate">{displayName}</span>
              {timestamp && <span className="text-xs text-stone-400">{timestamp}</span>}
              {comment.is_resolved && (
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  Resolved
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canResolve && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleResolved();
                  }}
                  disabled={isTogglingResolved}
                  title={comment.is_resolved ? "Reopen thread" : "Resolve thread"}
                >
                  {isTogglingResolved ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500" />
                  ) : comment.is_resolved ? (
                    <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </Button>
              )}
              {canEditOrDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-stone-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {selectedText && (
            <div className="text-xs text-stone-500 italic border-l-2 border-amber-200 pl-2 mb-2 line-clamp-3">
              "{selectedText}"
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="text-sm min-h-[90px] bg-stone-50 border-stone-200"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditedText(comment.content || "");
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !editedText.trim()}
                >
                  {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{comment.content}</p>
          )}

          {replies.length > 0 && (
            <div className="mt-3 space-y-2 pl-3 border-l-2 border-stone-100">
              {replies.map((reply) => {
                const replyName = reply.profiles?.full_name || reply.author_id?.substring(0, 8) || "Reply";
                const replyTime = reply.created_at
                  ? formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })
                  : null;
                return (
                  <div key={reply.id} className="text-xs text-stone-600 bg-stone-50 p-2 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-stone-700">{replyName}</span>
                      {replyTime && <span className="text-[10px] text-stone-400">{replyTime}</span>}
                    </div>
                    <p className="whitespace-pre-wrap">{reply.content}</p>
                  </div>
                );
              })}
            </div>
          )}

          {canReply && !comment.is_resolved && (
            <div className="mt-3 flex gap-2">
              <Textarea
                placeholder="Reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="text-xs min-h-0 py-1 flex-1 bg-stone-50 border-none"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleReply}
                disabled={isProcessing || !replyText.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3 text-stone-500" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
