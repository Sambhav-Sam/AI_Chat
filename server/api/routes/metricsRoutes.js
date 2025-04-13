/**
 * Metrics API Routes
 * Provides endpoints for system metrics and performance data
 */

import express from 'express';
import browserMetrics from '../../services/browserMetrics.js';
import taskMetrics from '../../services/taskMetrics.js';

const router = express.Router();

/**
 * Get all system metrics
 * GET /api/metrics
 */
router.get('/', (req, res) => {
    try {
        const metrics = {
            browser: browserMetrics.getMetrics(),
            task: taskMetrics.getMetrics(),
            timestamp: new Date().toISOString()
        };

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error retrieving metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve metrics'
        });
    }
});

/**
 * Get browser metrics
 * GET /api/metrics/browser
 */
router.get('/browser', (req, res) => {
    try {
        const metrics = browserMetrics.getMetrics();

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error retrieving browser metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve browser metrics'
        });
    }
});

/**
 * Get browser load time metrics
 * GET /api/metrics/browser/loadtime
 */
router.get('/browser/loadtime', (req, res) => {
    try {
        const metrics = browserMetrics.getLoadTimeMetrics();

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error retrieving browser load time metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve browser load time metrics'
        });
    }
});

/**
 * Get browser error metrics
 * GET /api/metrics/browser/errors
 */
router.get('/browser/errors', (req, res) => {
    try {
        const metrics = browserMetrics.getErrorMetrics();

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error retrieving browser error metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve browser error metrics'
        });
    }
});

/**
 * Get task metrics
 * GET /api/metrics/task
 */
router.get('/task', (req, res) => {
    try {
        const metrics = taskMetrics.getMetrics();

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error retrieving task metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve task metrics'
        });
    }
});

/**
 * Get task type metrics
 * GET /api/metrics/task/type/:taskType
 */
router.get('/task/type/:taskType', (req, res) => {
    try {
        const { taskType } = req.params;
        const metrics = taskMetrics.getTaskTypeMetrics(taskType);

        return res.json({
            success: true,
            taskType,
            metrics
        });
    } catch (error) {
        console.error(`Error retrieving metrics for task type ${req.params.taskType}:`, error);
        return res.status(500).json({
            success: false,
            error: `Failed to retrieve metrics for task type ${req.params.taskType}`
        });
    }
});

/**
 * Get task failure metrics
 * GET /api/metrics/task/failures
 */
router.get('/task/failures', (req, res) => {
    try {
        const metrics = taskMetrics.getFailureMetrics();

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error retrieving task failure metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve task failure metrics'
        });
    }
});

/**
 * Get task performance metrics
 * GET /api/metrics/task/performance
 */
router.get('/task/performance', (req, res) => {
    try {
        const metrics = taskMetrics.getPerformanceMetrics();

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error retrieving task performance metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve task performance metrics'
        });
    }
});

/**
 * Reset all metrics
 * POST /api/metrics/reset
 */
router.post('/reset', (req, res) => {
    try {
        browserMetrics.resetMetrics();
        taskMetrics.resetMetrics();

        return res.json({
            success: true,
            message: 'All metrics reset successfully'
        });
    } catch (error) {
        console.error('Error resetting metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reset metrics'
        });
    }
});

/**
 * Reset browser metrics
 * POST /api/metrics/browser/reset
 */
router.post('/browser/reset', (req, res) => {
    try {
        browserMetrics.resetMetrics();

        return res.json({
            success: true,
            message: 'Browser metrics reset successfully'
        });
    } catch (error) {
        console.error('Error resetting browser metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reset browser metrics'
        });
    }
});

/**
 * Reset task metrics
 * POST /api/metrics/task/reset
 */
router.post('/task/reset', (req, res) => {
    try {
        taskMetrics.resetMetrics();

        return res.json({
            success: true,
            message: 'Task metrics reset successfully'
        });
    } catch (error) {
        console.error('Error resetting task metrics:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reset task metrics'
        });
    }
});

export default router; 