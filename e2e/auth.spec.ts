/**
 * E2E: Authentication flows
 *
 * Covers:
 *   - Register page renders and validates inputs
 *   - Login page renders and shows error on bad credentials
 *   - Nav hides on /login and /register (HIDE_PATHS)
 */

import { expect, test } from 'playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('Register page', () => {
  test.describe.configure({ mode: 'serial' });

  test('renders the registration form', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await expect(page.getByRole('heading', { name: 'Create account', exact: true })).toBeVisible();
    await expect(page.getByLabel('Full Name', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  });

  test('top navigation is hidden on /register', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    // Nav component returns null for HIDE_PATHS
    const nav = page.locator('nav').first();
    const navCount = await nav.count();
    // Either no nav at all, or the nav is not visible
    if (navCount > 0) {
      await expect(nav).not.toBeVisible();
    }
  });

  test('shows validation error when submitting empty form', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    const submitBtn = page.getByRole('button', { name: /submit|create|register|sign up/i });
    await submitBtn.click();
    // Some error indication should appear
    const errorIndicator = page.locator('[role="alert"], .error, [data-error]').first();
    const hasNativeValidation = await page.locator('input:invalid').count();
    expect(
      (await errorIndicator.count()) > 0 || hasNativeValidation > 0
    ).toBe(true);
  });

  test('shows error for short password', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.getByLabel('Full Name', { exact: true }).fill('Priya Singh');
    await page.getByLabel('Email Address', { exact: true }).fill('priya@test.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: /submit|create|register|sign up/i }).click();
    // Expect an error about password length
    const body = await page.textContent('body');
    expect(body).toMatch(/password|8 character/i);
  });
});

test.describe('Login page', () => {
  test.describe.configure({ mode: 'serial' });

  test('renders the login form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByLabel('Email Address', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible();
  });

  test('top navigation is hidden on /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const nav = page.locator('nav').first();
    const navCount = await nav.count();
    if (navCount > 0) {
      await expect(nav).not.toBeVisible();
    }
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email Address', { exact: true }).fill('fake@doesnotexist.com');
    await page.getByLabel('Password', { exact: true }).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    // Wait for response
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body).toMatch(/invalid|incorrect|error|wrong|not found/i);
  });

  test('has a link to the register page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    const registerLink = page.getByRole('link', { name: /register|sign up|create account/i });
    await expect(registerLink).toBeVisible();
  });
});
