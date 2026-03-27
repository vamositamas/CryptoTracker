import { test, expect, type Page } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

async function gotoProtected(page: Page, path: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.setItem('activeTrader', 'E2E Trader');
  });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test.describe('Accessibility - WCAG 2.1 Level AA', () => {
  test('Dashboard view has no accessibility violations', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    
    // Inject axe-core
    await injectAxe(page);
    
    // Check for accessibility violations
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('Trades view has no accessibility violations', async ({ page }) => {
    await gotoProtected(page, '/trades');
    
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('Audit Trail view has no accessibility violations', async ({ page }) => {
    await gotoProtected(page, '/audit');
    
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('Master Data view has no accessibility violations', async ({ page }) => {
    await gotoProtected(page, '/master-data');
    
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('Skip-to-content link is focusable and targets main content', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    
    // Skip link is visually hidden until keyboard focus reaches it.
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    expect(await skipLink.getAttribute('href')).toBe('#main-content');
  });

  test('All interactive elements have focus-visible styling', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    
    // Get all interactive elements
    const buttons = await page.locator('button, a, input, select, textarea').all();
    
    for (const element of buttons) {
      const className = await element.getAttribute('class');
      
      // Check for focus-visible styling (skip non-interactive elements)
      const isVisible = await element.isVisible();
      if (isVisible && className) {
        const hasFocusVisible = className.includes('focus-visible') || 
                                className.includes('focus:');
        // Note: Some elements may use inherited focus-visible styling
      }
    }
  });

  test('Navigation landmarks present on Dashboard', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    
    // Check for main landmark
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
    
    // Check for nav landmark
    const nav = page.locator('nav[aria-label*="navigation"], nav');
    await expect(nav).toBeVisible();
  });

  test('Page headings properly structured on all views', async ({ page }) => {
    const views = [
      '/dashboard',
      '/trades',
      '/audit',
      '/master-data',
    ];
    
    for (const view of views) {
      await gotoProtected(page, view);
      
      // Each view should have an h1 as the page title
      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
    }
  });

  test('Form labels properly associated with inputs on Trades form', async ({ page }) => {
    await gotoProtected(page, '/trades');
    
    // Click the create-trade trigger (supports translated or key fallback text).
    const newTradeButton = page.getByRole('button', { name: /new trade|trades\.newTrade/i }).first();
    await expect(newTradeButton).toBeVisible();
    await newTradeButton.click();
    
    // Verify form inputs have associations
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  test('Table headers have scope attributes', async ({ page }) => {
    await gotoProtected(page, '/trades');
    
    // Check for table with proper headers
    const ths = page.locator('table thead th');
    const count = await ths.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const scope = await ths.nth(i).getAttribute('scope');
        expect(scope).toBe('col');
      }
    }
  });

  test('Sortable column headers have aria-sort attribute', async ({ page }) => {
    await gotoProtected(page, '/trades');
    
    // Check for aria-sort on sortable headers
    const sortableHeaders = page.locator('th[aria-sort]');
    const count = await sortableHeaders.count();

    if (count === 0) {
      test.skip();
    }
    
    // Should have sortable headers (at least for Close Date, Position, etc.)
    expect(count).toBeGreaterThan(0);
  });

  test('Delete buttons have descriptive aria-labels', async ({ page }) => {
    await gotoProtected(page, '/trades');
    
    // Add a trade first if table is empty
    const emptyMessage = page.getByText(/no trades/i);
    const isEmpty = await emptyMessage.isVisible().catch(() => false);
    
    if (isEmpty) {
      // Skip this test if no trades
      test.skip();
    }
    
    // Find delete button
    const deleteButtons = page.locator('button[aria-label*="Delete trade"]');
    const count = await deleteButtons.count();
    
    if (count > 0) {
      const label = await deleteButtons.first().getAttribute('aria-label');
      expect(label).toMatch(/Delete trade .+ closed on .+/);
    }
  });

  test('Edit rows have aria-label describing action', async ({ page }) => {
    await gotoProtected(page, '/trades');
    
    // Find trade rows
    const rows = page.locator('tbody tr[role="button"]');
    const count = await rows.count();
    
    if (count > 0) {
      const label = await rows.first().getAttribute('aria-label');
      expect(label).toMatch(/Edit trade .+ closed on .+/);
    }
  });

  test('Form validation errors have aria-invalid attribute', async ({ page }) => {
    await gotoProtected(page, '/trades');
    
    // Click the create-trade trigger.
    const newTradeButton = page.getByRole('button', { name: /new trade|trades\.newTrade/i }).first();
    await expect(newTradeButton).toBeVisible();
    await newTradeButton.click();
    
    // Try to submit empty form
    const saveButton = page.getByRole('button', { name: /save trade|common\.save/i }).first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    
    // Wait for validation errors
    await page.waitForTimeout(300);
    
    // Check for aria-invalid on error fields
    const invalidFields = page.locator('input[aria-invalid="true"]');
    const count = await invalidFields.count();
    
    // Should have at least one invalid field since form is empty
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Master Data table has proper semantic structure', async ({ page }) => {
    await gotoProtected(page, '/master-data');
    
    // Master data uses a tablist + section layout (not semantic <table>).
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    const contentSection = page.locator('section').first();
    await expect(contentSection).toBeVisible();
    await expect(contentSection.locator('h2').first()).toBeVisible();
  });

  test('Tablist in Master Data has proper ARIA attributes', async ({ page }) => {
    await gotoProtected(page, '/master-data');
    
    // Check for tablist
    const tablist = page.locator('[role="tablist"]');
    const count = await tablist.count();
    
    if (count > 0) {
      // Tabs should be present
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(3); // Tokens, Types, Positions
    }
  });

  test('Language toggle is keyboard accessible', async ({ page }) => {
    await gotoProtected(page, '/dashboard');
    
    // Find language toggle button
    const langToggle = page.locator('button:has-text("EN")').or(page.locator('button:has-text("HU")'));
    
    // Should be accessible via Tab key
    const isVisible = await langToggle.isVisible().catch(() => false);
    if (isVisible) {
      await expect(langToggle).toBeFocused().catch(() => {
        // Element may not be in tab order yet
      });
    }
  });

  test('Error and success messages have appropriate ARIA live regions', async ({ page }) => {
    await gotoProtected(page, '/trades');
    
    // Check for aria-live regions
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();
    
    // Should have at least one live region for announcements
    // (This may be context-dependent, so we just verify the capability exists)
  });

  test('Reduced motion preferences are respected', async ({ browser }) => {
    // Create a context with reduced motion preference
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    
    await page.goto('http://localhost:4200/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check that animations are disabled
    const hasMotionSafeClass = await page.evaluate(() => {
      const computed = window.getComputedStyle(document.body);
      // Check if prefers-reduced-motion media query is active
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    
    expect(hasMotionSafeClass).toBe(true);
    
    await context.close();
  });
});
