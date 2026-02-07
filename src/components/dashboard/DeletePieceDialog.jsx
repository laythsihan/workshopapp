import React, { useState } from "react";
import { Piece } from "@/api/entities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

export default function DeletePieceDialog({ piece, open, onOpenChange, onConfirm }) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (confirmText !== piece.title) return;
    
    setIsDeleting(true);
    try {
      await Piece.delete(piece.id);
      onConfirm();
    } catch (error) {
      console.error("Error deleting piece:", error);
    }
    setIsDeleting(false);
  };

  const handleOpenChange = (open) => {
    if (!open) {
      setConfirmText("");
    }
    onOpenChange(open);
  };

  const canDelete = confirmText === piece.title;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">Delete Piece</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>"{piece.title}"</strong> will be permanently deleted, including:
            </p>
            <ul className="mt-2 text-sm text-red-700 space-y-1">
              <li>• All text content ({piece.word_count?.toLocaleString() || 0} words)</li>
              <li>• All comments and feedback</li>
              <li>• Workshop history and collaborations</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-title" className="text-sm font-medium">
              Type the piece title to confirm deletion:
            </Label>
            <Input
              id="confirm-title"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={piece.title}
              className="border-red-200 focus:border-red-400 focus:ring-red-400"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? "Deleting..." : "Delete Piece"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}