/**
 * Test Visible Browser Automation
 * Demonstrates automation with visible (non-headless) browser
 */

import { automateWebsite } from './automation/automateWebsites.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Make sure the USE_HEADLESS environment variable is set to false
process.env.USE_HEADLESS = 'false';

// Get current directory for screenshots
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, 'automation/screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Sample test task
const testTask = {
    url: 'https://www.google.com',
    actions: [
        { type: 'wait', milliseconds: 1000 },
        { type: 'screenshot', name: 'google-home' },
        { type: 'type', selector: 'input[name="q"]', text: 'Playwright automation' },
        { type: 'wait', milliseconds: 500 },
        { type: 'click', selector: 'input[name="btnK"]' },
        { type: 'wait', milliseconds: 2000 },
        { type: 'screenshot', name: 'search-results' }
    ]
};

/**
 * Run test automation with visible browser
 */
async function runVisibleTest() {
    console.log('=== Testing Visible Browser Automation ===');
    console.log(`Screenshots will be saved to: ${screenshotsDir}`);

    try {
        console.log(`Running test automation for: ${testTask.url}`);
        console.log('Browser will be visible during automation');

        const result = await automateWebsite(testTask, {
            headless: false, // Force visible mode
            outputDir: screenshotsDir
        });

        console.log('\nAutomation Results:');
        console.log(`Success: ${result.success}`);
        console.log(`Action Count: ${result.stats.actionCount}`);
        console.log(`Duration: ${result.stats.duration}ms`);
        console.log('\nScreenshots:');
        result.screenshots.forEach(screenshot => {
            console.log(`- ${screenshot}`);
        });

        console.log('\nLogs:');
        result.logs.forEach(log => {
            console.log(`- ${log}`);
        });

        if (result.errors.length > 0) {
            console.log('\nErrors:');
            result.errors.forEach(error => {
                console.log(`- ${error}`);
            });
        }
    } catch (error) {
        console.error('Error running automation test:', error);
    }
}

// Run the test
runVisibleTest()
    .then(() => console.log('Test completed'))
    .catch(err => console.error('Test failed:', err)); 