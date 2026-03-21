import { test, expect } from "../fixtures/auth";

test.describe("Availability", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.getByRole("link", { name: "Availability" }).click();
    await expect(page).toHaveURL(/availability/);
  });

  test("shows employee dropdown", async ({ authenticatedPage: page }) => {
    await expect(
      page.getByRole("combobox", { name: /employee/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Lou Poles" }),
    ).toBeAttached();
  });

  test("shows seeded availability for Lou Poles", async ({
    authenticatedPage: page,
  }) => {
    await page
      .getByRole("combobox", { name: /employee/i })
      .selectOption({ label: "Lou Poles" });
    await expect(page.getByText("07:00 – 15:00")).toBeVisible();
    await expect(page.getByText("Mon", { exact: true })).toBeVisible();
  });

  test("shows add availability form for managers", async ({
    authenticatedPage: page,
  }) => {
    await expect(
      page.getByRole("button", { name: /^save$/i }),
    ).toBeVisible();
  });

  test("manager can add an availability window", async ({
    authenticatedPage: page,
  }) => {
    await page
      .getByRole("combobox", { name: /employee/i })
      .selectOption({ label: "Fran Tastic" });

    await page.getByLabel("Day").selectOption("2"); // Tuesday
    await page.getByLabel("From").fill("09:00");
    await page.getByLabel("To").fill("17:00");
    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText("09:00 – 17:00")).toBeVisible();
  });

  test("manager can delete an availability window", async ({
    authenticatedPage: page,
  }) => {
    page.on("dialog", (d) => d.accept());
    await page
      .getByRole("combobox", { name: /employee/i })
      .selectOption({ label: "Lou Poles" });
    await expect(page.getByText("07:00 – 15:00")).toBeVisible();
    await page.getByTitle("Remove window").click();
    await expect(page.getByText("07:00 – 15:00")).not.toBeVisible();
  });

  test("switches availability when employee changes", async ({
    authenticatedPage: page,
  }) => {
    // Lou has availability seeded; Zack does not (and no other test adds Zack's availability)
    await page
      .getByRole("combobox", { name: /employee/i })
      .selectOption({ label: "Zack Lee" });
    await expect(page.getByText("No availability set.")).toBeVisible();
  });
});
