/**
 * Playwright Page Pool
 * Manages a pool of Playwright pages for reuse to speed up automation
 */

import browserManager from './browserManager.js';
import { URL } from 'url';

class PagePool {
    constructor(options = {}) {
        this.pages = new Map();
        this.maxPages = options.maxPages || 10;
        this.pageIdleTimeout = options.pageIdleTimeout || 120000; // 2 minutes
        this.preloadPages = options.preloadPages || false;
        this.lastUsed = new Map();
        this.cleanupInterval = null;
        this.initialized = false;
        this.preloadDomains = options.preloadDomains || [
            'example.com',
            'google.com',
            'github.com'
        ];
    }

    /**
     * Initialize the page pool
     */
    async initialize() {
        if (this.initialized) return;

        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Check every minute

        // Preload common domains if enabled
        if (this.preloadPages) {
            await this.preloadCommonDomains();
        }

        this.initialized = true;
        console.log('Page pool initialized');
    }

    /**
     * Preload pages for common domains
     */
    async preloadCommonDomains() {
        console.log('Preloading pages for common domains...');

        try {
            for (const domain of this.preloadDomains) {
                const url = `https://${domain}`;
                await this.getPage(url, { preload: true });
                console.log(`Preloaded page for ${domain}`);
            }
        } catch (error) {
            console.error('Error preloading pages:', error);
        }
    }

    /**
     * Get domain key from URL
     * @param {string} url - URL to extract domain from
     * @returns {string} Domain key
     * @private
     */
    _getDomainKey(url) {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname;
        } catch (error) {
            return url;
        }
    }

    /**
     * Get a page for a URL, reusing an existing one if available
     * @param {string} url - URL to navigate to
     * @param {Object} options - Options for the page
     * @returns {Promise<Object>} Page object with contextId and page
     */
    async getPage(url, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const domainKey = this._getDomainKey(url);
        const contextOptions = options.contextOptions || {};
        const timeout = options.timeout || 30000;

        // Check if we have an existing page for this domain
        if (this.pages.has(domainKey) && !options.forceNew) {
            const existingPageData = this.pages.get(domainKey);

            try {
                // Basic check to see if the page is still usable
                const page = existingPageData.page;
                await page.evaluate(() => true, { timeout: 1000 });

                // Update last used timestamp
                this.lastUsed.set(domainKey, Date.now());

                console.log(`Reusing existing page for ${domainKey}`);
                return existingPageData;
            } catch (error) {
                console.log(`Existing page for ${domainKey} is no longer usable, creating a new one`);
                await this.releasePage(domainKey);
            }
        }

        // Limit the number of pages
        if (this.pages.size >= this.maxPages) {
            await this.releaseOldestPage();
        }

        // Create a new browser context and page
        const { contextId, context } = await browserManager.getBrowserContext(contextOptions);
        const page = await context.newPage();

        // Navigate to the URL if not just preloading
        if (!options.preload) {
            // First load with domcontentloaded for faster initial rendering
            if (options.fastLoad) {
                try {
                    await page.goto(url, {
                        waitUntil: 'domcontentloaded',
                        timeout: timeout / 2
                    });
                } catch (error) {
                    console.log(`Fast load failed for ${url}, continuing to full load`);
                }
            }

            // Complete navigation with networkidle
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout
            });
        }

        // Store the page in the pool
        const pageData = { contextId, context, page, url };
        this.pages.set(domainKey, pageData);
        this.lastUsed.set(domainKey, Date.now());

        return pageData;
    }

    /**
     * Release a page by domain key
     * @param {string} domainKey - Domain key to release
     * @returns {Promise<boolean>} Success status
     */
    async releasePage(domainKey) {
        if (!this.pages.has(domainKey)) {
            return false;
        }

        const { contextId, page } = this.pages.get(domainKey);

        try {
            // Close the page
            await page.close();

            // Release the context if needed
            await browserManager.releaseContext(contextId);

            // Remove from maps
            this.pages.delete(domainKey);
            this.lastUsed.delete(domainKey);

            return true;
        } catch (error) {
            console.error(`Error releasing page for ${domainKey}:`, error);
            return false;
        }
    }

    /**
     * Release the oldest page by last used time
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async releaseOldestPage() {
        if (this.pages.size === 0) {
            return false;
        }

        let oldestDomain = null;
        let oldestTime = Date.now();

        for (const [domain, time] of this.lastUsed.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestDomain = domain;
            }
        }

        if (oldestDomain) {
            console.log(`Releasing oldest page for ${oldestDomain}`);
            return await this.releasePage(oldestDomain);
        }

        return false;
    }

    /**
     * Cleanup idle pages
     * @returns {Promise<number>} Number of pages released
     */
    async cleanup() {
        const now = Date.now();
        let released = 0;

        for (const [domain, time] of this.lastUsed.entries()) {
            if (now - time > this.pageIdleTimeout) {
                console.log(`Cleaning up idle page for ${domain}`);
                if (await this.releasePage(domain)) {
                    released++;
                }
            }
        }

        return released;
    }

    /**
     * Close all pages and cleanup
     * @returns {Promise<void>}
     */
    async close() {
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Release all pages
        for (const domain of this.pages.keys()) {
            await this.releasePage(domain);
        }

        this.initialized = false;
        console.log('Page pool closed');
    }

    /**
     * Get status information about the page pool
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            initialized: this.initialized,
            activePages: this.pages.size,
            maxPages: this.maxPages,
            domains: Array.from(this.pages.keys()),
            idleTimeout: this.pageIdleTimeout
        };
    }
}

// Create singleton instance
const pagePool = new PagePool();

export default pagePool; 