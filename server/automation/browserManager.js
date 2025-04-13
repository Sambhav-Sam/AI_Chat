/**
 * Browser Manager
 * Manages Playwright browser instances to improve performance by reusing them
 */

import { chromium } from 'playwright';
import os from 'os';

class BrowserManager {
    constructor() {
        this.browser = null;
        this.contexts = new Map();
        this.lastUsed = new Map();
        this.isInitialized = false;
        this.maxIdleTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.cleanupInterval = null;
        this.maxContexts = Math.max(1, Math.floor(os.cpus().length / 2)); // Use half of available CPU cores
    }

    /**
     * Initialize the browser manager
     * @param {Object} options - Browser launch options
     * @returns {Promise<void>}
     */
    async initialize(options = {}) {
        if (this.isInitialized) return;

        try {
            const defaultOptions = {
                headless: true
            };
            const launchOptions = { ...defaultOptions, ...options };

            console.log('Initializing browser manager...');
            this.browser = await chromium.launch(launchOptions);
            this.isInitialized = true;

            // Start cleanup interval
            this.cleanupInterval = setInterval(() => this.cleanupIdleContexts(), 60000);

            console.log('Browser manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize browser manager:', error);
            throw error;
        }
    }

    /**
     * Get a browser context, creating it if needed
     * @param {Object} options - Context options
     * @returns {Promise<Object>} Browser context
     */
    async getBrowserContext(options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const defaultOptions = {
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        };

        const contextId = `context_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const contextOptions = { ...defaultOptions, ...options };

        // Limit the number of concurrent contexts
        if (this.contexts.size >= this.maxContexts) {
            // Find the oldest context to close
            let oldestId = null;
            let oldestTime = Date.now();

            for (const [id, time] of this.lastUsed.entries()) {
                if (time < oldestTime) {
                    oldestTime = time;
                    oldestId = id;
                }
            }

            if (oldestId) {
                await this.releaseContext(oldestId);
            }
        }

        // Create new context
        const context = await this.browser.newContext(contextOptions);
        this.contexts.set(contextId, context);
        this.lastUsed.set(contextId, Date.now());

        return { contextId, context };
    }

    /**
     * Mark a context as being used
     * @param {string} contextId - The context ID
     */
    updateContextUsage(contextId) {
        if (this.contexts.has(contextId)) {
            this.lastUsed.set(contextId, Date.now());
        }
    }

    /**
     * Release a browser context
     * @param {string} contextId - The context ID to release
     * @returns {Promise<boolean>} Whether the context was successfully released
     */
    async releaseContext(contextId) {
        if (!this.contexts.has(contextId)) {
            return false;
        }

        try {
            const context = this.contexts.get(contextId);
            await context.close();
            this.contexts.delete(contextId);
            this.lastUsed.delete(contextId);
            return true;
        } catch (error) {
            console.error(`Error releasing context ${contextId}:`, error);
            return false;
        }
    }

    /**
     * Clean up idle contexts
     * @returns {Promise<void>}
     */
    async cleanupIdleContexts() {
        const now = Date.now();

        for (const [contextId, lastUsedTime] of this.lastUsed.entries()) {
            if (now - lastUsedTime > this.maxIdleTime) {
                console.log(`Cleaning up idle context: ${contextId}`);
                await this.releaseContext(contextId);
            }
        }
    }

    /**
     * Close all browser contexts and the browser
     * @returns {Promise<void>}
     */
    async close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Close all contexts
        for (const contextId of this.contexts.keys()) {
            await this.releaseContext(contextId);
        }

        // Close browser
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }

        this.isInitialized = false;
        console.log('Browser manager closed');
    }
}

// Create singleton instance
const browserManager = new BrowserManager();

export default browserManager; 