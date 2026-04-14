from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    page.goto("http://localhost:5173")
    page.wait_for_timeout(8000) # Wait for initial loader and fly-in

    # Open the system console menu
    page.click('text=Menu')
    page.wait_for_timeout(1000)

    # Toggle Zodiac mode
    page.click('text=Zodiac Ring')
    page.wait_for_timeout(2000)

    # Close the transit panel if it's blocking
    try:
        page.click('.transit-panel .close-btn', timeout=2000)
        page.wait_for_timeout(1000)
    except:
        pass

    # Open the navigation panel
    page.click('button[aria-label="open solar system panel"]')
    page.wait_for_timeout(1000)

    # Open full list
    page.click('.solar-button')
    page.wait_for_timeout(1000)

    # Select Mars
    page.click('.planet-list >> text=Mars')
    page.wait_for_timeout(4000) # Wait for fly-to

    # Take screenshot
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(2000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
