/**
 * Search task module
 * Handles search-related automation tasks
 */

import { automateWebsite } from '../automation/automateWebsites.js';

/**
 * Execute search task with provided parameters
 * @param {Object} params - Task parameters from the parser
 * @returns {Promise<Object>} Results of the automation
 */
export async function execute(params) {
    console.log('Executing search task with params:', JSON.stringify(params, null, 2));

    // Set default URL to Google if no specific site is provided
    let url = params.site ? `https://${params.site}` : 'https://www.google.com';
    const query = params.query || params.term || '';

    // Build actions for searching
    const actions = [
        { type: 'wait', selector: 'input[type="text"], input[type="search"]' },
        {
            type: 'type',
            selector: 'input[type="text"], input[type="search"]',
            text: query
        },
        {
            type: 'click',
            selector: 'button[type="submit"], input[type="submit"]',
            screenshotAfter: true
        },
        { type: 'wait', milliseconds: 2000 },
        { type: 'screenshot', name: 'search_results' }
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
            taskType: 'search'
        };
    } catch (error) {
        console.error('Error executing search task:', error);
        return {
            success: false,
            screenshots: [],
            errors: [error.message],
            taskType: 'search'
        };
    }
} 