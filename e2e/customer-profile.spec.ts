import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Customer Profile & Account Management', () => {
  test.beforeAll(() => {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execSync(`${npxCmd} prisma db seed`, { stdio: 'pipe' });
  });

  test('views Customer 360 workspace and edits profile with validation', async ({ page }) => {
    await page.goto('/');

    const jamesCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'James Smith' });
    await jamesCard.locator('a').click();

    await expect(page).toHaveURL(/userId=/);
    await expect(page.locator('h2:has-text("James Smith")')).toBeVisible();

    // Verify Customer 360 sections
    await expect(page.locator('text=Vehicle Garage & Passes')).toBeVisible();
    await expect(page.locator('text=Billing & Purchase Ledger')).toBeVisible();
    await expect(page.locator('text=Lifetime Spend')).toBeVisible();

    // Open Edit Profile modal
    await page.locator('button:has-text("Edit Profile")').click();
    await expect(page.locator('text=Edit Customer Account')).toBeVisible();

    // Test form validation: empty legal name
    const nameInput = page.locator('.fixed input#name');
    await nameInput.fill('');
    await page.locator('.fixed button[type="submit"]').click();
    await expect(page.locator('text=Name is required')).toBeVisible();

    // Submit valid update
    await nameInput.fill('James Robert Smith');
    await page.locator('.fixed input#phone').fill('(555) 100-9999');
    await page.locator('.fixed button[type="submit"]').click();

    // Verify modal dismissed and profile updated
    await expect(page.locator('h3:has-text("Edit Customer Account")')).toHaveCount(0);
    await expect(page.locator('h2:has-text("James Robert Smith")')).toBeVisible();
    await expect(page.locator('p:has-text("(555) 100-9999")')).toBeVisible();
  });

  test('accurately calculates lifetime spend and transactions for customers with >20 purchases', async ({ page }) => {
    await page.goto('/');

    // Search and select Samantha Reed (seeded with 25 transactions)
    const searchInput = page.locator('input[role="searchbox"]');
    await searchInput.click();
    await searchInput.fill('Samantha Reed');

    const samanthaCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'Samantha Reed' });
    await expect(samanthaCard).toBeVisible();
    await samanthaCard.locator('a').click();

    await expect(page).toHaveURL(/userId=/);
    await expect(page.locator('h2:has-text("Samantha Reed")')).toBeVisible();

    await expect(page.locator('text=Billing & Purchase Ledger')).toBeVisible();
    await expect(page.locator('p:has-text("Transactions") + p')).toHaveText('25');

    // Lifetime Spend must aggregate all 25 purchases ($805.78: 22*$34.99 + 2*$18.00 + $0 promo)
    await expect(page.locator('p:has-text("Lifetime Spend") + p')).toHaveText('$805.78');
    await expect(page.locator('p:has-text("Promos Redeemed") + p')).toHaveText('1');

    // Page 1 displays first 10 transactions with pagination bar
    const purchaseRows = page.locator('div.space-y-2\\.5 > div');
    await expect(purchaseRows).toHaveCount(10);
    await expect(page.locator('text=Showing 1–10 of 25 transactions')).toBeVisible();
    await expect(page.locator('text=Page 1 of 3')).toBeVisible();

    const prevButton = page.locator('button[aria-label="Previous page"]');
    const nextButton = page.locator('button[aria-label="Next page"]');
    await expect(prevButton).toBeDisabled();
    await expect(nextButton).toBeEnabled();

    // Navigate to Page 2
    await nextButton.click();
    await expect(page.locator('text=Showing 11–20 of 25 transactions')).toBeVisible();
    await expect(page.locator('text=Page 2 of 3')).toBeVisible();
    await expect(purchaseRows).toHaveCount(10);
    await expect(prevButton).toBeEnabled();
    await expect(nextButton).toBeEnabled();

    // Navigate to Page 3 (final page with 5 items)
    await nextButton.click();
    await expect(page.locator('text=Showing 21–25 of 25 transactions')).toBeVisible();
    await expect(page.locator('text=Page 3 of 3')).toBeVisible();
    await expect(purchaseRows).toHaveCount(5);
    await expect(prevButton).toBeEnabled();
    await expect(nextButton).toBeDisabled();

    // Navigate back to Page 2
    await prevButton.click();
    await expect(page.locator('text=Showing 11–20 of 25 transactions')).toBeVisible();
    await expect(page.locator('text=Page 2 of 3')).toBeVisible();
    await expect(purchaseRows).toHaveCount(10);
  });
});
