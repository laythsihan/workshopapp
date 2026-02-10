import React, { useMemo } from "react";

const TextRenderer = ({ content, comments = [], activeCommentId, onCommentClick, draftAnnotation }) => {
  if (!content) return <div className="animate-pulse h-64 bg-stone-100 rounded" />;

  const renderedContent = useMemo(() => {
    const anchoredComments = (comments || []).filter(
      (comment) =>
        Number.isInteger(comment.position_start) &&
        Number.isInteger(comment.position_end) &&
        comment.position_start >= 0 &&
        comment.position_end > comment.position_start
    );

    if (
      draftAnnotation &&
      Number.isInteger(draftAnnotation.position_start) &&
      Number.isInteger(draftAnnotation.position_end) &&
      draftAnnotation.position_start >= 0 &&
      draftAnnotation.position_end > draftAnnotation.position_start
    ) {
      anchoredComments.push({
        id: "__draft__",
        is_draft: true,
        content: "",
        selected_text: draftAnnotation.selected_text,
        position_start: draftAnnotation.position_start,
        position_end: draftAnnotation.position_end,
      });
    }

    if (anchoredComments.length === 0) return content;

    // Process text from left-to-right, preferring earlier starts.
    const sortedComments = [...anchoredComments].sort((a, b) => {
      if (a.position_start !== b.position_start) {
        return a.position_start - b.position_start;
      }
      return a.position_end - b.position_end;
    });

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
        const isDraft = comment.is_draft;
        const isSelected = activeCommentId === comment.id;
        const isResolved = comment.is_resolved;

        elements.push(
          <span
            key={`comment-${comment.id}-${index}`}
            onClick={() => !isDraft && onCommentClick?.(comment.id)}
            className={`transition-colors duration-200 border-b-2 ${
              isDraft
                ? "bg-blue-100/80 border-blue-300 text-stone-900"
                : isSelected
                  ? "cursor-pointer bg-amber-200 border-amber-400 text-stone-900"
                  : isResolved
                    ? "cursor-pointer bg-amber-100/20 border-amber-200/40 text-stone-700 opacity-50 hover:opacity-80"
                    : "cursor-pointer bg-amber-100/35 border-amber-200/60 hover:bg-amber-100/70"
            }`}
            title={isDraft ? "Draft comment highlight" : comment.content}
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
  }, [content, comments, activeCommentId, onCommentClick, draftAnnotation]);

  return (
    <div className="prose prose-stone max-w-none">
      <div data-manuscript-root="true" className="whitespace-pre-wrap text-lg leading-relaxed text-stone-800 font-serif">
        {renderedContent}
      </div>
    </div>
  );
};

export default TextRenderer;