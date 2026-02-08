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
import { Upload, FileUp, Loader2, X } from "lucide-react";
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
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Track whether content came from file or manual entry
  const isFileMode = uploadedFileName !== "";
  const isTextMode = content.trim().length > 0 && !isFileMode;

  // --- PDF PROCESSING ---
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

  // --- DOCX PROCESSING ---
  const processDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  // --- FILE PROCESSING LOGIC ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    
    // Auto-fill title from filename if empty
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    setUploadedFileName(file.name);

    try {
      let extractedText = "";

      if (file.type === "application/pdf") {
        console.log("Processing PDF...");
        extractedText = await processPDF(file);
        toast({ title: "PDF processed successfully" });
      } 
      else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword"
      ) {
        console.log("Processing DOCX/DOC...");
        extractedText = await processDOCX(file);
        toast({ title: "Document processed successfully" });
      } 
      else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        console.log("Processing TXT...");
        extractedText = await file.text();
        toast({ title: "Text file loaded successfully" });
      }
      else {
        throw new Error("Unsupported file type");
      }

      if (!extractedText.trim()) {
        throw new Error("No text could be extracted from the file");
      }

      setContent(extractedText);

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

  // Clear uploaded file - allows switching to text mode
  const handleClearFile = () => {
    setContent("");
    setUploadedFileName("");
    setTitle("");
  };

  // --- VALIDATION ---
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
        description: "Please upload a file or paste your text.",
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  // --- DATABASE SYNC LOGIC ---
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
        status: "draft"
      });

      toast({ 
        title: "Upload successful!", 
        description: "Your manuscript is ready for workshopping." 
      });

      // Refresh the pieces list in the app
      if (onRefresh) {
        await onRefresh();
      }
      
      // Navigate to workshop
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
    <div className="max-w-4xl mx-auto py-10 px-4">
      <Card className="border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-stone-900">Upload Manuscript</CardTitle>
          <CardDescription>
            {isFileMode 
              ? "File uploaded. Review the extracted text below or clear to start over."
              : "Upload a file (PDF, DOCX, DOC, or TXT) OR paste your text below."
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-6">
            
            {/* File Upload Area */}
            {isFileMode ? (
              // FILE UPLOADED - Show file info with clear button
              <div className="p-6 border-2 border-green-200 rounded-lg bg-green-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileUp className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">{uploadedFileName}</p>
                    <p className="text-sm text-green-700">
                      {wordCount.toLocaleString()} words extracted
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearFile}
                  className="text-green-700 hover:text-green-900 hover:bg-green-100"
                  title="Clear file and start over"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              // NO FILE - Show upload area (disabled if text entered)
              <div className={`p-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-4 transition-all ${
                isTextMode 
                  ? 'border-stone-100 bg-stone-50 opacity-50 cursor-not-allowed' 
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
              }`}>
                <FileUp className={`w-10 h-10 ${isTextMode ? 'text-stone-300' : 'text-stone-400'}`} />
                <div className="text-center">
                  <Label 
                    htmlFor="file-input" 
                    className={`text-lg font-medium ${
                      isTextMode 
                        ? 'text-stone-400 cursor-not-allowed' 
                        : 'cursor-pointer text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    Click to choose a file
                  </Label>
                  <p className="text-sm text-stone-500 mt-1">
                    Accepts PDF, DOCX, DOC, or TXT files
                  </p>
                  {isTextMode && (
                    <p className="text-xs text-stone-500 mt-2 font-medium">
                      Clear text below to upload a file instead
                    </p>
                  )}
                </div>
                <input 
                  id="file-input" 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  disabled={isTextMode}
                />
                {isParsing && (
                  <div className="flex items-center gap-2 text-sm text-stone-600 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin"/> Extracting text from file...
                  </div>
                )}
              </div>
            )}

            {/* Title and Genre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Manuscript Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., The Midnight Library"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Genre (Optional)</Label>
                <Input
                  id="genre"
                  placeholder="e.g., Literary Fiction"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                />
              </div>
            </div>

            {/* Text Area - DISABLED if file uploaded, EDITABLE otherwise */}
            <div className="space-y-2">
              <Label htmlFor="content">
                Manuscript Text <span className="text-red-500">*</span>
                {isFileMode && (
                  <span className="text-xs text-green-600 ml-2 font-normal">
                    ✓ Text extracted from file
                  </span>
                )}
              </Label>
              <Textarea
                id="content"
                placeholder={isFileMode 
                  ? "" 
                  : "Paste your text here, or upload a file above..."
                }
                className={`min-h-[400px] font-serif text-base leading-relaxed ${
                  isFileMode 
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed opacity-60' 
                    : 'bg-white'
                }`}
                value={isFileMode ? "" : content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isFileMode || isParsing}
                required={!isFileMode}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-stone-500">
                  {isFileMode ? `${wordCount.toLocaleString()} words in uploaded file` : `${wordCount.toLocaleString()} words`}
                </p>
                {isFileMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFile}
                    className="text-xs text-stone-500 hover:text-stone-700"
                  >
                    Clear file to enter text manually instead
                  </Button>
                )}
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
              className="bg-black text-white hover:bg-stone-800 px-8"
              disabled={isUploading || isParsing || !title.trim() || !content.trim()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Workshop
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}