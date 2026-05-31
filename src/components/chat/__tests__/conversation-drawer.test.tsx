// @vitest-environment jsdom
/**
 * SYS-9 (TD-5.5) — BEHAVIOR / LOGIC tests for ConversationDrawer + ConversationList.
 *
 * ConversationDrawer owns the open/close state of the mobile Sheet and wraps
 * ConversationList (which owns selection, empty-state, list rendering and
 * active-conversation highlighting). Both are covered here because the drawer's
 * whole purpose is to surface that list — the SYS-9 behaviors named by the
 * assessment (open/close, select, empty-state, list, active highlight) live
 * across the pair.
 *
 * Seams mocked: next/navigation router (push), the deleteConversation server
 * action. No network/contract change.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import ConversationDrawer from "../conversation-drawer";
import ConversationList from "../conversation-list";
import type { Conversation } from "@/db/schema";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const deleteConversationMock = vi.fn();
vi.mock("@/app/actions", () => ({
  deleteConversation: (...args: unknown[]) => deleteConversationMock(...args),
}));

function makeConversation(over: Partial<Conversation> = {}): Conversation {
  return {
    id: "conv-1",
    userId: "user-1",
    mindId: "mind-1",
    title: "Primeira conversa",
    shareToken: null,
    sharedAt: null,
    createdAt: new Date("2026-05-30T10:00:00Z"),
    updatedAt: new Date("2026-05-30T10:00:00Z"),
    ...over,
  } as Conversation;
}

const conversations: Conversation[] = [
  makeConversation({ id: "conv-1", title: "Sobre estoicismo" }),
  makeConversation({ id: "conv-2", title: "Sobre etica" }),
];

describe("ConversationDrawer — open/close (SYS-9)", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    deleteConversationMock.mockReset();
  });
  afterEach(() => cleanup());

  it("is closed by default — list content is not rendered", () => {
    render(
      <ConversationDrawer conversations={conversations} mindId="mind-1" />
    );
    // Trigger is present...
    expect(
      screen.getByRole("button", { name: /Abrir conversas/i })
    ).toBeInTheDocument();
    // ...but the sheet content (conversation titles) is not yet mounted/visible.
    expect(screen.queryByText("Sobre estoicismo")).not.toBeInTheDocument();
  });

  it("opens the drawer and renders the conversation list when the trigger is clicked", async () => {
    render(
      <ConversationDrawer conversations={conversations} mindId="mind-1" />
    );
    fireEvent.click(screen.getByRole("button", { name: /Abrir conversas/i }));

    await waitFor(() =>
      expect(screen.getByText("Sobre estoicismo")).toBeInTheDocument()
    );
    expect(screen.getByText("Sobre etica")).toBeInTheDocument();
    expect(screen.getByText("Conversas")).toBeInTheDocument();
  });

  it("closes the drawer after selecting a conversation (onClick wrapper sets open=false)", async () => {
    render(
      <ConversationDrawer
        conversations={conversations}
        mindId="mind-1"
        activeConversationId="conv-1"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Abrir conversas/i }));
    await waitFor(() =>
      expect(screen.getByText("Sobre etica")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Sobre etica"));

    // Selecting routes to the conversation...
    expect(pushMock).toHaveBeenCalledWith(
      "/chat/mind-1?conversation=conv-2"
    );
    // ...and the drawer collapses (content unmounts).
    await waitFor(() =>
      expect(screen.queryByText("Sobre etica")).not.toBeInTheDocument()
    );
  });
});

describe("ConversationList — selection / empty / highlight (SYS-9)", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    deleteConversationMock.mockReset();
  });
  afterEach(() => cleanup());

  it("renders the empty state when there are no conversations", () => {
    render(<ConversationList conversations={[]} mindId="mind-1" />);
    expect(screen.getByText(/Nenhuma conversa ainda/i)).toBeInTheDocument();
    // New-chat affordance is still present.
    expect(screen.getByText(/Nova Conversa/i)).toBeInTheDocument();
  });

  it("renders one button per conversation with its title", () => {
    render(
      <ConversationList conversations={conversations} mindId="mind-1" />
    );
    expect(screen.getByText("Sobre estoicismo")).toBeInTheDocument();
    expect(screen.getByText("Sobre etica")).toBeInTheDocument();
  });

  it("falls back to 'Sem titulo' when a conversation has no title", () => {
    render(
      <ConversationList
        conversations={[makeConversation({ id: "conv-x", title: null })]}
        mindId="mind-1"
      />
    );
    expect(screen.getByText("Sem titulo")).toBeInTheDocument();
  });

  it("selecting a conversation routes to its chat URL", () => {
    render(
      <ConversationList conversations={conversations} mindId="mind-1" />
    );
    fireEvent.click(screen.getByText("Sobre estoicismo"));
    expect(pushMock).toHaveBeenCalledWith(
      "/chat/mind-1?conversation=conv-1"
    );
  });

  it("'Nova Conversa' routes to the base chat URL (no conversation param)", () => {
    render(
      <ConversationList conversations={conversations} mindId="mind-1" />
    );
    fireEvent.click(screen.getByText(/Nova Conversa/i));
    expect(pushMock).toHaveBeenCalledWith("/chat/mind-1");
  });

  it("highlights the active conversation and not the inactive ones", () => {
    render(
      <ConversationList
        conversations={conversations}
        mindId="mind-1"
        activeConversationId="conv-1"
      />
    );
    const active = screen.getByText("Sobre estoicismo").closest("button")!;
    const inactive = screen.getByText("Sobre etica").closest("button")!;
    // Active row carries the purple highlight class; inactive does not.
    expect(active.className).toContain("border-purple-500/50");
    expect(inactive.className).not.toContain("border-purple-500/50");
  });

  it("encodes the mindId in the routed URL", () => {
    render(
      <ConversationList
        conversations={[makeConversation({ id: "conv-1" })]}
        mindId="mind/with space"
      />
    );
    fireEvent.click(screen.getByText("Primeira conversa"));
    expect(pushMock).toHaveBeenCalledWith(
      "/chat/mind%2Fwith%20space?conversation=conv-1"
    );
  });
});
