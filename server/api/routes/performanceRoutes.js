/**
 * Performance Monitoring API Routes
 * Provides endpoints for monitoring system performance
 */

import express from 'express';
import redisCache from '../../services/redisCache.js';
import { getBrowserStatus } from '../../automation/automateWebsites.js';
import os from 'os';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import cacheMetrics from '../../services/cacheMetrics.js';
import pagePool from '../../automation/pagePool.js';
import browserManager from '../../automation/browserManager.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get system metrics
 * @returns {Object} System metrics
 */
async function getSystemMetrics() {
    try {
        // Get CPU load
        const cpuLoad = os.loadavg();

        // Get memory usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = (usedMem / totalMem) * 100;

        // Get process memory usage
        const processMemory = process.memoryUsage();

        // Get uptime
        const uptime = os.uptime();
        const processUptime = process.uptime();

        // Format uptime values
        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor(((seconds % 86400) % 3600) / 60);
            const remainingSeconds = Math.floor(((seconds % 86400) % 3600) % 60);

            if (days > 0) {
                return `${days}d ${hours}h ${minutes}m`;
            } else if (hours > 0) {
                return `${hours}h ${minutes}m ${remainingSeconds}s`;
            } else {
                return `${minutes}m ${remainingSeconds}s`;
            }
        };

        return {
            cpu: {
                cores: os.cpus().length,
                load: {
                    '1m': cpuLoad[0],
                    '5m': cpuLoad[1],
                    '15m': cpuLoad[2]
                }
            },
            memory: {
                total: formatBytes(totalMem),
                free: formatBytes(freeMem),
                used: formatBytes(usedMem),
                usagePercent: memUsagePercent.toFixed(2)
            },
            process: {
                memory: {
                    rss: formatBytes(processMemory.rss),
                    heapTotal: formatBytes(processMemory.heapTotal),
                    heapUsed: formatBytes(processMemory.heapUsed),
                    external: formatBytes(processMemory.external)
                },
                uptime: formatUptime(processUptime)
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                uptime: formatUptime(uptime)
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting system metrics:', error);
        return { error: error.message };
    }
}

/**
 * Format bytes to a human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get Redis metrics
 * @returns {Promise<Object>} Redis metrics
 */
async function getRedisMetrics() {
    try {
        return await redisCache.getMetrics();
    } catch (error) {
        console.error('Error getting Redis metrics:', error);
        return { error: error.message };
    }
}

/**
 * Get Browser metrics
 * @returns {Object} Browser metrics
 */
function getBrowserMetrics() {
    try {
        return getBrowserStatus();
    } catch (error) {
        console.error('Error getting browser metrics:', error);
        return { error: error.message };
    }
}

/**
 * Get test results
 * @returns {Promise<Object>} Test results
 */
async function getTestResults() {
    try {
        const resultsDir = path.join(__dirname, '../../tests/results');

        // Check if directory exists
        if (!fs.existsSync(resultsDir)) {
            return { error: 'Results directory not found' };
        }

        // Get files in the directory
        const files = fs.readdirSync(resultsDir)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => {
                const statA = fs.statSync(path.join(resultsDir, a));
                const statB = fs.statSync(path.join(resultsDir, b));
                return statB.mtime.getTime() - statA.mtime.getTime(); // Sort by modification time (newest first)
            });

        // Read the most recent file
        if (files.length > 0) {
            const latestFile = files[0];
            const filePath = path.join(resultsDir, latestFile);
            const content = fs.readFileSync(filePath, 'utf8');

            try {
                const parsedContent = JSON.parse(content);
                return {
                    timestamp: parsedContent.timestamp,
                    results: parsedContent,
                    filePath: latestFile
                };
            } catch (parseError) {
                return { error: 'Error parsing results file' };
            }
        } else {
            return { error: 'No results files found' };
        }
    } catch (error) {
        console.error('Error getting test results:', error);
        return { error: error.message };
    }
}

/**
 * GET /api/performance
 * Returns performance metrics for the system
 */
router.get('/', async (req, res) => {
    try {
        const [systemMetrics, redisMetrics, testResults] = await Promise.all([
            getSystemMetrics(),
            getRedisMetrics(),
            getTestResults()
        ]);

        const browserMetrics = getBrowserMetrics();

        res.json({
            system: systemMetrics,
            redis: redisMetrics,
            browser: browserMetrics,
            testResults,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in performance endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/performance/redis
 * Returns Redis cache metrics
 */
router.get('/redis', async (req, res) => {
    try {
        const metrics = await getRedisMetrics();
        res.json(metrics);
    } catch (error) {
        console.error('Error in Redis metrics endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/performance/browser
 * Returns browser automation metrics
 */
router.get('/browser', async (req, res) => {
    try {
        const isInitialized = browserManager.isInitialized;

        // Get page pool statistics if available
        const pagePoolStats = pagePool.initialized ? pagePool.getStats() : null;

        // Get browser manager memory usage
        const memoryUsage = isInitialized ? await browserManager.getMemoryUsage() : null;

        return res.json({
            success: true,
            browserStatus: isInitialized ? 'initialized' : 'not initialized',
            metrics: {
                pagePool: pagePoolStats,
                memoryUsage,
                browserInfo: {
                    version: browserManager.browserVersion || 'unknown',
                    isHeadless: browserManager.isHeadless,
                    contextCount: browserManager.contextCount || 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching browser metrics:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            browserStatus: browserManager.isInitialized ? 'initialized' : 'not initialized'
        });
    }
});

/**
 * GET /api/performance/system
 * Returns system metrics
 */
router.get('/system', (req, res) => {
    try {
        const metrics = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            resourceUsage: process.resourceUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Error fetching system metrics:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/performance/redis/reset
 * Resets Redis cache metrics
 */
router.post('/redis/reset', async (req, res) => {
    try {
        if (redisCache.metrics) {
            redisCache.metrics.resetMetrics();
            res.json({ success: true, message: 'Redis metrics reset successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Redis metrics tracking is not available' });
        }
    } catch (error) {
        console.error('Error resetting Redis metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/performance/redis/clear
 * Clears the Redis cache
 */
router.post('/redis/clear', async (req, res) => {
    try {
        const success = await redisCache.clear();

        if (success) {
            res.json({ success: true, message: 'Redis cache cleared successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Failed to clear Redis cache' });
        }
    } catch (error) {
        console.error('Error clearing Redis cache:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get cache performance metrics
 * GET /api/performance/cache
 */
router.get('/cache', async (req, res) => {
    try {
        if (!redisCache.connected) {
            return res.status(503).json({
                success: false,
                error: 'Redis cache is not connected',
                cacheStatus: 'disabled'
            });
        }

        // Get metrics from cache metrics service
        const metrics = await cacheMetrics.getMetrics();

        // Get real-time cache stats from Redis
        const cacheInfo = await redisCache.getStats();

        return res.json({
            success: true,
            cacheStatus: 'connected',
            metrics: {
                ...metrics,
                cacheInfo
            }
        });
    } catch (error) {
        console.error('Error fetching cache metrics:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            cacheStatus: redisCache.connected ? 'connected' : 'disconnected'
        });
    }
});

/**
 * Get health check status
 * GET /api/performance/health
 */
router.get('/health', async (req, res) => {
    try {
        const services = {
            server: {
                status: 'healthy',
                uptime: process.uptime()
            },
            cache: {
                status: redisCache.connected ? 'connected' : 'disconnected',
                metrics: redisCache.connected ? await cacheMetrics.getMetrics() : null
            },
            browser: {
                status: browserManager.isInitialized ? 'initialized' : 'not initialized',
                pagePoolReady: pagePool.initialized,
                activePages: pagePool.initialized ? pagePool.getStats().activePages : 0
            }
        };

        // Determine overall health
        const allHealthy = services.server.status === 'healthy' &&
            (services.cache.status === 'connected' || services.cache.status === 'disconnected') &&
            (services.browser.status === 'initialized' || services.browser.status === 'not initialized');

        return res.status(allHealthy ? 200 : 503).json({
            healthy: allHealthy,
            services,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error checking health:', error);
        return res.status(500).json({
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router; 