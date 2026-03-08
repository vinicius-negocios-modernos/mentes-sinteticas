// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SharePopover from "../share-popover";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock haptics
vi.mock("@/lib/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

// Mock Radix Dialog to avoid portal duplication issues in jsdom
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("SharePopover a11y", () => {
  const defaultProps = {
    conversationId: "test-conv-123",
    isShared: false,
    shareToken: null,
    onShareChange: vi.fn(),
  };

  it("share button has aria-label", () => {
    const { container } = render(<SharePopover {...defaultProps} />);
    const btn = container.querySelector('button[aria-label="Compartilhar conversa"]');
    expect(btn).toBeInTheDocument();
  });

  it("share button icon has aria-hidden='true'", () => {
    const { container } = render(<SharePopover {...defaultProps} />);
    const svg = container.querySelector("button svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("share button has no aria-expanded when not shared", () => {
    const { container } = render(<SharePopover {...defaultProps} />);
    const btn = container.querySelector('button[aria-label="Compartilhar conversa"]');
    expect(btn).not.toHaveAttribute("aria-expanded");
  });

  it("share button has no aria-haspopup when not shared", () => {
    const { container } = render(<SharePopover {...defaultProps} />);
    const btn = container.querySelector('button[aria-label="Compartilhar conversa"]');
    expect(btn).not.toHaveAttribute("aria-haspopup");
  });

  it("share button has aria-haspopup='menu' when shared", () => {
    const { container } = render(
      <SharePopover
        {...defaultProps}
        isShared={true}
        shareToken="abc123"
      />
    );
    const btn = container.querySelector('button[aria-label="Compartilhar conversa"]');
    expect(btn).toHaveAttribute("aria-haspopup", "menu");
  });

  it("share button has aria-expanded='false' when shared but menu closed", () => {
    const { container } = render(
      <SharePopover
        {...defaultProps}
        isShared={true}
        shareToken="abc123"
      />
    );
    const btn = container.querySelector('button[aria-label="Compartilhar conversa"]');
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("menu items have role='menuitem' when menu is open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SharePopover
        {...defaultProps}
        isShared={true}
        shareToken="abc123"
      />
    );

    // Click to open menu
    const btn = container.querySelector('button[aria-label="Compartilhar conversa"]')!;
    await user.click(btn);

    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems.length).toBeGreaterThanOrEqual(2);
  });

  it("menu has role='menu' when open", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SharePopover
        {...defaultProps}
        isShared={true}
        shareToken="abc123"
      />
    );

    const btn = container.querySelector('button[aria-label="Compartilhar conversa"]')!;
    await user.click(btn);

    const menu = container.querySelector('[role="menu"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute("aria-label");
  });

  it("aria-live region exists for status announcements", () => {
    const { container } = render(<SharePopover {...defaultProps} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("shared indicator dot is aria-hidden with sr-only text", () => {
    const { container } = render(
      <SharePopover
        {...defaultProps}
        isShared={true}
        shareToken="abc123"
      />
    );
    // The green dot should be aria-hidden
    const dot = container.querySelector(".bg-green-500");
    expect(dot).toHaveAttribute("aria-hidden", "true");
    // sr-only text should exist nearby
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).toBeInTheDocument();
  });
});
