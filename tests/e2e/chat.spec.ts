import { test, expect } from "@playwright/test";

// Use authenticated state from setup
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Chat Page (Authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    // Go to home and click the first available mind
    await page.goto("/");
    const firstMindTag = page.locator('a[href^="/chat/"]').first();
    await expect(firstMindTag).toBeVisible({ timeout: 10000 });
    await firstMindTag.click();
    await page.waitForURL(/\/chat\/.+/);
  });

  test("should display chat header with mind name and online status", async ({
    page,
  }) => {
    // Chat header with mind name
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Online status indicator
    await expect(page.getByText("Online")).toBeVisible();

    // End session button
    await expect(
      page.getByRole("link", { name: "Encerrar Sessao" })
    ).toBeVisible();
  });

  test("should display chat input with send button", async ({ page }) => {
    const textarea = page.getByPlaceholder("Digite sua questao estrategica...");
    await expect(textarea).toBeVisible();

    const sendButton = page.getByRole("button", { name: "Enviar" });
    await expect(sendButton).toBeVisible();

    // Send button should be disabled when input is empty
    await expect(sendButton).toBeDisabled();
  });

  test("should enable send button when typing a message", async ({ page }) => {
    const textarea = page.getByPlaceholder("Digite sua questao estrategica...");
    const sendButton = page.getByRole("button", { name: "Enviar" });

    await textarea.fill("Ola, como vai?");
    await expect(sendButton).toBeEnabled();
  });

  test("should send message and receive a response", async ({ page }) => {
    const textarea = page.getByPlaceholder("Digite sua questao estrategica...");
    const sendButton = page.getByRole("button", { name: "Enviar" });

    const userMessage = "Qual e a sua principal area de conhecimento?";
    await textarea.fill(userMessage);
    await sendButton.click();

    // User message should appear in chat
    await expect(page.getByText(userMessage)).toBeVisible();

    // Input should be cleared after sending
    await expect(textarea).toHaveValue("");

    // Wait for AI response (streaming) — allow generous timeout for API call
    // The response appears as a new chat message from the "model" role
    // We look for any new text content that wasn't there before
    const responseLocator = page.locator('[data-role="model"]').last();
    await expect(responseLocator).toBeVisible({ timeout: 30000 });

    // Verify the response has some text content (not empty)
    await expect(responseLocator).not.toBeEmpty();
  });

  test("should navigate back to home when clicking end session", async ({
    page,
  }) => {
    const endSessionLink = page.getByRole("link", { name: "Encerrar Sessao" });
    await endSessionLink.click();

    await page.waitForURL("/");
    await expect(page.getByText("Selecionar Mente")).toBeVisible();
  });
});
