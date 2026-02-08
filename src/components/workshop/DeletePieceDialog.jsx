import React, { useState } from "react";
import { Piece } from "@/api/entities";
import { useToast } from "@/components/ui/use-toast";
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
import { Loader2, Trash2 } from "lucide-react";

/**
 * DeletePieceDialog - Reusable component for deleting pieces
 * 
 * @param {Object} piece - The piece to delete
 * @param {Function} onSuccess - Callback after successful deletion
 * @param {React.ReactNode} trigger - The button/element that opens the dialog
 * @param {boolean} redirectAfterDelete - Whether to redirect to dashboard after delete (default: false)
 */
export default function DeletePieceDialog({ 
  piece, 
  onSuccess, 
  trigger,
  redirectAfterDelete = false 
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await Piece.delete(piece.id);
      
      toast({
        title: "Piece deleted",
        description: `"${piece.title}" has been permanently deleted.`,
      });

      setOpen(false);

      // Redirect if requested (e.g., from workshop page)
      if (redirectAfterDelete) {
        window.location.href = "/dashboard";
      } else {
        // Otherwise just call the success callback to refresh the list
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error deleting piece:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete the piece. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Delete "{piece.title}"?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>This action cannot be undone. This will permanently delete:</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>The manuscript and all versions</li>
              <li>All comments and feedback</li>
              <li>Version history</li>
              <li>Collaborator invitations</li>
            </ul>
            <p className="font-medium text-red-600 mt-3">
              Are you absolutely sure?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}