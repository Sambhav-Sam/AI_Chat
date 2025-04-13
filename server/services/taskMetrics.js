/**
 * Task Metrics Service
 * Tracks performance metrics for different task types
 */

import errorAnalyzer from '../utils/errorAnalyzer.js';

class TaskMetricsService {
    constructor() {
        this.initializeMetrics();
    }

    /**
     * Initialize metrics storage
     */
    initializeMetrics() {
        // Overall task metrics
        this.metrics = {
            totalTasks: 0,
            successfulTasks: 0,
            failedTasks: 0,
            successRate: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0
        };

        // Metrics per task type
        this.taskTypeMetrics = {};

        // Recent executions (most recent first)
        this.recentExecutions = [];

        // Failure metrics
        this.failureMetrics = {
            byCategory: {},        // Failures by error category
            byTaskType: {},        // Failures by task type
            byErrorPattern: {},    // Failures by error pattern
            recurring: []          // Recurring errors
        };

        // Performance metrics
        this.performanceMetrics = {
            executionTimeDistribution: {
                '0-100ms': 0,
                '100-500ms': 0,
                '500-1000ms': 0,
                '1-5s': 0,
                '5-10s': 0,
                '>10s': 0
            },
            maxExecutionTime: 0,
            minExecutionTime: Infinity,
            executionTimePercentiles: {
                p50: 0,
                p90: 0,
                p95: 0,
                p99: 0
            },
            // Store all execution times to calculate percentiles
            allExecutionTimes: []
        };

        // Error analysis storage
        this.errorAnalyses = [];
    }

    /**
     * Record a task execution
     * @param {Object} taskData - Data about the task execution
     */
    recordTaskExecution(taskData) {
        const {
            taskId,
            taskType,
            parameters,
            success,
            executionTime,
            result,
            error,
            timestamp = new Date().toISOString()
        } = taskData;

        // Update overall metrics
        this.metrics.totalTasks++;
        this.metrics.totalExecutionTime += executionTime;
        this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.totalTasks;

        if (success) {
            this.metrics.successfulTasks++;
        } else {
            this.metrics.failedTasks++;

            // Analyze error if available
            if (error) {
                this.recordTaskFailure({
                    taskId,
                    taskType,
                    parameters,
                    error,
                    executionTime,
                    timestamp
                });
            }
        }

        // Calculate success rate
        this.metrics.successRate = (this.metrics.successfulTasks / this.metrics.totalTasks) * 100;

        // Initialize metrics for this task type if not exist
        if (!this.taskTypeMetrics[taskType]) {
            this.taskTypeMetrics[taskType] = {
                totalTasks: 0,
                successfulTasks: 0,
                failedTasks: 0,
                successRate: 0,
                totalExecutionTime: 0,
                averageExecutionTime: 0
            };
        }

        // Update task type specific metrics
        const typeMetrics = this.taskTypeMetrics[taskType];
        typeMetrics.totalTasks++;
        typeMetrics.totalExecutionTime += executionTime;
        typeMetrics.averageExecutionTime = typeMetrics.totalExecutionTime / typeMetrics.totalTasks;

        if (success) {
            typeMetrics.successfulTasks++;
        } else {
            typeMetrics.failedTasks++;
        }

        typeMetrics.successRate = (typeMetrics.successfulTasks / typeMetrics.totalTasks) * 100;

        // Add to recent executions
        this.recentExecutions.unshift({
            taskId,
            taskType,
            success,
            executionTime,
            timestamp,
            ...(success ? { result: this._summarizeResult(result) } : { error: this._summarizeError(error) })
        });

        // Keep only the 100 most recent executions
        if (this.recentExecutions.length > 100) {
            this.recentExecutions.pop();
        }

        // Update performance metrics
        this._updatePerformanceMetrics(executionTime);
    }

    /**
     * Record a task failure with error analysis
     * @param {Object} failureData - Data about the task failure
     */
    recordTaskFailure(failureData) {
        const {
            taskId,
            taskType,
            parameters,
            error,
            executionTime,
            timestamp
        } = failureData;

        // Generate error analysis
        const analysis = errorAnalyzer.analyzeError(error, taskType);

        // Store the analysis
        this.errorAnalyses.push({
            taskId,
            taskType,
            timestamp,
            analysis
        });

        // Keep only the 100 most recent error analyses
        if (this.errorAnalyses.length > 100) {
            this.errorAnalyses.shift();
        }

        // Update error category counts
        for (const category of analysis.analysis.categories) {
            const categoryName = category.category;

            if (!this.failureMetrics.byCategory[categoryName]) {
                this.failureMetrics.byCategory[categoryName] = {
                    count: 0,
                    description: category.description,
                    taskTypes: {}
                };
            }

            this.failureMetrics.byCategory[categoryName].count++;

            // Track which task types have this error category
            if (!this.failureMetrics.byCategory[categoryName].taskTypes[taskType]) {
                this.failureMetrics.byCategory[categoryName].taskTypes[taskType] = 0;
            }

            this.failureMetrics.byCategory[categoryName].taskTypes[taskType]++;
        }

        // Update error pattern counts
        for (const category of analysis.analysis.categories) {
            const pattern = category.matchedPattern;

            if (!this.failureMetrics.byErrorPattern[pattern]) {
                this.failureMetrics.byErrorPattern[pattern] = {
                    count: 0,
                    category: category.category,
                    taskTypes: {}
                };
            }

            this.failureMetrics.byErrorPattern[pattern].count++;

            // Track which task types have this error pattern
            if (!this.failureMetrics.byErrorPattern[pattern].taskTypes[taskType]) {
                this.failureMetrics.byErrorPattern[pattern].taskTypes[taskType] = 0;
            }

            this.failureMetrics.byErrorPattern[pattern].taskTypes[taskType]++;
        }

        // Update failures by task type
        if (!this.failureMetrics.byTaskType[taskType]) {
            this.failureMetrics.byTaskType[taskType] = {
                count: 0,
                categories: {},
                patterns: {}
            };
        }

        this.failureMetrics.byTaskType[taskType].count++;

        // Check for recurring errors 
        this._checkForRecurringErrors(analysis, taskType);
    }

    /**
     * Check if an error is recurring
     * @param {Object} analysis - Error analysis
     * @param {string} taskType - Task type
     * @private
     */
    _checkForRecurringErrors(analysis, taskType) {
        // Find similar errors in the last 10 error analyses
        const recentAnalyses = this.errorAnalyses.slice(-10);
        let similarErrorCount = 0;

        for (const pastAnalysis of recentAnalyses) {
            // Skip the current error
            if (pastAnalysis.analysis === analysis) continue;

            // Check if same task type and has a matching error category
            if (pastAnalysis.taskType === taskType) {
                const pastCategories = pastAnalysis.analysis.analysis.categories.map(c => c.category);
                const currentCategories = analysis.analysis.categories.map(c => c.category);

                // If they share at least one category, consider it similar
                if (pastCategories.some(cat => currentCategories.includes(cat))) {
                    similarErrorCount++;
                }
            }
        }

        // If we have 3 or more similar errors, consider it recurring
        if (similarErrorCount >= 2) {
            // See if we already have this recurring error pattern
            const mainCategory = analysis.analysis.categories[0]?.category || 'UNKNOWN';
            const pattern = analysis.analysis.categories[0]?.matchedPattern || 'unknown-pattern';
            const recurringKey = `${taskType}:${mainCategory}:${pattern}`;

            let existingRecurring = this.failureMetrics.recurring.find(r => r.key === recurringKey);

            if (existingRecurring) {
                existingRecurring.count++;
                existingRecurring.lastSeen = new Date().toISOString();
            } else {
                this.failureMetrics.recurring.push({
                    key: recurringKey,
                    taskType,
                    category: mainCategory,
                    pattern,
                    description: this._generateRecurringErrorDescription(analysis, taskType),
                    count: similarErrorCount + 1,
                    firstSeen: this.errorAnalyses[this.errorAnalyses.length - similarErrorCount - 1]?.timestamp,
                    lastSeen: new Date().toISOString(),
                    suggestedFix: analysis.analysis.potentialFixes[0] || "Investigate the pattern of failures"
                });
            }
        }
    }

    /**
     * Generate a description for a recurring error
     * @param {Object} analysis - Error analysis
     * @param {string} taskType - Task type
     * @returns {string} Description
     * @private
     */
    _generateRecurringErrorDescription(analysis, taskType) {
        const category = analysis.analysis.categories[0]?.category || 'UNKNOWN';
        const pattern = analysis.analysis.categories[0]?.matchedPattern || 'unknown pattern';

        return `Recurring ${category} errors in ${taskType} tasks, matching pattern "${pattern}"`;
    }

    /**
     * Update performance metrics with a new execution time
     * @param {number} executionTime - Task execution time in ms
     * @private
     */
    _updatePerformanceMetrics(executionTime) {
        // Update execution time distribution
        if (executionTime <= 100) {
            this.performanceMetrics.executionTimeDistribution['0-100ms']++;
        } else if (executionTime <= 500) {
            this.performanceMetrics.executionTimeDistribution['100-500ms']++;
        } else if (executionTime <= 1000) {
            this.performanceMetrics.executionTimeDistribution['500-1000ms']++;
        } else if (executionTime <= 5000) {
            this.performanceMetrics.executionTimeDistribution['1-5s']++;
        } else if (executionTime <= 10000) {
            this.performanceMetrics.executionTimeDistribution['5-10s']++;
        } else {
            this.performanceMetrics.executionTimeDistribution['>10s']++;
        }

        // Update min/max execution time
        if (executionTime > this.performanceMetrics.maxExecutionTime) {
            this.performanceMetrics.maxExecutionTime = executionTime;
        }

        if (executionTime < this.performanceMetrics.minExecutionTime) {
            this.performanceMetrics.minExecutionTime = executionTime;
        }

        // Store execution time for percentile calculations
        this.performanceMetrics.allExecutionTimes.push(executionTime);

        // Recalculate percentiles if we have enough data
        if (this.performanceMetrics.allExecutionTimes.length >= 10) {
            this._calculatePercentiles();
        }
    }

    /**
     * Calculate percentiles for execution times
     * @private
     */
    _calculatePercentiles() {
        const sortedTimes = [...this.performanceMetrics.allExecutionTimes].sort((a, b) => a - b);

        this.performanceMetrics.executionTimePercentiles.p50 = this._getPercentile(sortedTimes, 50);
        this.performanceMetrics.executionTimePercentiles.p90 = this._getPercentile(sortedTimes, 90);
        this.performanceMetrics.executionTimePercentiles.p95 = this._getPercentile(sortedTimes, 95);
        this.performanceMetrics.executionTimePercentiles.p99 = this._getPercentile(sortedTimes, 99);
    }

    /**
     * Calculate a specific percentile from sorted array
     * @param {Array} sortedArr - Sorted array of values
     * @param {number} percentile - Percentile to calculate (0-100)
     * @returns {number} Percentile value
     * @private
     */
    _getPercentile(sortedArr, percentile) {
        const index = Math.ceil((percentile / 100) * sortedArr.length) - 1;
        return sortedArr[index];
    }

    /**
     * Summarize a result object for storage in recent executions
     * @param {Object} result - Task result
     * @returns {Object} Summarized result
     * @private
     */
    _summarizeResult(result) {
        if (!result) return { summary: 'No result data' };

        // If result is not an object or is null, return as is
        if (typeof result !== 'object' || result === null) {
            return { summary: result.toString().substring(0, 100) };
        }

        // Create a summary version with limited data
        return {
            summary: JSON.stringify(result).substring(0, 100) + (JSON.stringify(result).length > 100 ? '...' : '')
        };
    }

    /**
     * Summarize an error object for storage in recent executions
     * @param {Error|Object} error - Error object
     * @returns {Object} Summarized error
     * @private
     */
    _summarizeError(error) {
        if (!error) return { message: 'Unknown error' };

        return {
            message: error.message || error.toString(),
            code: error.code,
            category: error.category
        };
    }

    /**
     * Get all metrics
     * @returns {Object} All metrics
     */
    getMetrics() {
        return {
            overview: this.getOverviewMetrics(),
            taskTypes: this.getTaskTypeMetrics(),
            failures: this.getFailureMetrics(),
            performance: this.getPerformanceMetrics(),
            recentExecutions: this.recentExecutions,
            errorAnalyses: this.errorAnalyses.slice(-10)  // Return 10 most recent analyses
        };
    }

    /**
     * Get overview metrics
     * @returns {Object} Overview metrics
     */
    getOverviewMetrics() {
        return {
            ...this.metrics,
            // Add some derived metrics
            totalErrors: this.errorAnalyses.length,
            recurringErrorCount: this.failureMetrics.recurring.length,
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Get task type metrics
     * @returns {Object} Task type metrics
     */
    getTaskTypeMetrics() {
        return this.taskTypeMetrics;
    }

    /**
     * Get failure metrics
     * @returns {Object} Failure metrics
     */
    getFailureMetrics() {
        // Sort categories by count
        const sortedCategories = Object.entries(this.failureMetrics.byCategory)
            .map(([category, data]) => ({
                category,
                ...data
            }))
            .sort((a, b) => b.count - a.count);

        // Sort patterns by count
        const sortedPatterns = Object.entries(this.failureMetrics.byErrorPattern)
            .map(([pattern, data]) => ({
                pattern,
                ...data
            }))
            .sort((a, b) => b.count - a.count);

        // Sort task types by count
        const sortedTaskTypes = Object.entries(this.failureMetrics.byTaskType)
            .map(([taskType, data]) => ({
                taskType,
                ...data
            }))
            .sort((a, b) => b.count - a.count);

        // Sort recurring errors by count
        const sortedRecurring = [...this.failureMetrics.recurring]
            .sort((a, b) => b.count - a.count);

        return {
            categories: sortedCategories,
            patterns: sortedPatterns,
            taskTypes: sortedTaskTypes,
            recurring: sortedRecurring,
            totalFailures: this.metrics.failedTasks,
            uniqueCategories: sortedCategories.length,
            mostCommonCategory: sortedCategories.length > 0 ? sortedCategories[0].category : 'N/A',
            errorAnalysisCount: this.errorAnalyses.length
        };
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return {
            distribution: this.performanceMetrics.executionTimeDistribution,
            max: this.performanceMetrics.maxExecutionTime,
            min: this.performanceMetrics.minExecutionTime === Infinity ? 0 : this.performanceMetrics.minExecutionTime,
            average: this.metrics.averageExecutionTime,
            percentiles: this.performanceMetrics.executionTimePercentiles,
            taskCount: this.metrics.totalTasks
        };
    }

    /**
     * Reset all metrics to initial state
     */
    resetMetrics() {
        this.initializeMetrics();
    }
}

// Export a singleton instance
export default new TaskMetricsService();