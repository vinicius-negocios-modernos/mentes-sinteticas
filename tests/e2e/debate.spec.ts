import { test, expect } from "@playwright/test";

// SYS-11 / AC3 — e2e for the debate flow. Today only chat/home/login/protected
// have e2e coverage. This spec exercises the debate setup UI, its validation,
// and (when the environment has >= 2 minds seeded) the full create-debate flow.
//
// Resilience note: the production seed may contain a single mind, but a debate
// requires >= 2 participants. The setup-UI and validation assertions run
// unconditionally; the end-to-end "launch a debate" assertion runs only when
// the catalog actually has >= 2 selectable minds, so the spec is green in both
// single-mind and multi-mind environments.

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Debate Setup (Authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/debate");
    // Setup form is present once minds finish loading.
    await expect(
      page.getByRole("form", { name: "Configurar debate" })
    ).toBeVisible({ timeout: 10000 });
  });

  test("renders the debate setup form with topic input and submit", async ({
    page,
  }) => {
    await expect(page.getByLabel("Topico do Debate")).toBeVisible();

    const submit = page.getByRole("button", { name: /Iniciar debate/i });
    await expect(submit).toBeVisible();
    // Invalid by default (no topic, < 2 minds selected).
    await expect(submit).toBeDisabled();
  });

  test("submit stays disabled until topic + 2 minds are valid", async ({
    page,
  }) => {
    const submit = page.getByRole("button", { name: /Iniciar debate/i });
    await page.getByLabel("Topico do Debate").fill("O futuro do trabalho");
    // Topic alone is not enough — still needs >= 2 minds.
    await expect(submit).toBeDisabled();

    const mindButtons = page.getByRole("checkbox");
    const mindCount = await mindButtons.count();

    if (mindCount < 2) {
      // Single-mind environment: validation correctly keeps submit disabled.
      test.info().annotations.push({
        type: "note",
        description: `Only ${mindCount} mind(s) available — full debate launch skipped.`,
      });
      await expect(submit).toBeDisabled();
      return;
    }

    // Select two minds → form becomes valid.
    await mindButtons.nth(0).click();
    await mindButtons.nth(1).click();
    await expect(mindButtons.nth(0)).toHaveAttribute("aria-checked", "true");
    await expect(mindButtons.nth(1)).toHaveAttribute("aria-checked", "true");
    await expect(submit).toBeEnabled();
  });

  test("launches a debate end-to-end when >= 2 minds exist", async ({
    page,
  }) => {
    const mindButtons = page.getByRole("checkbox");
    const mindCount = await mindButtons.count();

    test.skip(
      mindCount < 2,
      "Debate requires >= 2 minds; environment has fewer — flow not exercisable."
    );

    await page.getByLabel("Topico do Debate").fill(
      "Inteligencia artificial e criatividade humana"
    );
    await mindButtons.nth(0).click();
    await mindButtons.nth(1).click();

    const submit = page.getByRole("button", { name: /Iniciar debate/i });
    await expect(submit).toBeEnabled();
    await submit.click();

    // On success the app routes to /debate/{debateId}.
    await page.waitForURL(/\/debate\/.+/, { timeout: 30000 });
    expect(page.url()).toMatch(/\/debate\/[^/]+$/);
  });
});
