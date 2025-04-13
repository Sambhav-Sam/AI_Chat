/**
 * API Service for communicating with the backend
 * 
 * NOTE: In demo mode, these functions will not actually be called,
 * but they are provided here for reference on how the real API would work.
 */

// Base URL for API requests - in demo mode this isn't used
const API_BASE_URL = 'http://localhost:5000';

/**
 * Parse a natural language instruction into a structured task
 * @param {string} instruction - Natural language instruction
 * @returns {Promise<Object>} Parsed task object
 */
export async function parseTask(instruction) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/parse-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: instruction }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to parse task');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in parseTask:', error);
        throw error;
    }
}

/**
 * Execute an automation task based on a parsed task
 * @param {Object} task - Structured task object
 * @returns {Promise<Object>} Results of the automation
 */
export async function executeTask(task) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/execute-task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to execute task');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in executeTask:', error);
        throw error;
    }
}

/**
 * Run a full automation from natural language instruction to execution
 * @param {string} instruction - Natural language instruction
 * @returns {Promise<Object>} Results object with parsed task, automation task, and execution results
 */
export async function runAutomation(instruction) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/run-automation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: instruction }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to run automation');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in runAutomation:', error);
        throw error;
    }
}

/**
 * Get a list of available screenshots
 * @returns {Promise<Array>} List of screenshot URLs
 */
export async function getScreenshots() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/screenshots`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get screenshots');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in getScreenshots:', error);
        throw error;
    }
}

// Export all functions
export default {
    parseTask,
    executeTask,
    runAutomation,
    getScreenshots,
}; 