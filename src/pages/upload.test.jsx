import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadPage from "./upload";

const mockNavigate = vi.fn();
const mockCreatePiece = vi.fn();
const mockToast = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/api/entities", () => ({
  Piece: {
    create: (...args) => mockCreatePiece(...args),
  },
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

vi.mock("pdfjs-dist", () => ({
  version: "4.0.0",
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
}));

const renderUpload = (props = {}) =>
  render(
    <MemoryRouter>
      <UploadPage onRefresh={vi.fn()} {...props} />
    </MemoryRouter>
  );

describe("Upload page", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockCreatePiece.mockReset();
    mockToast.mockReset();
    mockCreatePiece.mockResolvedValue({ id: "piece-42" });
  });

  it("adds and removes invited reviewer emails", async () => {
    const user = userEvent.setup();
    renderUpload();

    const inviteInput = screen.getByLabelText(/invite reviewers/i);
    await user.type(inviteInput, "reader@example.com");
    await user.click(screen.getByRole("button", { name: /add/i }));

    expect(screen.getByText("reader@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove reader@example\.com/i }));
    expect(screen.queryByText("reader@example.com")).not.toBeInTheDocument();
  });

  it("submits manuscript with invited reviewers", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    renderUpload({ onRefresh });

    await user.type(screen.getByLabelText(/^title/i), "A Bright Winter");
    await user.type(screen.getByLabelText(/genre/i), "Memoir");
    await user.type(screen.getByLabelText(/manuscript text/i), "This is a workshop manuscript.");

    const inviteInput = screen.getByLabelText(/invite reviewers/i);
    await user.type(inviteInput, "reviewer@example.com");
    await user.click(screen.getByRole("button", { name: /add/i }));

    await user.click(screen.getByRole("button", { name: /create manuscript/i }));

    await waitFor(() => {
      expect(mockCreatePiece).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "A Bright Winter",
          genre: "Memoir",
          content: "This is a workshop manuscript.",
          collaborators: ["reviewer@example.com"],
        })
      );
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/workshop?piece=piece-42");
  });
});
