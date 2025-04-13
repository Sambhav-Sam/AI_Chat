/**
 * Task Execution Framework
 * Routes parsed task objects to the appropriate task modules or plugins
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { executeTaskIsolated } from './taskIsolationManager.js';
import * as pluginLoader from './plugins/pluginLoader.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map of known task intents to their modules
const KNOWN_INTENTS = ['search', 'fill_form', 'navigate'];

// Python task prefixes
const PYTHON_TASK_PREFIXES = ['py_', 'python_'];

// Initialize plugin system
let pluginsInitialized = false;

/**
 * Initialize the plugin system if not already initialized
 * @returns {Promise<void>}
 */
async function initializePlugins() {
    if (!pluginsInitialized) {
        try {
            await pluginLoader.loadAllPlugins();
            pluginsInitialized = true;
            console.log('Plugin system initialized successfully');
        } catch (error) {
            console.error('Error initializing plugin system:', error);
        }
    }
}

/**
 * Check if a task module exists for the given intent
 * @param {string} intent - The intent to check
 * @returns {boolean} True if a module exists for this intent
 */
function taskModuleExists(intent) {
    try {
        const modulePath = path.join(__dirname, 'tasks', `${intent}.js`);
        return fs.existsSync(modulePath);
    } catch (error) {
        console.error(`Error checking task module existence for intent '${intent}':`, error);
        return false;
    }
}

/**
 * Check if a plugin exists that can handle the given intent
 * @param {string} intent - The intent to check
 * @returns {Promise<boolean>} True if a plugin exists for this intent
 */
async function pluginExistsForIntent(intent) {
    await initializePlugins();
    const plugin = pluginLoader.getPluginForIntent(intent);
    return !!plugin;
}

/**
 * Execute a task based on its intent and parameters
 * @param {Object} task - The parsed task object from the AI
 * @returns {Promise<Object>} The result of the task execution
 */
export async function executeTask(task) {
    if (!task || !task.intent) {
        throw new Error('Invalid task object or missing intent field');
    }

    console.log(`Executing task with intent: ${task.intent}`);

    try {
        // First, check if a plugin can handle this intent
        await initializePlugins();
        const intent = task.intent.toLowerCase();

        // Check for plugin-based execution
        if (await pluginExistsForIntent(intent)) {
            console.log(`Using plugin system for intent: ${intent}`);
            const result = await pluginLoader.executeTask(task);
            return {
                ...result,
                intent: task.intent,
                originalTask: task,
                executedBy: 'plugin'
            };
        }

        // Determine if this is a Python task
        const isPythonTask = PYTHON_TASK_PREFIXES.some(prefix => intent.startsWith(prefix)) ||
            task.executor === 'python';

        // Execute the task in isolation
        const result = await executeTaskIsolated(task);

        return {
            ...result,
            intent: task.intent,
            originalTask: task,
            executedBy: isPythonTask ? 'python' : 'legacy'
        };
    } catch (error) {
        console.error(`Error executing task with intent '${task.intent}':`, error);
        return {
            success: false,
            intent: task.intent,
            originalTask: task,
            errors: [error.message],
            screenshots: []
        };
    }
}

/**
 * Get a list of all available task types including plugins
 * @returns {Promise<string[]>} Array of available task intents
 */
export async function getAvailableTaskTypes() {
    try {
        // Initialize plugins if not already done
        await initializePlugins();

        // Get legacy task types
        const tasksDir = path.join(__dirname, 'tasks');
        const files = fs.readdirSync(tasksDir);

        // Filter for JavaScript files and remove the extension
        const jsTasks = files
            .filter(file => file.endsWith('.js'))
            .map(file => file.replace('.js', ''));

        // Add Python tasks
        const pythonTasks = [
            'py_web_scrape',
            'py_data_analysis',
            'py_image_processing'
        ];

        // Add plugin-based tasks
        const pluginIntents = [];
        const plugins = pluginLoader.getAllPlugins();

        for (const [name, plugin] of plugins.entries()) {
            if (plugin.manifest && plugin.manifest.intents) {
                pluginIntents.push(...plugin.manifest.intents);
            }
        }

        return [...new Set([...jsTasks, ...pythonTasks, ...pluginIntents])];
    } catch (error) {
        console.error('Error getting available task types:', error);
        return KNOWN_INTENTS;
    }
}

/**
 * Get details about all available plugins
 * @returns {Promise<Array>} Array of plugin information
 */
export async function getAvailablePlugins() {
    await initializePlugins();

    const plugins = pluginLoader.getAllPlugins();
    const result = [];

    for (const [name, plugin] of plugins.entries()) {
        if (plugin.manifest) {
            result.push({
                name,
                ...plugin.manifest,
                functions: Object.keys(plugin)
                    .filter(key => typeof plugin[key] === 'function' && key !== 'execute')
            });
        }
    }

    return result;
} 