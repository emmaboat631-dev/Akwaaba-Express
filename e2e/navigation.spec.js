import { test, expect } from '@playwright/test';

test.describe('Navigation & UI', () => {
  test('S6: Welcome page has working navigation to sign-in', async ({ page }) => {
    await page.goto('/welcome');
    await page.click('text=I already have an account', { timeout: 10000 });
    await expect(page).toHaveURL(/signin/);
  });

  test('S7: Welcome page has working navigation to sign-up', async ({ page }) => {
    await page.goto('/welcome');
    await page.click('text=Get started', { timeout: 10000 });
    await expect(page).toHaveURL(/signup/);
  });

  test('S8: Sign-in page back button goes to welcome', async ({ page }) => {
    await page.goto('/signin');
    await page.click('button[aria-label="Back"]');
    await expect(page).toHaveURL(/welcome/);
  });

  test('S9: Sign-up page has forgot password link', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('text=Forgot password')).toBeVisible();
  });

  test('S10: Password visibility toggle works', async ({ page }) => {
    await page.goto('/signin');
    const pwInput = page.locator('input[type="password"]');
    await expect(pwInput).toBeVisible();
    await page.click('button[aria-label="Toggle password"]');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');
  });

  test('S11: Sign-up shows password checklist on typing', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="new-password"]', 'Ab');
    await expect(page.locator('text=8 characters')).toBeVisible();
  });
});
