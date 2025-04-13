/**
 * Simple Visible Operator Example
 * 
 * This demonstrates the core features of the Visible Operator:
 * - Launching a visible browser
 * - Navigating to a URL
 * - Moving mouse to specific coordinates
 * - Clicking buttons/elements
 * - Typing in fields
 * - Waiting between actions
 */

import { chromium } from 'playwright';

// Define a simple task object structure
const task = {
    url: 'https://demoqa.com/automation-practice-form',
    delayBetweenSteps: 1500 // 1.5 seconds between steps
};

/**
 * Run visible browser automation with detailed, deliberate steps
 */
async function runVisibleDemo() {
    console.log('Starting visible browser automation...');

    // Launch visible browser
    const browser = await chromium.launch({
        headless: false, // Make the browser visible
        slowMo: 100 // Add 100ms delay to actions for visibility
    });

    // Create a browser context
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });

    // Create a new page
    const page = await context.newPage();

    try {
        // Step 1: Navigate to URL
        console.log(`Navigating to ${task.url}...`);
        await page.goto(task.url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(task.delayBetweenSteps);

        // Step 2: Move mouse to coordinates (center of viewport)
        console.log('Moving mouse to center of viewport...');
        await page.mouse.move(640, 400, { steps: 10 }); // Move in 10 steps for smooth movement
        await page.waitForTimeout(task.delayBetweenSteps);

        // Step 3: Move mouse to first name input field
        console.log('Finding first name field...');
        const firstNameField = await page.$('#firstName');
        const boundingBox = await firstNameField.boundingBox();

        console.log('Moving mouse to first name field...');
        await page.mouse.move(
            boundingBox.x + boundingBox.width / 2,
            boundingBox.y + boundingBox.height / 2,
            { steps: 15 } // Even smoother movement
        );
        await page.waitForTimeout(1000);

        // Step 4: Click on the field
        console.log('Clicking on first name field...');
        await page.click('#firstName');
        await page.waitForTimeout(1000);

        // Step 5: Type into field with human-like typing
        console.log('Typing name with human-like delays...');
        const name = 'John Doe';

        // Type each character with random delays
        for (const char of name) {
            await page.keyboard.type(char, { delay: 100 + Math.random() * 200 });
        }
        await page.waitForTimeout(task.delayBetweenSteps);

        // Step 6: Move mouse to exact coordinates
        console.log('Moving mouse to specific coordinates (200, 300)...');
        await page.mouse.move(200, 300, { steps: 20 });
        await page.waitForTimeout(task.delayBetweenSteps);

        // Step 7: Scroll down the page to reveal more form elements
        console.log('Scrolling down page...');
        await page.evaluate(() => {
            window.scrollBy(0, 300);
        });
        await page.waitForTimeout(task.delayBetweenSteps);

        // Step 8: Find and move to the email field
        console.log('Moving to email field...');
        const emailField = await page.$('#userEmail');
        const emailBox = await emailField.boundingBox();

        await page.mouse.move(
            emailBox.x + emailBox.width / 2,
            emailBox.y + emailBox.height / 2,
            { steps: 15 }
        );
        await page.waitForTimeout(1000);

        // Step 9: Click on email field
        console.log('Clicking on email field...');
        await page.click('#userEmail');
        await page.waitForTimeout(1000);

        // Step 10: Type email with pauses
        console.log('Typing email address...');
        await page.keyboard.type('john.doe@example.com', { delay: 100 });
        await page.waitForTimeout(task.delayBetweenSteps);

        // Step 11: Find and click a button (Male radio button)
        console.log('Moving to gender radio button...');
        const radioButton = await page.$('label[for="gender-radio-1"]');
        const radioBox = await radioButton.boundingBox();

        await page.mouse.move(
            radioBox.x + radioBox.width / 2,
            radioBox.y + radioBox.height / 2,
            { steps: 10 }
        );
        await page.waitForTimeout(1000);

        console.log('Clicking gender radio button...');
        await page.click('label[for="gender-radio-1"]');
        await page.waitForTimeout(task.delayBetweenSteps);

        // Step 12: Final scroll down
        console.log('Final scroll down...');
        await page.evaluate(() => {
            window.scrollBy(0, 500);
        });
        await page.waitForTimeout(1000);

        // Step 13: Find the submit button
        console.log('Moving to submit button...');
        const submitButton = await page.$('#submit');

        // Make sure the button is in view
        await submitButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);

        const submitBox = await submitButton.boundingBox();
        await page.mouse.move(
            submitBox.x + submitBox.width / 2,
            submitBox.y + submitBox.height / 2,
            { steps: 15 }
        );
        await page.waitForTimeout(1000);

        // Step 14: Click the submit button
        console.log('Clicking submit button...');
        await page.click('#submit');

        // Wait for submission to process
        console.log('Waiting for form submission...');
        await page.waitForTimeout(3000);

        console.log('Automation complete!');
    } catch (error) {
        console.error('Error during automation:', error);
    } finally {
        // Add a final pause so the user can see the end result
        await page.waitForTimeout(5000);

        // Close the browser
        await browser.close();
        console.log('Browser closed');
    }
}

// Run the demonstration
runVisibleDemo().catch(console.error); 