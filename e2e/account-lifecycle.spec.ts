import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Account Deactivation & Reactivation Lifecycle', () => {
  test.beforeAll(() => {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execSync(`${npxCmd} prisma db seed`, { stdio: 'pipe' });
  });

  test('deactivates account with reason and reactivates account ("I want to cancel my account")', async ({
    page,
  }) => {
    await page.goto('/');

    // Select active customer Emma Johnson
    const customerCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'Emma Johnson' }).first();
    await customerCard.locator('a').click();

    // Deactivate account
    await page.locator('button:has-text("Deactivate Account")').click();
    await expect(page.locator('text=Deactivate Customer Account')).toBeVisible();

    await page.locator('.fixed input#deactivate-reason').fill('Customer moving out of service territory');
    await page.locator('.fixed button[type="submit"]').click();

    // Verify inactive status badge and reactivate action button
    await expect(page.locator('span:has-text("INACTIVE")').first()).toBeVisible();
    const reactivateBtn = page.locator('button:has-text("Reactivate Account")');
    await expect(reactivateBtn).toBeVisible();

    // Reactivate account via confirmation modal
    await reactivateBtn.click();
    await expect(page.locator('text=Reactivate Customer Account')).toBeVisible();
    await page.locator('.fixed input#reactivate-reason').fill('Customer returned to service territory');
    await page.locator('.fixed button[type="submit"]').click();
    await expect(page.locator('button:has-text("Deactivate Account")')).toBeVisible();
  });
});
