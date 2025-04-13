/**
 * Browser Controller
 * Manages the browser session using Playwright with real-time visualization
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Screenshots directory
const SCREENSHOTS_DIR = path.join(__dirname, '../../public/screenshots');

class BrowserController {
    constructor(io) {
        this.browser = null;
        this.page = null;
        this.context = null;
        this.io = io; // Socket.IO instance for real-time communication
        this.isRunning = false;
        this.isPaused = false;
        this.actionHistory = [];
        this.currentActionIndex = -1;
        this.screenshotInterval = null;
        this.mouseMoveThrottle = null;
    }

    /**
     * Initialize the browser
     */
    async initialize() {
        try {
            // Create screenshots directory if it doesn't exist
            await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

            // Launch browser with headed mode
            this.browser = await chromium.launch({
                headless: false,
                args: ['--start-maximized']
            });

            // Create a browser context with viewport size
            this.context = await this.browser.newContext({
                viewport: { width: 1280, height: 800 },
                recordVideo: {
                    dir: path.join(SCREENSHOTS_DIR, 'videos'),
                    size: { width: 1280, height: 800 }
                }
            });

            // Create a new page
            this.page = await this.context.newPage();

            // Start listening to page events
            await this.setupPageListeners();

            // Start screenshot interval for real-time view
            this.startScreenshotStream();

            this.isRunning = true;

            return true;
        } catch (error) {
            console.error('Failed to initialize browser:', error);
            return false;
        }
    }

    /**
     * Set up page event listeners
     */
    async setupPageListeners() {
        // Listen for console messages
        this.page.on('console', msg => {
            this.io.emit('browser:console', {
                type: msg.type(),
                text: msg.text()
            });
        });

        // Listen for page navigation
        this.page.on('load', () => {
            this.takeScreenshot();
            this.io.emit('browser:navigation', {
                url: this.page.url(),
                title: this.page.title()
            });
        });

        // Set up mouse move listener
        this.page.mouse.on = this.page.mouse.on || (() => { }); // Fallback if not available
        this.page.mouse.on('move', throttle((x, y) => {
            this.io.emit('browser:cursor', { x, y });
        }, 50)); // Throttle to 50ms
    }

    /**
     * Start streaming screenshots at regular intervals
     */
    startScreenshotStream() {
        // Clear any existing interval
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
        }

        // Take screenshots every 500ms
        this.screenshotInterval = setInterval(async () => {
            if (this.page && !this.isPaused) {
                await this.takeScreenshot();
            }
        }, 500);
    }

    /**
     * Take a screenshot and emit it to clients
     */
    async takeScreenshot() {
        if (!this.page) return;

        try {
            const screenshot = await this.page.screenshot({
                type: 'jpeg',
                quality: 80,
                omitBackground: true
            });

            // Convert to base64 for transmission
            const base64Image = screenshot.toString('base64');
            this.io.emit('browser:screenshot', { image: base64Image });

            return base64Image;
        } catch (error) {
            console.error('Failed to take screenshot:', error);
        }
    }

    /**
     * Navigate to a URL
     */
    async navigate(url) {
        if (!this.page || this.isPaused) return false;

        try {
            // Log action
            const action = {
                type: 'navigation',
                url,
                timestamp: Date.now()
            };
            this.logAction(action);

            // Emit action start event
            this.io.emit('agent:action', {
                action: 'Navigating to URL',
                target: url,
                status: 'start'
            });

            // Actually navigate
            await this.page.goto(url, { waitUntil: 'domcontentloaded' });

            // Take a screenshot after navigation
            await this.takeScreenshot();

            // Emit action complete event
            this.io.emit('agent:action', {
                action: 'Navigating to URL',
                target: url,
                status: 'complete'
            });

            return true;
        } catch (error) {
            console.error(`Failed to navigate to ${url}:`, error);

            // Emit action error event
            this.io.emit('agent:action', {
                action: 'Navigating to URL',
                target: url,
                status: 'error',
                error: error.message
            });

            return false;
        }
    }

    /**
     * Click an element
     */
    async click(selector, description = 'element') {
        if (!this.page || this.isPaused) return false;

        try {
            // Log action
            const action = {
                type: 'click',
                selector,
                description,
                timestamp: Date.now()
            };
            this.logAction(action);

            // Emit action start event
            this.io.emit('agent:action', {
                action: 'Clicking',
                target: description,
                status: 'start'
            });

            // First try to scroll the element into view
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, selector);

            // Wait a moment for the scroll to complete
            await this.page.waitForTimeout(500);

            // Highlight the element before clicking (visual feedback)
            await this.highlightElement(selector);

            // Get element position for cursor animation
            const elementHandle = await this.page.$(selector);
            if (!elementHandle) {
                throw new Error(`Element not found: ${selector}`);
            }

            const boundingBox = await elementHandle.boundingBox();
            if (!boundingBox) {
                throw new Error(`Cannot get position of element: ${selector}`);
            }

            // Animate cursor to the element
            await this.animateCursor(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

            // Click with a slight delay for visual effect
            await this.page.waitForTimeout(300);
            await this.page.click(selector);

            // Take a screenshot after click
            await this.takeScreenshot();

            // Emit action complete event
            this.io.emit('agent:action', {
                action: 'Clicking',
                target: description,
                status: 'complete'
            });

            return true;
        } catch (error) {
            console.error(`Failed to click ${description} (${selector}):`, error);

            // Emit action error event
            this.io.emit('agent:action', {
                action: 'Clicking',
                target: description,
                status: 'error',
                error: error.message
            });

            return false;
        }
    }

    /**
     * Type text into an input field
     */
    async type(selector, text, description = 'input field') {
        if (!this.page || this.isPaused) return false;

        try {
            // Log action
            const action = {
                type: 'type',
                selector,
                text,
                description,
                timestamp: Date.now()
            };
            this.logAction(action);

            // Emit action start event
            this.io.emit('agent:action', {
                action: 'Typing',
                target: description,
                text: text,
                status: 'start'
            });

            // First try to scroll the element into view
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, selector);

            // Wait a moment for the scroll to complete
            await this.page.waitForTimeout(500);

            // Highlight the element before typing
            await this.highlightElement(selector);

            // Get element position for cursor animation
            const elementHandle = await this.page.$(selector);
            if (!elementHandle) {
                throw new Error(`Element not found: ${selector}`);
            }

            const boundingBox = await elementHandle.boundingBox();
            if (!boundingBox) {
                throw new Error(`Cannot get position of element: ${selector}`);
            }

            // Animate cursor to the element
            await this.animateCursor(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);

            // Click with a slight delay for visual effect
            await this.page.waitForTimeout(300);
            await this.page.click(selector);

            // Clear existing content if needed
            await this.page.fill(selector, '');

            // Type text character by character for visual effect
            for (const char of text) {
                await this.page.type(selector, char, { delay: 50 });

                // Emit typing progress for CoT display
                this.io.emit('agent:typing', {
                    currentText: char,
                    target: description
                });
            }

            // Take a screenshot after typing
            await this.takeScreenshot();

            // Emit action complete event
            this.io.emit('agent:action', {
                action: 'Typing',
                target: description,
                text: text,
                status: 'complete'
            });

            return true;
        } catch (error) {
            console.error(`Failed to type into ${description} (${selector}):`, error);

            // Emit action error event
            this.io.emit('agent:action', {
                action: 'Typing',
                target: description,
                text: text,
                status: 'error',
                error: error.message
            });

            return false;
        }
    }

    /**
     * Highlight an element temporarily for visual feedback
     */
    async highlightElement(selector) {
        try {
            await this.page.evaluate((sel) => {
                const element = document.querySelector(sel);
                if (element) {
                    const originalOutline = element.style.outline;
                    const originalBoxShadow = element.style.boxShadow;

                    element.style.outline = '2px solid #ff5722';
                    element.style.boxShadow = '0 0 10px rgba(255, 87, 34, 0.7)';

                    setTimeout(() => {
                        element.style.outline = originalOutline;
                        element.style.boxShadow = originalBoxShadow;
                    }, 1000);
                }
            }, selector);
        } catch (error) {
            console.error('Failed to highlight element:', error);
        }
    }

    /**
     * Animate cursor movement to coordinates
     */
    async animateCursor(targetX, targetY) {
        try {
            // Get current mouse position (defaults to 0,0 if not available)
            const currentPosition = { x: 0, y: 0 };

            // Calculate animation frames (30 frames for smooth animation)
            const frames = 15;
            const deltaX = (targetX - currentPosition.x) / frames;
            const deltaY = (targetY - currentPosition.y) / frames;

            // Animate mouse movement
            for (let i = 1; i <= frames; i++) {
                const x = currentPosition.x + deltaX * i;
                const y = currentPosition.y + deltaY * i;

                // Move mouse to new position
                await this.page.mouse.move(x, y);

                // Emit cursor position for UI
                this.io.emit('browser:cursor', { x, y });

                // Short delay between frames
                await this.page.waitForTimeout(10);
            }
        } catch (error) {
            console.error('Failed to animate cursor:', error);
        }
    }

    /**
     * Log an action to history
     */
    logAction(action) {
        // If we've done undo operations, trim the history
        if (this.currentActionIndex < this.actionHistory.length - 1) {
            this.actionHistory = this.actionHistory.slice(0, this.currentActionIndex + 1);
        }

        // Add the new action
        this.actionHistory.push(action);
        this.currentActionIndex = this.actionHistory.length - 1;

        // Emit action history update
        this.io.emit('agent:history', {
            history: this.actionHistory,
            currentIndex: this.currentActionIndex
        });
    }

    /**
     * Undo the last action
     */
    async undoLastAction() {
        if (this.currentActionIndex < 0) {
            return false; // Nothing to undo
        }

        // Decrement the current index
        this.currentActionIndex--;

        // Emit action start event
        this.io.emit('agent:action', {
            action: 'Undoing last action',
            status: 'start'
        });

        // Rebuild the state by replaying all actions up to currentActionIndex
        await this.rebuildStateToIndex(this.currentActionIndex);

        // Emit updated history
        this.io.emit('agent:history', {
            history: this.actionHistory,
            currentIndex: this.currentActionIndex
        });

        // Emit action complete event
        this.io.emit('agent:action', {
            action: 'Undoing last action',
            status: 'complete'
        });

        return true;
    }

    /**
     * Rebuild the browser state up to a specific index
     */
    async rebuildStateToIndex(index) {
        // Reset browser state
        await this.page.goto('about:blank');

        // Replay actions up to the specified index
        for (let i = 0; i <= index; i++) {
            const action = this.actionHistory[i];

            switch (action.type) {
                case 'navigation':
                    await this.page.goto(action.url, { waitUntil: 'domcontentloaded' });
                    break;

                case 'click':
                    try {
                        await this.page.waitForSelector(action.selector, { timeout: 5000 });
                        await this.page.click(action.selector);
                    } catch (error) {
                        console.error(`Failed to replay click action: ${error.message}`);
                    }
                    break;

                case 'type':
                    try {
                        await this.page.waitForSelector(action.selector, { timeout: 5000 });
                        await this.page.fill(action.selector, action.text);
                    } catch (error) {
                        console.error(`Failed to replay type action: ${error.message}`);
                    }
                    break;

                default:
                    console.warn(`Unknown action type: ${action.type}`);
            }
        }

        // Take a screenshot of the rebuilt state
        await this.takeScreenshot();
    }

    /**
     * Pause agent actions
     */
    pause() {
        this.isPaused = true;
        this.io.emit('agent:status', { status: 'paused' });
        return true;
    }

    /**
     * Resume agent actions
     */
    resume() {
        this.isPaused = false;
        this.io.emit('agent:status', { status: 'running' });
        return true;
    }

    /**
     * Execute custom JavaScript in the browser context
     */
    async executeScript(script) {
        if (!this.page) return null;

        try {
            return await this.page.evaluate(script);
        } catch (error) {
            console.error('Failed to execute script:', error);
            return null;
        }
    }

    /**
     * Clean up resources
     */
    async close() {
        // Clear intervals
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.screenshotInterval = null;
        }

        // Close page, context, and browser
        if (this.page) {
            await this.page.close();
            this.page = null;
        }

        if (this.context) {
            await this.context.close();
            this.context = null;
        }

        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }

        this.isRunning = false;

        return true;
    }
}

// Utility function to throttle function calls
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function () {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

export default BrowserController; 