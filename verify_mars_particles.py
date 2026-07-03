import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Use a large viewport
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        # Add error listener
        page.on("pageerror", lambda exc: print(f"uncaught exception: {exc}"))

        print("Navigating to Mars Surface...")
        # Navigate to a planet and then to Mars surface via the button
        # Or just use the teleport/direct access if available.
        # The app starts at Solar System.
        await page.goto("http://localhost:3000")
        await page.wait_for_timeout(5000)

        # Click on Mars (it should be visible in the solar system)
        # We can use the System Console to select Mars
        await page.click("button.menu-btn") # Open menu
        await page.click("text=Mars") # Select Mars from list if it exists in menu
        await page.wait_for_timeout(2000)

        # Look for "Explore Surface" button
        explore_btn = page.locator("button:has-text('Explore Surface')")
        if await explore_btn.is_visible():
            await explore_btn.click()
            print("Clicked Explore Surface")
        else:
            print("Explore Surface button not found, trying fallback...")
            # Fallback: maybe it's in the HUD
            await page.click(".hud-btn:has-text('Explore')")

        await page.wait_for_timeout(5000)

        # Check if we are on Mars surface (background color should be reddish)
        # Capture screenshot
        screenshot_path = "/home/jules/verification/screenshots/mars_surface_particles.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
