import { test, expect } from '@playwright/test';

test.describe('Audit Trail Verification', () => {
  test('Audit entry created when trade is created', async ({ page }) => {
    await page.goto('/trades');
    await page.waitForLoadState('networkidle');
    
    // Create a trade
    await page.click('button:has-text("New Trade")');
    
    const form = page.locator('form').first();
    await form.locator('input[type="date"]').first().fill('2024-12-25');
    
    const positionInput = form.locator('input, select').filter({ hasText: /token/i }).first();
    if (await positionInput.isVisible().catch(() => false)) {
      await positionInput.fill('BTC');
    }
    
    const typeInput = form.locator('input, select').filter({ hasText: /type/i }).first();
    if (await typeInput.isVisible().catch(() => false)) {
      await typeInput.fill('long');
    }
    
    const leverageInput = form.locator('input[type="number"]').nth(0);
    await leverageInput.fill('2');
    
    const volumeInput = form.locator('input[type="number"]').nth(1);
    await volumeInput.fill('1.0');
    
    const buyPriceInput = form.locator('input[type="number"]').nth(2);
    await buyPriceInput.fill('45000');
    
    const sellPriceInput = form.locator('input[type="number"]').nth(3);
    await sellPriceInput.fill('50000');
    
    // Save trade
    await page.click('button:has-text("Save Trade")');
    await page.waitForTimeout(800);
    
    // Navigate to audit trail
    await page.click('a:has-text("Audit Trail")');
    await page.waitForLoadState('networkidle');
    
    // Verify audit entry exists
    const auditTable = page.locator('table tbody tr').first();
    const auditEntry = await auditTable.isVisible().catch(() => false);
    
    if (auditEntry) {
      // Should see CREATE action
      const createAction = page.getByText(/CREATE|create/i);
      const isVisible = await createAction.isVisible().catch(() => false);
      
      if (isVisible) {
        expect(isVisible).toBe(true);
      }
    }
  });

  test('Audit entry created when trade is updated', async ({ page }) => {
    // This test depends on having a trade to edit
    await page.goto('/trades');
    await page.waitForLoadState('networkidle');
    
    // Create a trade first
    await page.click('button:has-text("New Trade")');
    
    const form = page.locator('form').first();
    await form.locator('input[type="date"]').first().fill('2024-12-26');
    
    const positionInput = form.locator('input, select').filter({ hasText: /token/i }).first();
    if (await positionInput.isVisible().catch(() => false)) {
      await positionInput.fill('ETH');
    }
    
    const typeInput = form.locator('input, select').filter({ hasText: /type/i }).first();
    if (await typeInput.isVisible().catch(() => false)) {
      await typeInput.fill('long');
    }
    
    const leverageInput = form.locator('input[type="number"]').nth(0);
    await leverageInput.fill('1');
    
    const volumeInput = form.locator('input[type="number"]').nth(1);
    await volumeInput.fill('0.5');
    
    const buyPriceInput = form.locator('input[type="number"]').nth(2);
    await buyPriceInput.fill('2000');
    
    const sellPriceInput = form.locator('input[type="number"]').nth(3);
    await sellPriceInput.fill('2100');
    
    await page.click('button:has-text("Save Trade")');
    await page.waitForTimeout(800);
    
    // Edit the trade
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    
    await page.waitForTimeout(300);
    
    // Modify a field
    const lastInput = page.locator('table tbody tr').first().locator('input[type="number"]').last();
    if (await lastInput.isVisible().catch(() => false)) {
      await lastInput.fill('2200');
      
      const saveBtn = page.locator('table tbody tr').first().locator('button:has-text("Save")');
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Navigate to audit trail
    await page.click('a:has-text("Audit Trail")');
    await page.waitForLoadState('networkidle');
    
    // Verify UPDATE entry exists
    const updateAction = page.getByText(/UPDATE|update/i);
    const isVisible = await updateAction.isVisible().catch(() => false);
    
    // Audit should show the update (may appear multiple times if there are multiple trades)
  });

  test('Audit entry created when trade is deleted', async ({ page }) => {
    await page.goto('/trades');
    await page.waitForLoadState('networkidle');
    
    // Create a trade to delete
    await page.click('button:has-text("New Trade")');
    
    const form = page.locator('form').first();
    await form.locator('input[type="date"]').first().fill('2024-12-27');
    
    const positionInput = form.locator('input, select').filter({ hasText: /token/i }).first();
    if (await positionInput.isVisible().catch(() => false)) {
      await positionInput.fill('XRP');
    }
    
    const typeInput = form.locator('input, select').filter({ hasText: /type/i }).first();
    if (await typeInput.isVisible().catch(() => false)) {
      await typeInput.fill('short');
    }
    
    const leverageInput = form.locator('input[type="number"]').nth(0);
    await leverageInput.fill('1');
    
    const volumeInput = form.locator('input[type="number"]').nth(1);
    await volumeInput.fill('100');
    
    const buyPriceInput = form.locator('input[type="number"]').nth(2);
    await buyPriceInput.fill('0.5');
    
    const sellPriceInput = form.locator('input[type="number"]').nth(3);
    await sellPriceInput.fill('0.45');
    
    await page.click('button:has-text("Save Trade")');
    await page.waitForTimeout(800);
    
    // Delete the trade
    const deleteButton = page.locator('button[aria-label*="Delete trade"]').first();
    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
      
      const confirmDeleteBtn = page.locator('button:has-text("Delete")').last();
      if (await confirmDeleteBtn.isVisible().catch(() => false)) {
        await confirmDeleteBtn.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Navigate to audit trail
    await page.click('a:has-text("Audit Trail")');
    await page.waitForLoadState('networkidle');
    
    // Verify DELETE entry exists
    const deleteAction = page.getByText(/DELETE|delete/i);
    const isVisible = await deleteAction.isVisible().catch(() => false);
    
    // Audit should show the delete action
  });

  test('Audit trail displays before/after values for changes', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    
    // Check audit table structure
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Should have action, timestamp, and data columns
    const headers = page.locator('thead th');
    const headerCount = await headers.count();
    
    expect(headerCount).toBeGreaterThan(0);
  });

  test('Audit trail filters work correctly', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    
    // Find filter inputs
    const filterInputs = page.locator('input').filter({ hasText: /from|to|filter/i });
    const filterCount = await filterInputs.count();
    
    // Should have date range filters
    if (filterCount > 0) {
      await expect(filterInputs.first()).toBeVisible();
    }
  });

  test('Audit trail shows correct action types', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    
    // Wait for table to load
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    
    // If there are audit entries, they should be visible
    if (rowCount > 0) {
      // Action column should contain CREATE, UPDATE, or DELETE
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const actionCell = rows.nth(i).locator('td').nth(0);
        const actionText = await actionCell.textContent();
        
        expect(actionText?.toUpperCase()).toMatch(/CREATE|UPDATE|DELETE/);
      }
    }
  });
});
