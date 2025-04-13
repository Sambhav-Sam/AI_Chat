/**
 * Test Script for Visible Operator Automation
 * 
 * This script demonstrates how to use the visibleOperator module
 * to create visible browser automation tasks that mimic human behavior.
 */

import { runVisibleOperator, createExampleTask } from './automation/visibleOperator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, 'automation/screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Create a custom task for a more complex demonstration
 */
function createCustomTask() {
    return {
        url: 'https://the-internet.herokuapp.com/login',
        delayBetweenSteps: 1000, // 1 second between actions
        stopOnError: true, // Stop if any action fails
        actions: [
            // Wait for the page to load
            {
                type: 'wait',
                milliseconds: 1500,
                description: 'Wait for page to fully render'
            },

            // Take a screenshot of the initial state
            {
                type: 'screenshot',
                name: 'login-page-initial'
            },

            // Move mouse to username field
            {
                type: 'moveMouse',
                selector: '#username',
                description: 'Move mouse to username field'
            },

            // Click on username field
            {
                type: 'click',
                selector: '#username',
                description: 'Click on username field'
            },

            // Type the username with human-like typing
            {
                type: 'type',
                selector: '#username',
                text: 'tomsmith',
                humanLike: true,
                description: 'Type the username'
            },

            // Wait a moment before moving to password
            {
                type: 'wait',
                milliseconds: 800,
                description: 'Pause briefly'
            },

            // Move to password field
            {
                type: 'moveMouse',
                selector: '#password',
                description: 'Move to password field'
            },

            // Click on password field
            {
                type: 'click',
                selector: '#password',
                description: 'Click on password field'
            },

            // Type the password
            {
                type: 'type',
                selector: '#password',
                text: 'SuperSecretPassword!',
                humanLike: true,
                description: 'Type the password'
            },

            // Take a screenshot before submitting
            {
                type: 'screenshot',
                name: 'before-submit'
            },

            // Move to login button
            {
                type: 'moveMouse',
                selector: 'button[type="submit"]',
                description: 'Move to login button'
            },

            // Wait a moment before clicking (simulating human hesitation)
            {
                type: 'wait',
                milliseconds: 500,
                description: 'Brief pause before clicking login'
            },

            // Click the login button
            {
                type: 'click',
                selector: 'button[type="submit"]',
                description: 'Click login button'
            },

            // Wait for the page to load after login
            {
                type: 'wait',
                milliseconds: 2000,
                description: 'Wait for redirect after login'
            },

            // Take a final screenshot
            {
                type: 'screenshot',
                name: 'after-login'
            }
        ]
    };
}

/**
 * Create a task that fills out a complex form
 */
function createFormTask() {
    return {
        url: 'https://demoqa.com/automation-practice-form',
        delayBetweenSteps: 1200,
        actions: [
            // Wait for page to load
            { type: 'wait', milliseconds: 2000 },

            // Take initial screenshot
            { type: 'screenshot', name: 'form-initial' },

            // Scroll down slightly to bring form into better view
            { type: 'scroll', y: 100 },

            // Fill in first name
            { type: 'moveMouse', selector: '#firstName' },
            { type: 'click', selector: '#firstName' },
            { type: 'type', selector: '#firstName', text: 'John', humanLike: true },

            // Fill in last name
            { type: 'moveMouse', selector: '#lastName' },
            { type: 'click', selector: '#lastName' },
            { type: 'type', selector: '#lastName', text: 'Doe', humanLike: true },

            // Fill in email
            { type: 'moveMouse', selector: '#userEmail' },
            { type: 'click', selector: '#userEmail' },
            { type: 'type', selector: '#userEmail', text: 'john.doe@example.com', humanLike: true },

            // Select gender (click Male radio button)
            { type: 'moveMouse', selector: 'label[for="gender-radio-1"]' },
            { type: 'click', selector: 'label[for="gender-radio-1"]' },

            // Fill in mobile number
            { type: 'moveMouse', selector: '#userNumber' },
            { type: 'click', selector: '#userNumber' },
            { type: 'type', selector: '#userNumber', text: '1234567890', humanLike: true },

            // Take a screenshot mid-form
            { type: 'screenshot', name: 'form-mid' },

            // Scroll down to reveal more form fields
            { type: 'scroll', y: 300 },

            // Click on Date of Birth field
            { type: 'moveMouse', selector: '#dateOfBirthInput' },
            { type: 'click', selector: '#dateOfBirthInput' },

            // Click on a date in the calendar (15th of current month)
            { type: 'wait', milliseconds: 500 },
            { type: 'moveMouse', selector: '.react-datepicker__day--015:not(.react-datepicker__day--outside-month)' },
            { type: 'click', selector: '.react-datepicker__day--015:not(.react-datepicker__day--outside-month)' },

            // Take another screenshot
            { type: 'screenshot', name: 'form-date-selected' },

            // Submit the form
            { type: 'scroll', y: 500 },
            { type: 'moveMouse', selector: '#submit' },
            { type: 'click', selector: '#submit' },

            // Wait for submission response
            { type: 'wait', milliseconds: 3000 },

            // Take final screenshot
            { type: 'screenshot', name: 'form-submitted' }
        ]
    };
}

/**
 * Run several example tasks to demonstrate the Visible Operator
 */
async function runDemonstrations() {
    console.log('=== Visible Operator Demonstration ===');

    try {
        // First run the basic example task
        console.log('\n1. Running Simple Google Search Example:');
        const basicTask = createExampleTask();
        await runVisibleOperator(basicTask, {
            takeScreenshots: true,
            screenshotsDir: screenshotsDir,
            slowMotion: 100 // Slow down even more for better visibility
        });

        // Then run the custom login example
        console.log('\n\n2. Running Login Form Example:');
        const loginTask = createCustomTask();
        await runVisibleOperator(loginTask, {
            takeScreenshots: true,
            screenshotsDir: screenshotsDir,
            slowMotion: 80
        });

        // Finally run the complex form example
        console.log('\n\n3. Running Complex Form Example:');
        const formTask = createFormTask();
        await runVisibleOperator(formTask, {
            takeScreenshots: true,
            screenshotsDir: screenshotsDir,
            slowMotion: 70
        });

        console.log('\n\nAll demonstrations completed successfully!');
        console.log(`Screenshots saved to: ${screenshotsDir}`);

    } catch (error) {
        console.error('Error during demonstration:', error);
    }
}

// Run the demonstrations
runDemonstrations().catch(console.error); 