import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const TEST_EMAIL = 'captcha-e2e@example.com';
const TEST_PASSWORD = 'CaptchaTest123!';

test.describe('Login form reCAPTCHA v3', () => {
  test('loads the reCAPTCHA script, hides the badge, shows disclosure under CSP', async ({ page }) => {
    const cspViolations: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /content security policy/i.test(msg.text())) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/login`);

    // Script tag injected by the form
    await expect(page.locator('#google-recaptcha-v3')).toBeAttached();

    // grecaptcha global becomes available (script executed — not CSP-blocked)
    await page.waitForFunction(() => typeof (window as any).grecaptcha !== 'undefined');

    // v3 badge iframe renders (frame-src allows www.google.com) …
    await expect(page.locator('iframe[src*="google.com/recaptcha"]')).toBeAttached();

    // … but the badge itself is hidden via .grecaptcha-badge { visibility: hidden }
    const badge = page.locator('.grecaptcha-badge');
    await expect(badge).toBeAttached();
    await expect(badge).toBeHidden();

    // Google-required disclosure text (mandatory when the badge is hidden)
    await expect(page.getByText(/protected by reCAPTCHA/i)).toBeVisible();

    expect(cspViolations).toEqual([]);
  });

  test('wrong password: captcha passes server verification, Django rejects credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForFunction(() => typeof (window as any).grecaptcha !== 'undefined');

    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.locator('#password').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Login' }).click();

    // Django's credential error — NOT the captcha error — proves the token
    // was accepted by Google siteverify and the request reached the backend.
    // Generous timeout: the first siteverify call from a cold server can take
    // ~20s while DNS/TLS warm up.
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 45_000 });
    await expect(toast).not.toContainText(/security check/i);
  });

  test('forged captcha token is rejected server-side', async ({ page }) => {
    // Pin window.grecaptcha to a fake that returns a bogus token, so the
    // server action must reject it via Google siteverify.
    await page.addInitScript(() => {
      const fake = {
        ready: (cb: () => void) => cb(),
        execute: async () => 'forged-token-should-fail-siteverify',
      };
      Object.defineProperty(window, 'grecaptcha', {
        configurable: false,
        get: () => fake,
        set: () => {},
      });
    });

    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText(/security check failed/i)).toBeVisible({ timeout: 20_000 });
  });

  test('valid credentials + real captcha: login succeeds', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForFunction(() => typeof (window as any).grecaptcha !== 'undefined');

    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText(/logged in successfully/i)).toBeVisible({ timeout: 45_000 });
    // Regular users land on /profile, admins on /dashboard (getRedirectUrl)
    await page.waitForURL(/dashboard|profile/, { timeout: 20_000 });
  });
});
