// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import DebateInterface from "../debate-interface";

// Mock scrollIntoView (not available in jsdom)
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

// Mock react-markdown (used by DebateMessage)
vi.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
vi.mock("remark-gfm", () => ({ __esModule: true, default: () => {} }));

// Mock ScrollArea to render children directly
vi.mock("@/components/ui/scroll-area", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ScrollArea: ({ children }: any) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

const defaultProps = {
  debateId: "debate-1",
  topic: "O futuro da IA",
  participants: [
    { mindSlug: "socrates", mindName: "Socrates" },
    { mindSlug: "aristoteles", mindName: "Aristoteles" },
  ],
  initialStatus: "active" as const,
  initialMessages: [],
  maxRounds: 3,
  currentTurn: 0,
};

describe("DebateInterface a11y", () => {
  it("message container has role='log'", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const log = container.querySelector('[role="log"]');
    expect(log).toBeInTheDocument();
  });

  it("message container has aria-label", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const log = container.querySelector('[role="log"]');
    expect(log).toHaveAttribute("aria-label", "Debate entre mentes");
  });

  it("message container has aria-relevant='additions'", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const log = container.querySelector('[role="log"]');
    expect(log).toHaveAttribute("aria-relevant", "additions");
  });

  it("status announcements have aria-live='polite'", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
  });

  it("controls toolbar has role='toolbar'", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar).toBeInTheDocument();
  });

  it("controls toolbar has aria-label", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const toolbar = container.querySelector('[role="toolbar"]');
    expect(toolbar).toHaveAttribute("aria-label", "Controles do debate");
  });

  it("next turn button has descriptive aria-label with mind name", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const nextBtn = container.querySelector('button[aria-label*="Proximo turno"]');
    expect(nextBtn).toBeInTheDocument();
    expect(nextBtn!.getAttribute("aria-label")).toContain("Socrates");
  });

  it("intervir button has aria-expanded", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const interjectBtn = container.querySelector('button[aria-expanded]');
    expect(interjectBtn).toBeInTheDocument();
    expect(interjectBtn).toHaveAttribute("aria-expanded", "false");
    expect(interjectBtn!.textContent).toBe("Intervir");
  });

  it("pause button has aria-label", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const pauseBtn = container.querySelector('button[aria-label="Pausar debate"]');
    expect(pauseBtn).toBeInTheDocument();
  });

  it("end button has aria-label", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const endBtn = container.querySelector('button[aria-label="Encerrar debate"]');
    expect(endBtn).toBeInTheDocument();
  });

  it("participants section has accessible list structure", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const list = container.querySelector('[role="list"]');
    expect(list).toBeInTheDocument();
    const items = container.querySelectorAll('[role="listitem"]');
    expect(items).toHaveLength(2);
  });

  it("round info has aria-label with full context", () => {
    const { container } = render(<DebateInterface {...defaultProps} />);
    const roundInfo = container.querySelector("[aria-label*='Round']");
    expect(roundInfo).toBeInTheDocument();
    expect(roundInfo!.getAttribute("aria-label")).toContain("de 3");
  });
});
