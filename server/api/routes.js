import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import taskRoutes from './routes/taskRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import visibleAutomationRoutes from './routes/visibleAutomationRoute.js';
import { parseTask, processInstructionAndExecute } from '../aiAgent.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '../automation/screenshots');

// Register task routes
router.use('/tasks', taskRoutes);

// Register agent routes
router.use('/agents', agentRoutes);

// Register performance monitoring routes
router.use('/performance', performanceRoutes);

// Register visible automation routes
router.use('/visible-automation', visibleAutomationRoutes);

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Helper function to dynamically import modules with fallbacks
async function importWithFallback(modulePath, fallbackFn) {
    try {
        const module = await import(modulePath);
        return module;
    } catch (error) {
        console.warn(`Could not import ${modulePath}: ${error.message}`);
        console.warn(`Using fallback implementation`);
        return { default: fallbackFn };
    }
}

// Fallback implementation for parseTask
const mockParseTask = async (input) => {
    console.log(`Mock parsing task: ${input}`);
    // Return a mock parsed task based on input
    if (input.toLowerCase().includes('search')) {
        return {
            intent: 'search',
            parameters: {
                query: input.replace(/search for|search|find/gi, '').trim(),
                site: input.toLowerCase().includes('google') ? 'google.com' : undefined
            },
            context: 'User wants to search for information'
        };
    } else if (input.toLowerCase().includes('form')) {
        return {
            intent: 'fill_form',
            parameters: {
                form_type: 'contact',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com'
            },
            context: 'User wants to fill out a form'
        };
    } else {
        return {
            intent: 'navigate',
            parameters: {
                url: 'example.com'
            },
            context: 'Unknown intent, defaulting to navigation'
        };
    }
};

// Fallback implementation for automation
const mockAutomateWebsite = async (task) => {
    console.log(`Mock automating website: ${JSON.stringify(task)}`);

    // Create timestamps for simulated screenshots
    const now = Date.now();
    const timestamps = Array.from({ length: 4 }, (_, i) => now + i * 1000);

    // Generate mock screenshots
    const screenshots = [
        `${screenshotsDir}/initial_${timestamps[0]}.png`,
        `${screenshotsDir}/action_${timestamps[1]}.png`,
        `${screenshotsDir}/final_${timestamps[2]}.png`,
    ];

    // Generate a demo SVG for each screenshot
    screenshots.forEach((screenshot, index) => {
        const svgContent = generateDemoSvg(task.url, index);
        // Write SVG content to a file
        fs.writeFileSync(screenshot.replace('.png', '.svg'), svgContent);
    });

    return {
        success: true,
        screenshots: screenshots.map(s => s.replace('.png', '.svg')),
        logs: [
            `Started automation for ${task.url}`,
            `Performed ${task.actions?.length || 0} actions`,
            'Completed successfully'
        ],
        errors: []
    };
};

// Fallback implementation for convertParsedTaskToAutomationTask
const mockConvertTask = (parsedTask) => {
    console.log(`Mock converting task: ${JSON.stringify(parsedTask)}`);
    return {
        url: parsedTask.parameters.url || 'https://example.com',
        actions: [
            { type: 'wait', milliseconds: 1000 },
            { type: 'screenshot', name: 'example' }
        ],
        intent: parsedTask.intent
    };
};

// Helper to generate demo SVG
function generateDemoSvg(url, index) {
    const titles = ['Initial Page', 'Action Performed', 'Final State'];
    const title = titles[index % titles.length];

    return `<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f5f5f5"/>
        <rect x="10" y="10" width="780" height="480" stroke="#646cff" stroke-width="2" fill="none" rx="5"/>
        
        <!-- Browser UI Elements -->
        <rect x="20" y="20" width="760" height="40" fill="#333" rx="4"/>
        <circle cx="40" cy="40" r="6" fill="#ff5f57"/>
        <circle cx="60" cy="40" r="6" fill="#febc2e"/>
        <circle cx="80" cy="40" r="6" fill="#28c840"/>
        <rect x="100" y="30" width="500" height="20" fill="#444" rx="3"/>
        <text x="350" y="45" font-family="Arial" font-size="12" fill="white" text-anchor="middle">${url}</text>
        
        <!-- Content -->
        <rect x="20" y="70" width="760" height="410" fill="#fff"/>
        
        <!-- Demo content -->
        <text x="400" y="250" font-family="Arial" font-size="24" fill="#646cff" text-anchor="middle">${title}</text>
        <text x="400" y="280" font-family="Arial" font-size="16" fill="#888" text-anchor="middle">URL: ${url}</text>
        <text x="400" y="310" font-family="Arial" font-size="16" fill="#888" text-anchor="middle">Screenshot ${index + 1}</text>
        
        <!-- Demo text -->
        <text x="400" y="460" font-family="Arial" font-size="14" fill="#646cff" text-anchor="middle">Demo Mode: Simulated Screenshot</text>
    </svg>`;
}

// Load modules with fallbacks
let parseTaskFn = mockParseTask;
let automateWebsiteFn = mockAutomateWebsite;
let convertTaskFn = mockConvertTask;

// Async initialization
async function initModules() {
    try {
        const aiAgentModule = await importWithFallback('../aiAgent.js', () => ({ parseTask: mockParseTask }));
        parseTaskFn = aiAgentModule.parseTask || mockParseTask;

        const automationModule = await importWithFallback('../automation/automateWebsites.js',
            () => ({ automateWebsite: mockAutomateWebsite }));
        automateWebsiteFn = automationModule.automateWebsite || mockAutomateWebsite;

        const integrationModule = await importWithFallback('../automation/integration.js',
            () => ({ convertParsedTaskToAutomationTask: mockConvertTask }));
        convertTaskFn = integrationModule.convertParsedTaskToAutomationTask || mockConvertTask;

        console.log('All modules loaded successfully with fallbacks if needed');
    } catch (error) {
        console.error('Error initializing modules:', error);
        console.log('Using all mock implementations');
    }
}

// Initialize modules
initModules();

// Parse a natural language instruction into a structured task
router.post('/parse-task', async (req, res) => {
    try {
        const { input } = req.body;

        if (!input) {
            return res.status(400).json({ error: 'Input is required' });
        }

        const parsedTask = await parseTaskFn(input);
        res.json(parsedTask);
    } catch (error) {
        console.error('Error parsing task:', error);
        res.status(500).json({ error: 'Failed to parse task: ' + error.message });
    }
});

// Execute a task based on a parsed task object
router.post('/execute-task', async (req, res) => {
    try {
        const { task } = req.body;

        if (!task) {
            return res.status(400).json({ error: 'Task object is required' });
        }

        // Convert the parsed task to an automation task if it's not already
        let automationTask = task;
        if (!task.url || !task.actions) {
            automationTask = convertTaskFn(task);
        }

        // Execute the automation
        const results = await automateWebsiteFn(automationTask, {
            headless: true,
            outputDir: screenshotsDir
        });

        res.json(results);
    } catch (error) {
        console.error('Error executing task:', error);
        res.status(500).json({ error: 'Failed to execute task: ' + error.message });
    }
});

// Complete flow: parse instruction and execute automation
router.post('/run-automation', async (req, res) => {
    try {
        const { input } = req.body;

        if (!input) {
            return res.status(400).json({ error: 'Input is required' });
        }

        // Use the new integrated function for the complete flow
        const result = await processInstructionAndExecute(input);
        res.json(result);
    } catch (error) {
        console.error('Error running automation:', error);
        res.status(500).json({ error: 'Failed to run automation: ' + error.message });
    }
});

// Get a list of all screenshots
router.get('/screenshots', (req, res) => {
    try {
        if (!fs.existsSync(screenshotsDir)) {
            return res.json([]);
        }

        const screenshots = fs.readdirSync(screenshotsDir)
            .filter(file => file.endsWith('.png'))
            .map(file => `/screenshots/${file}`);

        res.json(screenshots);
    } catch (error) {
        console.error('Error getting screenshots:', error);
        res.status(500).json({ error: 'Failed to get screenshots: ' + error.message });
    }
});

// Serve static screenshots
router.use('/screenshots', express.static(screenshotsDir));

export default router; 