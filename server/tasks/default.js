/**
 * Default task module
 * Handles tasks with unknown intents by providing a fallback behavior
 */

import { automateWebsite } from '../automation/automateWebsites.js';

/**
 * Execute default task with provided parameters
 * @param {Object} params - Task parameters from the parser
 * @returns {Promise<Object>} Results of the automation
 */
export async function execute(params) {
    console.log('Executing default task with params:', JSON.stringify(params, null, 2));

    // Extract URL from parameters or use a default
    let url = params.url || 'https://example.com';

    // Add https:// if not present
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }

    // Build simple screenshot actions
    const actions = [
        { type: 'wait', milliseconds: 2000 },
        { type: 'screenshot', name: 'default_task_result' }
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
            taskType: 'default'
        };
    } catch (error) {
        console.error('Error executing default task:', error);
        return {
            success: false,
            screenshots: [],
            errors: [error.message],
            taskType: 'default'
        };
    }
} 