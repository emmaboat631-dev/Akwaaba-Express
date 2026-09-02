import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('S1: Welcome page loads with sign-in and sign-up options', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page.locator('text=Akwaaba Express').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Get started')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=I already have an account')).toBeVisible({ timeout: 10000 });
  });

  test('S2: Sign-in page shows email, password, and OAuth buttons', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('text=Google')).toBeVisible();
    await expect(page.locator('text=Apple')).toBeVisible();
  });

  test('S3: Sign-in with invalid credentials shows error', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[type="email"]', 'fake@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.toast-error')).toBeVisible({ timeout: 5000 });
  });

  test('S4: Sign-up page shows role toggle and form fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('text=Passenger')).toBeVisible();
    await expect(page.locator('text=Driver')).toBeVisible();
    await expect(page.locator('input[name="given-name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('text=Google')).toBeVisible();
  });

  test('S5: Sign-up validation rejects empty name', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.click('text=Create account');
    await expect(page.locator('.toast-error')).toBeVisible({ timeout: 5000 });
  });

  test('S14: Unauthenticated user redirects to welcome', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/welcome/);
  });
});
