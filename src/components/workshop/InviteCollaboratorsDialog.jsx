import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
import { Users, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function InviteCollaboratorsDialog({ piece, onUpdate, trigger }) {
  const [open, setOpen] = useState(false);
  const [collaboratorInput, setCollaboratorInput] = useState("");
  const [pendingCollaborators, setPendingCollaborators] = useState([]);
  const [existingCollaborators, setExistingCollaborators] = useState([]);
  const [collaboratorsToRemove, setCollaboratorsToRemove] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchCollaborators();
  }, [open, piece.id]);

  const fetchCollaborators = async () => {
    const { data, error: fetchError } = await supabase
      .from('collaborators')
      .select('invitee_email')
      .eq('piece_id', piece.id);
    
    if (fetchError) console.error("Fetch Error:", fetchError);
    setExistingCollaborators(data?.map(c => c.invitee_email) || []);
  };

  const handleAddPending = () => {
    const email = collaboratorInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format");
      return;
    }
    if (existingCollaborators.includes(email) || pendingCollaborators.includes(email)) {
      setError("User already invited");
      return;
    }
    setPendingCollaborators([...pendingCollaborators, email]);
    setCollaboratorInput("");
    setError("");
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    
    try {
      // 1. Delete removals
      if (collaboratorsToRemove.length > 0) {
        await supabase
          .from('collaborators')
          .delete()
          .eq('piece_id', piece.id)
          .in('invitee_email', collaboratorsToRemove);
      }

      // 2. Insert new ones
      if (pendingCollaborators.length > 0) {
        const payload = pendingCollaborators.map(email => ({
          piece_id: piece.id,
          invitee_email: email,
          role: 'reviewer'
        }));

        const { error: insertError } = await supabase
          .from('collaborators')
          .insert(payload);

        if (insertError) throw insertError;
      }

      toast({ title: "Invites sent successfully" });
      
      if (typeof onUpdate === 'function') onUpdate();
      
      // Cleanup
      setPendingCollaborators([]);
      setCollaboratorsToRemove([]);
      setOpen(false);
    } catch (err) {
      console.error("Submission Error:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Workshop Access</DialogTitle>
          <DialogDescription>Add reviewers to your manuscript.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current List */}
          {(existingCollaborators.length > 0 || pendingCollaborators.length > 0) && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-stone-400">Reviewers</Label>
              <div className="flex flex-wrap gap-2">
                {existingCollaborators.map(email => (
                  <Badge 
                    key={email} 
                    variant={collaboratorsToRemove.includes(email) ? "destructive" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => setCollaboratorsToRemove(prev => 
                      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
                    )}
                  >
                    {email} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
                {pendingCollaborators.map(email => (
                  <Badge key={email} className="bg-blue-50 text-blue-600 border-blue-100">
                    {email} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setPendingCollaborators(p => p.filter(e => e !== email))} />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex gap-2">
            <Input 
              value={collaboratorInput} 
              onChange={(e) => setCollaboratorInput(e.target.value)} 
              placeholder="reviewer@email.com" 
              onKeyDown={(e) => e.key === 'Enter' && handleAddPending()}
            />
            <Button variant="outline" type="button" onClick={handleAddPending}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleFinalSubmit} 
            disabled={isSubmitting || (pendingCollaborators.length === 0 && collaboratorsToRemove.length === 0)} 
            className="w-full bg-black text-white"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}