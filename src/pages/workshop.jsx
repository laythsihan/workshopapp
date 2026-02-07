import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { useToast } from "@/components/ui/use-toast";

import TextRenderer from "../components/workshop/TextRenderer";
import CommentSidebar from "../components/workshop/CommentSidebar";
import SelectionToolbar from "../components/workshop/SelectionToolbar";
import WorkshopHeader from "../components/workshop/WorkshopHeader";

import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * WorkshopPage: Handles document rendering, text selection, 
 * and collaborative feedback orchestration.
 */
export default function WorkshopPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // -- Document & User State --
  const [piece, setPiece] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [comments, setComments] = useState([]);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  
  // -- UI Interaction State --
  const [selection, setSelection] = useState(null);
  const [tempAnnotation, setTempAnnotation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [visibleCommenters, setVisibleCommenters] = useState({});
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  const articleRef = useRef(null);
  const pieceIdFromUrl = useMemo(() => new URLSearchParams(location.search).get("piece"), [location.search]);

  /**
   * Transforms raw database rows into the unified comment format used by the UI.
   */
  const formatComment = useCallback((c) => ({
    ...c,
    commenter_email: c.author_id,
    comment_text: c.content,
    selected_text: c.selection_json?.text || "",
    position_start: c.selection_json?.start || 0,
    position_end: c.selection_json?.end || 0,
    comment_type: c.selection_json?.type || "highlight"
  }), []);

  /**
   * Initializes page data. Ensures a document piece and version exist
   * before allowing user interaction.
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

      // Fetch the piece and current version
      const { data: pieceData, error: pieceError } = await supabase
        .from('pieces')
        .select('id, owner_id, title, status')
        .eq('id', pieceIdFromUrl)
        .maybeSingle();

      if (pieceError) throw pieceError;
      
      const activePiece = pieceData || { id: pieceIdFromUrl, title: "Untitled", owner_id: authUser?.id };

      const [versionRes, commentsRes] = await Promise.all([
        supabase.from('versions')
          .select('id, content')
          .eq('piece_id', pieceIdFromUrl)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('comments')
          .select('*')
          .eq('piece_id', pieceIdFromUrl)
      ]);

      setPiece({
        ...activePiece,
        content: versionRes.data?.content || "No content found for this version."
      });
      setCurrentVersion(versionRes.data);
      setComments((commentsRes.data || []).map(formatComment));
      setStatus("success");
    } catch (error) {
      console.error("Initialization Error:", error);
      setStatus("error");
    }
  }, [pieceIdFromUrl, navigate, formatComment]);

  /**
   * Global listener for text selection within the article container.
   */
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      const text = sel.toString().trim();
      if (text && articleRef.current?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = articleRef.current.getBoundingClientRect();
        setSelection({
          text,
          rect: {
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left,
            width: rect.width,
            height: rect.height
          },
          start: range.startOffset,
          end: range.endOffset
        });
      } else {
        setSelection(null);
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  /**
   * Real-time subscription to comment changes.
   * Prevents duplicate local updates by checking existing IDs.
   */
  useEffect(() => {
    loadData();
    if (!pieceIdFromUrl) return;

    const channel = supabase
      .channel(`comments-${pieceIdFromUrl}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments', 
        filter: `piece_id=eq.${pieceIdFromUrl}` 
      }, (payload) => {
        const newFormatted = formatComment(payload.new);
        setComments(prev => {
          const exists = prev.some(c => c.id === newFormatted.id);
          return exists ? prev : [...prev, newFormatted];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData, pieceIdFromUrl, formatComment]);

  /**
   * Persists a temporary annotation to the database.
   * Decoupled from document initialization; expects piece/version to exist.
   */
  const handleSaveTempAnnotation = async (commentText) => {
    if (!tempAnnotation || !user || !piece?.id || !currentVersion?.id) {
      toast({ 
        title: "Configuration Error", 
        description: "The document is not ready for comments. Please refresh.", 
        variant: "destructive"
      });
      return;
    }

    try {
      // 1. Transaction: Insert the comment
      const { data: newComment, error: cErr } = await supabase
        .from('comments')
        .insert([{
          piece_id: piece.id,
          author_id: user.id,
          content: commentText,
          version_id: currentVersion.id,
          selection_json: {
            text: tempAnnotation.selected_text,
            start: tempAnnotation.position_start,
            end: tempAnnotation.position_end,
            type: tempAnnotation.comment_type
          }
        }])
        .select()
        .single();

      if (cErr) throw cErr;

      // 2. Immediate UI Cleanup: Reset interactions before updating data list
      setTempAnnotation(null); 
      setSelection(null);
      
      // 3. Update local state (Optimistic UI update)
      const formatted = formatComment(newComment);
      setComments(prev => [...prev, formatted]);

      // 4. Success notification with short duration to prevent stacking
      toast({ 
        id: `save-success-${newComment.id}`,
        title: "Feedback saved!", 
        duration: 2500 
      });

    } catch (err) {
      console.error("Save Operation Failed:", err);
      toast({ 
        title: "Save Failed", 
        description: err.message, 
        variant: "destructive",
        duration: 4000
      });
    }
  };

  const collaboratorColors = useMemo(() => {
    const colors = {};
    const owner = piece?.owner_id;
    if (owner) colors[owner] = { hex: "#444", textColor: "#fff" };
    return colors;
  }, [piece]);

  // -- Render States --
  if (status === "loading") return (
    <div className="h-screen flex items-center justify-center bg-white">
      <Loader2 className="animate-spin text-stone-300" />
    </div>
  );
  
  if (status === "error") return (
    <div className="h-screen flex flex-col items-center justify-center p-4 bg-white text-center">
      <AlertCircle className="mb-4 text-red-500 w-12 h-12" />
      <h2 className="text-xl font-bold">Document Not Found</h2>
      <Button onClick={() => navigate("/dashboard")} className="mt-4">Back to Dashboard</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-stone-50/50 relative">
        <WorkshopHeader piece={piece} onToggleEdit={() => setIsEditing(!isEditing)} isEditing={isEditing} />
        <main className="flex-1 overflow-y-auto p-4 md:p-12">
          <article ref={articleRef} className="max-w-3xl mx-auto bg-white shadow-sm border border-stone-200 p-8 md:p-16 rounded-sm relative min-h-[1056px]">
            <TextRenderer 
              content={piece?.content || ""} 
              piece={piece} 
              comments={comments} 
              activeCommentId={activeCommentId} 
              onCommentClick={setActiveCommentId} 
            />
            {!isEditing && (
              <SelectionToolbar 
                selection={selection}
                onAnnotate={(temp) => {
                  setTempAnnotation({ ...temp, author_id: user?.id });
                  setIsDesktopCollapsed(false);
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
        onSaveTempAnnotation={handleSaveTempAnnotation}
        onCancelTempAnnotation={() => setTempAnnotation(null)}
        activeCommentId={activeCommentId} 
        setActiveCommentId={setActiveCommentId}
        collaboratorColors={collaboratorColors}
        visibleCommenters={visibleCommenters}
        setVisibleCommenters={setVisibleCommenters}
        isDesktopCollapsed={isDesktopCollapsed}
        setIsDesktopCollapsed={setIsDesktopCollapsed}
        currentUser={user}
      />
    </div>
  );
}