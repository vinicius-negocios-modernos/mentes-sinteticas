// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import DebateMessage, { DebateMessageLoading } from "../debate-message";

// Mock react-markdown
vi.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
vi.mock("remark-gfm", () => ({ __esModule: true, default: () => {} }));

describe("DebateMessage a11y", () => {
  it("user message has role='article'", () => {
    const { container } = render(
      <DebateMessage role="user" text="My question" />
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toBeInTheDocument();
  });

  it("user message has aria-label 'Voce disse'", () => {
    const { container } = render(
      <DebateMessage role="user" text="My question" />
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveAttribute("aria-label", "Voce disse");
  });

  it("model message has role='article'", () => {
    const { container } = render(
      <DebateMessage role="model" text="My answer" mindName="Socrates" />
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toBeInTheDocument();
  });

  it("model message aria-label includes mind name", () => {
    const { container } = render(
      <DebateMessage role="model" text="Answer" mindName="Aristoteles" />
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveAttribute("aria-label", "Aristoteles disse");
  });

  it("model message without mindName uses generic label", () => {
    const { container } = render(
      <DebateMessage role="model" text="Answer" />
    );
    const article = container.querySelector('[role="article"]');
    expect(article).toHaveAttribute("aria-label", "Mente disse");
  });

  it("model message avatar is aria-hidden", () => {
    const { container } = render(
      <DebateMessage role="model" text="Answer" mindName="Plato" />
    );
    const avatar = container.querySelector('[aria-hidden="true"]');
    expect(avatar).toBeInTheDocument();
  });

  it("model message has sr-only speaker label", () => {
    const { container } = render(
      <DebateMessage role="model" text="Answer" mindName="Socrates" />
    );
    const srText = container.querySelector(".sr-only");
    expect(srText).toBeInTheDocument();
    expect(srText!.textContent).toBe("Socrates:");
  });

  it("user message has sr-only speaker label", () => {
    const { container } = render(
      <DebateMessage role="user" text="Question" />
    );
    const srText = container.querySelector(".sr-only");
    expect(srText).toBeInTheDocument();
    expect(srText!.textContent).toBe("Voce:");
  });

  it("streaming cursor is aria-hidden", () => {
    const { container } = render(
      <DebateMessage
        role="model"
        text="Partial"
        mindName="Socrates"
        isStreaming
      />
    );
    const cursor = container.querySelector(".animate-pulse");
    expect(cursor).toHaveAttribute("aria-hidden", "true");
  });
});

describe("DebateMessageLoading a11y", () => {
  it("has role='status'", () => {
    const { container } = render(
      <DebateMessageLoading mindName="Socrates" />
    );
    const status = container.querySelector('[role="status"]');
    expect(status).toBeInTheDocument();
  });

  it("has aria-live='polite'", () => {
    const { container } = render(
      <DebateMessageLoading mindName="Socrates" />
    );
    const status = container.querySelector('[role="status"]');
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("has aria-label with mind name", () => {
    const { container } = render(
      <DebateMessageLoading mindName="Aristoteles" />
    );
    const status = container.querySelector('[role="status"]');
    expect(status).toHaveAttribute(
      "aria-label",
      "Aristoteles esta respondendo"
    );
  });

  it("animated dots are aria-hidden", () => {
    const { container } = render(
      <DebateMessageLoading mindName="Socrates" />
    );
    const dots = container.querySelectorAll(".animate-bounce");
    dots.forEach((dot) => {
      expect(dot).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("has sr-only thinking text", () => {
    const { container } = render(
      <DebateMessageLoading mindName="Plato" />
    );
    const srText = container.querySelector(".sr-only");
    expect(srText).toBeInTheDocument();
    expect(srText!.textContent).toBe("Plato esta pensando...");
  });
});
