
import { test, expect } from '@playwright/test';

test('capture menu width', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for the app to load
  await page.waitForSelector('.system-console');

  const consoleContainer = page.locator('.tron-container');

  // Open menu in English
  await page.click('.menu-btn');
  await page.waitForTimeout(600);
  const openBoxEn = await consoleContainer.boundingBox();
  console.log(`Open width (EN): ${openBoxEn.width}`);
  await consoleContainer.screenshot({ path: 'menu_open_en.png' });

  // Switch to Chinese
  await page.click('button[title="中文"]');
  await page.waitForTimeout(600);

  // Check Chinese width (menu still open)
  const openBoxZh = await consoleContainer.boundingBox();
  console.log(`Open width (ZH): ${openBoxZh.width}`);
  await consoleContainer.screenshot({ path: 'menu_open_zh.png' });

  // Also check if selecting a planet (showing GRID) makes it wider
  // Mercury is usually visible or easy to find.
  // But let's just use the current max.
});
