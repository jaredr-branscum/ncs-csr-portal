import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Vehicle Garage & Subscription Lifecycle', () => {
  test.beforeAll(() => {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execSync(`${npxCmd} prisma db seed`, { stdio: 'pipe' });
  });

  test('manages vehicle garage: adds vehicle, attaches, transfers, cancels pass, and removes vehicle', async ({
    page,
  }) => {
    await page.goto('/');

    // Select customer James Smith
    const customerCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'James Smith' }).first();
    await customerCard.locator('a').click();

    const rav4Card = page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2016 Toyota RAV4' }) });
    const crvCard = page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2017 Honda CR-V' }) });
    await expect(rav4Card).toBeVisible();
    await expect(crvCard).toBeVisible();

    // Add new vehicle
    await page.locator('button:has-text("Add Vehicle")').click();
    await expect(page.locator('h3:has-text("Add Customer Vehicle")')).toBeVisible();

    await page.locator('.fixed input#licensePlate').fill('CSR-E2E-1');
    await page.locator('.fixed input#make').fill('Tesla');
    await page.locator('.fixed input#model').fill('Model 3');
    await page.locator('.fixed input#year').fill('2023');
    await page.locator('.fixed input#color').fill('Deep Blue');
    await page.locator('.fixed button[type="submit"]').click();

    const teslaCard = page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2023 Tesla Model 3' }) });
    await expect(teslaCard).toBeVisible();
    await expect(teslaCard.locator('text=CSR-E2E-1')).toBeVisible();
    await expect(teslaCard.locator('text=Unsubscribed Vehicle')).toBeVisible();

    // Attach recurring membership plan
    await teslaCard.locator('button:has-text("Attach Plan")').click();
    await expect(page.locator('h3:has-text("Attach Wash Plan")')).toBeVisible();

    const expressOption = page.locator('.fixed h4:has-text("Express Clean Pass")');
    await expect(expressOption).toBeVisible();
    await expressOption.click();

    await page.locator('.fixed button[type="submit"]').click();
    await expect(teslaCard.locator('text=Express Clean Pass')).toBeVisible();

    // Transfer membership pass between vehicles
    await teslaCard.locator('button:has-text("Transfer")').click();
    await expect(page.locator('h3:has-text("Transfer Subscription")')).toBeVisible();

    // Select vacant 2017 Honda CR-V in target list
    const targetOption = page.locator('.fixed [role="radio"]:has-text("2017 Honda CR-V")');
    await expect(targetOption).toBeVisible();
    await targetOption.click();

    await page.locator('.fixed button[type="submit"]').click();
    await expect(crvCard.locator('text=Express Clean Pass')).toBeVisible();
    await expect(teslaCard.locator('text=Unsubscribed Vehicle')).toBeVisible();

    // Cancel membership pass
    await crvCard.locator('button:has-text("Cancel")').click();
    await expect(page.locator('h3:has-text("Cancel Membership Pass")')).toBeVisible();

    await page.locator('.fixed textarea#reason').fill('Vehicle being sold');
    await page.locator('.fixed button[type="submit"]').click();

    await expect(crvCard.locator('text=NO ACTIVE PASS')).toBeVisible();

    // Remove unsubscribed vehicle (soft delete)
    await teslaCard.locator('button:has-text("Remove")').click();
    await expect(page.locator('h3:has-text("Remove Vehicle")')).toBeVisible();
    await page.locator('.fixed button[type="submit"]').click();

    await expect(page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2023 Tesla Model 3' }) })).toHaveCount(0);
  });
});
