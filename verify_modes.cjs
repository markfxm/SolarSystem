const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');

  // Wait for loader to disappear
  await page.waitForSelector('#initial-loader', { state: 'detached', timeout: 30000 });

  // Wait a bit for initial animation
  await page.waitForTimeout(5000);

  // Take screenshot of Standard Mode
  await page.screenshot({ path: 'verification/standard_mode.png' });
  console.log('Saved standard_mode.png');

  // Click Fractal Mode button
  const fractalBtn = await page.getByRole('button', { name: /Fractal Mode/i });
  await fractalBtn.click();

  // Wait for transition
  await page.waitForTimeout(1000);

  // Take screenshot of Fractal Mode
  await page.screenshot({ path: 'verification/fractal_mode_verified.png' });
  console.log('Saved fractal_mode_verified.png');

  await browser.close();
})();
