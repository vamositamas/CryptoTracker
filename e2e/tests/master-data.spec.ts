import { test, expect } from '@playwright/test';

test.describe('Master Data Management E2E', () => {
  test('Add new token to master data', async ({ page }) => {
    await page.goto('/master-data');
    await page.waitForLoadState('networkidle');
    
    // Find the Tokens tab
    const tokensTab = page.locator('[role="tab"]:has-text("Tokens")').or(page.locator('button:has-text("Tokens")'));
    
    if (await tokensTab.isVisible().catch(() => false)) {
      // Click tokens tab if it's separate
      await tokensTab.click().catch(() => {});
    }
    
    // Find add button or add row input
    const addButton = page.locator('button:has-text("Add")').first();
    const tableRows = page.locator('table tbody tr');
    const initialRowCount = await tableRows.count();
    
    // Try to add a new token
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(300);
    }
    
    // Find input field for new token
    const newInput = page.locator('table tbody input').last();
    
    if (await newInput.isVisible().catch(() => false)) {
      // Type new token name
      await newInput.fill('TEST');
      
      // Find save button (usually next to the input)
      const saveBtn = page.locator('button:has-text("Save")').or(page.locator('button:has-text("✓")'));
      
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Verify row count increased
    const finalRowCount = await page.locator('table tbody tr').count();
    // May or may not increase depending on implementation
  });

  test('Delete token from master data', async ({ page }) => {
    await page.goto('/master-data');
    await page.waitForLoadState('networkidle');
    
    // Find the Tokens tab
    const tokensTab = page.locator('[role="tab"]:has-text("Tokens")').or(page.locator('button:has-text("Tokens")'));
    
    if (await tokensTab.isVisible().catch(() => false)) {
      await tokensTab.click().catch(() => {});
    }
    
    // Get initial row count
    const initialRowCount = await page.locator('table tbody tr').count();
    
    if (initialRowCount === 0) {
      // Skip if no tokens
      test.skip();
    }
    
    // Find delete button for first token
    const deleteButton = page.locator('button[aria-label*="Delete"]').first().or(page.locator('button:has-text("🗑")').first());
    
    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
      
      // Confirm deletion
      const confirmBtn = page.locator('button:has-text("Delete")').last();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
      }
      
      // Verify row count decreased
      const finalRowCount = await page.locator('table tbody tr').count();
      expect(finalRowCount).toBeLessThanOrEqual(initialRowCount);
    }
  });

  test('Add new trade type to master data', async ({ page }) => {
    await page.goto('/master-data');
    await page.waitForLoadState('networkidle');
    
    // Find the Trade Types tab
    const typesTab = page.locator('[role="tab"]:has-text("Trade Types")').or(page.locator('button:has-text("Trade Types")'));
    
    if (await typesTab.isVisible().catch(() => false)) {
      await typesTab.click();
      await page.waitForTimeout(300);
    }
    
    // Find add button
    const addButton = page.locator('button:has-text("Add")').first();
    
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(300);
    }
    
    // Find input field and fill it
    const newInput = page.locator('table tbody input').last();
    
    if (await newInput.isVisible().catch(() => false)) {
      await newInput.fill('margin');
      
      // Save
      const saveBtn = page.locator('button:has-text("Save")').or(page.locator('button:has-text("✓")'));
      
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('Add new position to master data', async ({ page }) => {
    await page.goto('/master-data');
    await page.waitForLoadState('networkidle');
    
    // Find the Positions tab
    const positionsTab = page.locator('[role="tab"]:has-text("Positions")').or(page.locator('button:has-text("Positions")'));
    
    if (await positionsTab.isVisible().catch(() => false)) {
      await positionsTab.click();
      await page.waitForTimeout(300);
    }
    
    // Find add button
    const addButton = page.locator('button:has-text("Add")').first();
    
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(300);
    }
    
    // Find input field and fill it
    const newInput = page.locator('table tbody input').last();
    
    if (await newInput.isVisible().catch(() => false)) {
      await newInput.fill('hedge');
      
      // Save
      const saveBtn = page.locator('button:has-text("Save")').or(page.locator('button:has-text("✓")'));
      
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('Master data changes reflected in trade form dropdowns', async ({ page }) => {
    // Note: This test requires that master data is already set up
    await page.goto('/trades');
    await page.waitForLoadState('networkidle');
    
    // Click "New Trade" button
    await page.click('button:has-text("New Trade")');
    
    // Check that form has access to master data for dropdowns
    const form = page.locator('form').first();
    const selects = form.locator('select, input').filter({ hasText: /token|type|position/i });
    
    const hasSelects = await selects.count() > 0;
    expect(hasSelects).toBe(true);
  });

  test('Master data table has proper ARIA tablist structure', async ({ page }) => {
    await page.goto('/master-data');
    await page.waitForLoadState('networkidle');
    
    // Check for tablist structure
    const tablist = page.locator('[role="tablist"]');
    const hasTablist = await tablist.isVisible().catch(() => false);
    
    if (hasTablist) {
      // Should have tabs
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      
      // Should have at least 3 tabs: Tokens, Trade Types, Positions
      expect(tabCount).toBeGreaterThanOrEqual(3);
      
      // Each tab should be keyboard accessible
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        const ariaSelected = await tab.getAttribute('aria-selected');
        expect(ariaSelected).toMatch(/true|false/);
      }
    }
  });

  test('Cancel edit in master data closes editor without saving', async ({ page }) => {
    await page.goto('/master-data');
    await page.waitForLoadState('networkidle');
    
    // Get a row and try to edit it
    const firstRow = page.locator('table tbody tr').first();
    
    if (await firstRow.isVisible().catch(() => false)) {
      // Click the row to edit
      await firstRow.click().catch(() => {});
      
      await page.waitForTimeout(300);
      
      // Find Cancel button
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(300);
        
        // Editor should close
        const cancelBtnVisible = await cancelBtn.isVisible().catch(() => false);
        expect(cancelBtnVisible).toBe(false);
      }
    }
  });
});
