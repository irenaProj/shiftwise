import { test, expect } from "../fixtures/auth";

test.describe("Forecast", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.getByRole("link", { name: "Forecast" }).click();
    await expect(page).toHaveURL(/forecast/);
  });

  test("shows forecast grid with seeded slots", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText("09:00")).toBeVisible();
    await expect(page.getByText("12:00")).toBeVisible();
  });

  test("shows required count badges", async ({ authenticatedPage: page }) => {
    // Slot with required=3 at 09:00 Mon
    await expect(page.getByText("3")).toBeVisible();
    await expect(page.getByText("2")).toBeVisible();
  });

  test("shows Set demand form for managers", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText("Set demand")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save slot/i }),
    ).toBeVisible();
  });

  test("manager can upsert a forecast slot", async ({
    authenticatedPage: page,
  }) => {
    await page.getByLabel("Day").selectOption("2"); // Tuesday
    await page.getByLabel("Time slot").selectOption("10:00");
    await page.getByLabel("Employees required").fill("4");
    await page.getByRole("button", { name: /save slot/i }).click();

    // New time row appears in the grid
    await expect(page.getByText("10:00")).toBeVisible();
  });

  test("manager can delete a forecast slot", async ({
    authenticatedPage: page,
  }) => {
    page.on("dialog", (d) => d.accept());
    await expect(page.getByText("09:00")).toBeVisible();
    // Click × on the badge in the 09:00 row
    await page.getByTitle("Remove slot").first().click();
    // The 09:00 row disappears since only one slot remains
    await expect(page.getByText("09:00")).not.toBeVisible();
  });

  test("shows colour legend", async ({ authenticatedPage: page }) => {
    await expect(page.getByText("4+")).toBeVisible();
  });
});
