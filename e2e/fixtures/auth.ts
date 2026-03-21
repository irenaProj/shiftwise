import { test as base, expect, Page } from '@playwright/test'

const MANAGER_EMAIL = 'will.power@demo.com'
const MANAGER_PASSWORD = 'password123'

// Fixture that provides a pre-authenticated page
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@company.com').fill(MANAGER_EMAIL)
    await page.getByPlaceholder('••••••••').fill(MANAGER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/dashboard/)
    await use(page)
  },
})

export { expect }

export async function login(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@company.com').fill(MANAGER_EMAIL)
  await page.getByPlaceholder('••••••••').fill(MANAGER_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/)
}
