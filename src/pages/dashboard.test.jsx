import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import Dashboard from "./dashboard";

const renderDashboard = (props = {}) =>
  render(
    <MemoryRouter>
      <Dashboard pieces={[]} isLoading={false} onRefresh={vi.fn()} {...props} />
    </MemoryRouter>
  );

describe("Dashboard page", () => {
  it("renders empty state when there are no pieces", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: "No manuscripts yet" })).toBeInTheDocument();
    expect(
      screen.getByText("Upload your first piece to start getting feedback.")
    ).toBeInTheDocument();
  });

  it("renders manuscript cards when pieces exist", () => {
    renderDashboard({
      pieces: [
        {
          id: "piece-1",
          title: "A Long Quiet Summer",
          status: "draft",
          created_at: "2026-02-10T00:00:00.000Z",
          isInvited: false,
        },
      ],
    });

    expect(screen.getByRole("heading", { name: "A Long Quiet Summer" })).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open/i })).toBeInTheDocument();
  });
});
