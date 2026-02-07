import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, X, Type } from "lucide-react";
import { motion } from "framer-motion";

export default function TextEditor({ piece, onSave, onCancel }) {
  const [editedContent, setEditedContent] = useState(piece.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedContent);
    } catch (error) {
      console.error("Error saving content:", error);
    }
    setIsSaving(false);
  };

  const calculateWordCount = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto"
    >
      {/* Editor Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <Type className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="literary-heading text-lg font-semibold text-gray-800">Editing Mode</h3>
            <p className="text-sm text-gray-600">Make changes to your story</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="border-amber-300 hover:bg-amber-100"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || editedContent === piece.content}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Title (Read-only in this editor) */}
      <h1 className="literary-heading text-4xl font-bold text-gray-800 mb-8">{piece.title}</h1>
      
      {/* Text Editor */}
      <div className="space-y-4">
        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="literary-text text-lg text-gray-800 leading-loose min-h-[600px] border-amber-200 focus:border-amber-400 focus:ring-amber-400 resize-none"
          placeholder="Start writing your story..."
        />
        
        {/* Word Count */}
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>Word count: {calculateWordCount(editedContent).toLocaleString()}</span>
          {editedContent !== piece.content && (
            <span className="text-amber-600 font-medium">• Unsaved changes</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}