
import React, { useState } from "react";
import { Piece } from "@/api/entities";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Plus, X, AlertTriangle, Send, UserMinus, CheckCircle } from "lucide-react";

export default function InviteCollaboratorsDialog({ piece, onUpdate, trigger }) {
  const [open, setOpen] = useState(false);
  const [collaboratorInput, setCollaboratorInput] = useState("");
  const [pendingCollaborators, setPendingCollaborators] = useState([]);
  const [collaboratorsToRemove, setCollaboratorsToRemove] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addCollaborator = () => {
    const email = collaboratorInput.trim();
    setError("");

    if (!email) {
      setError("Please enter an email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (email === piece.created_by) {
      setError("You cannot invite yourself as a collaborator");
      return;
    }

    if (pendingCollaborators.includes(email)) {
      setError("This user is already in your pending invites");
      return;
    }

    if (piece.collaborators?.includes(email)) {
      setError("This user is already a collaborator");
      return;
    }

    setPendingCollaborators(prev => [...prev, email]);
    setCollaboratorInput("");
    setSuccess(`Added ${email} to pending invites`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const removeNewCollaborator = (email) => {
    setPendingCollaborators(prev => prev.filter(c => c !== email));
  };

  const toggleRemoveExistingCollaborator = (email) => {
    setCollaboratorsToRemove(prev => 
      prev.includes(email) 
        ? prev.filter(c => c !== email)
        : [...prev, email]
    );
  };

  const handleInitialSubmit = () => {
    if (pendingCollaborators.length === 0 && collaboratorsToRemove.length === 0) return;
    
    setError("");
    
    // If piece is draft and we're adding collaborators, show confirmation dialog
    if (piece.status === 'draft' && pendingCollaborators.length > 0) {
      setShowConfirmation(true);
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    
    try {
      // Calculate new collaborators list
      const currentCollaborators = piece.collaborators || [];
      const filteredCollaborators = currentCollaborators.filter(email => !collaboratorsToRemove.includes(email));
      const newCollaborators = [...filteredCollaborators, ...pendingCollaborators];

      const updatedData = {
        collaborators: newCollaborators
      };

      // If piece was draft and we're adding collaborators, update status to ready_for_workshop
      if (piece.status === 'draft' && pendingCollaborators.length > 0) {
        updatedData.status = 'ready_for_workshop';
      }

      // If removing all collaborators from a ready_for_workshop piece, revert to draft
      if (piece.status === 'ready_for_workshop' && newCollaborators.length === 0) {
        updatedData.status = 'draft';
      }

      console.log("Updating piece with data:", updatedData);
      await Piece.update(piece.id, updatedData);
      
      onUpdate(); // Refresh the piece data
      
      // Reset state and close dialog
      setPendingCollaborators([]);
      setCollaboratorsToRemove([]);
      setShowConfirmation(false);
      setSuccess("Collaborators updated successfully!");
      setTimeout(() => {
        setSuccess("");
        setOpen(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error updating collaborators:", error);
      setError(`Failed to update collaborators: ${error.message || "Unknown error"}`);
    }
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setPendingCollaborators([]);
    setCollaboratorsToRemove([]);
    setCollaboratorInput("");
    setShowConfirmation(false);
    setError("");
    setSuccess("");
    setOpen(false);
  };

  const hasChanges = pendingCollaborators.length > 0 || collaboratorsToRemove.length > 0;
  const willRemoveAllCollaborators = piece.collaborators?.length > 0 && 
    (piece.collaborators.length === collaboratorsToRemove.length) && 
    pendingCollaborators.length === 0;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) handleCancel();
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!showConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-stone-600" />
                Manage Collaborators
              </DialogTitle>
              <DialogDescription>
                Add or remove reviewers for your piece.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Current Collaborators */}
              {piece.collaborators && piece.collaborators.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Current Collaborators</Label>
                  <div className="flex flex-wrap gap-2">
                    {piece.collaborators.map((email) => (
                      <Badge 
                        key={email} 
                        variant="outline" 
                        className={`flex items-center gap-1 cursor-pointer transition-colors ${
                          collaboratorsToRemove.includes(email)
                            ? "bg-red-50 text-red-700 border-red-200 line-through"
                            : "bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        }`}
                        onClick={() => toggleRemoveExistingCollaborator(email)}
                      >
                        {email}
                        <X className="w-3 h-3" />
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click to mark for removal</p>
                </div>
              )}

              {/* Add New Collaborators */}
              <div className="space-y-2">
                <Label htmlFor="collaborator-email" className="text-sm font-medium text-gray-700">
                  Add New Collaborators
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="collaborator-email"
                    value={collaboratorInput}
                    onChange={(e) => setCollaboratorInput(e.target.value)}
                    placeholder="Enter email address"
                    className="border-stone-200 focus:border-stone-400 focus:ring-stone-400"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCollaborator();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCollaborator}
                    className="border-stone-200 hover:bg-stone-100"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Pending Collaborators */}
              {pendingCollaborators.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Ready to Invite</Label>
                  <div className="flex flex-wrap gap-2">
                    {pendingCollaborators.map((email) => (
                      <Badge key={email} className="bg-stone-100 text-stone-800 border-stone-200 flex items-center gap-1">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeNewCollaborator(email)}
                          className="hover:text-stone-900 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Change Warnings */}
              {piece.status === 'draft' && pendingCollaborators.length > 0 && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Adding collaborators will change this piece from "Draft" to "Ready for Workshop".
                  </AlertDescription>
                </Alert>
              )}

              {willRemoveAllCollaborators && piece.status === 'ready_for_workshop' && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Removing all collaborators will change this piece back to "Draft" status.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleInitialSubmit}
                disabled={!hasChanges || isSubmitting}
                className="bg-black hover:bg-stone-800 text-white"
              >
                {isSubmitting ? (
                  "Updating..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {pendingCollaborators.length > 0 && collaboratorsToRemove.length > 0 
                      ? `Update (${pendingCollaborators.length} add, ${collaboratorsToRemove.length} remove)`
                      : pendingCollaborators.length > 0 
                        ? `Send Invites (${pendingCollaborators.length})`
                        : `Remove (${collaboratorsToRemove.length})`
                    }
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-stone-600" />
                Confirm Status Change
              </DialogTitle>
              <DialogDescription>
                You're about to invite collaborators to review your piece.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800">
                  <strong>Your piece will be updated:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• Status: Draft (Private) → Ready for Workshop</li>
                    <li>• {pendingCollaborators.length} collaborator{pendingCollaborators.length > 1 ? 's' : ''} will be invited</li>
                    <li>• Text editing will be disabled to preserve reviewer context</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2">Inviting:</Label>
                <div className="flex flex-wrap gap-2">
                  {pendingCollaborators.map((email) => (
                    <Badge key={email} className="bg-stone-100 text-stone-800 border-stone-200">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Back to Edit
              </Button>
              <Button 
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-black hover:bg-stone-800 text-white"
              >
                {isSubmitting ? "Updating..." : "Confirm & Update"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
