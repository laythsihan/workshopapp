import React from "react";
import { render, screen } from "@testing-library/react";
import CommentCard from "./CommentCard";

vi.mock("../../api/entities", () => ({
  Comment: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    resolve: vi.fn(),
    unresolve: vi.fn(),
  },
}));

vi.mock("../user/UserProfileCard", () => ({
  default: () => <div data-testid="user-profile-card">User profile</div>,
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const basePiece = {
  id: "piece-1",
  owner_id: "owner-1",
};

const baseComment = {
  id: "comment-1",
  author_id: "reviewer-1",
  content: "I think this opening line is very strong.",
  selection_json: { text: "Opening line", start: 0, end: 12, type: "highlight" },
  created_at: "2026-02-10T10:00:00.000Z",
  is_resolved: false,
  parent_comment_id: null,
};

describe("CommentCard", () => {
  it("shows quoted selected text context", () => {
    render(
      <CommentCard
        piece={basePiece}
        comment={baseComment}
        replies={[]}
        currentUser={{ id: "owner-1" }}
        onCommentUpdate={vi.fn()}
        isActive={false}
        onClick={vi.fn()}
        canParticipate={true}
        isCompleted={false}
      />
    );

    expect(screen.getByText(/"Opening line"/i)).toBeInTheDocument();
    expect(screen.getByText(/I think this opening line is very strong\./i)).toBeInTheDocument();
  });

  it("shows reply input when thread is open and participant can reply", () => {
    render(
      <CommentCard
        piece={basePiece}
        comment={baseComment}
        replies={[]}
        currentUser={{ id: "owner-1" }}
        onCommentUpdate={vi.fn()}
        isActive={false}
        onClick={vi.fn()}
        canParticipate={true}
        isCompleted={false}
      />
    );

    expect(screen.getByPlaceholderText(/reply\.\.\./i)).toBeInTheDocument();
  });

  it("hides reply input when thread is resolved", () => {
    render(
      <CommentCard
        piece={basePiece}
        comment={{ ...baseComment, is_resolved: true }}
        replies={[]}
        currentUser={{ id: "owner-1" }}
        onCommentUpdate={vi.fn()}
        isActive={false}
        onClick={vi.fn()}
        canParticipate={true}
        isCompleted={false}
      />
    );

    expect(screen.queryByPlaceholderText(/reply\.\.\./i)).not.toBeInTheDocument();
    expect(screen.getByText(/resolved/i)).toBeInTheDocument();
  });
});
