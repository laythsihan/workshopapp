
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isPast } from "date-fns";

export default function SubmitReviewDialog({ piece, draftCommentCount, onSubmit, trigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(overallFeedback);
      setIsOpen(false);
      setOverallFeedback("");
    } catch (error) {
      console.error("Error submitting review:", error);
    }
    setIsSubmitting(false);
  };

  const handleOpenChange = (open) => {
    if (!isSubmitting) {
      setIsOpen(open);
      if (!open) {
        setOverallFeedback("");
      }
    }
  };

  // Check if deadline has passed
  const isDeadlinePassed = piece.workshop_deadline && isPast(new Date(piece.workshop_deadline + 'T23:59:59'));

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Send className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-left">Submit Your Review</DialogTitle>
              <DialogDescription className="text-left">
                Share your feedback with the author for "{piece.title}"
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deadline Warning */}
          {isDeadlinePassed && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Deadline has passed:</strong> The workshop deadline for this piece has already passed. 
                The author may not see or need your feedback at this point, but you can still submit it if you'd like.
              </AlertDescription>
            </Alert>
          )}

          {draftCommentCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Comments Ready to Submit</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                  {draftCommentCount}
                </Badge>
              </div>
              <p className="text-sm text-blue-700">
                You have {draftCommentCount} draft comment{draftCommentCount !== 1 ? 's' : ''} that will be shared with the author when you submit this review.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-800">
              Overall Feedback <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <Textarea
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Share your overall thoughts about this piece - what worked well, areas for improvement, or general impressions..."
              className="min-h-[120px] border-gray-200 focus:border-green-400 focus:ring-green-400"
            />
            <p className="text-xs text-gray-500">
              This will be shared with the author along with your specific comments.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">What happens when you submit:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Your draft comments become visible to the author</li>
              <li>• You can still add new comments after submitting</li>
              <li>• The author will be notified of your completed review</li>
              <li>• Your overall feedback will be highlighted for the author</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || draftCommentCount === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
