import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Customer Directory & Multi-Attribute Search', () => {
  test.beforeAll(() => {
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execSync(`${npxCmd} prisma db seed`, { stdio: 'pipe' });
  });

  test('displays customer directory with status badges and reactive search', async ({ page }) => {
    await page.goto('/');

    // Verify layout and branding
    await expect(page.locator('header')).toContainText('AMP');
    await expect(page.locator('header')).toContainText('CSR Portal');
    await expect(page.locator('h1')).toHaveText('Registered Customers');

    const customerCards = page.locator('ul[aria-label="Customer list"] > li');
    await expect(customerCards).toHaveCount(20);

    // Verify presence of status badges
    await expect(page.locator('text=OVERDUE').first()).toBeVisible();
    await expect(page.locator('text=ACTIVE').first()).toBeVisible();

    // Search by name
    const searchInput = page.locator('input[role="searchbox"]');
    await searchInput.fill('James');
    await page.waitForTimeout(400);

    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('James Smith');

    // Search for non-existent customer
    await searchInput.fill('XYZNONEXISTENT999');
    await page.waitForTimeout(400);

    await expect(page.locator('text=No customers found')).toBeVisible();
    await expect(page.locator('text=No results for "XYZNONEXISTENT999".')).toBeVisible();

    // Clear search
    const clearBtn = page.locator('button[aria-label="Clear search"]');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await page.waitForTimeout(400);

    await expect(customerCards).toHaveCount(20);

    // Search by license plate
    await searchInput.fill('AMP-500');
    await page.waitForTimeout(400);

    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('James Smith');
  });

  test('preserves focus and does not drop characters or pop previous query during mid-typing', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[role="searchbox"]');
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    // Type first chunk
    await searchInput.pressSequentially('Mich', { delay: 60 });
    // Wait enough for debounced search to trigger
    await page.waitForTimeout(350);

    // Continue typing while server transition is in flight
    await searchInput.pressSequentially('ael', { delay: 60 });
    await expect(searchInput).toHaveValue('Michael');
    await expect(searchInput).toBeFocused();

    // Pause again, then type last name
    await page.waitForTimeout(350);
    await searchInput.pressSequentially(' Chang', { delay: 60 });
    await expect(searchInput).toHaveValue('Michael Chang');
    await expect(searchInput).toBeFocused();

    await page.waitForTimeout(400);

    const customerCards = page.locator('ul[aria-label="Customer list"] > li');
    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('Michael Chang');
  });

  test('matches phone numbers across diverse input formats (digits, dashed, spaced, parentheses)', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[role="searchbox"]');
    const customerCards = page.locator('ul[aria-label="Customer list"] > li');

    // Raw digits: 5558765432
    await searchInput.fill('5558765432');
    await page.waitForTimeout(400);
    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('Michael Chang');

    // Dashed: 555-876-5432
    await searchInput.fill('555-876-5432');
    await page.waitForTimeout(400);
    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('Michael Chang');

    // Spaced: 555 876 5432
    await searchInput.fill('555 876 5432');
    await page.waitForTimeout(400);
    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('Michael Chang');

    // Formatted: (555) 876-5432
    await searchInput.fill('(555) 876-5432');
    await page.waitForTimeout(400);
    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('Michael Chang');
  });

  test('supports keyboard shortcuts: Enter for immediate search and Escape to clear', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[role="searchbox"]');
    const customerCards = page.locator('ul[aria-label="Customer list"] > li');

    await searchInput.fill('Samantha Reed');
    await searchInput.press('Enter');

    // Immediate match without waiting for debounce timeout
    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('Samantha Reed');

    // Escape clears the search input and restores full directory
    await searchInput.press('Escape');
    await expect(searchInput).toHaveValue('');
    await page.waitForTimeout(400);
    await expect(customerCards).toHaveCount(20);
  });

  test('selects customer on the very first click from search results', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[role="searchbox"]');
    const customerCards = page.locator('ul[aria-label="Customer list"] > li');

    // Type search query and wait for filtered results
    await searchInput.fill('Samantha Reed');
    await page.waitForTimeout(400);

    await expect(customerCards).toHaveCount(1);
    await expect(customerCards.first()).toContainText('Samantha Reed');

    // Select customer with a single click
    await customerCards.first().click();

    // Verify Customer 360 workspace loads on the very first click
    await expect(page.locator('h2:has-text("Samantha Reed")')).toBeVisible();
    await expect(page).toHaveURL(/userId=/);
    await expect(page.locator('text=Member Since')).toBeVisible();
    await expect(customerCards.first().locator('a')).toHaveClass(/border-sky-500/);
  });

  test('selects customer when clicking immediately as search result appears', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[role="searchbox"]');

    await searchInput.click();
    await expect(searchInput).toBeFocused();
    await searchInput.pressSequentially('Hannah', { delay: 40 });

    // Wait until search results appear
    const hannahCard = page.locator('ul[aria-label="Customer list"] > li:has-text("Hannah Reyes")');
    await expect(hannahCard).toBeVisible();

    // Move to the card and click fast
    const box = await hannahCard.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.up();
    }

    await expect(page.locator('h2:has-text("Hannah Reyes")')).toBeVisible();
    await expect(page).toHaveURL(/userId=/);
  });

  test('does not trigger redundant server requests when clicking an already selected customer card', async ({ page }) => {
    await page.goto('/');

    const customerCards = page.locator('ul[aria-label="Customer list"] > li');
    const firstCard = customerCards.first();

    // First click selects the customer
    await firstCard.click();
    await expect(page).toHaveURL(/userId=/);
    await expect(firstCard.locator('a')).toHaveClass(/border-sky-500/);

    // Track any subsequent network requests
    let redundantRequestCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('userId=') || req.url().includes('_rsc')) {
        redundantRequestCount++;
      }
    });

    // Clicking the already selected card
    await firstCard.click();
    await page.waitForTimeout(300);

    expect(redundantRequestCount).toBe(0);
  });

  test('preserves loaded customers and pagination cursor when selecting a customer', async ({ page }) => {
    await page.goto('/');

    const customerCards = page.locator('ul[aria-label="Customer list"] > li');
    await expect(customerCards).toHaveCount(20);

    // Load next page of customers
    const loadMoreBtn = page.getByRole('button', { name: 'Load More Customers' });
    await loadMoreBtn.click();
    await expect(customerCards).toHaveCount(40);

    // Select customer from page 2 (index 24)
    const customer25 = customerCards.nth(24);
    const customerName = (await customer25.locator('h3').textContent()) ?? '';
    await customer25.click();

    // Verify workspace loaded and customer is selected
    await expect(page.locator(`h2:has-text("${customerName}")`)).toBeVisible();
    await expect(page).toHaveURL(/userId=/);
    await expect(customer25.locator('a')).toHaveClass(/border-sky-500/);

    // Verify directory did NOT reset back to 20 customers
    await expect(customerCards).toHaveCount(40);

    // Verify pagination cursor was preserved and load more continues to work
    await expect(loadMoreBtn).toBeVisible();
    await loadMoreBtn.click();
    await expect(customerCards).toHaveCount(60);
  });
});
