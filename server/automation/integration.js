/**
 * Integration example showing how to use the automation tool with the AI task parser
 */

import { automateWebsite } from './automateWebsites.js';
import fs from 'fs';
import path from 'path';

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Convert a parsed task from the AI agent into a Playwright automation task
 * @param {Object} parsedTask - The task object from the AI agent
 * @returns {Object} A task object for the automateWebsite function
 */
function convertParsedTaskToAutomationTask(parsedTask) {
    // Default URL if none provided
    let url = 'https://example.com';
    const actions = [];

    // Handle different intents
    switch (parsedTask.intent) {
        case 'search':
            if (parsedTask.parameters.site) {
                url = `https://${parsedTask.parameters.site}`;
            } else {
                url = 'https://www.google.com';
            }

            // Add search actions
            actions.push({ type: 'wait', selector: 'input[type="text"], input[type="search"]' });

            if (parsedTask.parameters.query || parsedTask.parameters.term) {
                const searchQuery = parsedTask.parameters.query || parsedTask.parameters.term;
                actions.push({
                    type: 'type',
                    selector: 'input[type="text"], input[type="search"]',
                    text: searchQuery
                });
                actions.push({
                    type: 'click',
                    selector: 'button[type="submit"], input[type="submit"]',
                    screenshotAfter: true
                });
            }

            // Wait for results
            actions.push({ type: 'wait', milliseconds: 2000 });
            actions.push({ type: 'screenshot', name: 'search_results' });
            break;

        case 'fill_form':
            // Set URL based on form type if available
            if (parsedTask.parameters.form_type === 'contact') {
                url = 'https://getbootstrap.com/docs/5.3/examples/checkout/';
            }

            // Wait for the form to load
            actions.push({ type: 'wait', selector: 'form' });

            // Fill out form fields from parameters
            Object.entries(parsedTask.parameters).forEach(([key, value]) => {
                if (key !== 'form_type') {
                    // Try to find appropriate form fields
                    actions.push({
                        type: 'type',
                        selector: `input[name="${key}"], input[placeholder*="${key}"], input[id*="${key}"], textarea[name="${key}"]`,
                        text: value
                    });
                }
            });

            // Submit the form
            actions.push({
                type: 'click',
                selector: 'button[type="submit"], input[type="submit"]',
                screenshotAfter: true
            });
            break;

        case 'navigate':
            if (parsedTask.parameters.url) {
                url = parsedTask.parameters.url;
                if (!url.startsWith('http')) {
                    url = `https://${url}`;
                }
            }

            // Just navigate and take a screenshot
            actions.push({ type: 'wait', milliseconds: 2000 });
            actions.push({ type: 'screenshot', name: 'navigation_result' });
            break;

        default:
            // Generic actions for unknown intents
            actions.push({ type: 'wait', milliseconds: 2000 });
            actions.push({ type: 'screenshot', name: 'page_loaded' });
    }

    return {
        url,
        actions
    };
}

/**
 * Process a natural language instruction and automate a website
 * @param {string} instruction - Natural language instruction
 * @returns {Promise<Object>} Results of the automation
 */
export async function processInstructionAndAutomate(instruction) {
    try {
        console.log(`Processing instruction: "${instruction}"`);

        // This would normally call the AI task parser API
        // For demonstration, we'll simulate a parsed task
        const simulatedParsedTask = simulateTaskParsing(instruction);

        console.log('Parsed task:', JSON.stringify(simulatedParsedTask, null, 2));

        // Convert the parsed task to an automation task
        const automationTask = convertParsedTaskToAutomationTask(simulatedParsedTask);

        console.log('Automation task:', JSON.stringify(automationTask, null, 2));

        // Execute the automation
        const results = await automateWebsite(automationTask, {
            headless: false,
            outputDir: './screenshots'
        });

        return results;
    } catch (error) {
        console.error('Error in processInstructionAndAutomate:', error);
        throw error;
    }
}

/**
 * Simulate AI task parsing (in production, this would call the AI parser API)
 * @param {string} instruction - Natural language instruction
 * @returns {Object} Simulated parsed task
 */
function simulateTaskParsing(instruction) {
    const lowerInstruction = instruction.toLowerCase();

    if (lowerInstruction.includes('search')) {
        // Extract search terms
        const searchTerms = lowerInstruction.replace(/search for|search|look up|find/gi, '').trim();
        return {
            intent: 'search',
            parameters: {
                query: searchTerms,
                site: lowerInstruction.includes('google') ? 'google.com' : undefined
            },
            context: 'User wants to search for information'
        };
    } else if (lowerInstruction.includes('fill') && lowerInstruction.includes('form')) {
        return {
            intent: 'fill_form',
            parameters: {
                form_type: 'contact',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                message: 'This is a test message from the automation script'
            },
            context: 'User wants to fill out a contact form'
        };
    } else if (lowerInstruction.includes('go to') || lowerInstruction.includes('navigate')) {
        // Extract URL
        let url = lowerInstruction.replace(/go to|navigate to|visit|open/gi, '').trim();

        // Add common domains if they're mentioned
        if (url.includes('google')) url = 'google.com';
        else if (url.includes('facebook')) url = 'facebook.com';
        else if (url.includes('twitter')) url = 'twitter.com';
        else if (url.includes('react')) url = 'reactjs.org';

        return {
            intent: 'navigate',
            parameters: {
                url: url
            },
            context: 'User wants to visit a website'
        };
    }

    // Default fallback
    return {
        intent: 'unknown',
        parameters: {},
        context: 'Could not determine user intent'
    };
}

// Example usage (uncomment to run)
async function runIntegrationExample() {
    try {
        const instructions = [
            'Search for React tutorials',
            'Fill out the contact form',
            'Navigate to reactjs.org'
        ];

        for (const instruction of instructions) {
            console.log('\n' + '='.repeat(50));
            console.log(`PROCESSING: "${instruction}"`);
            console.log('='.repeat(50));

            const results = await processInstructionAndAutomate(instruction);

            console.log('\nResults:', results.success ? 'SUCCESS' : 'FAILURE');
            console.log(`Screenshots taken: ${results.screenshots.length}`);

            if (results.errors.length > 0) {
                console.log('\nErrors:');
                results.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
            }

            // Wait a bit between examples
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (error) {
        console.error('Integration example failed:', error);
    }
}

// Export the main function
export { convertParsedTaskToAutomationTask, runIntegrationExample };

// Run the integration example
runIntegrationExample().catch(console.error); 