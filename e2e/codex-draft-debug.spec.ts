import { test } from 'playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const DRAFT_KEY = 'job-readiness-fitcheck-draft';

async function dumpDraft(page: import('playwright/test').Page, label: string) {
  const draft = await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY);
  console.log(`${label}: ${draft}`);
}

test('debug fit-check persisted draft replay', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(`${BASE_URL}/career-fit-check`);
  await page.getByRole('radio').first().waitFor({ timeout: 8000 });

  for (let step = 0; step < 12; step++) {
    if (page.url().includes('/register')) break;
    const option = page.getByRole('radio').first();
    await option.click();
    const actionButton = page.locator('section.route-shell button.btn-primary');
    const actionLabel = await actionButton.innerText();
    await actionButton.press('Enter');
    if (/See my top matches/i.test(actionLabel)) {
      await page.waitForURL(/\/register/, { timeout: 20000 });
      break;
    }
  }

  await dumpDraft(page, 'after-register-gate');

  const suffix = Date.now();
  await page.getByLabel(/full name/i).fill('Priya Test');
  await page.getByLabel(/email address/i).fill(`priya.${suffix}@example.com`);
  await page.getByLabel(/^password$/i).fill('Password123!');
  await page.getByLabel(/confirm password/i).fill('Password123!');
  await page.getByRole('button', { name: /^create account$/i }).click();
  await page.waitForURL(/career-fit-check/, { timeout: 30000 });
  await page.waitForTimeout(2000);

  await dumpDraft(page, 'after-return');
  console.log(`url: ${page.url()}`);
  console.log(await page.locator('body').innerText());
});
