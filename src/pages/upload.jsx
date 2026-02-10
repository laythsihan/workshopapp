import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Piece } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Upload, FileUp, Loader2, X, Plus, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Upload Page - Supports PDF, DOCX, DOC, and TXT files OR direct text input
 * EITHER upload a file OR type text - not both
 * @param {Function} onRefresh - Refresh function to reload pieces after upload
 */
export default function UploadPage({ onRefresh }) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [invitedReviewers, setInvitedReviewers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const hasUploadedFile = uploadedFileName !== "";

  const processPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText.trim();
  };

  const processDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const parseFileToText = async (file) => {
    if (file.type === "application/pdf") {
      return processPDF(file);
    }

    if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "application/msword" ||
      file.name.toLowerCase().endsWith(".docx") ||
      file.name.toLowerCase().endsWith(".doc")
    ) {
      return processDOCX(file);
    }

    if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
      return file.text();
    }

    throw new Error("Unsupported file type. Please upload PDF, DOCX, DOC, or TXT.");
  };

  const handleSelectedFile = async (file) => {
    if (!file) return;

    setIsParsing(true);
    setIsDragOver(false);

    try {
      const extractedText = await parseFileToText(file);

      if (!extractedText.trim()) {
        throw new Error("No readable text was found in that file.");
      }

      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      setUploadedFileName(file.name);
      setContent(extractedText);
      toast({ title: "File parsed successfully" });
    } catch (error) {
      console.error("File processing error:", error);
      toast({ 
        title: "Processing error", 
        description: error.message || "Could not extract text from file. Please try again.",
        variant: "destructive" 
      });
      setUploadedFileName("");
      setContent("");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await handleSelectedFile(file);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    await handleSelectedFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleClearFile = () => {
    setUploadedFileName("");
  };

  const addReviewer = () => {
    const normalized = inviteInput.trim().toLowerCase();
    if (!normalized) return;

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (!isValidEmail) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid reviewer email.",
        variant: "destructive",
      });
      return;
    }

    if (invitedReviewers.includes(normalized)) {
      setInviteInput("");
      return;
    }

    setInvitedReviewers((prev) => [...prev, normalized]);
    setInviteInput("");
  };

  const removeReviewer = (email) => {
    setInvitedReviewers((prev) => prev.filter((item) => item !== email));
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast({ 
        title: "Title required", 
        description: "Please enter a title for your manuscript.",
        variant: "destructive" 
      });
      return false;
    }

    if (!content.trim()) {
      toast({ 
        title: "Content required", 
        description: "Please upload a manuscript file or paste your text.",
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsUploading(true);

    try {
      // Create the piece using entities.js
      const newPiece = await Piece.create({
        title: title.trim(),
        content: content.trim(),
        genre: genre.trim() || "Uncategorized",
        status: "draft",
        collaborators: invitedReviewers
      });

      toast({ 
        title: "Manuscript uploaded",
        description: "Your piece is now in your library."
      });

      if (onRefresh) {
        await onRefresh();
      }
      
      navigate(`/workshop?piece=${newPiece.id}`);

    } catch (error) {
      console.error("Upload error:", error);
      toast({ 
        title: "Upload failed", 
        description: error.message || "Could not upload manuscript. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(w => w).length;

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="writer-surface border-stone-200/80">
        <CardHeader>
          <CardTitle className="writer-heading text-3xl">New Manuscript</CardTitle>
          <CardDescription>
            Upload a file, add reviewer emails, and start your workshop.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-stone-700">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., The Last Summer in Aleppo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 border-stone-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre" className="text-stone-700">Genre</Label>
                <Input
                  id="genre"
                  placeholder="Literary Fiction"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="h-11 border-stone-300"
                />
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-8 transition-colors ${
                isDragOver ? "border-stone-400 bg-stone-100" : "border-stone-300 bg-stone-50"
              }`}
            >
              <div className="text-center">
                <FileUp className="w-10 h-10 mx-auto text-stone-500 mb-3" />
                <p className="font-medium text-stone-800">Drag & drop manuscript file</p>
                <p className="text-sm text-stone-500 mt-1">Accepts .pdf, .docx, .doc, and .txt</p>
                <Label
                  htmlFor="file-input"
                  className="inline-flex mt-4 cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
                >
                  Browse files
                </Label>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                />
                {isParsing && (
                  <div className="mt-3 inline-flex items-center gap-2 text-sm text-stone-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing manuscript...
                  </div>
                )}
              </div>
            </div>

            {hasUploadedFile && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileUp className="w-5 h-5 text-stone-500 shrink-0" />
                  <div>
                    <p className="font-medium text-stone-800 truncate">{uploadedFileName}</p>
                    <p className="text-sm text-stone-500">
                      {wordCount.toLocaleString()} words loaded
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearFile}
                  className="text-stone-500 hover:text-stone-800"
                  title="Remove file link"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="invite-reviewers" className="text-stone-700">
                Invite Reviewers
              </Label>
              <div className="flex gap-2">
                <Input
                  id="invite-reviewers"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addReviewer();
                    }
                  }}
                  placeholder="reviewer@email.com"
                  className="h-11 border-stone-300"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-stone-300"
                  onClick={addReviewer}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-6">
                {invitedReviewers.map((email) => (
                  <div key={email} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700">
                    <Users className="w-3 h-3" />
                    {email}
                    <button
                      type="button"
                      onClick={() => removeReviewer(email)}
                      className="text-stone-400 hover:text-stone-700"
                      aria-label={`Remove ${email}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                Manuscript Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="Paste your manuscript text here, or upload a file above..."
                className="min-h-[320px] font-serif text-base leading-relaxed border-stone-300 bg-white"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isParsing}
                required
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-stone-500">{wordCount.toLocaleString()} words</p>
                <p className="text-xs text-stone-500">{invitedReviewers.length} reviewer(s) invited</p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t border-stone-100 pt-6">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => navigate("/dashboard")}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="h-11 rounded-xl bg-stone-900 text-white hover:bg-stone-800 px-8"
              disabled={isUploading || isParsing}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Create Manuscript
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}