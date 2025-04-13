/**
 * Simple Browser Automation Test
 * This script demonstrates launching a visible browser directly
 */

// Set environment variables
process.env.USE_HEADLESS = 'false';

// Import Playwright directly
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, 'automation/screenshots');

// Ensure the screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runSimpleBrowserTest() {
    console.log('=== Simple Browser Automation Test ===');
    console.log('Starting a visible browser...');

    // Launch the browser in visible mode
    const browser = await chromium.launch({
        headless: false,
        slowMo: 50 // Slow down actions for visibility
    });

    // Create a new context
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
    });

    // Create a new page
    const page = await context.newPage();

    try {
        console.log('Navigating to Google...');
        await page.goto('https://www.google.com');

        // Take screenshot
        const screenshotPath = path.join(screenshotsDir, `google-home-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved: ${screenshotPath}`);

        // Type in search box
        console.log('Typing in search box...');
        await page.fill('input[name="q"]', 'Playwright automation test');

        // Wait briefly
        await page.waitForTimeout(1000);

        // Click search button
        console.log('Clicking search button...');
        await page.click('input[name="btnK"]');

        // Wait for results page
        await page.waitForSelector('#search');

        // Take another screenshot
        const resultsScreenshotPath = path.join(screenshotsDir, `search-results-${Date.now()}.png`);
        await page.screenshot({ path: resultsScreenshotPath });
        console.log(`Results screenshot saved: ${resultsScreenshotPath}`);

        // Wait a bit longer to see results
        await page.waitForTimeout(5000);

        console.log('Test completed successfully');
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Close the browser
        await browser.close();
        console.log('Browser closed');
    }
}

// Run the test
runSimpleBrowserTest().catch(console.error); 