import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, File, Loader2 } from "lucide-react";

export default function FileUploadDropzone({ onFileUpload, isProcessing }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.type === 'text/plain' || 
      file.type === 'application/pdf' || 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.md') ||
      file.name.endsWith('.rtf') ||
      file.name.endsWith('.doc') ||
      file.name.endsWith('.docx')
    );
    
    if (validFile) {
      onFileUpload(validFile);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
        isDragOver 
          ? 'border-amber-400 bg-amber-50' 
          : 'border-amber-200 hover:border-amber-300 bg-white'
      } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept=".txt,.md,.rtf,.doc,.docx,.pdf"
        className="hidden"
      />
      
      {isProcessing ? (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 text-amber-600 mx-auto animate-spin" />
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Processing File</h3>
            <p className="text-sm text-gray-500 mt-1">Extracting text content...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Upload Your Writing
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop your file here, or click to browse
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleBrowseClick}
              className="border-amber-200 hover:bg-amber-50"
            >
              <File className="w-4 h-4 mr-2" />
              Browse Files
            </Button>
          </div>
          <div className="text-xs text-gray-400">
            Supported formats: TXT, MD, RTF, DOC, DOCX, PDF
          </div>
        </div>
      )}
    </div>
  );
}