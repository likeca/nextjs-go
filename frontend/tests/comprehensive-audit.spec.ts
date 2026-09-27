import { test, expect, type Page } from '@playwright/test';
import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'D:/git_projects/saas_boilerplate';

// Helper function to save screenshots
async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}`, fullPage: true });
}

// Helper function to check console errors
let consoleErrors: Array<{page: string, message: string, type: string}> = [];

function setupConsoleLogging(page: Page, pageName: string) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ page: pageName, message: msg.text(), type: 'error' });
    }
  });
  
  page.on('pageerror', error => {
    consoleErrors.push({ page: pageName, message: error.message, type: 'pageerror' });
  });
}

test.describe('Comprehensive QA Audit', () => {
  
  // 1. HOMEPAGE TESTING
  test('1. Homepage - Desktop', async ({ page }) => {
    setupConsoleLogging(page, 'Homepage');
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await takeScreenshot(page, 'audit-homepage-desktop.png');
    
    // Check for header, footer, hero
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Check navigation links - click each one
    const navLinks = await page.locator('header a').all();
    console.log(`Found ${navLinks.length} navigation links`);
    
    // Test hero section exists
    const heroSection = page.locator('text=/get started|sign up|try free/i').first();
    if (await heroSection.isVisible()) {
      console.log('✓ Hero section with CTA found');
    }
  });

  // 2. AUTHENTICATION FLOW - SIGNUP
  test('2. Signup Page - Validation Tests', async ({ page }) => {
    setupConsoleLogging(page, 'Signup');
    
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await takeScreenshot(page, 'audit-signup-desktop.png');
    
    // Test 1: Empty fields validation
    console.log('Testing empty fields...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Check for error messages
    const errorMessages = await page.locator('[class*="error"], [class*="destructive"], [role="alert"]').count();
    console.log(`Found ${errorMessages} error message elements`);
    
    // Test 2: Invalid email
    console.log('Testing invalid email...');
    await page.fill('input[name="email"], input[type="email"]', 'notanemail');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Test 3: Weak password (< 8 chars)
    console.log('Testing weak password...');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"][type="password"]', '123');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Test 4: Mismatched passwords
    console.log('Testing mismatched passwords...');
    await page.fill('input[name="password"][type="password"]', 'Password123!');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="confirm-password"]').first();
    if (await confirmPasswordInput.isVisible()) {
      await confirmPasswordInput.fill('DifferentPass123!');
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for password strength indicator
    const strengthIndicator = await page.locator('[class*="strength"], [class*="meter"]').count();
    console.log(`Password strength indicator present: ${strengthIndicator > 0}`);
    
    // Check for show/hide password toggle
    const toggleButton = await page.locator('button[aria-label*="password"], button[type="button"]:has-text("Show"), button[type="button"]:has-text("Hide")').count();
    console.log(`Password toggle present: ${toggleButton > 0}`);
  });

  // 3. LOGIN PAGE
  test('3. Login Page - Validation Tests', async ({ page }) => {
    setupConsoleLogging(page, 'Login');
    
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await takeScreenshot(page, 'audit-login-desktop.png');
    
    // Test empty fields
    console.log('Testing empty login fields...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Test invalid email
    console.log('Testing invalid email...');
    await page.fill('input[name="email"], input[type="email"]', 'invalidemail');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Test invalid password (< 8 chars)
    console.log('Testing short password...');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Check for "Forgot Password" link
    const forgotPasswordLink = await page.locator('a:has-text("Forgot"), a:has-text("forgot")').count();
    console.log(`Forgot Password link present: ${forgotPasswordLink > 0}`);
    
    // Check for show/hide password toggle
    const toggleButton = await page.locator('button[aria-label*="password"], button:has-text("Show"), button:has-text("Hide")').count();
    console.log(`Password toggle present: ${toggleButton > 0}`);
  });

  // 4. FORGOT PASSWORD
  test('4. Forgot Password Page', async ({ page }) => {
    setupConsoleLogging(page, 'Forgot Password');
    
    await page.goto(`${BASE_URL}/forgot-password`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await takeScreenshot(page, 'audit-forgot-password.png');
    
    // Test empty email
    console.log('Testing empty email...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Test invalid email
    console.log('Testing invalid email...');
    await page.fill('input[type="email"]', 'notanemail');
    await submitBtn.click();
    await page.waitForTimeout(1000);
  });

  // 5. RESET PASSWORD
  test('5. Reset Password Page', async ({ page }) => {
    setupConsoleLogging(page, 'Reset Password');
    
    await page.goto(`${BASE_URL}/reset-password`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await takeScreenshot(page, 'audit-reset-password.png');
    
    // Document what's on the page
    const hasForm = await page.locator('form').count();
    console.log(`Form present: ${hasForm > 0}`);
  });

  // 6. PROTECTED ROUTES - CRITICAL SECURITY TEST
  test('6. Protected Routes - Security Test (UNAUTHENTICATED)', async ({ page }) => {
    setupConsoleLogging(page, 'Protected Routes');
    
    const protectedRoutes = [
      '/profile',
      '/billing',
      '/dashboard',
      '/account',
      '/users',
      '/settings'
    ];
    
    for (const route of protectedRoutes) {
      console.log(`Testing protected route: ${route}`);
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const screenshotName = `audit-protected-${route.replace('/', '')}.png`;
      await takeScreenshot(page, screenshotName);
      
      // Check if redirected to login or unauthorized
      if (currentUrl.includes('/login') || currentUrl.includes('/unauthorized')) {
        console.log(`✓ ${route} correctly redirected to ${currentUrl}`);
      } else if (currentUrl.includes(route)) {
        console.log(`✗ SECURITY ISSUE: ${route} accessible without authentication!`);
      } else {
        console.log(`? ${route} redirected to ${currentUrl}`);
      }
    }
  });

  // 7. CONTACT FORM
  test('7. Contact Form - Validation Tests', async ({ page }) => {
    setupConsoleLogging(page, 'Contact');
    
    await page.goto(`${BASE_URL}/contact`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await takeScreenshot(page, 'audit-contact-desktop.png');
    
    // Test empty fields
    console.log('Testing empty contact form...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Test invalid email
    console.log('Testing invalid email...');
    await page.fill('input[name="email"], input[type="email"]', 'invalidemail');
    await submitBtn.click();
    await page.waitForTimeout(1000);
    
    // Test short message (< 10 chars)
    console.log('Testing short message...');
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="fullName"], input[name="name"]', 'Test User');
    const messageField = page.locator('textarea[name="message"]');
    if (await messageField.isVisible()) {
      await messageField.fill('Short');
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Test XSS payload
    console.log('Testing XSS payload...');
    await messageField.fill('<script>alert("XSS")</script>');
    
    // Test SQL injection
    console.log('Testing SQL injection string...');
    await messageField.fill("'; DROP TABLE users; --");
    
    // Test very long name (500 chars)
    console.log('Testing long name...');
    await page.fill('input[name="fullName"], input[name="name"]', 'A'.repeat(500));
    
    // Test special characters
    console.log('Testing special characters...');
    await page.fill('input[name="fullName"], input[name="name"]', '!@#$%^&*()');
  });

  // 8. STATIC PAGES
  test('8. Static Pages - Terms, Privacy, Unauthorized, Blog', async ({ page }) => {
    setupConsoleLogging(page, 'Static Pages');
    
    const staticPages = [
      { url: '/terms', screenshot: 'audit-terms.png' },
      { url: '/privacy', screenshot: 'audit-privacy.png' },
      { url: '/unauthorized', screenshot: 'audit-unauthorized.png' },
      { url: '/blog', screenshot: 'audit-blog.png' }
    ];
    
    for (const staticPage of staticPages) {
      console.log(`Testing ${staticPage.url}...`);
      await page.goto(`${BASE_URL}${staticPage.url}`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, staticPage.screenshot);
      
      // Check if page has content
      const bodyText = await page.locator('body').textContent();
      console.log(`${staticPage.url} has content: ${bodyText && bodyText.length > 100}`);
    }
  });

  // 9. MOBILE RESPONSIVENESS
  test('9. Mobile Responsiveness - 375px', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    setupConsoleLogging(page, 'Mobile 375px');
    
    const pages = [
      { url: '/', screenshot: 'audit-home-375px.png' },
      { url: '/login', screenshot: 'audit-login-375px.png' },
      { url: '/signup', screenshot: 'audit-signup-375px.png' },
      { url: '/contact', screenshot: 'audit-contact-375px.png' }
    ];
    
    for (const testPage of pages) {
      console.log(`Testing ${testPage.url} at 375px...`);
      await page.goto(`${BASE_URL}${testPage.url}`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, testPage.screenshot);
      
      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      console.log(`${testPage.url} has horizontal overflow: ${hasOverflow}`);
    }
    
    await context.close();
  });

  test('10. Mobile Responsiveness - 768px', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await context.newPage();
    setupConsoleLogging(page, 'Tablet 768px');
    
    const pages = [
      { url: '/', screenshot: 'audit-home-768px.png' },
      { url: '/login', screenshot: 'audit-login-768px.png' },
      { url: '/signup', screenshot: 'audit-signup-768px.png' },
      { url: '/contact', screenshot: 'audit-contact-768px.png' }
    ];
    
    for (const testPage of pages) {
      console.log(`Testing ${testPage.url} at 768px...`);
      await page.goto(`${BASE_URL}${testPage.url}`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, testPage.screenshot);
    }
    
    await context.close();
  });

  test('11. Mobile Responsiveness - 1024px', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    setupConsoleLogging(page, 'Desktop 1024px');
    
    const pages = [
      { url: '/', screenshot: 'audit-home-1024px.png' },
      { url: '/login', screenshot: 'audit-login-1024px.png' },
      { url: '/signup', screenshot: 'audit-signup-1024px.png' },
      { url: '/contact', screenshot: 'audit-contact-1024px.png' }
    ];
    
    for (const testPage of pages) {
      console.log(`Testing ${testPage.url} at 1024px...`);
      await page.goto(`${BASE_URL}${testPage.url}`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, testPage.screenshot);
    }
    
    await context.close();
  });

  // 12. 404 PAGE
  test('12. 404 Error Page', async ({ page }) => {
    setupConsoleLogging(page, '404 Page');
    
    await page.goto(`${BASE_URL}/nonexistent-page-404-test`);
    await page.waitForLoadState('networkidle');
    
    await takeScreenshot(page, 'audit-404.png');
    
    // Check if it's a styled 404 page
    const bodyText = await page.locator('body').textContent();
    const has404Text = bodyText?.includes('404') || bodyText?.includes('Not Found') || bodyText?.includes('not found');
    console.log(`Styled 404 page present: ${has404Text}`);
    
    // Check for home link
    const homeLink = await page.locator('a[href="/"], a:has-text("Home"), a:has-text("home")').count();
    console.log(`Home link present on 404: ${homeLink > 0}`);
  });

  // 13. SECURITY HEADERS
  test('13. Security Headers Check', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    const headers = response?.headers() || {};
    
    console.log('\n=== SECURITY HEADERS CHECK ===');
    console.log(`Content-Security-Policy: ${headers['content-security-policy'] ? '✓ Present' : '✗ Missing'}`);
    console.log(`X-Frame-Options: ${headers['x-frame-options'] ? '✓ Present' : '✗ Missing'}`);
    console.log(`X-Content-Type-Options: ${headers['x-content-type-options'] ? '✓ Present' : '✗ Missing'}`);
    console.log(`Strict-Transport-Security: ${headers['strict-transport-security'] ? '✓ Present' : '✗ Missing'}`);
    console.log(`Referrer-Policy: ${headers['referrer-policy'] ? '✓ Present' : '✗ Missing'}`);
    console.log('================================\n');
  });

  // 14. ACCESSIBILITY CHECKS
  test('14. Accessibility Checks - Home, Login, Signup', async ({ page }) => {
    const pages = [
      { url: '/', name: 'Home' },
      { url: '/login', name: 'Login' },
      { url: '/signup', name: 'Signup' }
    ];
    
    for (const testPage of pages) {
      console.log(`\n=== ACCESSIBILITY: ${testPage.name} ===`);
      await page.goto(`${BASE_URL}${testPage.url}`);
      await page.waitForLoadState('networkidle');
      
      // Check for h1
      const h1Count = await page.locator('h1').count();
      console.log(`H1 tags: ${h1Count} ${h1Count === 1 ? '✓' : h1Count === 0 ? '✗ Missing' : '⚠ Multiple'}`);
      
      // Check for images with alt text
      const images = await page.locator('img').all();
      let imagesWithoutAlt = 0;
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        if (!alt || alt.trim() === '') {
          imagesWithoutAlt++;
        }
      }
      console.log(`Images without alt text: ${imagesWithoutAlt} ${imagesWithoutAlt === 0 ? '✓' : '✗'}`);
      
      // Check for form labels
      const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"], textarea').all();
      let inputsWithoutLabel = 0;
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = await page.locator(`label[for="${id}"]`).count();
          if (label === 0 && !ariaLabel && !ariaLabelledby) {
            inputsWithoutLabel++;
          }
        } else if (!ariaLabel && !ariaLabelledby) {
          inputsWithoutLabel++;
        }
      }
      console.log(`Form inputs without labels: ${inputsWithoutLabel} ${inputsWithoutLabel === 0 ? '✓' : '✗'}`);
      
      console.log('================================\n');
    }
  });

  // 15. EDGE CASES
  test('15. Edge Cases - Long Input, Unicode, Special Chars', async ({ page }) => {
    setupConsoleLogging(page, 'Edge Cases');
    
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');
    
    // Test very long email (500 chars)
    console.log('Testing 500-char email...');
    const longEmail = 'a'.repeat(500) + '@example.com';
    await page.fill('input[name="email"], input[type="email"]', longEmail);
    
    // Test Unicode in name
    console.log('Testing Unicode in name...');
    const nameInput = page.locator('input[name="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('测试用户 👨‍💻');
    }
    
    // Test special characters
    console.log('Testing special characters...');
    await nameInput.fill('!@#$%^&*()');
    
    // Test rapid submission
    console.log('Testing rapid double-click...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await submitBtn.click(); // Double click
    await page.waitForTimeout(2000);
    
    // Check if button shows loading state or is disabled
    const isDisabled = await submitBtn.isDisabled();
    console.log(`Submit button disabled during submission: ${isDisabled ? '✓' : '✗'}`);
  });

  // FINAL: Print all console errors
  test.afterAll(async () => {
    console.log('\n\n=== ALL CONSOLE ERRORS ===');
    if (consoleErrors.length === 0) {
      console.log('✓ No console errors found!');
    } else {
      consoleErrors.forEach((error, index) => {
        console.log(`\n${index + 1}. Page: ${error.page}`);
        console.log(`   Type: ${error.type}`);
        console.log(`   Message: ${error.message}`);
      });
    }
    console.log('==========================\n');
  });
});
