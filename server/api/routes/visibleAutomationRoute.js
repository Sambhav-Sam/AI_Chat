/**
 * Visible Automation API Route
 * Provides an endpoint to run automation tasks with a visible browser
 */

import express from 'express';
import { automateWebsite } from '../../automation/automateWebsites.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, '../../automation/screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Execute an automation task with a visible browser
 * POST /api/visible-automation/execute
 */
router.post('/execute', async (req, res) => {
    try {
        const { task } = req.body;

        if (!task || !task.url) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task format. Must include a URL.'
            });
        }

        console.log('Received visible automation request:', JSON.stringify(task, null, 2));

        // Force visible (non-headless) mode
        process.env.USE_HEADLESS = 'false';

        // Execute the automation task
        const result = await automateWebsite(task, {
            headless: false,
            outputDir: screenshotsDir,
            reuseContext: true,
            usePagePool: false // Create a new page for better visibility
        });

        // Add base URL for accessing screenshots
        if (result.screenshots && result.screenshots.length > 0) {
            result.screenshotUrls = result.screenshots.map(screenshot => {
                const filename = path.basename(screenshot);
                return `/screenshots/${filename}`;
            });
        }

        return res.json(result);
    } catch (error) {
        console.error('Error in visible automation endpoint:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * Get the status of the visible automation system
 * GET /api/visible-automation/status
 */
router.get('/status', (req, res) => {
    res.json({
        ready: true,
        mode: 'visible',
        screenshotsPath: screenshotsDir
    });
});

export default router; 