import { test, expect } from "@playwright/test";

// Do NOT use authenticated state — test unauthenticated access
test.describe("Protected Routes (Unauthenticated)", () => {
  test("should redirect /chat/some-mind to login with redirectTo param", async ({
    page,
  }) => {
    await page.goto("/chat/some-mind");

    // Middleware should redirect to /login?redirectTo=/chat/some-mind
    await page.waitForURL(/\/login/);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirectTo")).toBe("/chat/some-mind");
  });

  test("should redirect /chat/encoded%20mind to login with redirectTo param", async ({
    page,
  }) => {
    await page.goto("/chat/encoded%20mind");

    await page.waitForURL(/\/login/);

    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirectTo")).toBe("/chat/encoded%20mind");
  });

  test("should allow access to public routes without login", async ({
    page,
  }) => {
    // Home page is public
    await page.goto("/");
    await expect(page.getByText("Mentes Sinteticas")).toBeVisible();

    // Login page is public
    await page.goto("/login");
    await expect(page.getByText("Entre para acessar suas conversas")).toBeVisible();

    // Signup page is public
    await page.goto("/signup");
    await page.waitForURL("/signup");
    expect(page.url()).toContain("/signup");
  });
});
