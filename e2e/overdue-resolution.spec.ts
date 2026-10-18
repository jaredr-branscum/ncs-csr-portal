import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Overdue Payment & Delinquency Resolution', () => {
  test.beforeAll(() => {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execSync(`${npxCmd} prisma db seed`, { stdio: 'pipe' });
  });

  test('resolves past-due subscription and restores wash access ("I cannot get a wash")', async ({
    page,
  }) => {
    await page.goto('/');

    // Select customer James Smith who has an overdue subscription
    const customerCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'James Smith' }).first();
    await customerCard.locator('a').click();

    // Verify overdue alert banner & gate lock notice
    await expect(page.locator('text=Gate Entry Suspended')).toBeVisible();
    await expect(page.locator('text=Payment Past Due — Wash Access Suspended')).toBeVisible();

    const rav4Card = page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2016 Toyota RAV4' }) });
    await expect(rav4Card.locator('text=OVERDUE PASS')).toBeVisible();

    // Modal confirmation resolution
    const resolveBtn = page.locator('button:has-text("Resolve Payment")');
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Verify modal appears and confirm settlement
    await expect(page.locator('text=Resolve Overdue Payment')).toBeVisible();
    await page.locator('.fixed button[type="submit"]').click();

    // Verify alert cleared, customer status ACTIVE, and pass restored
    await expect(page.locator('text=Gate Entry Suspended')).toHaveCount(0);
    await expect(rav4Card.locator('text=ACTIVE PASS')).toBeVisible();
    await expect(page.locator('text=Overdue Payment Resolution')).toBeVisible();
  });

  test('supports selective overdue resolution for multi-vehicle customer', async ({
    page,
  }) => {
    await page.goto('/');

    // Search and select customer Elena Rostova who has multiple overdue subscriptions
    const searchInput = page.locator('input[role="searchbox"]');
    await searchInput.fill('Elena Rostova');
    await page.waitForTimeout(400);

    const customerCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'Elena Rostova' }).first();
    await customerCard.locator('a').click();

    // Verify overdue alert banner & gate lock notice
    await expect(page.locator('text=Gate Entry Suspended')).toBeVisible();
    await expect(page.locator('text=Payment Past Due — Wash Access Suspended')).toBeVisible();

    const bmwCard = page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2022 BMW X5' }) });
    const audiCard = page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2021 Audi Q5' }) });
    await expect(bmwCard.locator('text=OVERDUE PASS')).toBeVisible();
    await expect(audiCard.locator('text=OVERDUE PASS')).toBeVisible();

    // Open resolve payment modal
    const resolveBtn = page.locator('button:has-text("Resolve Payment")');
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Modal appears with selective options
    await expect(page.locator('text=Resolve Overdue Payment')).toBeVisible();
    await expect(page.locator('text=Delinquent Subscriptions (2):')).toBeVisible();
    await expect(page.locator('text=2 of 2 selected')).toBeVisible();

    const bmwCheckbox = page.locator('input[type="checkbox"][aria-label*="AMP-901"]');
    const audiCheckbox = page.locator('input[type="checkbox"][aria-label*="AMP-902"]');
    await expect(bmwCheckbox).toBeChecked();
    await expect(audiCheckbox).toBeChecked();

    const submitBtn = page.locator('.fixed button[type="submit"]');

    // Deselect both -> submit is disabled with validation message
    await bmwCheckbox.click();
    await audiCheckbox.click();
    await expect(submitBtn).toBeDisabled();
    await expect(page.locator('text=Select at least one vehicle to resolve.')).toBeVisible();

    // Select only BMW X5 -> total updates to $34.99 and button re-enabled
    await bmwCheckbox.click();
    await expect(submitBtn).toBeEnabled();
    await expect(submitBtn).toHaveText(/Confirm Settlement \(\$34\.99\)/);

    // Submit selective settlement
    await submitBtn.click();

    // Verify BMW X5 is restored to ACTIVE PASS, while Audi Q5 remains OVERDUE PASS
    await expect(bmwCard.locator('text=ACTIVE PASS')).toBeVisible();
    await expect(audiCard.locator('text=OVERDUE PASS')).toBeVisible();

    // Customer status remains OVERDUE because Audi Q5 is still overdue
    await expect(page.locator('text=Gate Entry Suspended')).toBeVisible();
    await expect(page.locator('text=Payment Past Due — Wash Access Suspended')).toBeVisible();

    // Verify ledger records the specific plan name settled
    await expect(page.locator('text=Unlimited Platinum — Overdue Payment Resolution')).toBeVisible();

    // Now resolve remaining Audi Q5 subscription
    await resolveBtn.click();
    await expect(page.locator('text=Resolve Overdue Payment')).toBeVisible();

    // Only 1 overdue pass remains, so it displays as fixed item (no checkbox)
    await expect(page.locator('.fixed input[type="checkbox"]')).toHaveCount(0);
    await expect(page.locator('.fixed', { hasText: '2021 Audi Q5' })).toBeVisible();
    await page.locator('.fixed button[type="submit"]').click();

    // Verify all overdue passes are resolved and account is fully ACTIVE
    await expect(page.locator('text=Gate Entry Suspended')).toHaveCount(0);
    await expect(page.locator('text=Payment Past Due — Wash Access Suspended')).toHaveCount(0);
    await expect(audiCard.locator('text=ACTIVE PASS')).toBeVisible();
    await expect(page.locator('text=Express Clean Pass — Overdue Payment Resolution')).toBeVisible();
  });

  test('does not leak open modal state when selecting a different customer after resolution', async ({
    page,
  }) => {
    await page.goto('/');

    // Select the first overdue customer from the list
    const firstOverdueCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'OVERDUE' }).first();
    await firstOverdueCard.locator('a').click();

    // Verify overdue banner visible
    await expect(page.locator('text=Gate Entry Suspended')).toBeVisible();

    // Open modal and resolve overdue payment
    await page.locator('button:has-text("Resolve Payment")').click();
    await expect(page.locator('text=Resolve Overdue Payment')).toBeVisible();
    await page.locator('.fixed button[type="submit"]').click();

    // Customer is now ACTIVE and modal is closed
    await expect(page.locator('text=Gate Entry Suspended')).toHaveCount(0);
    await expect(page.locator('text=Resolve Overdue Payment')).toHaveCount(0);

    // Click on another overdue customer in directory list
    const nextOverdueCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'OVERDUE' }).first();
    await nextOverdueCard.locator('a').click();

    // Verify new customer workspace is displayed without modal popping up
    await expect(page.locator('text=Gate Entry Suspended')).toBeVisible();
    await expect(page.locator('text=Resolve Overdue Payment')).toHaveCount(0);
  });

  test('auto-resolves customer status to ACTIVE when an overdue subscription is cancelled', async ({
    page,
  }) => {
    await page.goto('/');

    // Search and select customer Jordan Blake who has an overdue subscription
    const searchInput = page.locator('input[role="searchbox"]');
    await searchInput.fill('Jordan Blake');
    await page.waitForTimeout(400);

    const customerCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'Jordan Blake' }).first();
    await customerCard.locator('a').click();

    // Verify overdue alert banner & gate lock notice
    await expect(page.locator('text=Gate Entry Suspended')).toBeVisible();

    const subaruCard = page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2021 Subaru Outback' }) });
    await expect(subaruCard.locator('text=OVERDUE PASS')).toBeVisible();

    // Click Cancel on the pass
    await subaruCard.locator('button:has-text("Cancel")').click();

    // Confirm cancellation in modal
    await expect(page.locator('text=Cancel Membership Pass')).toBeVisible();
    await page.locator('.fixed button[type="submit"]:has-text("Confirm Cancellation")').click();

    // Verify pass is cancelled, customer status is restored to ACTIVE, and overdue alert is completely gone
    await expect(page.locator('text=Gate Entry Suspended')).toHaveCount(0);
    await expect(subaruCard.locator('text=NO ACTIVE PASS')).toBeVisible();
    await expect(page.locator('span:has-text("ACTIVE")').first()).toBeVisible();
  });

  test('resolves overdue account with $0.00 balance and restores gate access', async ({
    page,
  }) => {
    await page.goto('/');

    const searchInput = page.locator('input[role="searchbox"]');
    await searchInput.fill('Sophia Davis');
    await page.waitForTimeout(400);

    const customerCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'Sophia Davis' }).first();
    await customerCard.locator('a').click();

    // Verify zero-balance overdue delinquency banner
    await expect(page.locator('text=Gate Entry Suspended')).toBeVisible();
    await expect(page.locator('text=Account Delinquency — Gate Entry Suspended')).toBeVisible();

    // Open modal via Clear Delinquency button
    const resolveBtn = page.locator('button:has-text("Clear Delinquency")');
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Modal displays clear administrative clearance explanation
    await expect(page.locator('text=Administrative Account Clearance')).toBeVisible();
    const confirmBtn = page.locator('.fixed button[type="submit"]:has-text("Clear Delinquency & Unlock Gate")');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify gate unlocked and customer status restored to ACTIVE
    await expect(page.locator('text=Gate Entry Suspended')).toHaveCount(0);
    await expect(page.locator('span:has-text("ACTIVE")').first()).toBeVisible();
  });

  test('displays IneligibleTransferNotice when attempting to transfer an overdue pass', async ({
    page,
  }) => {
    await page.goto('/');

    // Search and select dedicated persona Carlos Ortiz who has an overdue pass and a second vehicle
    const searchInput = page.locator('input[role="searchbox"]');
    await searchInput.fill('Carlos Ortiz');
    await page.waitForTimeout(400);

    const customerCard = page.locator('ul[aria-label="Customer list"] > li', { hasText: 'Carlos Ortiz' }).first();
    await customerCard.locator('a').click();

    const corvetteCard = page.locator('div.rounded-xl', { has: page.locator('h3', { hasText: '2022 Chevrolet Corvette' }) });
    await expect(corvetteCard.locator('text=OVERDUE PASS')).toBeVisible();

    // Click Transfer on overdue vehicle
    await corvetteCard.locator('button:has-text("Transfer")').click();

    // Verify modal appears with ineligibility notice
    await expect(page.locator('h3:has-text("Transfer Subscription")')).toBeVisible();
    await expect(
      page.locator('text=Past-due subscriptions cannot be transferred. Please resolve outstanding balances first.')
    ).toBeVisible();

    // Verify submit button is not present and Close button closes modal
    await expect(page.locator('.fixed button[type="submit"]')).toHaveCount(0);
    await page.locator('.fixed button:has-text("Close")').click();
    await expect(page.locator('h3:has-text("Transfer Subscription")')).toHaveCount(0);
  });
});

