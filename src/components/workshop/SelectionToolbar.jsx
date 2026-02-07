import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Strikethrough } from "lucide-react";

/**
 * Floating toolbar component that appears over highlighted text.
 */
export default function SelectionToolbar({ selection, onAnnotate }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  /**
   * Recalculates toolbar position whenever the selection rectangle changes.
   * Defined at the top level to adhere to the Rules of Hooks.
   */
  useEffect(() => {
    if (selection?.rect) {
      const toolbarWidth = 220;
      const toolbarHeight = 44;
      const margin = 10;

      const top = selection.rect.top - toolbarHeight - margin;
      const left = selection.rect.left + (selection.rect.width / 2) - (toolbarWidth / 2);
      
      setPosition({ top, left });
    }
  }, [selection]);

  if (!selection || !selection.text) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="selection-toolbar"
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        className="absolute z-50 pointer-events-auto"
        style={{ top: position.top, left: position.left }}
      >
        <div className="bg-stone-900 text-white rounded-md border border-stone-700 shadow-xl flex items-center p-1" style={{ width: '220px' }}>
          <Button 
            variant="ghost" 
            onClick={() => onAnnotate({ 
              selected_text: selection.text, 
              position_start: selection.start, 
              position_end: selection.end, 
              comment_type: 'highlight' 
            })} 
            className="text-white hover:bg-white/10 flex-1 h-8 text-xs"
          >
            <ThumbsUp className="w-3.5 h-3.5 mr-2"/> Highlight
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onAnnotate({ 
              selected_text: selection.text, 
              position_start: selection.start, 
              position_end: selection.end, 
              comment_type: 'strikethrough' 
            })} 
            className="text-white hover:bg-white/10 flex-1 h-8 text-xs"
          >
            <Strikethrough className="w-3.5 h-3.5 mr-2"/> Strike
          </Button>
        </div>
        <div className="w-2 h-2 bg-stone-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b border-stone-700" />
      </motion.div>
    </AnimatePresence>
  );
}