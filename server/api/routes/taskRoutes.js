/**
 * Task API Routes
 * Handles HTTP endpoints for task execution
 */

import express from 'express';
import { executeTask, getAvailableTaskTypes } from '../../taskExecutor.js';

const router = express.Router();

/**
 * Execute a task
 * POST /api/tasks/execute
 */
router.post('/execute', async (req, res) => {
    try {
        const task = req.body;

        if (!task || !task.intent) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task format. Must include an intent field.'
            });
        }

        console.log('Received task execution request:', JSON.stringify(task, null, 2));

        const result = await executeTask(task);

        return res.json(result);
    } catch (error) {
        console.error('Error in task execution endpoint:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * Execute a task with isolation
 * POST /api/tasks/execute-isolated
 */
router.post('/execute-isolated', async (req, res) => {
    try {
        const task = req.body;

        if (!task || !task.intent) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task format. Must include an intent field.'
            });
        }

        console.log('Received isolated task execution request:', JSON.stringify(task, null, 2));

        // Force isolation
        task.forceIsolation = true;

        const result = await executeTask(task);

        return res.json(result);
    } catch (error) {
        console.error('Error in isolated task execution endpoint:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * Get available task types
 * GET /api/tasks/types
 */
router.get('/types', async (req, res) => {
    try {
        const taskTypes = await getAvailableTaskTypes();

        return res.json({
            success: true,
            taskTypes
        });
    } catch (error) {
        console.error('Error in get task types endpoint:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

export default router; 