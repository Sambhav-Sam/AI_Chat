/**
 * Visible Operator Automation Module
 * 
 * This module provides a way to visually demonstrate browser automation
 * in a way that mimics a human operator, with visible mouse movements,
 * deliberate pauses, and a step-by-step approach.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, '../automation/screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Run a browser automation task in visible (headed) mode
 * 
 * @param {Object} task - The automation task to perform
 * @param {string} task.url - The URL to navigate to
 * @param {Array} task.actions - Array of actions to perform
 * @param {number} task.delayBetweenSteps - Optional delay in ms between actions (default: 1000ms)
 * @param {Object} options - Additional options
 * @param {boolean} options.takeScreenshots - Whether to take screenshots after each action (default: true)
 * @param {string} options.screenshotsDir - Directory to save screenshots (default: ./screenshots)
 * @param {number} options.defaultTimeout - Default timeout for actions in ms (default: 30000ms)
 * @param {number} options.slowMotion - Slow down each action by this amount in ms (default: 50ms)
 * @returns {Promise<Object>} Result of the automation
 */
export async function runVisibleOperator(task, options = {}) {
    // Default options
    const config = {
        takeScreenshots: true,
        screenshotsDir: screenshotsDir,
        defaultTimeout: 30000,
        slowMotion: 50,
        ...options
    };

    // Validate task
    if (!task || !task.url) {
        throw new Error('Task must include a URL to navigate to');
    }

    // Extract or set default delay between steps
    const delayBetweenSteps = task.delayBetweenSteps || 1000;

    // Prepare result object
    const result = {
        success: false,
        screenshots: [],
        logs: [],
        errors: [],
        startTime: Date.now(),
        endTime: null,
        duration: null
    };

    // Log start of automation
    console.log(`\n=== Starting Visible Operator Automation ===`);
    console.log(`Target URL: ${task.url}`);
    console.log(`Number of actions: ${task.actions?.length || 0}`);
    console.log(`Delay between steps: ${delayBetweenSteps}ms`);

    // Launch the browser in visible mode
    const browser = await chromium.launch({
        headless: false,
        slowMo: config.slowMotion, // Add slight delay to actions to make them visible
    });

    result.logs.push(`Launched browser in visible mode`);

    // Create a new browser context
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        recordVideo: options.recordVideo ? { dir: config.screenshotsDir } : undefined
    });

    // Create a new page
    const page = await context.newPage();

    try {
        // Navigate to the URL
        console.log(`Navigating to ${task.url}...`);
        result.logs.push(`Navigating to ${task.url}`);

        await page.goto(task.url, {
            waitUntil: 'networkidle',
            timeout: config.defaultTimeout
        });

        result.logs.push(`Navigation complete`);

        // Take initial screenshot
        if (config.takeScreenshots) {
            const screenshotPath = path.join(config.screenshotsDir, `initial_${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath });
            result.screenshots.push(screenshotPath);
            result.logs.push(`Took initial screenshot: ${screenshotPath}`);
        }

        // Wait an initial delay to let user see the page
        console.log(`Waiting ${delayBetweenSteps}ms before starting actions...`);
        await page.waitForTimeout(delayBetweenSteps);

        // Process actions if provided
        if (task.actions && Array.isArray(task.actions)) {
            for (const [index, action] of task.actions.entries()) {
                const actionNumber = index + 1;
                console.log(`\nExecuting action ${actionNumber}/${task.actions.length}: ${action.type}`);
                result.logs.push(`Executing action ${actionNumber}: ${action.type}`);

                try {
                    // Execute the action based on its type
                    switch (action.type) {
                        case 'click':
                            // Wait for the element to be visible
                            await page.waitForSelector(action.selector, {
                                state: 'visible',
                                timeout: action.timeout || config.defaultTimeout
                            });

                            // Move the mouse to the element first (more human-like)
                            const element = await page.$(action.selector);
                            const boundingBox = await element.boundingBox();

                            if (boundingBox) {
                                // Calculate center of the element
                                const x = boundingBox.x + boundingBox.width / 2;
                                const y = boundingBox.y + boundingBox.height / 2;

                                // Move the mouse in a human-like fashion
                                await page.mouse.move(x, y, { steps: 10 });
                                await page.waitForTimeout(300); // Pause before clicking

                                // Then click
                                await page.click(action.selector, { timeout: action.timeout || config.defaultTimeout });
                                result.logs.push(`Clicked element: ${action.selector}`);
                            } else {
                                throw new Error(`Element ${action.selector} has no bounding box`);
                            }
                            break;

                        case 'type':
                            // Wait for the element to be visible
                            await page.waitForSelector(action.selector, {
                                state: 'visible',
                                timeout: action.timeout || config.defaultTimeout
                            });

                            // Focus the element first
                            await page.focus(action.selector);
                            await page.waitForTimeout(300); // Small pause after focus

                            // Clear existing text if requested
                            if (action.clearFirst) {
                                await page.fill(action.selector, '');
                                await page.waitForTimeout(200);
                            }

                            // Type the text character by character for more human-like typing
                            if (action.humanLike) {
                                for (const char of action.text) {
                                    await page.type(action.selector, char, { delay: 30 + Math.random() * 100 });
                                }
                            } else {
                                // Or type it all at once with a consistent delay
                                await page.type(action.selector, action.text, { delay: 50 });
                            }

                            result.logs.push(`Typed "${action.text}" into ${action.selector}`);
                            break;

                        case 'wait':
                            if (action.selector) {
                                await page.waitForSelector(action.selector, {
                                    timeout: action.timeout || config.defaultTimeout
                                });
                                result.logs.push(`Waited for selector: ${action.selector}`);
                            } else if (action.milliseconds) {
                                await page.waitForTimeout(action.milliseconds);
                                result.logs.push(`Waited for ${action.milliseconds}ms`);
                            } else {
                                await page.waitForLoadState('networkidle');
                                result.logs.push('Waited for network to be idle');
                            }
                            break;

                        case 'moveMouse':
                            if (action.selector) {
                                // Move to an element
                                const el = await page.$(action.selector);
                                const box = await el.boundingBox();

                                if (box) {
                                    const targetX = box.x + (action.offsetX || box.width / 2);
                                    const targetY = box.y + (action.offsetY || box.height / 2);
                                    await page.mouse.move(targetX, targetY, { steps: 10 });
                                    result.logs.push(`Moved mouse to element: ${action.selector}`);
                                }
                            } else if (action.x !== undefined && action.y !== undefined) {
                                // Move to specific coordinates
                                await page.mouse.move(action.x, action.y, { steps: 10 });
                                result.logs.push(`Moved mouse to coordinates: (${action.x}, ${action.y})`);
                            }
                            break;

                        case 'scroll':
                            if (action.selector) {
                                // Scroll element into view
                                const scrollEl = await page.$(action.selector);
                                if (scrollEl) {
                                    await scrollEl.scrollIntoViewIfNeeded();
                                    result.logs.push(`Scrolled element into view: ${action.selector}`);
                                }
                            } else {
                                // Scroll the page
                                await page.evaluate(({ x, y }) => {
                                    window.scrollBy(x || 0, y || 0);
                                }, { x: action.x || 0, y: action.y || 300 });
                                result.logs.push(`Scrolled page by (${action.x || 0}, ${action.y || 300})`);
                            }
                            break;

                        case 'select':
                            await page.selectOption(action.selector, action.value, {
                                timeout: action.timeout || config.defaultTimeout
                            });
                            result.logs.push(`Selected ${action.value} from ${action.selector}`);
                            break;

                        case 'screenshot':
                            const screenshotName = action.name || `screenshot_${index}`;
                            const screenshotPath = path.join(config.screenshotsDir, `${screenshotName}_${Date.now()}.png`);
                            await page.screenshot({ path: screenshotPath });
                            result.screenshots.push(screenshotPath);
                            result.logs.push(`Took screenshot: ${screenshotPath}`);
                            break;

                        default:
                            result.logs.push(`Unknown action type: ${action.type}`);
                            console.warn(`Unknown action type: ${action.type}`);
                    }

                    // Take a screenshot after each action if enabled
                    if (config.takeScreenshots && action.type !== 'screenshot') {
                        const actionScreenshotPath = path.join(
                            config.screenshotsDir,
                            `action_${actionNumber}_${Date.now()}.png`
                        );
                        await page.screenshot({ path: actionScreenshotPath });
                        result.screenshots.push(actionScreenshotPath);
                        result.logs.push(`Took screenshot after action ${actionNumber}`);
                    }

                    // Wait between actions unless specified otherwise
                    if (!action.skipDelay) {
                        const delay = action.delay || delayBetweenSteps;
                        console.log(`Waiting ${delay}ms before next action...`);
                        await page.waitForTimeout(delay);
                    }

                } catch (actionError) {
                    const errorMsg = `Error in action ${actionNumber} (${action.type}): ${actionError.message}`;
                    console.error(errorMsg);
                    result.errors.push(errorMsg);
                    result.logs.push(errorMsg);

                    // Take a screenshot of the error state
                    if (config.takeScreenshots) {
                        try {
                            const errorScreenshotPath = path.join(
                                config.screenshotsDir,
                                `error_action_${actionNumber}_${Date.now()}.png`
                            );
                            await page.screenshot({ path: errorScreenshotPath });
                            result.screenshots.push(errorScreenshotPath);
                            result.logs.push(`Took error screenshot: ${errorScreenshotPath}`);
                        } catch (screenshotError) {
                            result.logs.push(`Failed to take error screenshot: ${screenshotError.message}`);
                        }
                    }

                    // Stop execution if stopOnError is true
                    if (action.stopOnError || task.stopOnError) {
                        result.logs.push('Stopping execution due to error');
                        break;
                    }
                }
            }
        }

        // Final screenshot
        if (config.takeScreenshots) {
            const finalScreenshotPath = path.join(config.screenshotsDir, `final_${Date.now()}.png`);
            await page.screenshot({ path: finalScreenshotPath });
            result.screenshots.push(finalScreenshotPath);
            result.logs.push(`Took final screenshot: ${finalScreenshotPath}`);
        }

        // Mark as successful if no errors
        result.success = result.errors.length === 0;

    } catch (error) {
        const errorMsg = `Automation error: ${error.message}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        result.logs.push(errorMsg);
    } finally {
        // Calculate duration
        result.endTime = Date.now();
        result.duration = result.endTime - result.startTime;

        console.log(`\nAutomation ${result.success ? 'completed successfully' : 'failed'}`);
        console.log(`Duration: ${result.duration}ms`);
        console.log(`Total screenshots: ${result.screenshots.length}`);

        if (result.errors.length > 0) {
            console.log(`Errors: ${result.errors.length}`);
        }

        // Close the browser
        await browser.close();
    }

    return result;
}

/**
 * Creates an example task for the visible operator
 * @returns {Object} Example task
 */
export function createExampleTask() {
    return {
        url: 'https://www.google.com',
        delayBetweenSteps: 1500,
        actions: [
            {
                type: 'wait',
                milliseconds: 1000
            },
            {
                type: 'type',
                selector: 'input[name="q"]',
                text: 'Playwright automation',
                humanLike: true
            },
            {
                type: 'wait',
                milliseconds: 500
            },
            {
                type: 'moveMouse',
                selector: 'input[name="btnK"]'
            },
            {
                type: 'click',
                selector: 'input[name="btnK"]'
            },
            {
                type: 'wait',
                milliseconds: 2000
            },
            {
                type: 'scroll',
                y: 400
            },
            {
                type: 'screenshot',
                name: 'search-results'
            }
        ]
    };
}

// Export default
export default runVisibleOperator; 