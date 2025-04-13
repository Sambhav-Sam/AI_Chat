/**
 * Plugin Loader
 * Dynamically loads and manages plugins for the task runner
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin cache
const plugins = new Map();

/**
 * Load all available plugins
 * @returns {Promise<Map>} Map of loaded plugins
 */
export async function loadAllPlugins() {
    try {
        // Get all .js files in the plugins directory (excluding the loader itself)
        const files = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && file !== 'pluginLoader.js');

        for (const file of files) {
            try {
                const pluginName = path.basename(file, '.js');
                await loadPlugin(pluginName);
            } catch (error) {
                console.error(`Error loading plugin ${file}:`, error);
            }
        }

        return plugins;
    } catch (error) {
        console.error('Error loading plugins:', error);
        return new Map();
    }
}

/**
 * Load a specific plugin by name
 * @param {string} pluginName - Name of the plugin to load
 * @returns {Promise<Object>} The loaded plugin
 */
export async function loadPlugin(pluginName) {
    // Check if already loaded
    if (plugins.has(pluginName)) {
        return plugins.get(pluginName);
    }

    try {
        const pluginPath = `./${pluginName}.js`;
        const plugin = await import(pluginPath);

        // Validate plugin structure
        if (!plugin.manifest) {
            throw new Error(`Plugin ${pluginName} is missing a manifest`);
        }

        // Add plugin to cache
        plugins.set(pluginName, plugin);
        console.log(`Loaded plugin: ${pluginName} (${plugin.manifest.name} v${plugin.manifest.version})`);

        return plugin;
    } catch (error) {
        console.error(`Could not load plugin ${pluginName}:`, error);
        throw error;
    }
}

/**
 * Get a loaded plugin by name
 * @param {string} pluginName - Name of the plugin to get
 * @returns {Object|null} The plugin or null if not found
 */
export function getPlugin(pluginName) {
    return plugins.get(pluginName) || null;
}

/**
 * Get all loaded plugins
 * @returns {Map} Map of all loaded plugins
 */
export function getAllPlugins() {
    return plugins;
}

/**
 * Get plugin that can handle a specific task intent
 * @param {string} intent - Task intent to find plugin for
 * @returns {Object|null} The first plugin that can handle the intent or null
 */
export function getPluginForIntent(intent) {
    for (const [name, plugin] of plugins.entries()) {
        if (plugin.manifest && plugin.manifest.intents &&
            plugin.manifest.intents.includes(intent)) {
            return plugin;
        }
    }
    return null;
}

/**
 * Execute a task using the appropriate plugin
 * @param {Object} task - Task to execute
 * @returns {Promise<Object>} Result of task execution
 */
export async function executeTask(task) {
    try {
        const { intent, parameters } = task;

        if (!intent) {
            throw new Error('Task intent is required');
        }

        // Find plugin that can handle this intent
        const plugin = getPluginForIntent(intent);

        if (!plugin) {
            throw new Error(`No plugin found for intent: ${intent}`);
        }

        // Check if plugin has the execute method
        if (typeof plugin.execute !== 'function') {
            throw new Error(`Plugin ${plugin.manifest.name} does not implement execute method`);
        }

        // Execute the task
        return await plugin.execute(intent, parameters);
    } catch (error) {
        console.error('Error executing task with plugin:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Export default functions for simpler imports
export default {
    loadAllPlugins,
    loadPlugin,
    getPlugin,
    getAllPlugins,
    getPluginForIntent,
    executeTask
}; 