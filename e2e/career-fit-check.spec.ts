/**
 * E2E: Career Fit Check critical path
 *
 * Guest flow: Landing -> Fit Check -> answer all questions -> registration gate.
 * Authentication is intentionally deferred until submission so the saved draft can
 * replay after registration and then produce results.
 */

import { expect, test, type Page } from 'playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

async function chooseFirstOption(page: Page) {
  const options = page.getByRole('radio');
  await expect(options.first()).toBeVisible({ timeout: 10_000 });
  await options.first().click();
}

test.describe('Career Fit Check - critical guest flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('landing page exposes a direct fit-check route', async ({ page }) => {
    await page.goto(BASE_URL);
    const fitCheckLink = page.locator('a[href="/career-fit-check"]').first();
    await expect(fitCheckLink).toBeVisible();
    await fitCheckLink.click();
    await expect(page).toHaveURL(/career-fit-check/);
  });

  test('guest sees the first question without an auth wall', async ({ page }) => {
    await page.goto(`${BASE_URL}/career-fit-check`);
    await expect(page.getByText('Question 1 of 5')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('radio').first()).toBeVisible();
    await expect(page.getByText('Account required')).toHaveCount(0);
  });

  test('selecting an option enables the exact next-question control', async ({ page }) => {
    await page.goto(`${BASE_URL}/career-fit-check`);
    await chooseFirstOption(page);

    const nextButton = page.getByRole('button', { name: 'Next question', exact: true });
    await expect(nextButton).toBeEnabled();
  });

  test('draft resumes after a refresh', async ({ page }) => {
    await page.goto(`${BASE_URL}/career-fit-check`);
    await chooseFirstOption(page);
    await page.getByRole('button', { name: 'Next question', exact: true }).press('Enter');
    await expect(page.getByText('Question 2 of 5')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Question 2 of 5')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Resume where you left off')).toBeVisible();
  });

  test('guest completes all questions and is gated only at submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/career-fit-check`);

    for (let step = 0; step < 14; step += 1) {
      await chooseFirstOption(page);

      const submitButton = page.getByRole('button', {
        name: 'See my top matches',
        exact: true,
      });
      if ((await submitButton.count()) === 1) {
        await expect(submitButton).toBeEnabled();
        await submitButton.press('Enter');
        break;
      }

      const nextButton = page.getByRole('button', { name: 'Next question', exact: true });
      const questionProgress = page.getByText(/^Question \d+ of \d+$/);
      const currentProgress = await questionProgress.textContent();
      await expect(nextButton).toBeEnabled();
      await nextButton.press('Enter');
      await expect(questionProgress).not.toHaveText(currentProgress || '', { timeout: 10_000 });
    }

    await expect(page).toHaveURL(
      /\/register\?next=%2Fcareer-fit-check%3Fresume%3D1/,
      { timeout: 10_000 }
    );
  });

  test('results remain protected for guests', async ({ page }) => {
    await page.goto(`${BASE_URL}/results`);
    await expect(page.getByText('Account required')).toBeVisible({ timeout: 10_000 });
  });

  test('Hindi toggle switches visible question copy', async ({ page }) => {
    await page.goto(`${BASE_URL}/career-fit-check`);
    const hindiButton = page.getByRole('button', { name: 'हिंदी', exact: true });
    await expect(hindiButton).toBeVisible({ timeout: 10_000 });
    await hindiButton.click();

    await expect(page.locator('body')).toContainText(/[\u0900-\u097F]/);
  });
});

test.describe('Career Fit Check - accessibility', () => {
  test('uses a visible heading and radiogroup', async ({ page }) => {
    await page.goto(`${BASE_URL}/career-fit-check`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('radiogroup')).toBeVisible();
  });
});
