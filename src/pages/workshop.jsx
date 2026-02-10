import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { Comment } from "../api/entities";
import { useToast } from "@/components/ui/use-toast";

import TextRenderer from "../components/workshop/TextRenderer";
import CommentSidebar from "../components/workshop/CommentSidebar";
import SelectionToolbar from "../components/workshop/SelectionToolbar";
import WorkshopHeader from "../components/workshop/WorkshopHeader";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkshopPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [piece, setPiece] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [comments, setComments] = useState([]);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [selection, setSelection] = useState(null);
  const [tempAnnotation, setTempAnnotation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const articleRef = useRef(null);

  const pieceIdFromUrl = useMemo(() => 
    new URLSearchParams(location.search).get("piece"), 
    [location.search]
  );

  const normalizedUserEmail = user?.email?.toLowerCase();
  const isOwner = !!piece && user?.id === piece.owner_id;
  const isInvitedReviewer = !!piece && !!normalizedUserEmail && (piece.collaborators || []).some(
    (email) => email?.toLowerCase() === normalizedUserEmail
  );
  const canParticipate = isOwner || isInvitedReviewer;
  const canUseHighlightTools = isInvitedReviewer && piece?.status !== "completed" && !isEditing;

  useEffect(() => {
    if (!canUseHighlightTools) {
      setSelection(null);
      setTempAnnotation(null);
    }
  }, [canUseHighlightTools]);

  /**
   * Helper: Formats database comments for the TextRenderer.
   * Ensures UI-specific fields like position_start are mapped from JSONB.
   */
  const formatComment = useCallback((c) => ({
    ...c,
    content: c.content || "",
    selected_text: c.selection_json?.text || "",
    position_start: c.selection_json?.start || 0,
    position_end: c.selection_json?.end || 0,
    comment_type: c.selection_json?.type || "highlight"
  }), []);

  /**
   * Main Data Loader: Fetches the piece, latest version, and all comments.
   */
  const loadData = useCallback(async () => {
    if (!pieceIdFromUrl) {
      navigate("/dashboard");
      return;
    }
    setStatus("loading");

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Parallel fetch for speed
      const [pieceRes, versionRes, commentsRes, collaboratorsRes] = await Promise.all([
        supabase.from('pieces').select('*').eq('id', pieceIdFromUrl).maybeSingle(),
        supabase.from('versions')
          .select('*')
          .eq('piece_id', pieceIdFromUrl)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('comments')
          .select('*')
          .eq('piece_id', pieceIdFromUrl)
          .order('created_at', { ascending: true }),
        supabase.from('collaborators').select('invitee_email').eq('piece_id', pieceIdFromUrl)
      ]);

      if (pieceRes.error) throw pieceRes.error;
      if (!pieceRes.data) throw new Error("Manuscript not found.");

      // FALLBACK LOGIC: If no version exists, use the piece's original content.
      const displayContent = versionRes.data?.content || pieceRes.data.content || "";

      setPiece({
        ...pieceRes.data,
        collaborators: (collaboratorsRes.data || []).map((row) => row.invitee_email).filter(Boolean),
        content: displayContent
      });

      setCurrentVersion(versionRes.data);
      setComments((commentsRes.data || []).map(formatComment));
      setStatus("success");
    } catch (error) {
      console.error("Critical Load Error:", error);
      setStatus("error");
    }
  }, [pieceIdFromUrl, navigate, formatComment]);

  /**
   * Real-time Subscription: Listens for new comments on this specific piece.
   */
  useEffect(() => {
    loadData();
    if (!pieceIdFromUrl) return;

    const channel = supabase.channel(`workshop_realtime_${pieceIdFromUrl}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments', 
        filter: `piece_id=eq.${pieceIdFromUrl}` 
      }, (payload) => {
        const formatted = formatComment(payload.new);
        setComments(prev => {
          // Prevent duplicates from race conditions between fetch and realtime
          if (prev.find(c => c.id === formatted.id)) return prev;
          return [...prev, formatted];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData, pieceIdFromUrl, formatComment]);

  /**
   * Text Selection: Captures offsets and coordinates for the toolbar.
   */
  useEffect(() => {
    const calculateOffsets = (range, rootElement) => {
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(rootElement);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;
      const selectedTextLength = range.toString().length;
      const end = start + selectedTextLength;
      return { start, end };
    };

    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rootElement = articleRef.current?.querySelector('[data-manuscript-root="true"]');
      if (!rootElement || !rootElement.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

      const rawText = range.toString();
      const text = rawText.trim();
      if (!text) {
        setSelection(null);
        return;
      }

      const { start, end } = calculateOffsets(range, rootElement);
      if (start < 0 || end <= start || end > (piece?.content || "").length) {
        setSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      const containerRect = articleRef.current.getBoundingClientRect();
      setSelection({
        text,
        rect: {
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height,
        },
        start,
        end,
      });
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [piece?.content]);

  /**
   * Save Handler: Posts new comments/highlights to Supabase.
   */
  const handleSaveComment = async (commentText) => {
    if (!tempAnnotation || !user || !piece || !canUseHighlightTools) return;

    try {
      // Link comment to current version when available.
      const newComment = await Comment.create({
        piece_id: piece.id,
        version_id: currentVersion?.id || null,
        content: commentText,
        selection_json: {
          text: tempAnnotation.selected_text,
          start: tempAnnotation.position_start,
          end: tempAnnotation.position_end,
          type: tempAnnotation.comment_type
        }
      });

      // Local State Update
      setComments(prev => [...prev, formatComment(newComment)]);
      setTempAnnotation(null);
      setSelection(null);
      
      toast({ 
        id: `save-${newComment.id}`, 
        title: "Feedback saved!", 
        description: "Your highlight is now visible." 
      });

    } catch (err) {
      console.error("Save failure:", err);
      toast({ 
        title: "Save Failed", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  };

  // Rendering
  if (status === "loading") return (
    <div className="h-screen flex items-center justify-center bg-stone-50">
      <Loader2 className="animate-spin text-stone-400 w-8 h-8" />
    </div>
  );

  if (status === "error") return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <AlertCircle className="text-red-500 w-12 h-12" />
      <h2 className="text-xl font-serif text-stone-800">Unable to load this manuscript.</h2>
      <Button onClick={() => navigate("/dashboard")} variant="outline">Return to Dashboard</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50/50 flex flex-col lg:flex-row overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 relative">
        <WorkshopHeader 
          piece={piece}
          user={user}
          isEditing={isEditing} 
          onToggleEdit={() => setIsEditing(!isEditing)}
          onPieceUpdate={loadData}
          comments={comments}
          onSubmitReview={loadData}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-12">
          <article 
            ref={articleRef} 
            className="max-w-3xl mx-auto bg-white shadow-sm border border-stone-200 p-8 md:p-16 rounded-sm relative min-h-[80vh]"
          >
            <TextRenderer 
              content={piece?.content || ""} 
              comments={comments} 
              activeCommentId={activeCommentId} 
              onCommentClick={setActiveCommentId} 
              draftAnnotation={tempAnnotation}
            />
            
            {canUseHighlightTools && (
              <SelectionToolbar 
                selection={selection} 
                onAnnotate={(temp) => {
                  setTempAnnotation({ ...temp, author_id: user?.id });
                }} 
              />
            )}
          </article>
        </main>
      </div>

      <CommentSidebar 
        piece={piece}
        comments={comments}
        tempAnnotation={tempAnnotation}
        onSaveTempAnnotation={handleSaveComment}
        onCancelTempAnnotation={() => setTempAnnotation(null)}
        activeCommentId={activeCommentId}
        setActiveCommentId={setActiveCommentId}
        isDesktopCollapsed={isDesktopCollapsed}
        setIsDesktopCollapsed={setIsDesktopCollapsed}
        currentUser={user}
        canParticipate={canParticipate}
        isCompleted={piece?.status === "completed"}
        onCommentUpdate={loadData} // Refetch data when children components update
      />
    </div>
  );
}
