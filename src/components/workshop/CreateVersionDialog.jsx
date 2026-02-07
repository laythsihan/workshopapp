import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Piece } from "@/api/entities";
import { VersionChain } from "@/api/entities";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { GitBranch, Users, FileText, AlertCircle, Plus, X, UserPlus, Upload, Type, File } from "lucide-react";

import FileUploadDropzone from "../upload/FileUploadDropzone";

export default function CreateVersionDialog({ piece, versionChain, open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    title: piece?.title || "",
    content: piece?.content || "",
    version_notes: "",
    invite_previous_reviewers: true,
    is_major_revision: true
  });
  const [newReviewers, setNewReviewers] = useState([]);
  const [newReviewerInput, setNewReviewerInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [contentInputMethod, setContentInputMethod] = useState("text");
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const previousCollaborators = React.useMemo(() => {
    if (!piece?.collaborators) return [];
    return [...new Set(piece.collaborators)];
  }, [piece]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addNewReviewer = () => {
    const email = newReviewerInput.trim();
    setError("");

    if (!email || !validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (email === piece?.created_by || previousCollaborators.includes(email) || newReviewers.includes(email)) {
      setError("This user is already a reviewer or cannot be invited.");
      return;
    }
    setNewReviewers(prev => [...prev, email]);
    setNewReviewerInput("");
  };

  const removeNewReviewer = (email) => {
    setNewReviewers(prev => prev.filter(r => r !== email));
  };

  const handleFileUpload = async (file) => {
    setIsProcessingFile(true);
    setError("");
    try {
      const { file_url } = await UploadFile({ file });
      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: { type: "object", properties: { content: { type: "string" } } }
      });
      if (result.status === "success" && result.output) {
        setFormData(prev => ({ ...prev, content: result.output.content || "" }));
      } else {
        setError("Could not extract text from file. Please try copy/paste instead.");
      }
    } catch (error) {
      setError("Failed to process uploaded file.");
    }
    setIsProcessingFile(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Title and content are required");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      let chainId = piece.version_chain_id;
      let chain = versionChain;

      if (!chainId) {
        const newChain = await VersionChain.create({
          title: piece.title,
          description: piece.description,
          genre: piece.genre,
          author_email: piece.created_by,
          original_piece_id: piece.id,
          status: "active",
        });
        chainId = newChain.id;
        chain = newChain;
        await Piece.update(piece.id, { version_chain_id: chainId });
      }

      const newVersionNumber = getNextVersionNumber();
      const wordCount = formData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
      const collaborators = [...new Set([...(formData.invite_previous_reviewers ? previousCollaborators : []), ...newReviewers])];

      const newPiece = await Piece.create({
        title: formData.title,
        genre: piece.genre,
        content: formData.content,
        description: piece.description,
        word_count: wordCount,
        status: "ready_for_workshop",
        collaborators: collaborators,
        version_chain_id: chainId,
        version_number: newVersionNumber,
        parent_version_id: piece.id,
        version_notes: formData.version_notes,
        is_major_revision: formData.is_major_revision
      });

      if (chain) {
        await VersionChain.update(chain.id, {
          current_version: newPiece.id,
          version_count: (chain.version_count || 1) + 1,
          trusted_reviewers: [...new Set([...(chain.trusted_reviewers || []), ...collaborators])]
        });
      }

      onSuccess(newPiece);
    } catch (error) {
      console.error("Error creating new version:", error);
      setError("Failed to create new version. Please try again.");
    }
    setIsSubmitting(false);
  };

  const getNextVersionNumber = () => {
    if (!piece?.version_number) return "2.0";
    const [major, minor] = piece.version_number.split('.').map(Number);
    return formData.is_major_revision ? `${major + 1}.0` : `${major}.${(minor || 0) + 1}`;
  };

  const calculateWordCountChange = () => {
    const oldWc = piece?.word_count || 0;
    const newWc = formData.content.trim().split(/\s+/).filter(Boolean).length;
    const change = newWc - oldWc;
    return change >= 0 ? `+${change}` : change.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-stone-800">
            <GitBranch className="w-5 h-5 text-stone-600" />
            Create New Version
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-stone-500">New Version</Label>
              <p className="font-bold text-lg text-stone-800">{getNextVersionNumber()}</p>
            </div>
            <div>
              <Label className="text-xs text-stone-500">Word Count Change</Label>
              <p className="font-bold text-lg text-stone-800">{calculateWordCountChange()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-stone-700 font-medium">Title</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="version_notes" className="text-stone-700 font-medium">What Changed? (Version Notes)</Label>
            <Textarea id="version_notes" value={formData.version_notes} onChange={(e) => setFormData(prev => ({ ...prev, version_notes: e.target.value }))} placeholder="e.g., Rewrote the ending, improved character dialogue..." />
          </div>

          <div className="space-y-4">
            <Label className="text-stone-700 font-medium">Content</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant={contentInputMethod === "text" ? "default" : "outline"} size="sm" onClick={() => setContentInputMethod("text")} className={contentInputMethod === "text" ? "bg-black hover:bg-stone-800" : "border-stone-200"}>
                <Type className="w-4 h-4 mr-2" /> Paste Text
              </Button>
              <Button type="button" variant={contentInputMethod === "file" ? "default" : "outline"} size="sm" onClick={() => setContentInputMethod("file")} className={contentInputMethod === "file" ? "bg-black hover:bg-stone-800" : "border-stone-200"}>
                <File className="w-4 h-4 mr-2" /> Upload File
              </Button>
            </div>
            {contentInputMethod === 'text' ? (
              <Textarea value={formData.content} onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))} className="min-h-48" required />
            ) : (
              <FileUploadDropzone onFileUpload={handleFileUpload} isProcessing={isProcessingFile} />
            )}
          </div>
          
          <Separator />

          <div className="space-y-4">
            <Label className="text-stone-700 font-medium">Reviewers</Label>
            {previousCollaborators.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox id="invite_previous" checked={formData.invite_previous_reviewers} onCheckedChange={(checked) => setFormData(prev => ({...prev, invite_previous_reviewers: checked}))} />
                <label htmlFor="invite_previous" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Automatically re-invite previous reviewers ({previousCollaborators.length})
                </label>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new_reviewers" className="text-sm">Invite New Reviewers</Label>
              <div className="flex gap-2">
                <Input id="new_reviewers" value={newReviewerInput} onChange={(e) => setNewReviewerInput(e.target.value)} placeholder="Enter email address..." onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewReviewer())}/>
                <Button type="button" variant="outline" onClick={addNewReviewer} className="border-stone-200"><UserPlus className="w-4 h-4 mr-2" />Add</Button>
              </div>
            </div>
            {newReviewers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newReviewers.map(email => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-2">
                    {email} <button type="button" onClick={() => removeNewReviewer(email)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-black hover:bg-stone-800 text-white">
              {isSubmitting ? "Creating..." : "Create Version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}