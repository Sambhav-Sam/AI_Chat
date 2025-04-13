/**
 * Automation Operator Module
 * 
 * A focused JavaScript module that provides visible browser automation
 * based on structured task objects. Specialized for demonstrating
 * automation actions in a human-like, visible manner.
 */

import { chromium } from 'playwright';

/**
 * Run a browser automation task in visible mode
 * 
 * @param {Object} task - The automation task object
 * @param {string} task.url - URL to navigate to
 * @param {Array} task.actions - Array of actions to perform
 * @param {number} task.delayBetweenSteps - Delay between actions in ms (default: 1000)
 * @returns {Promise<Object>} - Results of the task execution
 */
export async function runAutomation(task) {
    // Validate task
    if (!task || !task.url) {
        throw new Error('Task must include a URL to navigate to');
    }

    // Set default values
    const delayBetweenSteps = task.delayBetweenSteps || 1000;

    console.log(`Running automation task for: ${task.url}`);
    console.log(`Actions: ${task.actions?.length || 0}`);
    console.log(`Delay between steps: ${delayBetweenSteps}ms`);

    // Launch a visible browser
    const browser = await chromium.launch({
        headless: false,  // Make the browser visible
        slowMo: 50        // Add slight delay to actions for visibility
    });

    // Create a browser context
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
    });

    // Create a new page
    const page = await context.newPage();

    // Result object
    const result = {
        success: false,
        url: task.url,
        actionsPerformed: 0,
        errors: [],
        startTime: Date.now(),
        endTime: null,
        duration: null
    };

    try {
        // Navigate to the URL
        console.log(`Navigating to ${task.url}...`);
        await page.goto(task.url, { waitUntil: 'networkidle' });

        // Perform each action
        if (task.actions && Array.isArray(task.actions)) {
            for (const [index, action] of task.actions.entries()) {
                // Log the action
                console.log(`Performing action ${index + 1}/${task.actions.length}: ${action.type}`);

                try {
                    // Process the action based on its type
                    switch (action.type) {
                        case 'moveToCoordinates':
                            // Move the mouse to specific coordinates
                            await page.mouse.move(action.x, action.y, { steps: action.steps || 10 });
                            console.log(`Moved mouse to coordinates (${action.x}, ${action.y})`);
                            break;

                        case 'moveToElement':
                            // Find the element
                            const element = await page.$(action.selector);
                            if (!element) {
                                throw new Error(`Element not found: ${action.selector}`);
                            }

                            // Get element's bounding box
                            const box = await element.boundingBox();
                            if (!box) {
                                throw new Error(`Cannot get bounding box for element: ${action.selector}`);
                            }

                            // Calculate position (center by default, or with offset)
                            const x = box.x + (action.offsetX !== undefined ? action.offsetX : box.width / 2);
                            const y = box.y + (action.offsetY !== undefined ? action.offsetY : box.height / 2);

                            // Move the mouse
                            await page.mouse.move(x, y, { steps: action.steps || 10 });
                            console.log(`Moved mouse to element: ${action.selector}`);
                            break;

                        case 'click':
                            // Click an element by selector
                            if (action.selector) {
                                // Wait for the element to be visible first
                                await page.waitForSelector(action.selector, {
                                    state: 'visible',
                                    timeout: action.timeout || 10000
                                });

                                // If moveBeforeClick is enabled, first move the mouse to the element
                                if (action.moveBeforeClick !== false) {
                                    const clickElement = await page.$(action.selector);
                                    const clickBox = await clickElement.boundingBox();

                                    if (clickBox) {
                                        await page.mouse.move(
                                            clickBox.x + clickBox.width / 2,
                                            clickBox.y + clickBox.height / 2,
                                            { steps: 10 }
                                        );
                                        // Small pause after moving before clicking
                                        await page.waitForTimeout(300);
                                    }
                                }

                                // Then click it
                                await page.click(action.selector);
                                console.log(`Clicked element: ${action.selector}`);
                            } else if (action.position) {
                                // Click at specific coordinates
                                await page.mouse.click(action.position.x, action.position.y);
                                console.log(`Clicked at position (${action.position.x}, ${action.position.y})`);
                            }
                            break;

                        case 'type':
                            // First wait for the element
                            await page.waitForSelector(action.selector, {
                                state: 'visible',
                                timeout: action.timeout || 10000
                            });

                            // Clear the field first if requested
                            if (action.clearFirst) {
                                await page.fill(action.selector, '');
                            }

                            // Focus the field
                            await page.focus(action.selector);

                            // Type with human-like behavior if requested
                            if (action.humanLike) {
                                for (const char of action.text) {
                                    await page.type(action.selector, char, {
                                        delay: 50 + Math.random() * 150
                                    });
                                }
                            } else {
                                // Type with consistent delay
                                await page.type(action.selector, action.text, {
                                    delay: action.delay || 50
                                });
                            }

                            console.log(`Typed "${action.text}" into ${action.selector}`);
                            break;

                        case 'wait':
                            if (action.milliseconds) {
                                await page.waitForTimeout(action.milliseconds);
                                console.log(`Waited for ${action.milliseconds}ms`);
                            } else if (action.selector) {
                                await page.waitForSelector(action.selector, {
                                    state: action.state || 'visible',
                                    timeout: action.timeout || 30000
                                });
                                console.log(`Waited for element: ${action.selector}`);
                            } else {
                                await page.waitForLoadState('networkidle');
                                console.log('Waited for network to be idle');
                            }
                            break;

                        case 'scroll':
                            if (action.selector) {
                                // Scroll element into view
                                const scrollElement = await page.$(action.selector);
                                if (scrollElement) {
                                    await scrollElement.scrollIntoViewIfNeeded();
                                    console.log(`Scrolled element into view: ${action.selector}`);
                                }
                            } else {
                                // Scroll by coordinates
                                await page.evaluate(
                                    ({ x, y }) => window.scrollBy(x || 0, y || 300),
                                    { x: action.x || 0, y: action.y || 300 }
                                );
                                console.log(`Scrolled by (${action.x || 0}, ${action.y || 300})`);
                            }
                            break;

                        default:
                            console.warn(`Unknown action type: ${action.type}`);
                    }

                    // Increment actions performed counter
                    result.actionsPerformed++;

                    // Wait between actions
                    const delay = action.delay || delayBetweenSteps;
                    if (delay > 0 && !action.skipDelay) {
                        await page.waitForTimeout(delay);
                    }
                } catch (actionError) {
                    // Log the error
                    const errorMessage = `Error in action ${index + 1} (${action.type}): ${actionError.message}`;
                    console.error(errorMessage);
                    result.errors.push(errorMessage);

                    // Stop execution if stopOnError is true
                    if (action.stopOnError || task.stopOnError) {
                        console.log('Stopping execution due to error');
                        break;
                    }
                }
            }
        }

        // Mark as successful if no errors
        result.success = result.errors.length === 0;

    } catch (error) {
        const errorMessage = `Automation error: ${error.message}`;
        console.error(errorMessage);
        result.errors.push(errorMessage);
    } finally {
        // Calculate duration
        result.endTime = Date.now();
        result.duration = result.endTime - result.startTime;

        // Log completion status
        console.log(`Automation ${result.success ? 'completed successfully' : 'failed'}`);
        console.log(`Duration: ${result.duration}ms`);
        console.log(`Actions performed: ${result.actionsPerformed}`);

        // Wait a moment before closing (so the user can see the final state)
        await page.waitForTimeout(3000);

        // Close the browser
        await browser.close();
        console.log('Browser closed');
    }

    return result;
}

/**
 * Create a sample task object
 * 
 * @param {string} url - URL to navigate to (default: Google search)
 * @returns {Object} - Sample task object
 */
export function createSampleTask(url = 'https://www.google.com') {
    return {
        url: url,
        delayBetweenSteps: 1200,
        stopOnError: true,
        actions: [
            // Wait for the page to load
            { type: 'wait', milliseconds: 1000 },

            // Move mouse to the search box
            { type: 'moveToElement', selector: 'input[name="q"]' },

            // Click on the search box
            { type: 'click', selector: 'input[name="q"]' },

            // Type a search query with human-like behavior
            {
                type: 'type',
                selector: 'input[name="q"]',
                text: 'Visible automation with Playwright',
                humanLike: true
            },

            // Wait briefly
            { type: 'wait', milliseconds: 800 },

            // Move to search button
            { type: 'moveToElement', selector: 'input[name="btnK"]' },

            // Click the search button
            { type: 'click', selector: 'input[name="btnK"]' },

            // Wait for search results
            { type: 'wait', milliseconds: 2000 },

            // Scroll down to see more results
            { type: 'scroll', y: 300 },

            // Move to specific coordinates on the page
            { type: 'moveToCoordinates', x: 400, y: 400, steps: 15 },

            // Wait a moment at those coordinates
            { type: 'wait', milliseconds: 1000 }
        ]
    };
}

// Export the module
export default {
    runAutomation,
    createSampleTask
}; 