import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Type, File, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import FileUploadDropzone from "../components/upload/FileUploadDropzone";

// Parsing Libraries
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Set up PDF.js worker (required)
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function UploadPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMethod, setUploadMethod] = useState("text"); 
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    genre: "",
    content: "",
    file: null,
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) navigate("/login");
      else setUser(authUser);
    };
    checkUser();
  }, [navigate]);

  // --- HELPER: EXTRACTION LOGIC ---
  const readTextFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (extension === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } 
    
    if (extension === 'pdf') {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(" ") + "\n";
      }
      return fullText;
    }

    // Default for TXT, MD, RTF
    return await file.text();
  };

  const handleFileUpload = (file) => {
    setFormData(prev => ({
      ...prev,
      title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
      file: file,
      content: "" 
    }));
    toast({ title: "File Ready", description: `${file.name} attached.` });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalContent = formData.content;

      if (formData.file) {
        finalContent = await readTextFromFile(formData.file);
      }

      // Final sanitization to prevent unicode escape errors
      finalContent = finalContent.replace(/\\u/g, 'u').normalize('NFC');

      if (!formData.title || !finalContent || !user) {
        throw new Error("Title and content are required.");
      }

      const { data: piece, error: pieceError } = await supabase
        .from('pieces')
        .insert([{ owner_id: user.id, title: formData.title }])
        .select().single();

      if (pieceError) throw pieceError;

      const { error: versionError } = await supabase
        .from('versions')
        .insert([{
          piece_id: piece.id,
          author_id: user.id,
          content: finalContent,
          version_label: "Original Draft"
        }]);

      if (versionError) throw versionError;

      navigate(`/workshop?piece=${piece.id}`);
    } catch (error) {
      console.error(error);
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/30 p-4 sm:p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-stone-800 font-serif">New Piece</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-stone-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 font-serif text-stone-700">
                <FileText className="w-5 h-5 text-stone-400" /> Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Genre</Label>
                <Input value={formData.genre} onChange={(e) => setFormData({...formData, genre: e.target.value})} placeholder="Fiction, Poetry..." />
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-stone-50/50 border-b border-stone-100">
              <div className="flex gap-2">
                <Button type="button" variant={uploadMethod === "text" ? "default" : "ghost"} onClick={() => setUploadMethod("text")}>
                  <Type className="w-4 h-4 mr-2" /> Editor
                </Button>
                <Button type="button" variant={uploadMethod === "file" ? "default" : "ghost"} onClick={() => setUploadMethod("file")}>
                  <File className="w-4 h-4 mr-2" /> Upload File
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {uploadMethod === "text" ? (
                <Textarea 
                  value={formData.content} 
                  onChange={(e) => setFormData({...formData, content: e.target.value})} 
                  placeholder="Paste your story here..." 
                  className="min-h-[450px] border-none focus-visible:ring-0 p-8 text-lg font-serif" 
                />
              ) : (
                <div className="p-12 space-y-6">
                  <FileUploadDropzone onFileUpload={handleFileUpload} />
                  {formData.file && (
                    <div className="flex items-center p-4 bg-stone-50 rounded-lg border border-stone-200">
                      <File className="w-6 h-6 text-stone-400 mr-4" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{formData.file.name}</p>
                        <p className="text-xs text-stone-500 uppercase">{formData.file.type || 'Document'}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, file: null})}>
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting} className="bg-stone-900 text-white px-12 h-12">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Start Workshop"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
