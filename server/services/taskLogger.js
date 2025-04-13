/**
 * Task Logger Service
 * Handles logging of task executions to MongoDB
 * Optimized with Redis caching layer for high-frequency operations
 */

import TaskLog from '../models/TaskLog.js';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import redisCache from './redisCache.js';

// Cache key prefixes
const RECENT_LOGS_KEY = 'recent_logs';
const ERROR_LOGS_KEY = 'error_logs';
const INTENT_LOGS_PREFIX = 'intent_logs:';
const STATS_PREFIX = 'stats:';

// Cache TTLs in seconds
const RECENT_LOGS_TTL = 300; // 5 minutes
const ERROR_LOGS_TTL = 600;  // 10 minutes
const INTENT_LOGS_TTL = 300; // 5 minutes
const STATS_TTL = 600;       // 10 minutes

class TaskLogger {
    /**
     * Start timing a task execution
     * @param {string} intent - Task intent
     * @param {Object} parameters - Task parameters
     * @returns {Object} Execution context with start time and ID
     */
    static startExecution(intent, parameters) {
        return {
            taskId: uuidv4(),
            intent,
            parameters,
            startTime: process.hrtime(),
            startMemory: process.memoryUsage(),
            timestamp: new Date()
        };
    }

    /**
     * Log a successful task execution
     * @param {Object} context - Execution context from startExecution
     * @param {Object} result - Task execution result
     * @returns {Promise<Object>} Created log entry
     */
    static async logSuccess(context, result) {
        const { taskId, intent, parameters, startTime, startMemory, timestamp } = context;

        // Calculate duration in milliseconds
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        // Calculate memory usage
        const endMemory = process.memoryUsage();
        const memoryUsage = endMemory.heapUsed - startMemory.heapUsed;

        // Create sanitized result (remove large data, circular references)
        const sanitizedResult = this.sanitizeObject(result);
        const sanitizedParams = this.sanitizeObject(parameters);

        try {
            const log = new TaskLog({
                taskId,
                intent,
                status: 'success',
                parameters: sanitizedParams,
                duration,
                executedBy: result.executedBy || 'unknown',
                result: sanitizedResult,
                metrics: {
                    memoryUsage,
                    cpuUsage: os.loadavg()[0], // 1-minute CPU load average
                },
                createdAt: timestamp
            });

            // Save to database
            await log.save();

            // Invalidate the relevant caches
            if (redisCache.connected) {
                await this.invalidateRelatedCaches(intent);
            }

            return log;
        } catch (error) {
            console.error('Failed to log successful task execution:', error);
            // Still return something even if logging fails
            return {
                taskId,
                intent,
                status: 'success',
                duration,
                error: 'Logging failed'
            };
        }
    }

    /**
     * Log a failed task execution
     * @param {Object} context - Execution context from startExecution
     * @param {Error|string} error - Error that occurred
     * @returns {Promise<Object>} Created log entry
     */
    static async logError(context, error) {
        const { taskId, intent, parameters, startTime, startMemory, timestamp } = context;

        // Calculate duration in milliseconds
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        // Calculate memory usage
        const endMemory = process.memoryUsage();
        const memoryUsage = endMemory.heapUsed - startMemory.heapUsed;

        // Extract error message
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : null;

        // Sanitize parameters
        const sanitizedParams = this.sanitizeObject(parameters);

        try {
            const log = new TaskLog({
                taskId,
                intent,
                status: 'error',
                parameters: sanitizedParams,
                error: errorMessage,
                duration,
                executedBy: context.executedBy || 'unknown',
                result: { error: errorMessage, stack: errorStack },
                metrics: {
                    memoryUsage,
                    cpuUsage: os.loadavg()[0], // 1-minute CPU load average
                },
                createdAt: timestamp
            });

            // Save to database
            await log.save();

            // Invalidate the relevant caches
            if (redisCache.connected) {
                await this.invalidateRelatedCaches(intent);
                // Specifically invalidate error logs cache
                await redisCache.delete(ERROR_LOGS_KEY);
            }

            return log;
        } catch (logError) {
            console.error('Failed to log failed task execution:', logError);
            // Still return something even if logging fails
            return {
                taskId,
                intent,
                status: 'error',
                duration,
                error: errorMessage,
                loggingError: 'Logging failed'
            };
        }
    }

    /**
     * Invalidate related caches when a new log is added
     * @param {string} intent - Task intent
     * @returns {Promise<void>}
     */
    static async invalidateRelatedCaches(intent) {
        if (!redisCache.connected) return;

        try {
            // Invalidate recent logs cache
            await redisCache.delete(RECENT_LOGS_KEY);

            // Invalidate intent-specific logs cache
            const intentKey = `${INTENT_LOGS_PREFIX}${intent}`;
            await redisCache.delete(intentKey);

            // Invalidate all stats caches related to this intent
            const allStatsKey = `${STATS_PREFIX}all`;
            const intentStatsKey = `${STATS_PREFIX}${intent}`;
            await redisCache.delete(allStatsKey);
            await redisCache.delete(intentStatsKey);
        } catch (error) {
            console.error('Error invalidating caches:', error);
        }
    }

    /**
     * Get recent task executions
     * @param {number} limit - Maximum number of logs to return
     * @returns {Promise<Array>} Recent log entries
     */
    static async getRecentLogs(limit = 100) {
        try {
            // Try to get from cache first
            if (redisCache.connected) {
                const cachedLogs = await redisCache.get(RECENT_LOGS_KEY);
                if (cachedLogs) {
                    return cachedLogs.slice(0, limit);
                }
            }

            // Get from database
            const logs = await TaskLog.getRecentLogs(limit);

            // Cache the results
            if (redisCache.connected) {
                await redisCache.set(RECENT_LOGS_KEY, logs, RECENT_LOGS_TTL);
            }

            return logs;
        } catch (error) {
            console.error('Failed to get recent logs:', error);
            return [];
        }
    }

    /**
     * Get logs for a specific intent
     * @param {string} intent - Intent to filter by
     * @param {number} limit - Maximum number of logs to return
     * @returns {Promise<Array>} Filtered log entries
     */
    static async getLogsByIntent(intent, limit = 100) {
        try {
            // Try to get from cache first
            const cacheKey = `${INTENT_LOGS_PREFIX}${intent}`;
            if (redisCache.connected) {
                const cachedLogs = await redisCache.get(cacheKey);
                if (cachedLogs) {
                    return cachedLogs.slice(0, limit);
                }
            }

            // Get from database
            const logs = await TaskLog.getLogsByIntent(intent, limit);

            // Cache the results
            if (redisCache.connected) {
                await redisCache.set(cacheKey, logs, INTENT_LOGS_TTL);
            }

            return logs;
        } catch (error) {
            console.error(`Failed to get logs for intent ${intent}:`, error);
            return [];
        }
    }

    /**
     * Get error logs
     * @param {number} limit - Maximum number of logs to return
     * @returns {Promise<Array>} Error log entries
     */
    static async getErrorLogs(limit = 100) {
        try {
            // Try to get from cache first
            if (redisCache.connected) {
                const cachedLogs = await redisCache.get(ERROR_LOGS_KEY);
                if (cachedLogs) {
                    return cachedLogs.slice(0, limit);
                }
            }

            // Get from database
            const logs = await TaskLog.getErrorLogs(limit);

            // Cache the results
            if (redisCache.connected) {
                await redisCache.set(ERROR_LOGS_KEY, logs, ERROR_LOGS_TTL);
            }

            return logs;
        } catch (error) {
            console.error('Failed to get error logs:', error);
            return [];
        }
    }

    /**
     * Get performance statistics
     * @param {string} intent - Optional intent to filter by
     * @param {number} timeRange - Time range in hours
     * @returns {Promise<Array>} Performance statistics
     */
    static async getPerformanceStats(intent = null, timeRange = 24) {
        try {
            // Generate cache key
            const cacheKey = intent
                ? `${STATS_PREFIX}${intent}:${timeRange}`
                : `${STATS_PREFIX}all:${timeRange}`;

            // Try to get from cache first
            if (redisCache.connected) {
                const cachedStats = await redisCache.get(cacheKey);
                if (cachedStats) {
                    return cachedStats;
                }
            }

            // Get from database
            const stats = await TaskLog.getPerformanceStats(intent, timeRange);

            // Cache the results
            if (redisCache.connected) {
                await redisCache.set(cacheKey, stats, STATS_TTL);
            }

            return stats;
        } catch (error) {
            console.error('Failed to get performance stats:', error);
            return [];
        }
    }

    /**
     * Sanitize an object for logging (handles circular references, large objects)
     * @param {Object} obj - Object to sanitize
     * @param {number} depth - Current recursion depth
     * @param {number} maxDepth - Maximum recursion depth
     * @returns {Object} Sanitized object
     */
    static sanitizeObject(obj, depth = 0, maxDepth = 3) {
        if (depth > maxDepth) {
            return '[Max Depth Exceeded]';
        }

        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            // For arrays, sanitize each element but limit length to 100 items
            const sanitizedArray = obj.slice(0, 100).map(item =>
                this.sanitizeObject(item, depth + 1, maxDepth)
            );

            if (obj.length > 100) {
                sanitizedArray.push(`[${obj.length - 100} more items]`);
            }

            return sanitizedArray;
        }

        // For objects, sanitize each property
        const sanitized = {};
        const seen = new WeakSet();

        for (const [key, value] of Object.entries(obj)) {
            // Skip functions and large strings
            if (typeof value === 'function') {
                sanitized[key] = '[Function]';
                continue;
            }

            if (typeof value === 'string' && value.length > 2000) {
                sanitized[key] = `${value.substring(0, 2000)}... [truncated, ${value.length} chars total]`;
                continue;
            }

            // Handle circular references
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    sanitized[key] = '[Circular Reference]';
                    continue;
                }
                seen.add(value);
            }

            sanitized[key] = this.sanitizeObject(value, depth + 1, maxDepth);
        }

        return sanitized;
    }
}

export default TaskLogger; 