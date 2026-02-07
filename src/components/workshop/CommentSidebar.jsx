import React, { useState, useMemo, useEffect, useRef } from "react";
import CommentCard from "./CommentCard";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, PanelRightClose, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  isDesktopCollapsed,
  setIsDesktopCollapsed
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [commentTypeFilter, setCommentTypeFilter] = useState("all");
  const scrollContainerRef = useRef(null);

  // 1. Map commenters for the filter list (Normalizing for author_id)
  const uniqueCommenters = useMemo(() => {
    const ids = comments.map(c => c.author_id);
    return [...new Set(ids)].filter(Boolean);
  }, [comments]);

  // 2. Filter logic normalized for Supabase selection_json
  const filteredComments = useMemo(() => {
    // We only show top-level comments in the main list; replies go inside CommentCard
    return comments
      .filter(c => !c.parent_comment_id) 
      .filter(comment => {
        const authorId = comment.author_id;
        
        // Filter by visibility toggle
        if (visibleCommenters[authorId] === false) return false;

        // Filter by Search Query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const contentMatch = (comment.comment_text || comment.content || "").toLowerCase().includes(query);
          const textMatch = (comment.selection_json?.text || "").toLowerCase().includes(query);
          if (!contentMatch && !textMatch) return false;
        }

        // Filter by Type
        if (commentTypeFilter !== "all") {
          const type = comment.selection_json?.type || "comment";
          if (type !== commentTypeFilter) return false;
        }

        return true;
      });
  }, [comments, visibleCommenters, searchQuery, commentTypeFilter]);

  // 3. Auto-scroll to active comment when it changes
  useEffect(() => {
    if (activeCommentId && scrollContainerRef.current) {
      const element = document.getElementById(`comment-${activeCommentId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeCommentId]);

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
              className="pl-10 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-500" />
            <Select value={commentTypeFilter} onValueChange={setCommentTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
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
        <div className="p-4 border-b border-stone-200 bg-stone-50/50">
          <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Filter by Reviewer</h3>
          <div className="space-y-2">
            {uniqueCommenters.map(id => (
              <div key={id} className="flex items-center justify-between">
                <span className="text-xs text-stone-600 truncate mr-2">{id}</span>
                <Switch 
                  className="scale-75"
                  checked={visibleCommenters[id] !== false}
                  onCheckedChange={() => setVisibleCommenters(prev => ({...prev, [id]: !prev[id]}))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {tempAnnotation && (
          <TempAnnotationForm
            tempAnnotation={tempAnnotation}
            onSave={onSaveTempAnnotation}
            onCancel={onCancelTempAnnotation}
          />
        )}

        {!tempAnnotation && filteredComments.length === 0 ? (
          <div className="text-center py-20 text-stone-300">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No feedback here yet.</p>
          </div>
        ) : (
          !tempAnnotation && filteredComments.map((comment) => (
            <div id={`comment-${comment.id}`} key={comment.id}>
              <CommentCard
                piece={piece}
                comment={comment}
                // Pull replies for this specific comment
                replies={comments.filter(c => c.parent_comment_id === comment.id)}
                colorInfo={collaboratorColors[comment.author_id]}
                currentUser={currentUser}
                onCommentUpdate={onCommentUpdate}
                isActive={activeCommentId === comment.id}
                onClick={() => setActiveCommentId(comment.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <aside className={`bg-white border-l border-stone-200 flex flex-col h-screen sticky top-0 transition-all duration-300 ${isDesktopCollapsed ? 'w-14' : 'w-[400px]'}`}>
      <header className="h-14 flex items-center justify-between px-4 border-b border-stone-200 shrink-0">
        {!isDesktopCollapsed && <h2 className="font-serif font-bold text-stone-800">Feedback</h2>}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          className="hover:bg-stone-100"
        >
          <PanelRightClose className={`w-4 h-4 text-stone-500 transition-transform ${isDesktopCollapsed ? 'rotate-180' : ''}`} />
        </Button>
      </header>
      {!isDesktopCollapsed && sidebarContent}
    </aside>
  );
}

function TempAnnotationForm({ tempAnnotation, onSave, onCancel }) {
  const [commentText, setCommentText] = useState("");

  return (
    <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 capitalize">
          {tempAnnotation.comment_type}
        </Badge>
      </div>
      <div className="text-sm text-stone-600 italic border-l-2 border-blue-300 pl-3 mb-4 line-clamp-3">
        "{tempAnnotation.selected_text}"
      </div>
      <Textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Add your thoughts..."
        className="mb-3 bg-white border-blue-200 focus-visible:ring-blue-400 min-h-[100px]"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-stone-500">Cancel</Button>
        <Button 
          size="sm" 
          onClick={() => onSave(commentText)} 
          disabled={!commentText.trim()} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Save
        </Button>
      </div>
    </div>
  );
}