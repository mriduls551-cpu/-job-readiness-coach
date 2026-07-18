/**
 * E2E: Product-lock suite — three full journeys that must never regress.
 *
 * 1. Golden path: fit check → register → results, then the selected role
 *    change persists across a reload (server-side selection storage).
 * 2. Value-before-wall promise: mid-assessment answers survive a page
 *    reload via the on-device draft, and the journey still completes.
 * 3. Analytics contract: the anonymous phase makes ZERO first-party
 *    /api/analytics/events calls (the endpoint requires a registered
 *    user), and events start flowing with 200s after registration.
 */

import { expect, type Page, test } from 'playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const ANALYTICS_PATH = '/api/analytics/events';

// The auth endpoints rate-limit by client IP (getClientIp reads the first
// x-forwarded-for entry). Repeated local runs would trip the limiter, so each
// run identifies as a fresh synthetic client instead of hammering one key.
const RUN_IP = `10.${rand(254)}.${rand(254)}.${rand(254)}`;
test.use({ extraHTTPHeaders: { 'x-forwarded-for': RUN_IP } });

function rand(max: number) {
  return 1 + Math.floor(Math.random() * max);
}

async function answerCurrentQuestion(page: Page) {
  const option = page.getByRole('radio').first();
  await expect(option).toBeVisible({ timeout: 8000 });
  await option.click();
  await expect(option).toHaveAttribute('aria-checked', 'true');
}

async function clickNext(page: Page) {
  const actionButton = page.locator('section.route-shell button.btn-primary');
  await expect(actionButton).toBeEnabled();
  const actionLabel = await actionButton.innerText();
  await actionButton.press('Enter');
  return /See my top matches/i.test(actionLabel);
}

/** Answers questions until the save-results register gate appears. */
async function answerFitCheckToRegisterGate(page: Page, alreadyOnPage = false) {
  if (!alreadyOnPage) {
    await page.goto(`${BASE_URL}/career-fit-check`);
  }

  for (let step = 0; step < 12; step++) {
    if (page.url().includes('/register')) break;

    await answerCurrentQuestion(page);
    const questionCounter = page.getByText(/Question \d+ of \d+/);
    const questionBefore = await questionCounter.textContent();
    const wasFinalQuestion = await clickNext(page);

    if (wasFinalQuestion) {
      await page.waitForURL(/\/register/, { timeout: 20000 });
      break;
    }
    await expect(questionCounter).not.toHaveText(questionBefore || '', { timeout: 5000 });
  }

  await expect(page).toHaveURL(/\/register/, { timeout: 8000 });
}

async function registerFreshUser(page: Page, namePrefix: string) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  await page.getByLabel(/full name/i).fill(`${namePrefix} Test`);
  await page.getByLabel(/email address/i).fill(`${namePrefix.toLowerCase()}.${suffix}@example.com`);
  await page.getByLabel(/^password$/i).fill('Password123!');
  await page.getByLabel(/confirm password/i).fill('Password123!');
  await page.getByRole('button', { name: /^create account$/i }).click();
}

test.describe('Product lock — full journeys', () => {
  test('1. golden path: fit check → register → results, and a role re-selection survives reload', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await answerFitCheckToRegisterGate(page);
    await registerFreshUser(page, 'Lock1');

    await expect(page).toHaveURL(/\/results/, { timeout: 30000 });

    // The scored result renders with a pre-selected top role.
    await expect(page.getByRole('button', { name: /^selected role$/i })).toBeVisible({
      timeout: 10000,
    });
    const chooseButtons = page.getByRole('button', { name: /^choose this role$/i });
    await expect(chooseButtons.first()).toBeVisible();

    // Re-select the second-ranked role and remember which card it lives in.
    // (Anchor by heading text, not by button locator: locators are live, and
    // the clicked button's label changes to "Selected role".)
    const secondCard = page.locator('article').filter({ has: chooseButtons.first() }).first();
    const secondCardHeading = (await secondCard.getByRole('heading').first().innerText()).trim();
    await chooseButtons.first().click();
    await expect(
      page
        .locator('article')
        .filter({ hasText: secondCardHeading })
        .first()
        .getByRole('button', { name: /^selected role$/i })
    ).toBeVisible({ timeout: 10000 });

    // The selection is stored server-side: it must survive a full reload.
    await page.reload();
    const cardAfterReload = page
      .locator('article')
      .filter({ hasText: secondCardHeading })
      .first();
    await expect(
      cardAfterReload.getByRole('button', { name: /^selected role$/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test('2. on-device draft: mid-assessment answers survive a reload and the journey completes', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.goto(`${BASE_URL}/career-fit-check`);

    // Answer the first three questions.
    for (let i = 0; i < 3; i++) {
      await answerCurrentQuestion(page);
      await clickNext(page);
    }

    const questionCounter = page.getByText(/Question \d+ of \d+/);
    await expect(questionCounter).toBeVisible();
    const counterBeforeReload = (await questionCounter.textContent())?.trim() || '';
    expect(counterBeforeReload).toMatch(/Question 4 of \d+/);

    // Reload mid-assessment: the persisted draft must restore progress.
    await page.reload();
    await expect(page.getByText(counterBeforeReload)).toBeVisible({ timeout: 10000 });

    // And the restored draft must still carry through to the register gate.
    await answerFitCheckToRegisterGate(page, true);
    await expect(
      page.getByText(/save your answers, then see your realistic role matches/i)
    ).toBeVisible();
  });

  test('3. analytics contract: zero first-party events while anonymous, 200s after registration', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const anonymousCalls: string[] = [];
    let registered = false;
    page.on('request', (request) => {
      if (request.url().includes(ANALYTICS_PATH) && !registered) {
        anonymousCalls.push(request.url());
      }
    });

    // Walk the entire anonymous surface: landing → full fit check → gate.
    await page.goto(BASE_URL);
    await expect(
      page.getByRole('link', { name: /find my best-fit roles/i })
    ).toBeVisible();
    await answerFitCheckToRegisterGate(page);

    // The funnel endpoint requires a registered user; the anonymous phase
    // must not have attempted a single first-party mirror call.
    expect(anonymousCalls).toHaveLength(0);

    // After registration the mirror must resume, and with 200s — not 401s.
    registered = true;
    const firstAnalyticsResponse = page.waitForResponse(
      (response) => response.url().includes(ANALYTICS_PATH),
      { timeout: 45000 }
    );
    await registerFreshUser(page, 'Lock3');
    await expect(page).toHaveURL(/\/results/, { timeout: 30000 });

    const response = await firstAnalyticsResponse;
    expect(response.status()).toBe(200);
  });
});
