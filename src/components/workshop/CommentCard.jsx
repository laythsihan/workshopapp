import React, { useState } from "react";
import { supabase } from "../../lib/supabase"; // Fixed Path
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, MoreVertical, Loader2 } from "lucide-react";
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
  isCompleted
}) {
  const [replyText, setReplyText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.comment_text || "");
  const { toast } = useToast();

  const canEditOrDelete = !isCompleted && currentUser?.id === comment.author_id;

  const handleReply = async () => {
    if (!replyText.trim() || !currentUser) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          piece_id: piece.id,
          author_id: currentUser.id,
          parent_comment_id: comment.id,
          comment_text: replyText.trim(),
          content: replyText.trim(),
        }]);

      if (error) throw error;
      setReplyText("");
      onCommentUpdate?.();
      toast({ title: "Reply posted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to post reply", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', comment.id);
      if (error) throw error;
      onCommentUpdate?.();
    } catch (error) {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" });
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl transition-all duration-300 w-full mb-3 cursor-pointer border ${
        isActive ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : 'bg-white border-stone-200'
      }`}
    >
      <div className="absolute top-3 left-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorInfo?.hex }}></div>
      
      <div className="flex items-start gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <div style={{ backgroundColor: colorInfo?.hex }} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 hover:opacity-80">
              <span style={{ color: colorInfo?.textColor }} className="text-[10px] font-bold">
                {comment.author_id?.substring(0,1).toUpperCase() || "U"}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none shadow-xl">
            <UserProfileCard userId={comment.author_id} />
          </PopoverContent>
        </Popover>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm text-stone-900">
                {comment.author_id?.substring(0, 8)}
            </span>
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

          <p className="text-sm text-stone-700 whitespace-pre-wrap">{comment.comment_text}</p>

          {/* Render Threaded Replies */}
          {replies.length > 0 && (
            <div className="mt-3 space-y-2 pl-3 border-l-2 border-stone-100">
              {replies.map(reply => (
                <div key={reply.id} className="text-xs text-stone-600 bg-stone-50 p-2 rounded">
                  <span className="font-bold mr-2">{reply.author_id?.substring(0, 4)}:</span>
                  {reply.comment_text}
                </div>
              ))}
            </div>
          )}

          {/* Reply Box */}
          <div className="mt-3 flex gap-2">
            <Textarea 
              placeholder="Reply..." 
              value={replyText} 
              onChange={(e) => setReplyText(e.target.value)}
              className="text-xs min-h-0 py-1 flex-1 bg-stone-50 border-none"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleReply} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-stone-400" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}