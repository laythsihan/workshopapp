import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
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
import { Upload, FileUp, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Note: If you use Mammoth or PDF.js, ensure they are installed 
// and imported here to handle the file processing logic.

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // --- FILE PROCESSING LOGIC ---
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));

    try {
      if (file.type === "application/pdf") {
        // Your PDF parsing logic (e.g., PDF.js) goes here
        console.log("Processing PDF...");
        // Example: const text = await parsePDF(file); setContent(text);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        // Your DOCX parsing logic (e.g., Mammoth.js) goes here
        console.log("Processing DOCX...");
      } else {
        const text = await file.text();
        setContent(text);
      }
      toast({ title: "File processed successfully" });
    } catch (error) {
      toast({ 
        title: "Processing error", 
        description: "Could not extract text from file.", 
        variant: "destructive" 
      });
    } finally {
      setIsParsing(false);
    }
  };

  // --- DATABASE SYNC LOGIC ---
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!content.trim() || !title.trim()) {
      toast({ title: "Error", description: "Title and content are required." });
      return;
    }

    setIsUploading(true);

    try {
      // 1. Create the Piece entry (The main record)
      const { data: piece, error: pieceError } = await supabase
        .from("pieces")
        .insert([
          {
            owner_id: user.id,
            title: title.trim(),
            content: content.trim(), // Primary storage for the editor
            status: "draft",
            genre: genre.trim(),
          },
        ])
        .select()
        .single();

      if (pieceError) throw pieceError;

      // 2. Create the Initial Version (The record the Workshop reads)
      const { error: versionError } = await supabase
        .from("versions")
        .insert([
          {
            piece_id: piece.id,
            author_id: user.id,
            content: content.trim(),
            version_label: "Original Upload",
          },
        ]);

      if (versionError) throw versionError;

      toast({ title: "Upload Successful", description: "Taking you to the workshop..." });
      
      // Redirect to the newly created piece
      navigate(`/workshop?piece=${piece.id}`);

    } catch (error) {
      console.error("Upload error:", error);
      toast({ 
        title: "Upload Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <Card className="border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-stone-900">Upload Manuscript</CardTitle>
          <CardDescription>
            Import a file or paste your text to start your workshop session.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-6">
            
            {/* File Dropzone Area */}
            <div className="p-10 border-2 border-dashed border-stone-200 rounded-lg bg-stone-50/50 flex flex-col items-center justify-center gap-4 transition-colors hover:bg-stone-50">
              <FileUp className="w-10 h-10 text-stone-400" />
              <div className="text-center">
                <Label htmlFor="file-input" className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium text-lg">
                  Click to choose a file
                </Label>
                <p className="text-sm text-stone-500 mt-1">Accepts PDF, DOCX, or TXT</p>
              </div>
              <input 
                id="file-input" 
                type="file" 
                className="hidden" 
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
              />
              {isParsing && (
                <div className="flex items-center gap-2 text-sm text-stone-600 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin"/> Extracting text...
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Manuscript Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., The Midnight Library"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Input
                  id="genre"
                  placeholder="e.g., Literary Fiction"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Text Preview</Label>
              <Textarea
                id="content"
                placeholder="The extracted text will appear here. You can also paste directly..."
                className="min-h-[400px] font-serif text-base leading-relaxed bg-white"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
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