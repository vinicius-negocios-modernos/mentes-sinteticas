import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Mentes Sinteticas")).toBeVisible();
    await expect(page.getByText("Entre para acessar suas conversas")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByText("Criar conta")).toBeVisible();
  });

  test("should login with valid credentials and redirect to home", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      test.skip(true, "E2E_TEST_EMAIL and E2E_TEST_PASSWORD required");
      return;
    }

    await page.goto("/login");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();

    // Should redirect to home page after successful login
    await page.waitForURL("/", { timeout: 15000 });
    await expect(page.getByText("Selecionar Mente")).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("invalid@test.com");
    await page.getByLabel("Senha").fill("wrongpassword123");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Should stay on login page and show error message
    await page.waitForURL(/\/login\?error=/);
    await expect(page.locator(".bg-red-500\\/10")).toBeVisible();
  });

  test("should have link to signup page", async ({ page }) => {
    await page.goto("/login");

    const signupLink = page.getByRole("link", { name: "Criar conta" });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute("href", "/signup");
  });
});
