import React, { useMemo } from "react";

const TextRenderer = ({ content, comments = [], activeCommentId, onCommentClick }) => {
  if (!content) return <div className="animate-pulse h-64 bg-stone-100 rounded" />;

  const renderedContent = useMemo(() => {
    if (!comments || comments.length === 0) return content;

    // 1. Sort comments by their start position to process text in order
    const sortedComments = [...comments].sort((a, b) => a.position_start - b.position_start);

    const elements = [];
    let lastIndex = 0;

    sortedComments.forEach((comment, index) => {
      const start = comment.position_start;
      const end = comment.position_end;

      // Only process if positions are valid and don't overlap with the previous highlight
      if (start >= lastIndex && start < end && end <= content.length) {
        // Add plain text before the highlight
        if (start > lastIndex) {
          elements.push(content.substring(lastIndex, start));
        }

        // Add the highlighted text
        const isSelected = activeCommentId === comment.id;
        elements.push(
          <span
            key={`comment-${comment.id}-${index}`}
            onClick={() => onCommentClick?.(comment.id)}
            className={`cursor-pointer transition-colors duration-200 border-b-2 ${
              isSelected 
                ? "bg-yellow-200 border-yellow-400 text-stone-900" 
                : "bg-yellow-100/50 border-yellow-200 hover:bg-yellow-200"
            }`}
            title={comment.comment_text}
          >
            {content.substring(start, end)}
          </span>
        );
        lastIndex = end;
      }
    });

    // Add any remaining text after the last highlight
    if (lastIndex < content.length) {
      elements.push(content.substring(lastIndex));
    }

    return elements;
  }, [content, comments, activeCommentId, onCommentClick]);

  return (
    <div className="prose prose-stone max-w-none">
      <div className="whitespace-pre-wrap text-lg leading-relaxed text-stone-800 font-serif">
        {renderedContent}
      </div>
    </div>
  );
};

export default TextRenderer;