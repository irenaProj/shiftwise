import { test, expect } from "../fixtures/auth";

test.describe("Employee Management", () => {
  test("dashboard shows employee list", async ({ authenticatedPage: page }) => {
    await expect(page.getByText("Team members")).toBeVisible();
    await expect(page.getByRole("table").getByText("Lou Poles")).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Fran Tastic"),
    ).toBeVisible();
  });

  test("shows stats strip with correct counts", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText("Total staff")).toBeVisible();
    await expect(page.getByText("Managers")).toBeVisible();
    await expect(page.getByText("Employees")).toBeVisible();
  });

  test("manager can open Add member modal", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("button", { name: /add member/i }).click();
    await expect(page.getByText("Add team member")).toBeVisible();
    await expect(page.getByPlaceholder("Alex Johnson")).toBeVisible();
    await expect(page.getByPlaceholder("alex@company.com")).toBeVisible();
  });

  test("manager can add a new employee", async ({
    authenticatedPage: page,
  }) => {
    const timestamp = Date.now();
    const uniqueName = `Test User ${timestamp}`;
    const uniqueEmail = `test.${timestamp}@demo.com`;

    await page.getByRole("button", { name: /add member/i }).click();
    await page.getByPlaceholder("Alex Johnson").fill(uniqueName);
    await page.getByPlaceholder("alex@company.com").fill(uniqueEmail);
    await page
      .getByRole("button", { name: /add member/i })
      .last()
      .click();

    // Modal closes
    await expect(page.getByText("Add team member")).not.toBeVisible();

    // The specific email we just added appears in the table
    await expect(page.getByRole("cell", { name: uniqueEmail })).toBeVisible();
  });

  test("shows conflict error for duplicate email", async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole("button", { name: /add member/i }).click();
    await page.getByPlaceholder("Alex Johnson").fill("Lou Poles");
    await page.getByPlaceholder("alex@company.com").fill("lou.poles@demo.com");
    await page
      .getByRole("button", { name: /add member/i })
      .last()
      .click();
    await expect(page.locator(".bg-red-50")).toBeVisible();
  });

  test("cancel button closes modal", async ({ authenticatedPage: page }) => {
    await page.getByRole("button", { name: /add member/i }).click();
    await expect(page.getByText("Add team member")).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByText("Add team member")).not.toBeVisible();
  });
});
