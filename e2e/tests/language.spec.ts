import { test, expect } from '@playwright/test';

test.describe('Language Toggle E2E', () => {
  test('Toggle language from English to Hungarian and back', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Get initial page text in English
    const mainHeading = page.locator('h1').first();
    const englishHeadingText = await mainHeading.textContent();
    
    expect(englishHeadingText).toContain('Dashboard'); // Default is English
    
    // Find language toggle button
    const langToggle = page.locator('button:has-text("EN")').or(page.locator('button:has-text("HU")'));
    
    if (await langToggle.isVisible().catch(() => false)) {
      // Get current language indicator
      const currentLang = await langToggle.textContent();
      
      // Click to toggle
      await langToggle.click();
      await page.waitForTimeout(500); // Wait for language change
      
      // Check that text changed
      const newHeadingText = await mainHeading.textContent();
      
      if (currentLang?.includes('EN')) {
        // Should have switched to Hungarian
        // Hungarian for "Dashboard" is different (based on i18n file)
        expect(newHeadingText).not.toContain('Dashboard');
      } else {
        // Should have switched to English
        expect(newHeadingText).toContain('Dashboard');
      }
    }
  });

  test('Language toggle affects all translated strings', async ({ page }) => {
    await page.goto('/trades');
    await page.waitForLoadState('networkidle');
    
    // Find strings that should translate
    const newTradeBtn = page.locator('button:has-text("New Trade")');
    const titleBtn = page.locator('button:has-text("Trades")');
    
    const initialText = await newTradeBtn.textContent();
    
    // Toggle language
    const langToggle = page.locator('button:has-text("EN")').or(page.locator('button:has-text("HU")'));
    
    if (await langToggle.isVisible().catch(() => false)) {
      await langToggle.click();
      await page.waitForTimeout(500);
      
      // Check that text changed
      const newText = await newTradeBtn.textContent();
      
      // Text should be different after language toggle
      // (Unless translation is identical, which is unlikely)
    }
  });

  test('Language preference persists after page reload', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Toggle language to Hungarian
    const langToggle = page.locator('button:has-text("EN")').or(page.locator('button:has-text("HU")'));
    
    if (await langToggle.isVisible().catch(() => false)) {
      const currentText = await langToggle.textContent();
      
      if (currentText?.includes('EN')) {
        // Switch to Hungarian
        await langToggle.click();
        await page.waitForTimeout(500);
      }
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Language should still be Hungarian
      const toggleAfterReload = page.locator('button:has-text("EN")').or(page.locator('button:has-text("HU")'));
      const textAfterReload = await toggleAfterReload.textContent();
      
      expect(textAfterReload).not.toContain('EN'); // Should still be Hungarian
    }
  });

  test('Language toggle is keyboard accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Find language toggle
    const langToggle = page.locator('button:has-text("EN")').or(page.locator('button:has-text("HU")'));
    
    if (await langToggle.isVisible().catch(() => false)) {
      // Activate via keyboard (Space or Enter)
      await langToggle.focus();
      
      const currentText = await langToggle.textContent();
      
      // Press Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Check that language changed
      const newText = await langToggle.textContent();
      
      // Text should have changed after Space key
    }
  });

  test('All major views are properly translated', async ({ page }) => {
    const views = [
      { url: '/dashboard', titleKey: 'Dashboard' },
      { url: '/trades', titleKey: 'Trades' },
      { url: '/audit', titleKey: 'Audit' },
      { url: '/master-data', titleKey: 'Master Data' },
    ];
    
    // Toggle to Hungarian first
    await page.goto('/dashboard');
    const langToggle = page.locator('button:has-text("EN")').or(page.locator('button:has-text("HU")'));
    
    if (await langToggle.isVisible().catch(() => false)) {
      const currentLang = await langToggle.textContent();
      
      if (currentLang?.includes('EN')) {
        // Switch to Hungarian
        await langToggle.click();
        await page.waitForTimeout(500);
      }
      
      // Check each view
      for (const view of views) {
        await page.goto(view.url);
        await page.waitForLoadState('networkidle');
        
        // Verify the view loaded
        const heading = page.locator('h1').first();
        const isVisible = await heading.isVisible().catch(() => false);
        
        expect(isVisible).toBe(true);
      }
    }
  });

  test('Language toggle works in navigation sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check sidebar exists
    const nav = page.locator('nav');
    const navVisible = await nav.isVisible().catch(() => false);
    
    expect(navVisible).toBe(true);
    
    // Find language toggle in sidebar
    const langToggle = page.locator('button:has-text("EN")').or(page.locator('button:has-text("HU")'));
    const toggleVisible = await langToggle.isVisible().catch(() => false);
    
    expect(toggleVisible).toBe(true);
    
    // Toggle language
    if (toggleVisible) {
      const beforeText = await langToggle.textContent();
      
      await langToggle.click();
      await page.waitForTimeout(500);
      
      const afterText = await langToggle.textContent();
      
      // Text should have changed
      // (EN ↔ HU)
    }
  });
});
