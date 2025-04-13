/**
 * Form filling task module
 * Handles form-filling automation tasks
 */

import { automateWebsite } from '../automation/automateWebsites.js';

/**
 * Execute form fill task with provided parameters
 * @param {Object} params - Task parameters from the parser
 * @returns {Promise<Object>} Results of the automation
 */
export async function execute(params) {
    console.log('Executing form fill task with params:', JSON.stringify(params, null, 2));

    // Determine URL based on form type
    let url = 'https://example.com/contact';
    if (params.form_type === 'contact') {
        url = 'https://getbootstrap.com/docs/5.3/examples/checkout/';
    } else if (params.url) {
        url = params.url.startsWith('http') ? params.url : `https://${params.url}`;
    }

    // Build base actions
    const actions = [
        { type: 'wait', selector: 'form' }
    ];

    // Add form field actions based on parameters
    Object.entries(params).forEach(([key, value]) => {
        if (key !== 'form_type' && key !== 'url' && key !== 'intent') {
            actions.push({
                type: 'type',
                selector: `input[name="${key}"], input[placeholder*="${key}"], input[id*="${key}"], textarea[name="${key}"]`,
                text: value
            });
        }
    });

    // Add submit action
    actions.push({
        type: 'click',
        selector: 'button[type="submit"], input[type="submit"]',
        screenshotAfter: true
    });

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
            taskType: 'form_fill'
        };
    } catch (error) {
        console.error('Error executing form fill task:', error);
        return {
            success: false,
            screenshots: [],
            errors: [error.message],
            taskType: 'form_fill'
        };
    }
} 