// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import ChatMessage from "../chat-message";

// Mock react-markdown to avoid complex rendering
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

describe("ChatMessage a11y", () => {
  it("user message has role='article'", () => {
    const { container } = render(<ChatMessage role="user" text="Hello" />);
    const article = container.querySelector('[role="article"]');
    expect(article).toBeInTheDocument();
  });

  it("user message has aria-label indicating user", () => {
    const { container } = render(<ChatMessage role="user" text="Hello" />);
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveAttribute("aria-label", "Mensagem do usuario");
  });

  it("model message has role='article'", () => {
    const { container } = render(
      <ChatMessage role="model" text="Hi there" mindName="Socrates" />
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toBeInTheDocument();
  });

  it("model message aria-label includes mind name", () => {
    const { container } = render(
      <ChatMessage role="model" text="Hi" mindName="Socrates" />
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveAttribute("aria-label", "Mensagem de Socrates");
  });

  it("model message without mindName has generic aria-label", () => {
    const { container } = render(<ChatMessage role="model" text="Hi" />);
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveAttribute("aria-label", "Mensagem da mente");
  });

  it("copy button icons have aria-hidden='true'", () => {
    const { container } = render(
      <ChatMessage role="model" text="Test message" mindName="Plato" />
    );
    const svgs = container.querySelectorAll("svg");
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("copy button has aria-label", () => {
    const { container } = render(
      <ChatMessage role="model" text="Test message" mindName="Plato" />
    );
    const copyBtn = container.querySelector('button[aria-label="Copiar mensagem"]');
    expect(copyBtn).toBeInTheDocument();
  });

  it("avatar fallback has aria-hidden for model messages", () => {
    const { container } = render(
      <ChatMessage role="model" text="Hello" mindName="Aristoteles" />
    );
    const fallback = container.querySelector('[data-slot="avatar-fallback"][aria-hidden="true"]');
    expect(fallback).toBeInTheDocument();
  });

  it("speaker button has aria-pressed when speaking", () => {
    const { container } = render(
      <ChatMessage
        role="model"
        text="Test"
        mindName="Plato"
        showSpeakerButton
        isSpeakingThis={true}
        onSpeak={vi.fn()}
        onStopSpeaking={vi.fn()}
      />
    );
    const speakerBtn = container.querySelector('button[aria-pressed="true"]');
    expect(speakerBtn).toBeInTheDocument();
  });

  it("speaker button has aria-pressed=false when not speaking", () => {
    const { container } = render(
      <ChatMessage
        role="model"
        text="Test"
        mindName="Plato"
        showSpeakerButton
        isSpeakingThis={false}
        onSpeak={vi.fn()}
        onStopSpeaking={vi.fn()}
      />
    );
    const speakerBtn = container.querySelector('button[aria-pressed="false"]');
    expect(speakerBtn).toBeInTheDocument();
  });
});
