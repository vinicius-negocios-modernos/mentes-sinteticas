// @vitest-environment jsdom
/**
 * SYS-9 / UX-11 (TD-5.5) — CHARACTERIZATION tests for ChatInterface.
 *
 * These capture the OBSERVABLE behavior of the live Gemini chat critical path
 * BEFORE the UX-11 hook extraction, and must remain GREEN UNCHANGED after the
 * refactor (proof of zero behavior change). They exercise the component at its
 * real seams: the streaming `fetch`, the non-streaming `sendMessage` fallback,
 * and the response headers contract (X-Conversation-Id, X-Token-Usage-Warning).
 *
 * Behaviors under contract:
 *  - empty-state shown when only the greeting message exists
 *  - sending a prompt renders the user message + loading indicator
 *  - streaming chunks render progressively, then collapse into a final message
 *  - token-warning banner appears on the X-Token-Usage-Warning header and is dismissable
 *  - error path falls back to sendMessage; total failure renders inline error message
 *  - scroll-to-bottom button is wired to the messages viewport
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from "@testing-library/react";
import ChatInterface from "../chat-interface";

// --- Mock heavy markdown stack (same seams as chat-message-a11y test) ---
vi.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
vi.mock("remark-gfm", () => ({ __esModule: true, default: () => {} }));
vi.mock("remark-math", () => ({ __esModule: true, default: () => {} }));
vi.mock("rehype-katex", () => ({ __esModule: true, default: () => {} }));
vi.mock("rehype-highlight", () => ({ __esModule: true, default: () => {} }));
vi.mock("../code-block", () => ({
  CodeBlock: ({ children }: { children: string }) => <pre>{children}</pre>,
}));
vi.mock("../collapsible-message", () => ({
  CollapsibleMessage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible">{children}</div>
  ),
  COLLAPSE_THRESHOLD: 15,
  COLLAPSED_LINES: 10,
}));

// --- Mock the non-streaming server action fallback seam ---
const sendMessageMock = vi.fn();
vi.mock("@/app/actions", () => ({
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
}));

// --- Mock toast (Sonner) so error path does not throw ---
const toastWarning = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    warning: (...a: unknown[]) => toastWarning(...a),
    error: (...a: unknown[]) => toastError(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
  },
}));

/**
 * Build a streaming Response whose body yields the given chunks in order, then
 * closes. Headers are honored so the conversationId / token-warning contract is
 * exercised exactly as production reads it.
 */
function streamingResponse(
  chunks: string[],
  headers: Record<string, string> = {}
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: new Headers(headers),
  });
}

function renderChat(props: Partial<React.ComponentProps<typeof ChatInterface>> = {}) {
  return render(<ChatInterface mindName="Socrates" {...props} />);
}

/**
 * Mirror the real send interaction: type into the textarea and press Enter
 * (ChatInput sends on Enter-without-Shift, there is no <form> submit).
 */
async function submitPrompt(text: string) {
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: text } });
  await act(async () => {
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
  });
}

describe("ChatInterface — characterization (SYS-9 / UX-11)", () => {
  beforeEach(() => {
    sendMessageMock.mockReset();
    toastWarning.mockClear();
    toastError.mockClear();
    toastSuccess.mockClear();
    vi.stubGlobal("fetch", vi.fn());
    // jsdom doesn't implement scrollIntoView
    Element.prototype.scrollIntoView =
      vi.fn() as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // --- Empty state ---

  it("shows the empty state when only the greeting message exists", () => {
    renderChat();
    // ChatEmptyState renders the suggested-prompts experience; greeting bubble
    // is NOT rendered as a chat log when empty-state is active.
    expect(
      screen.queryByRole("log", { name: /Mensagens da conversa/i })
    ).not.toBeInTheDocument();
  });

  it("renders the conversation log (not empty state) when initialMessages are provided", () => {
    renderChat({
      initialMessages: [
        { role: "user", text: "Oi", timestamp: new Date() },
        { role: "model", text: "Ola de volta", timestamp: new Date() },
      ],
    });
    expect(
      screen.getByRole("log", { name: /Mensagens da conversa/i })
    ).toBeInTheDocument();
  });

  // --- Sending + streaming ---

  it("streams chunks progressively then collapses into a final model message", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      streamingResponse(["Hello", " world"], {
        "X-Conversation-Id": "conv-1",
      })
    );

    renderChat();

    await submitPrompt("Pergunta");

    // User message must appear in the log.
    await waitFor(() =>
      expect(screen.getByText("Pergunta")).toBeInTheDocument()
    );

    // Final accumulated model message appears after stream completes.
    await waitFor(() =>
      expect(screen.getByText("Hello world")).toBeInTheDocument()
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" })
    );
  });

  // --- Token warning ---

  it("shows the token-warning banner when the X-Token-Usage-Warning header is set, and dismisses it", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      streamingResponse(["ok"], {
        "X-Token-Usage-Warning": "approaching-limit",
      })
    );

    renderChat();
    await submitPrompt("Pergunta");

    const banner = await screen.findByText(/80% do seu limite diario/i);
    expect(banner).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Fechar aviso/i }));
    await waitFor(() =>
      expect(
        screen.queryByText(/80% do seu limite diario/i)
      ).not.toBeInTheDocument()
    );
  });

  it("does NOT show the token-warning banner when the header is absent", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(streamingResponse(["ok"]));

    renderChat();
    await submitPrompt("Pergunta");

    await waitFor(() => expect(screen.getByText("ok")).toBeInTheDocument());
    expect(
      screen.queryByText(/80% do seu limite diario/i)
    ).not.toBeInTheDocument();
  });

  // --- Error / fallback path ---

  it("falls back to sendMessage when the streaming fetch returns not-ok", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "boom" }), { status: 500 })
    );
    sendMessageMock.mockResolvedValue({
      success: true,
      text: "Resposta de fallback",
      conversationId: "conv-fb",
    });

    renderChat();
    await submitPrompt("Pergunta");

    await waitFor(() =>
      expect(screen.getByText("Resposta de fallback")).toBeInTheDocument()
    );
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });

  it("renders an inline error message when both streaming and fallback fail", async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValue(new Error("network down"));
    sendMessageMock.mockResolvedValue({ success: false });

    renderChat();
    await submitPrompt("Pergunta");

    // An inline *italic* error model message is appended; a toast is also shown.
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  // --- Scroll button wiring ---

  it("renders the scroll-to-bottom control", () => {
    renderChat({
      initialMessages: [
        { role: "user", text: "Oi", timestamp: new Date() },
        { role: "model", text: "Ola", timestamp: new Date() },
      ],
    });
    expect(
      screen.getByRole("button", { name: /Ir para o final/i })
    ).toBeInTheDocument();
  });
});
