
import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit3, Eye, UserPlus, Download, CheckCircle, RotateCcw, Send, GitBranch } from "lucide-react";
import { Piece } from "@/api/entities";
import { Comment } from "@/api/entities";
import { VersionChain } from "@/api/entities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import UserProfileCard from "../user/UserProfileCard";
import { useToast } from "@/components/ui/use-toast";

import InviteCollaboratorsDialog from "./InviteCollaboratorsDialog";
import MarkCompleteDialog from "./MarkCompleteDialog";
import ReopenWorkshopDialog from "./ReopenWorkshopDialog";
import SubmitReviewDialog from "./SubmitReviewDialog";
import CreateVersionDialog from "./CreateVersionDialog";

export default function WorkshopHeader({ piece, user, isEditing, onToggleEdit, canEdit, onPieceUpdate, comments, onSubmitReview, isMock }) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showCreateVersionDialog, setShowCreateVersionDialog] = useState(false);
  const [versionChain, setVersionChain] = useState(null);
  const [hasChildVersion, setHasChildVersion] = useState(false); // New state to track if a new version has been created
  const { toast } = useToast();

  const isAuthor = !isMock && user?.id === piece.owner_id;
  const canInvite = !isMock && isAuthor && (piece.status === 'draft' || piece.status === 'ready_for_feedback');
  const isCompleted = piece.status === 'completed';
  const isReviewer = !isAuthor && piece.collaborators?.includes(user?.email); // Changed: Removed '!isMock' to allow reviewers for mock pieces

  // Load version chain data and check for child versions
  useEffect(() => {
    const loadDependencies = async () => {
      if (piece?.version_chain_id) {
        try {
          const chain = await VersionChain.get(piece.version_chain_id);
          setVersionChain(chain);
        } catch (error) {
          console.error("Error loading version chain:", error);
        }
      } else {
        setVersionChain(null); // Clear version chain if piece doesn't have one
      }

      if (piece?.status === 'completed' && piece.id) {
        try {
          // Check if any other piece lists this one as its parent
          const childVersions = await Piece.filter({ parent_version_id: piece.id }, null, 1);
          setHasChildVersion(childVersions.length > 0);
        } catch (error) {
          console.error("Error checking for child versions:", error);
          setHasChildVersion(false); // Default to false on error
        }
      } else {
        setHasChildVersion(false); // Reset if not completed or no piece ID
      }
    };

    loadDependencies();
  }, [piece]); // Depend on piece to re-load if the piece object changes (e.g., new piece loaded)

  // Get user's DRAFT comments for review submission count
  const userDraftComments = useMemo(() => {
    // For mock pieces, we need to count all comments since they don't have status field
    if (isMock) {
      return comments?.filter(comment => 
        comment.commenter_email === user?.email &&
        comment.piece_id === piece.id
      ) || [];
    }
    
    // For real pieces, filter by draft status
    return comments?.filter(comment => 
      comment.commenter_email === user?.email &&
      comment.piece_id === piece.id &&
      comment.status === 'draft'
    ) || [];
  }, [comments, user?.email, piece.id, isMock]);

  const handleDownload = async () => {
    let allPieceComments = [];

    if (isMock) {
      // For mock pieces, use the comments from props to ensure what you see is what you get.
      allPieceComments = comments.filter(c => c.piece_id === piece.id);
    } else {
      // For real pieces, fetch only submitted comments to provide the author with the final version.
      allPieceComments = await Comment.filter({ piece_id: piece.id, status: 'submitted' }, "created_date");
    }

    const overallFeedbackComments = allPieceComments.filter(c => c.selected_text === "Overall Feedback");
    const inlineComments = allPieceComments.filter(c => c.selected_text !== "Overall Feedback");

    // Format the content as Markdown
    let fileContent = `# ${piece.title}\n\n`;
    fileContent += `_By: ${user?.email || 'Author'}_\n\n`;
    fileContent += `**Version:** ${piece.version_number || '1.0'}\n`;
    fileContent += `**Status:** ${piece.status.replace(/_/g, ' ')}\n`;
    fileContent += `**Word Count:** ${piece.word_count}\n`;
    if (piece.version_notes) {
      fileContent += `**Version Notes:** ${piece.version_notes}\n`;
    }
    fileContent += '\n---\n\n';
    fileContent += piece.content;

    if (overallFeedbackComments.length > 0) {
      fileContent += '\n\n---\n\n## Review Summaries\n\n';
      overallFeedbackComments.forEach(comment => {
        fileContent += `### Summary from ${comment.commenter_email}:\n`;
        // Ensure multi-line notes are formatted correctly as a blockquote
        fileContent += `> ${comment.comment_text.replace(/\n/g, '\n> ')}\n\n`;
      });
    }

    if (inlineComments.length > 0) {
      fileContent += '\n\n---\n\n## Inline Comments\n\n';
      inlineComments.forEach((comment, index) => {
        fileContent += `${index + 1}. **On text:** "${comment.selected_text}"\n`;
        fileContent += `   - **From:** ${comment.commenter_email}\n`;
        fileContent += `   - > ${comment.comment_text.replace(/\n/g, '\n   - > ')}\n`;
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach(reply => {
            fileContent += `   - **Reply from ${reply.author_email}:** ${reply.text}\n`;
          });
        }
        fileContent += `\n`;
      });
    } else {
        fileContent += '\n\n---\n\n*No inline comments were made on this piece.*\n';
    }

    const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${piece.title.replace(/[\s/]/g, '_')}_v${piece.version_number || '1.0'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleMarkComplete = async () => {
    if (isMock) {
      toast({ title: "Mock Piece", description: "Actions are disabled for mock pieces." });
      return;
    }
    await Piece.update(piece.id, { status: 'completed' });
    onPieceUpdate();
    setShowCompleteDialog(false);
  };

  const handleReopenWorkshop = async () => {
    if (isMock) {
      toast({ title: "Mock Piece", description: "Actions are disabled for mock pieces." });
      return;
    }
    const newStatus = piece.collaborators?.length > 0 ? 'ready_for_feedback' : 'draft';
    await Piece.update(piece.id, { status: newStatus });
    onPieceUpdate();
    setShowReopenDialog(false);
  };

  const handleCreateVersionSuccess = (newPiece) => {
    if (isMock) {
      toast({ title: "Mock Piece", description: "Actions are disabled for mock pieces." });
      return;
    }
    setShowCreateVersionDialog(false);
    // Navigate to the new version
    window.location.href = createPageUrl(`workshop?piece=${newPiece.id}`);
  };

  const handleBackToDashboard = () => {
    // Mark that user is returning from viewing a piece
    sessionStorage.setItem('returnedFromPiece', 'true');
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-stone-200 p-4 shrink-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
          <Link to={createPageUrl("dashboard")} onClick={handleBackToDashboard}>
            <Button variant="outline" size="icon" className="border-stone-200 hover:bg-stone-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="literary-heading text-lg sm:text-xl font-bold text-stone-800 truncate">{piece.title}</h1>
              {piece.version_number && (
                <Badge variant="outline" className="text-xs bg-stone-100 text-stone-600 border-stone-300">
                  v{piece.version_number}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <span className="shrink-0">by {user?.email?.split('@')[0] || 'you'}</span>
              {piece.version_notes && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="truncate max-w-xs">{piece.version_notes}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
          <div className="hidden sm:flex -space-x-2">
            {[user?.email, ...(piece.collaborators || [])].filter(Boolean).slice(0, 4).map((email, i) => (
              <Popover key={i}>
                <PopoverTrigger asChild>
                  <div 
                    className="w-8 h-8 rounded-full bg-stone-200 border-2 border-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                    title={email}
                  >
                    <span className="text-xs font-bold text-stone-700">{email ? email[0].toUpperCase() : '?'}</span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none shadow-none bg-transparent">
                  <UserProfileCard email={email} />
                </PopoverContent>
              </Popover>
            ))}
          </div>
          
          <Button variant="outline" className="border-stone-200 hover:bg-stone-100" onClick={handleDownload}>
            <Download className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Download</span>
          </Button>

          {/* Submit Review Button for Reviewers - Only show if they have draft comments */}
          {isReviewer && !isCompleted && userDraftComments.length > 0 && (
            <SubmitReviewDialog
              piece={piece}
              draftCommentCount={userDraftComments.length}
              onSubmit={onSubmitReview}
              trigger={
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Send className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Submit Review</span> ({userDraftComments.length})
                </Button>
              }
            />
          )}

          {/* Invite Collaborators Button */}
          {canInvite && !isCompleted && (
            <InviteCollaboratorsDialog 
              piece={piece} 
              onUpdate={onPieceUpdate}
              trigger={
                <Button variant="outline" className="border-stone-200 hover:bg-stone-100">
                  <UserPlus className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{piece.collaborators?.length > 0 ? 'Manage' : 'Invite'}</span>
                </Button>
              }
            />
          )}
          
          {/* Edit Button is only shown if editing is allowed */}
          {canEdit && !isCompleted && (
            <Button 
              variant={isEditing ? "default" : "outline"} 
              onClick={onToggleEdit}
              className={`${
                isEditing 
                  ? "bg-black hover:bg-stone-800 text-white" 
                  : "border-stone-200 hover:bg-stone-100"
              }`}
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">View</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Edit</span>
                </>
              )}
            </Button>
          )}

          {/* Create New Version Button */}
          {isAuthor && isCompleted && (
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div className="relative"> {/* Wrapper for Tooltip with disabled button */}
                    <Button
                      variant="outline"
                      className="border-blue-300 hover:bg-blue-50 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => !isMock && setShowCreateVersionDialog(true)}
                      disabled={hasChildVersion || isMock}
                    >
                      <GitBranch className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">{hasChildVersion ? 'Versioned' : 'New Version'}</span>
                    </Button>
                  </div>
                </TooltipTrigger>
                {hasChildVersion && (
                  <TooltipContent>
                    <p>A new version has already been created from this piece.</p>
                  </TooltipContent>
                )}
                 {isMock && (
                  <TooltipContent>
                    <p>Cannot create new versions from a mock piece.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          {isAuthor && !isCompleted && (
            <Button 
              variant="outline"
              className="border-green-300 hover:bg-green-50 text-green-700"
              onClick={() => setShowCompleteDialog(true)}
            >
              <CheckCircle className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Complete</span>
            </Button>
          )}

          {isAuthor && isCompleted && (
            <Button
                variant="outline"
                className="border-stone-300 hover:bg-stone-100 text-stone-700"
                onClick={() => setShowReopenDialog(true)}
            >
                <RotateCcw className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Reopen</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Dialogs */}
      <MarkCompleteDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        onConfirm={handleMarkComplete}
      />
      <ReopenWorkshopDialog
        open={showReopenDialog}
        onOpenChange={setShowReopenDialog}
        onConfirm={handleReopenWorkshop}
      />
      <CreateVersionDialog
        piece={piece}
        versionChain={versionChain}
        open={showCreateVersionDialog}
        onOpenChange={setShowCreateVersionDialog}
        onSuccess={handleCreateVersionSuccess}
      />
    </header>
  );
}
