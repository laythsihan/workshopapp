import React from "react";
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
import { RotateCcw } from "lucide-react";

export default function ReopenWorkshopDialog({ open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-stone-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">Reopen for Feedback?</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                This will unlock the piece for new edits and comments.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="text-sm text-gray-700 space-y-2">
            <p>Reopening this piece will change its status from "Completed" back to "Ready for Feedback" (if it has collaborators) or "Draft" (if it doesn't).</p>
            <p>You and your collaborators will be able to add new comments and you will be able to edit the content again.</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-black hover:bg-stone-800"
          >
            Confirm & Reopen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}