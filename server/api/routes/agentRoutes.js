/**
 * Agent API Routes
 * Handles HTTP endpoints for multi-agent coordination
 */

import express from 'express';
import { AgentRunner } from '../../agents/agentRunner.js';

const router = express.Router();
const agentRunner = new AgentRunner();

/**
 * Execute a multi-agent task
 * POST /api/agents/execute
 */
router.post('/execute', async (req, res) => {
    try {
        const { instruction } = req.body;

        if (!instruction) {
            return res.status(400).json({
                success: false,
                error: 'Instruction is required'
            });
        }

        console.log('Received multi-agent task instruction:', instruction);

        const result = await agentRunner.execute(instruction);

        return res.json(result);
    } catch (error) {
        console.error('Error in multi-agent task execution endpoint:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * Get execution history
 * GET /api/agents/history
 */
router.get('/history', (req, res) => {
    try {
        const history = agentRunner.getHistory();

        return res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error('Error getting execution history:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * Clear execution history
 * DELETE /api/agents/history
 */
router.delete('/history', (req, res) => {
    try {
        agentRunner.clearHistory();

        return res.json({
            success: true,
            message: 'Execution history cleared'
        });
    } catch (error) {
        console.error('Error clearing execution history:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

/**
 * Get available agents
 * GET /api/agents
 */
router.get('/', (req, res) => {
    try {
        const agents = Object.entries(agentRunner.agents).map(([key, agent]) => ({
            id: key,
            name: agent.name,
            description: agent.description,
            capabilities: agent.getCapabilities()
        }));

        return res.json({
            success: true,
            agents
        });
    } catch (error) {
        console.error('Error getting available agents:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

export default router; 