import { describe, it, expect } from "vitest";
import { t } from "@/lib/i18n";

describe("t() — i18n lookup", () => {
  it("resolves a top-level key", () => {
    expect(t("common.appName")).toBe("Mentes Sinteticas");
  });

  it("resolves nested keys with dot notation", () => {
    expect(t("chat.send")).toBe("Enviar");
    expect(t("auth.loginTitle")).toBe("Entrar");
    expect(t("footer.builtWith")).toContain("Google Gemini");
  });

  it("returns the key itself when not found (fallback)", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("returns the key when the first segment is unknown", () => {
    expect(t("unknown.section.deep")).toBe("unknown.section.deep");
  });

  it("returns the key when target is not a string (object node)", () => {
    // "chat" resolves to the chat sub-object, not a string
    expect(t("chat")).toBe("chat");
  });

  it("returns the key for empty string input", () => {
    expect(t("")).toBe("");
  });

  it("resolves home section keys", () => {
    expect(t("home.heroTitle")).toBe("Mentes Sinteticas");
    expect(t("home.selectMindTitle")).toBe("Selecionar Mente");
  });

  it("resolves error section keys", () => {
    expect(t("errors.generic")).toBe("Erro ao processar mensagem.");
  });
});
