import React, { useState, useMemo, useEffect, useRef } from "react";
import CommentCard from "./CommentCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Filter, PanelRightClose, Lock, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function CommentSidebar({
  piece,
  comments = [],
  tempAnnotation,
  onSaveTempAnnotation,
  onCancelTempAnnotation,
  collaboratorColors = {},
  currentUser,
  onCommentUpdate,
  activeCommentId,
  setActiveCommentId,
  visibleCommenters = {},
  setVisibleCommenters,
  isCompleted,
  isMobileOpen,
  onMobileClose,
  isDesktopCollapsed,
  setIsDesktopCollapsed
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [commentTypeFilter, setCommentTypeFilter] = useState("all");
  const scrollContainerRef = useRef(null);

  // 1. Map commenters for the filter list
  const uniqueCommenters = useMemo(() => {
    const ids = comments.map(c => c.author_id || c.commenter_email);
    return [...new Set(ids)].filter(Boolean);
  }, [comments]);

  // 2. Filtering Logic updated for Supabase fields
  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      const authorId = comment.author_id || comment.commenter_email;
      
      // Filter by visibility toggle
      if (visibleCommenters[authorId] === false) return false;

      // Filter by Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const contentMatch = (comment.content || comment.comment_text || "").toLowerCase().includes(query);
        const textMatch = (comment.selection_json?.text || comment.selected_text || "").toLowerCase().includes(query);
        if (!contentMatch && !textMatch) return false;
      }

      // Filter by Type
      if (commentTypeFilter !== "all") {
        const type = comment.selection_json?.type || comment.comment_type;
        if (type !== commentTypeFilter) return false;
      }

      return true;
    });
  }, [comments, visibleCommenters, searchQuery, commentTypeFilter]);

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Search and Filters */}
      {!tempAnnotation && (
        <div className="p-4 border-b border-stone-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comments..."
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-500" />
            <Select value={commentTypeFilter} onValueChange={setCommentTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="highlight">Highlights</SelectItem>
                <SelectItem value="strikethrough">Strikethrough</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Reviewer Visibility Toggles */}
      {uniqueCommenters.length > 0 && !tempAnnotation && (
        <div className="p-4 border-b border-stone-200">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Reviewers</h3>
          <div className="space-y-2">
            {uniqueCommenters.map(id => (
              <div key={id} className="flex items-center justify-between">
                <span className="text-sm text-stone-700 truncate mr-2">{id}</span>
                <Switch 
                  checked={visibleCommenters[id] !== false}
                  onCheckedChange={() => setVisibleCommenters(prev => ({...prev, [id]: !prev[id]}))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/30">
        {tempAnnotation && (
          <TempAnnotationForm
            tempAnnotation={tempAnnotation}
            onSave={onSaveTempAnnotation}
            onCancel={onCancelTempAnnotation}
            colorInfo={collaboratorColors[tempAnnotation.author_id]}
          />
        )}

        {!tempAnnotation && filteredComments.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No comments found.</p>
          </div>
        ) : (
          !tempAnnotation && filteredComments.map((comment) => (
            <CommentCard
              key={comment.id}
              piece={piece}
              comment={comment}
              // Map colors based on author_id
              colorInfo={collaboratorColors[comment.author_id || comment.commenter_email]}
              currentUser={currentUser}
              onCommentUpdate={onCommentUpdate}
              isActive={activeCommentId === comment.id}
              onClick={() => setActiveCommentId(comment.id)}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <aside className={`bg-white border-l border-stone-200 flex flex-col h-full shrink-0 transition-all duration-300 ${isDesktopCollapsed ? 'w-16' : 'w-[400px]'}`}>
      <header className="p-4 border-b border-stone-200 flex items-center justify-between">
        {!isDesktopCollapsed && <h2 className="font-bold text-stone-800">Workshop Feedback</h2>}
        <Button variant="ghost" size="icon" onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}>
          <PanelRightClose className={`w-5 h-5 transition-transform ${isDesktopCollapsed ? 'rotate-180' : ''}`} />
        </Button>
      </header>
      {!isDesktopCollapsed && sidebarContent}
    </aside>
  );
}

function TempAnnotationForm({ tempAnnotation, onSave, onCancel, colorInfo }) {
  const [commentText, setCommentText] = useState("");

  return (
    <div className="p-4 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/30">
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-blue-500">New {tempAnnotation.comment_type}</Badge>
      </div>
      <blockquote className="text-sm text-stone-500 italic border-l-2 border-blue-300 pl-3 mb-3">
        "{tempAnnotation.selected_text}"
      </blockquote>
      <Textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Write your feedback..."
        className="mb-3 bg-white"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(commentText)} disabled={!commentText.trim()} className="bg-blue-600">
          Save Comment
        </Button>
      </div>
    </div>
  );
}