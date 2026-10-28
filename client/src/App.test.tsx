import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LinkVault entry flow", () => {
  it("shows the landing page and navigates to account creation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })));
    render(<App />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Short links/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(await screen.findByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });
});
