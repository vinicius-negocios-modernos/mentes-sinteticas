// @vitest-environment jsdom
/**
 * SYS-9 (TD-5.5) — BEHAVIOR / LOGIC tests for DebateInterface.
 *
 * Complements the existing a11y suite (debate-interface-a11y.test.tsx) by
 * exercising the observable STATE logic of the debate:
 *  - turn/round progression display derived from `currentTurn`
 *  - participants rendering (the participant pill list)
 *  - status transitions (active → paused → completed) driving control visibility
 *  - current-turn highlighting (next-turn aria-label names the mind whose turn it is)
 *  - max-rounds clamping (round display never exceeds maxRounds; totalTurns math)
 *
 * The streaming/network path (handleNextTurn fetch + reader) is NOT refactored
 * here; control side-effects are mocked at their seams (fetch, sonner, router)
 * consistently with the sibling a11y test.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import DebateInterface from "../debate-interface";
import type { DebateParticipantInfo, DebateStatus } from "@/lib/types";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
vi.mock("remark-gfm", () => ({ __esModule: true, default: () => {} }));

vi.mock("@/components/ui/scroll-area", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ScrollArea: ({ children }: any) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

// Realistic DebateParticipantInfo fixtures (mindId/mindName/mindSlug/turnOrder).
const participants: DebateParticipantInfo[] = [
  { mindId: "1", mindSlug: "socrates", mindName: "Socrates", turnOrder: 0 },
  { mindId: "2", mindSlug: "aristoteles", mindName: "Aristoteles", turnOrder: 1 },
];

function renderDebate(
  overrides: Partial<React.ComponentProps<typeof DebateInterface>> = {}
) {
  const props: React.ComponentProps<typeof DebateInterface> = {
    debateId: "debate-1",
    topic: "O futuro da IA",
    participants,
    initialStatus: "active" as DebateStatus,
    initialMessages: [],
    maxRounds: 3,
    currentTurn: 0,
    ...overrides,
  };
  return render(<DebateInterface {...props} />);
}

describe("DebateInterface — behavior/logic (SYS-9)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // --- Participants rendering ---

  it("renders one pill per participant with the mind name", () => {
    renderDebate();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(screen.getByText("Socrates")).toBeInTheDocument();
    expect(screen.getByText("Aristoteles")).toBeInTheDocument();
  });

  it("renders the debate topic as the heading", () => {
    renderDebate({ topic: "Etica das maquinas" });
    expect(
      screen.getByRole("heading", { name: "Etica das maquinas" })
    ).toBeInTheDocument();
  });

  // --- Turn / round progression display ---

  it("shows round 1 and turn 0 at the start of the debate", () => {
    renderDebate({ currentTurn: 0 });
    // totalTurns = participants.length (2) * maxRounds (3) = 6
    expect(screen.getByText(/Round 1\/3/)).toBeInTheDocument();
    expect(screen.getByText(/Turno 0\/6/)).toBeInTheDocument();
  });

  it("derives the round from currentTurn (turn 2 → round 2 with 2 participants)", () => {
    // floor(2 / 2) + 1 = round 2
    renderDebate({ currentTurn: 2 });
    expect(screen.getByText(/Round 2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/Turno 2\/6/)).toBeInTheDocument();
  });

  it("clamps the displayed round to maxRounds even when currentTurn overshoots", () => {
    // floor(10 / 2) + 1 = 6, but maxRounds = 3 → clamped to 3
    renderDebate({ currentTurn: 10, maxRounds: 3 });
    expect(screen.getByText(/Round 3\/3/)).toBeInTheDocument();
  });

  it("computes totalTurns as participants × maxRounds", () => {
    renderDebate({ maxRounds: 4 }); // 2 × 4 = 8
    expect(screen.getByText(/Turno 0\/8/)).toBeInTheDocument();
  });

  // --- Current-turn highlighting ---

  it("names the current mind (turn 0 → Socrates) in the next-turn aria-label", () => {
    renderDebate({ currentTurn: 0 });
    const nextBtn = screen.getByRole("button", { name: /Proximo turno/i });
    expect(nextBtn.getAttribute("aria-label")).toContain("Socrates");
  });

  it("advances current-mind highlighting to the next participant (turn 1 → Aristoteles)", () => {
    renderDebate({ currentTurn: 1 });
    const nextBtn = screen.getByRole("button", { name: /Proximo turno/i });
    expect(nextBtn.getAttribute("aria-label")).toContain("Aristoteles");
  });

  it("wraps current-mind highlighting around participants (turn 2 → Socrates again)", () => {
    // 2 % 2 === 0 → back to Socrates
    renderDebate({ currentTurn: 2 });
    const nextBtn = screen.getByRole("button", { name: /Proximo turno/i });
    expect(nextBtn.getAttribute("aria-label")).toContain("Socrates");
  });

  // --- Status transitions: active ---

  it("shows the active controls (next turn / intervir / pausar / encerrar) when active", () => {
    renderDebate({ initialStatus: "active" });
    expect(
      screen.getByRole("button", { name: /Proximo turno/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar debate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encerrar debate" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Criar novo debate" })
    ).not.toBeInTheDocument();
  });

  it("renders the start hint in the log when there are no messages", () => {
    renderDebate();
    expect(
      screen.getByText(/Clique em .* para iniciar o debate/i)
    ).toBeInTheDocument();
  });

  it("renders existing messages instead of the start hint", () => {
    renderDebate({
      initialMessages: [
        {
          role: "model",
          text: "Penso, logo existo",
          mindName: "Socrates",
          mindSlug: "socrates",
          turnNumber: 1,
        },
      ],
    });
    expect(screen.getByText("Penso, logo existo")).toBeInTheDocument();
    expect(
      screen.queryByText(/Clique em .* para iniciar o debate/i)
    ).not.toBeInTheDocument();
  });

  // --- Status transitions: paused ---

  it("shows the resume control and disables next-turn when paused", () => {
    renderDebate({ initialStatus: "paused" });
    expect(screen.getByRole("button", { name: "Retomar debate" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pausar debate" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Proximo turno/i })).toBeDisabled();
  });

  it("annotates the round info with the paused state", () => {
    const { container } = renderDebate({ initialStatus: "paused" });
    const roundInfo = container.querySelector("[aria-label*='Round']");
    expect(roundInfo!.getAttribute("aria-label")).toContain("Debate pausado");
    expect(screen.getByText(/Debate pausado/)).toBeInTheDocument();
  });

  // --- Status transitions: completed ---

  it("hides the active controls and shows 'Novo Debate' when completed", () => {
    renderDebate({ initialStatus: "completed" });
    expect(
      screen.getByRole("button", { name: "Criar novo debate" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Proximo turno/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Encerrar debate" })
    ).not.toBeInTheDocument();
  });

  it("annotates the round info with the finished state when completed", () => {
    const { container } = renderDebate({ initialStatus: "completed" });
    const roundInfo = container.querySelector("[aria-label*='Round']");
    expect(roundInfo!.getAttribute("aria-label")).toContain("Debate encerrado");
    expect(screen.getByText(/Debate encerrado/)).toBeInTheDocument();
  });

  // --- Empty participants edge case (no crash) ---

  it("handles an empty participants list without rendering pills or crashing", () => {
    renderDebate({ participants: [] });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: /Proximo turno/i })
    ).toBeInTheDocument();
  });
});
