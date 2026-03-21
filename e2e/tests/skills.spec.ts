import { test, expect } from "../fixtures/auth";

test.describe("Skills", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.getByRole("link", { name: "Skills" }).click();
    await expect(page).toHaveURL(/skills/);
  });

  test("shows workspace skills", async ({ authenticatedPage: page }) => {
    await expect(page.getByText("Barista")).toBeVisible();
    await expect(page.getByText("Cashier")).toBeVisible();
  });

  test("shows add skill form for managers", async ({
    authenticatedPage: page,
  }) => {
    await expect(
      page.getByPlaceholder("New skill name"),
    ).toBeVisible();
  });

  test("manager can add a new skill", async ({ authenticatedPage: page }) => {
    await page.getByPlaceholder("New skill name").fill("Kitchen Hand");
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByPlaceholder("New skill name")).toHaveValue("");
    await expect(page.getByText("Kitchen Hand")).toBeVisible();
  });

  test("manager can delete a skill", async ({ authenticatedPage: page }) => {
    page.on("dialog", (d) => d.accept());
    await expect(page.getByText("Cashier")).toBeVisible();
    // Click the × on the Cashier chip
    await page.getByText("Cashier").locator("..").getByRole("button").click();
    await expect(page.getByText("Cashier")).not.toBeVisible();
  });

  test("shows employee skill assignment section", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText("Employee skills")).toBeVisible();
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("assigned skills shown for selected employee", async ({
    authenticatedPage: page,
  }) => {
    // Lou Poles has Barista assigned in seed
    await page.getByRole("combobox").selectOption({ label: "Lou Poles" });
    await expect(
      page.locator("text=Assigned skills").locator("..").getByText("Barista"),
    ).toBeVisible();
  });
});
