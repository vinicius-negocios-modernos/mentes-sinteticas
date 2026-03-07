import { test, expect } from "@playwright/test";

// Use authenticated state from setup
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Home Page (Authenticated)", () => {
  test("should display mind selection card with mind tags", async ({ page }) => {
    await page.goto("/");

    // Verify main UI elements
    await expect(page.getByText("Selecionar Mente")).toBeVisible();
    await expect(
      page.getByText("Escolha com quem voce quer debater hoje")
    ).toBeVisible();

    // Verify at least one mind tag is displayed (link within mind card)
    const mindTags = page.locator('a[href^="/chat/"]');
    await expect(mindTags.first()).toBeVisible({ timeout: 10000 });

    const count = await mindTags.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should display knowledge base card", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Base de Conhecimento")).toBeVisible();
    await expect(
      page.getByText("Google Gemini File Search Ativo")
    ).toBeVisible();
  });

  test("should navigate to chat when clicking a mind tag", async ({ page }) => {
    await page.goto("/");

    // Click the first mind tag
    const firstMindTag = page.locator('a[href^="/chat/"]').first();
    await expect(firstMindTag).toBeVisible({ timeout: 10000 });

    const mindName = await firstMindTag.textContent();
    await firstMindTag.click();

    // Should navigate to the chat page for that mind
    await page.waitForURL(/\/chat\/.+/);
    expect(page.url()).toContain("/chat/");

    // Chat header should show the mind name
    if (mindName) {
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        mindName.trim()
      );
    }
  });
});
