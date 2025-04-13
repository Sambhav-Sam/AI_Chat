/**
 * Navigation task module
 * Handles website navigation automation tasks
 */

import { automateWebsite } from '../automation/automateWebsites.js';

/**
 * Execute navigation task with provided parameters
 * @param {Object} params - Task parameters from the parser
 * @returns {Promise<Object>} Results of the automation
 */
export async function execute(params) {
    console.log('Executing navigation task with params:', JSON.stringify(params, null, 2));

    // Extract URL from parameters
    let url = params.url || 'https://example.com';

    // Add https:// if not present
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    // Handle common website names
    if (url.includes('google') && !url.includes('.')) url = 'https://google.com';
    else if (url.includes('facebook') && !url.includes('.')) url = 'https://facebook.com';
    else if (url.includes('twitter') && !url.includes('.')) url = 'https://twitter.com';
    else if (url.includes('react') && !url.includes('.')) url = 'https://reactjs.org';

    // Build navigation actions
    const actions = [
        { type: 'wait', milliseconds: 2000 },
        { type: 'screenshot', name: 'navigation_result' }
    ];

    // Execute the automation
    try {
        const result = await automateWebsite({
            url,
            actions
        }, {
            headless: false,
            outputDir: './screenshots'
        });

        return {
            success: result.success,
            screenshots: result.screenshots,
            errors: result.errors,
            taskType: 'navigate'
        };
    } catch (error) {
        console.error('Error executing navigation task:', error);
        return {
            success: false,
            screenshots: [],
            errors: [error.message],
            taskType: 'navigate'
        };
    }
} 