/**
 * Automation script for interacting with React-based websites using Playwright
 * This module provides functions to automate browser interactions like navigation,
 * clicking, typing, and taking screenshots.
 */

import { chromium } from 'playwright';
import browserManager from './browserManager.js';
import pagePool from './pagePool.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get headless mode from environment
const USE_HEADLESS = process.env.USE_HEADLESS === 'true'; // Default to visible browser

/**
 * Automates browser interactions based on task instructions
 * @param {Object} task - Task object containing instructions
 * @param {string} task.url - URL to navigate to
 * @param {Array} task.actions - List of actions to perform
 * @param {Object} options - Additional options for automation
 * @param {boolean} options.headless - Whether to run browser in headless mode
 * @param {string} options.outputDir - Directory to save screenshots
 * @returns {Promise<Object>} Results of the automation
 */
export async function automateWebsite(task, options = {}) {
    const defaultOptions = {
        headless: USE_HEADLESS,  // Use environment setting, defaults to visible
        outputDir: path.join(__dirname, '../automation/screenshots'),
        reuseContext: true,      // Enable browser context reuse by default
        usePagePool: true,       // Enable page pool by default
        fastLoad: true           // Use fast loading strategy by default
    };

    const config = { ...defaultOptions, ...options };

    // Ensure screenshot directory exists
    if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
    }

    console.log(`Automating with ${config.headless ? 'headless' : 'visible'} browser`);

    const results = {
        success: false,
        screenshots: [],
        logs: [],
        errors: [],
        stats: {
            startTime: Date.now(),
            endTime: null,
            duration: null,
            actionCount: 0,
            errorCount: 0
        }
    };

    // Validate task object
    if (!task || !task.url) {
        throw new Error('Task must include a URL to navigate to');
    }

    let contextId = null;
    let context = null;
    let page = null;
    let shouldRelease = false;
    let pageFromPool = false;
    let domainKey = null;

    try {
        // Log the start of automation
        results.logs.push(`Starting automation for ${task.url}`);
        console.log(`Starting automation for ${task.url} (${config.headless ? 'headless' : 'visible'} mode)`);

        // Determine if we should use the page pool
        if (config.usePagePool && config.reuseContext) {
            try {
                // Get page from pool
                const pageData = await pagePool.getPage(task.url, {
                    fastLoad: config.fastLoad,
                    timeout: task.timeout || 30000,
                    contextOptions: {
                        viewport: { width: 1280, height: 720 },
                        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
                    }
                });

                // Extract context and page from pool data
                contextId = pageData.contextId;
                context = pageData.context;
                page = pageData.page;
                domainKey = pagePool._getDomainKey(task.url);
                pageFromPool = true;

                results.logs.push(`Using page from pool for domain: ${domainKey}`);
            } catch (poolError) {
                results.logs.push(`Failed to get page from pool: ${poolError.message}`);
                // Fall back to regular browser manager if page pool fails
                pageFromPool = false;
            }
        }

        // If not using page pool, get a context from browser manager
        if (!pageFromPool) {
            if (config.reuseContext) {
                // Initialize browser manager if not already initialized
                if (!browserManager.isInitialized) {
                    await browserManager.initialize({ headless: config.headless });
                }

                // Get or create a browser context
                const contextResult = await browserManager.getBrowserContext({
                    viewport: { width: 1280, height: 720 },
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                });

                contextId = contextResult.contextId;
                context = contextResult.context;
                shouldRelease = false; // We'll let the manager handle this
            } else {
                // Use a one-off browser instance
                const browser = await chromium.launch({ headless: config.headless });
                context = await browser.newContext({
                    viewport: { width: 1280, height: 720 },
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
                });
                shouldRelease = true;
            }

            page = await context.newPage();

            // Log navigation start
            results.logs.push(`Navigating to ${task.url}`);

            // Use two-phase loading for better performance
            if (config.fastLoad) {
                try {
                    // First load with domcontentloaded for faster initial rendering
                    await page.goto(task.url, {
                        waitUntil: 'domcontentloaded',
                        timeout: (task.timeout || 30000) / 2
                    });
                    results.logs.push('Initial page load completed (domcontentloaded)');
                } catch (fastLoadError) {
                    results.logs.push(`Fast load failed: ${fastLoadError.message}`);
                }
            }

            // Complete full navigation with networkidle
            await page.goto(task.url, {
                waitUntil: 'networkidle',
                timeout: task.timeout || 30000
            });
            results.logs.push('Full page load completed (networkidle)');
        }

        // Take initial screenshot
        const initialScreenshot = `${config.outputDir}/initial_${Date.now()}.png`;
        await page.screenshot({ path: initialScreenshot });
        results.screenshots.push(initialScreenshot);
        results.logs.push(`Took initial screenshot: ${initialScreenshot}`);

        // Process actions if provided
        if (task.actions && Array.isArray(task.actions)) {
            results.stats.actionCount = task.actions.length;

            for (const [index, action] of task.actions.entries()) {
                results.logs.push(`Executing action ${index + 1}: ${action.type}`);

                const actionStartTime = Date.now();
                let actionSuccess = false;

                try {
                    switch (action.type) {
                        case 'click':
                            // Wait for the element to be visible first
                            await page.waitForSelector(action.selector, {
                                state: 'visible',
                                timeout: action.timeout || 5000
                            });

                            // Then click it
                            await page.click(action.selector, { timeout: action.timeout || 5000 });
                            results.logs.push(`Clicked element: ${action.selector}`);
                            break;

                        case 'type':
                            // Wait for the element to be visible first
                            await page.waitForSelector(action.selector, {
                                state: 'visible',
                                timeout: action.timeout || 5000
                            });

                            // Then fill it
                            await page.fill(action.selector, action.text, { timeout: action.timeout || 5000 });
                            results.logs.push(`Typed "${action.text}" into ${action.selector}`);
                            break;

                        case 'select':
                            await page.selectOption(action.selector, action.value, { timeout: action.timeout || 5000 });
                            results.logs.push(`Selected ${action.value} from ${action.selector}`);
                            break;

                        case 'wait':
                            if (action.selector) {
                                await page.waitForSelector(action.selector, { timeout: action.timeout || 30000 });
                                results.logs.push(`Waited for selector: ${action.selector}`);
                            } else if (action.milliseconds) {
                                await page.waitForTimeout(action.milliseconds);
                                results.logs.push(`Waited for ${action.milliseconds}ms`);
                            } else {
                                await page.waitForLoadState('networkidle');
                                results.logs.push('Waited for network to be idle');
                            }
                            break;

                        case 'screenshot':
                            const screenshotPath = `${config.outputDir}/${action.name || `screenshot_${index}`}_${Date.now()}.png`;
                            await page.screenshot({ path: screenshotPath });
                            results.screenshots.push(screenshotPath);
                            results.logs.push(`Took screenshot: ${screenshotPath}`);
                            break;

                        case 'hover':
                            await page.hover(action.selector, { timeout: action.timeout || 5000 });
                            results.logs.push(`Hovered over element: ${action.selector}`);
                            break;

                        case 'press':
                            await page.press(action.selector || 'body', action.key, { timeout: action.timeout || 5000 });
                            results.logs.push(`Pressed key ${action.key} on ${action.selector || 'body'}`);
                            break;

                        case 'evaluate':
                            if (action.script) {
                                const result = await page.evaluate(action.script);
                                results.logs.push(`Evaluated script, result: ${JSON.stringify(result)}`);
                            }
                            break;

                        default:
                            results.logs.push(`Unknown action type: ${action.type}`);
                    }

                    // Mark action as successful
                    actionSuccess = true;

                    // Take a screenshot after each action if specified
                    if (action.screenshotAfter) {
                        const actionScreenshot = `${config.outputDir}/after_action_${index + 1}_${Date.now()}.png`;
                        await page.screenshot({ path: actionScreenshot });
                        results.screenshots.push(actionScreenshot);
                        results.logs.push(`Took screenshot after action ${index + 1}: ${actionScreenshot}`);
                    }

                    // Wait a bit between actions unless specified otherwise
                    if (action.noDelay !== true) {
                        await page.waitForTimeout(action.delay || 1000);
                    }
                } catch (actionError) {
                    results.stats.errorCount++;

                    const errorMessage = `Error executing action ${index + 1} (${action.type}): ${actionError.message}`;
                    results.errors.push(errorMessage);
                    results.logs.push(errorMessage);

                    // Take a screenshot of the error state if possible
                    try {
                        const errorScreenshot = `${config.outputDir}/error_action_${index + 1}_${Date.now()}.png`;
                        await page.screenshot({ path: errorScreenshot });
                        results.screenshots.push(errorScreenshot);
                        results.logs.push(`Took error screenshot: ${errorScreenshot}`);
                    } catch (screenshotError) {
                        results.logs.push(`Failed to take error screenshot: ${screenshotError.message}`);
                    }

                    // Break execution if stopOnError is true
                    if (action.stopOnError === true) {
                        results.logs.push('Stopping execution due to stopOnError flag');
                        break;
                    }
                } finally {
                    // Record action duration
                    const actionDuration = Date.now() - actionStartTime;
                    results.logs.push(`Action ${index + 1} completed in ${actionDuration}ms (${actionSuccess ? 'success' : 'failed'})`);
                }
            }
        }

        // Mark task as successful if we got this far
        results.success = results.errors.length === 0;
        results.logs.push(`Automation ${results.success ? 'completed successfully' : 'completed with errors'}`);
    } catch (error) {
        const errorMessage = `Automation error: ${error.message}`;
        results.errors.push(errorMessage);
        results.logs.push(errorMessage);
    } finally {
        // Update performance statistics
        results.stats.endTime = Date.now();
        results.stats.duration = results.stats.endTime - results.stats.startTime;

        // If using page pool, don't release the page (let it be reused)
        if (pageFromPool && domainKey) {
            results.logs.push(`Keeping page in pool for domain: ${domainKey}`);
        } else {
            // Update context usage if we're using the browser manager
            if (contextId) {
                browserManager.updateContextUsage(contextId);
            }

            // If we should release the context (not using browser manager)
            if (shouldRelease && context) {
                try {
                    await context.close();
                    results.logs.push('Browser context closed');
                } catch (error) {
                    results.logs.push(`Error closing browser context: ${error.message}`);
                }
            }
        }
    }

    return results;
}

/**
 * Clean up browser resources when the application is shutting down
 */
export async function cleanupBrowserResources() {
    try {
        console.log('Cleaning up browser resources...');

        // Close page pool first
        await pagePool.close();

        // Then close browser manager
        await browserManager.close();

        return true;
    } catch (error) {
        console.error('Error cleaning up browser resources:', error);
        return false;
    }
}

/**
 * Get status information about browser resources
 * @returns {Object} Status information
 */
export function getBrowserStatus() {
    return {
        browserManager: {
            initialized: browserManager.isInitialized,
            contexts: browserManager.contexts.size,
            maxContexts: browserManager.maxContexts
        },
        pagePool: pagePool.getStatus()
    };
}

/**
 * Sample usage example
 */
async function example() {
    const task = {
        url: 'https://example.com',
        actions: [
            { type: 'wait', milliseconds: 2000 },
            { type: 'click', selector: 'a', screenshotAfter: true },
            { type: 'type', selector: 'input#search', text: 'React testing' },
            { type: 'click', selector: 'button[type="submit"]' },
            { type: 'wait', selector: '.results' },
            { type: 'screenshot', name: 'search_results' }
        ]
    };

    const results = await automateWebsite(task, { headless: false });
    console.log('Automation results:', results);
}

// Export the function
export default automateWebsite; 