import { test as setup, expect } from "@playwright/test";

const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

setup("authenticate", async ({ page }) => {
  if (!E2E_TEST_EMAIL || !E2E_TEST_PASSWORD) {
    throw new Error(
      "E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars are required for E2E tests"
    );
  }

  // Navigate to login page
  await page.goto("/login");

  // Fill in credentials
  await page.getByLabel("Email").fill(E2E_TEST_EMAIL);
  await page.getByLabel("Senha").fill(E2E_TEST_PASSWORD);

  // Submit the form
  await page.getByRole("button", { name: "Entrar" }).click();

  // Wait for redirect to home page (successful login)
  await page.waitForURL("/", { timeout: 15000 });

  // Verify we're on the home page
  await expect(page.getByText("Mentes Sinteticas")).toBeVisible();

  // Save storage state for reuse in other tests
  await page.context().storageState({ path: "tests/e2e/.auth/user.json" });
});
