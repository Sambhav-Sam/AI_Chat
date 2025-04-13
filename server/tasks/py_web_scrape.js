/**
 * Python Web Scraping Task Module
 * This module serves as a bridge to execute web scraping tasks in an isolated Python container
 */

import { runPythonTaskIsolated } from '../taskIsolationManager.js';

/**
 * Execute a web scraping task using Python in an isolated container
 * @param {Object} params - Task parameters
 * @returns {Promise<Object>} Results of the Python task execution
 */
export async function execute(params) {
    console.log('Executing Python web scraping task with params:', JSON.stringify(params, null, 2));

    // Create the task object for the Python container
    const pythonTask = {
        intent: 'web_scrape',
        parameters: {
            ...params,
            url: params.url || 'https://example.com',
            depth: params.depth || 1,
            max_pages: params.max_pages || 5
        },
        executor: 'python'
    };

    try {
        // Execute the task in an isolated Python container
        const result = await runPythonTaskIsolated(pythonTask);

        return {
            success: result.success,
            screenshots: result.screenshots || [],
            errors: result.errors || [],
            data: result.data || {},
            taskType: 'py_web_scrape'
        };
    } catch (error) {
        console.error('Error executing Python web scraping task:', error);
        return {
            success: false,
            screenshots: [],
            errors: [error.message],
            data: {},
            taskType: 'py_web_scrape'
        };
    }
} 