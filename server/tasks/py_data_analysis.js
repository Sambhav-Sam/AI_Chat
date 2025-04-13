/**
 * Python Data Analysis Task Module
 * This module serves as a bridge to execute data analysis tasks in an isolated Python container
 */

import { runPythonTaskIsolated } from '../taskIsolationManager.js';

/**
 * Execute a data analysis task using Python in an isolated container
 * @param {Object} params - Task parameters
 * @returns {Promise<Object>} Results of the Python task execution
 */
export async function execute(params) {
    console.log('Executing Python data analysis task with params:', JSON.stringify(params, null, 2));

    // Create the task object for the Python container
    const pythonTask = {
        intent: 'data_analysis',
        parameters: {
            ...params,
            dataset: params.dataset || 'sample_dataset',
            analysis_type: params.analysis_type || 'summary',
            output_format: params.output_format || 'json'
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
            taskType: 'py_data_analysis'
        };
    } catch (error) {
        console.error('Error executing Python data analysis task:', error);
        return {
            success: false,
            screenshots: [],
            errors: [error.message],
            data: {},
            taskType: 'py_data_analysis'
        };
    }
} 