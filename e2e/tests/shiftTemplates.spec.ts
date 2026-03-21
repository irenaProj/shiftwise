import { test, expect } from "../fixtures/auth";

test.describe("Shift Templates", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.getByRole("link", { name: "Templates" }).click();
    await expect(page).toHaveURL(/shift-templates/);
  });

  test("shows existing templates", async ({ authenticatedPage: page }) => {
    await expect(page.getByText("Morning")).toBeVisible();
    await expect(page.getByText("Afternoon")).toBeVisible();
  });

  test("shows start and end times", async ({ authenticatedPage: page }) => {
    await expect(page.getByText("06:00 – 14:00")).toBeVisible();
    await expect(page.getByText("14:00 – 22:00")).toBeVisible();
  });

  test("shows add template form for managers", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByPlaceholder("e.g. Morning")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /add template/i }),
    ).toBeVisible();
  });

  test("manager can add a new template", async ({
    authenticatedPage: page,
  }) => {
    const timestamp = Date.now();
    const name = `Night ${timestamp}`;

    await page.getByPlaceholder("e.g. Morning").fill(name);
    // Fill time inputs — get the two time inputs
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill("22:00");
    await timeInputs.nth(1).fill("06:00");
    await page.getByRole("button", { name: /add template/i }).click();

    await expect(page.getByText(name)).toBeVisible();
  });

  test("manager can delete a template", async ({
    authenticatedPage: page,
  }) => {
    page.on("dialog", (d) => d.accept());
    await expect(page.getByText("Afternoon")).toBeVisible();
    // Click the delete button next to Afternoon
    await page
      .getByText("Afternoon")
      .locator("../../..")
      .getByTitle("Delete template")
      .click();
    await expect(page.getByText("Afternoon")).not.toBeVisible();
  });
});
