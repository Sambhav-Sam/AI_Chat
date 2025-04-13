/**
 * Demo Script for Automation Operator
 * 
 * This script demonstrates how to use the automationOperator module
 * to run visible browser automation tasks.
 */

import { runAutomation, createSampleTask } from './automationOperator.js';

/**
 * Create a custom task for a form-filling scenario
 */
function createFormTask() {
    return {
        url: 'https://demoqa.com/automation-practice-form',
        delayBetweenSteps: 1000,
        actions: [
            // Wait for page to load fully
            { type: 'wait', milliseconds: 2000 },

            // === First Name Field ===
            { type: 'moveToElement', selector: '#firstName' },
            { type: 'click', selector: '#firstName' },
            {
                type: 'type',
                selector: '#firstName',
                text: 'John',
                humanLike: true
            },

            // === Last Name Field ===
            { type: 'moveToElement', selector: '#lastName' },
            { type: 'click', selector: '#lastName' },
            {
                type: 'type',
                selector: '#lastName',
                text: 'Doe',
                humanLike: true
            },

            // === Email Field ===
            { type: 'moveToElement', selector: '#userEmail' },
            { type: 'click', selector: '#userEmail' },
            {
                type: 'type',
                selector: '#userEmail',
                text: 'john.doe@example.com',
                humanLike: true
            },

            // === Gender Selection ===
            { type: 'moveToElement', selector: 'label[for="gender-radio-1"]' },
            { type: 'click', selector: 'label[for="gender-radio-1"]' },

            // === Mobile Number ===
            { type: 'moveToElement', selector: '#userNumber' },
            { type: 'click', selector: '#userNumber' },
            {
                type: 'type',
                selector: '#userNumber',
                text: '1234567890',
                humanLike: true
            },

            // === Scroll down to see more form fields ===
            { type: 'scroll', y: 300 },

            // === Subject Field - Demonstrating mouse coordinates ===
            // First move mouse to a specific area on the page
            { type: 'moveToCoordinates', x: 400, y: 400, steps: 15 },
            // Then move to the actual field
            { type: 'moveToElement', selector: '#subjectsInput' },
            { type: 'click', selector: '#subjectsInput' },
            {
                type: 'type',
                selector: '#subjectsInput',
                text: 'Computer Science',
                humanLike: true
            },

            // Wait for results to appear
            { type: 'wait', milliseconds: 500 },

            // Press Enter to select the subject
            {
                type: 'type',
                selector: '#subjectsInput',
                text: '\n'
            },

            // === Scroll down to the submit button ===
            { type: 'scroll', y: 400 },

            // Wait a moment after scrolling
            { type: 'wait', milliseconds: 1000 },

            // === Final pause before completion ===
            { type: 'wait', milliseconds: 3000 }
        ]
    };
}

/**
 * Run the automation demonstrations
 */
async function runDemo() {
    console.log('=== Automation Operator Demo ===');

    try {
        // Run the sample task (Google search)
        console.log('\n=== Running Sample Task (Google Search) ===');
        const sampleTask = createSampleTask();
        const sampleResult = await runAutomation(sampleTask);

        console.log('Sample task completed with result:', {
            success: sampleResult.success,
            duration: sampleResult.duration,
            actionsPerformed: sampleResult.actionsPerformed,
            errors: sampleResult.errors.length
        });

        // Run the form filling task
        console.log('\n=== Running Form Filling Task ===');
        const formTask = createFormTask();
        const formResult = await runAutomation(formTask);

        console.log('Form task completed with result:', {
            success: formResult.success,
            duration: formResult.duration,
            actionsPerformed: formResult.actionsPerformed,
            errors: formResult.errors.length
        });

        console.log('\n=== All Demonstrations Completed ===');
    } catch (error) {
        console.error('Error running demonstrations:', error);
    }
}

// Run the demonstration
runDemo().catch(console.error); 