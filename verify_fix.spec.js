
import { test, expect } from '@playwright/test';

test('verify menu width stability', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for the app to load
  await page.waitForSelector('.system-console');

  const consoleContainer = page.locator('.tron-container');

  // Measure closed width
  const closedBox = await consoleContainer.boundingBox();
  const closedWidth = closedBox.width;
  console.log(`Closed width: ${closedWidth}`);

  // Open menu
  await page.click('.menu-btn');
  await page.waitForTimeout(600);

  const openBox = await consoleContainer.boundingBox();
  const openWidth = openBox.width;
  console.log(`Open width: ${openWidth}`);

  // Expect widths to be very close (allowing for potential 1px border/rendering rounding if any, but ideally 0)
  expect(Math.abs(openWidth - closedWidth)).toBeLessThanOrEqual(1);

  await consoleContainer.screenshot({ path: 'verified_menu_open.png' });
});
