
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
import { CheckCircle } from "lucide-react";

export default function MarkCompleteDialog({ open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">Mark Piece as Complete?</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                This will end the feedback session for this piece.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="text-sm text-gray-700 space-y-2">
            <p>By marking this piece as complete, you will lock it.</p>
            <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md">
                <li>New comments and replies cannot be added.</li>
                <li>The text content can no longer be edited.</li>
                <li>Everyone can still view the piece and its comments.</li>
            </ul>
            <p>You can create a new version from this piece later.</p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-600"
          >
            Confirm & Complete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
