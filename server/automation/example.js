/**
 * Example usage of the automateWebsite function
 */

import { automateWebsite } from './automateWebsites.js';
import fs from 'fs';
import path from 'path';

// Ensure screenshots directory exists
const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Define a sample task
const sampleTask = {
    url: 'https://react-shopping-cart-67954.firebaseapp.com/', // A sample React app
    actions: [
        // Wait for the page to load
        { type: 'wait', selector: '.shelf-container', timeout: 10000 },

        // Take a screenshot of the initial page
        { type: 'screenshot', name: 'initial_page' },

        // Click on a product
        { type: 'click', selector: '.shelf-item:nth-child(2)', screenshotAfter: true },

        // Add to cart
        { type: 'click', selector: '.buy-btn', screenshotAfter: true },

        // Wait for the cart to update
        { type: 'wait', milliseconds: 1000 },

        // Click on the checkout button
        { type: 'click', selector: '.cart-checkout', screenshotAfter: true }
    ]
};

async function runExample() {
    console.log('Starting automation example...');

    try {
        // Run the automation with sample task
        const results = await automateWebsite(sampleTask, {
            headless: false, // Set to true to run without visible browser
            outputDir: './screenshots'
        });

        // Print the results
        console.log('\nAutomation completed with result:', results.success ? 'SUCCESS' : 'FAILURE');
        console.log(`Total actions performed: ${sampleTask.actions.length}`);
        console.log(`Screenshots taken: ${results.screenshots.length}`);
        console.log(`Errors encountered: ${results.errors.length}`);

        if (results.errors.length > 0) {
            console.log('\nErrors:');
            results.errors.forEach((error, i) => {
                console.log(`  ${i + 1}. ${error}`);
            });
        }

        console.log('\nScreenshots saved:');
        results.screenshots.forEach((screenshot, i) => {
            console.log(`  ${i + 1}. ${screenshot}`);
        });

    } catch (error) {
        console.error('Failed to run automation example:', error);
    }
}

// Run the example
runExample().catch(console.error); 