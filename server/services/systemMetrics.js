/**
 * System Metrics Service
 * Tracks system-level performance metrics including memory, CPU, and disk usage
 */

import os from 'os';
import { freemem, totalmem, cpus, platform, release, uptime } from 'os';
import { promises as fs } from 'fs';
import path from 'path';

class SystemMetricsService {
    constructor() {
        this.initializeMetrics();

        // Take snapshots hourly for trend analysis
        this.snapshotInterval = 60 * 60 * 1000; // 1 hour
        this.snapshots = [];
        this.maxSnapshots = 24; // Keep 24 hours of snapshots

        // Start snapshot timer
        this.snapshotTimer = setInterval(() => {
            this.takeSnapshot();
        }, this.snapshotInterval);
    }

    /**
     * Initialize metrics tracking
     */
    initializeMetrics() {
        this.startTime = Date.now();
        this.apiCalls = 0;
        this.errors = 0;
        this.diskChecks = 0;
        this.lastDiskSpace = null;
    }

    /**
     * Record an API call
     */
    recordApiCall() {
        this.apiCalls++;
    }

    /**
     * Record a system error
     * @param {Error} error - The error that occurred
     */
    recordError(error) {
        this.errors++;
        console.error('System error recorded:', error);
    }

    /**
     * Record a disk check
     * @param {Object} diskSpace - The disk space data
     */
    recordDiskCheck(diskSpace) {
        this.diskChecks++;
        this.lastDiskSpace = diskSpace;
    }

    /**
     * Get current system metrics
     * @returns {Promise<Object>} - Current system metrics
     */
    async getMetrics() {
        try {
            // Get real-time system stats
            const memoryUsage = process.memoryUsage();
            const systemMemory = {
                total: totalmem(),
                free: freemem(),
                used: totalmem() - freemem()
            };

            // Get CPU information
            const cpuInfo = cpus();
            const cpuCount = cpuInfo.length;
            const cpuModel = cpuInfo[0].model;

            // Calculate CPU usage
            let totalIdle = 0;
            let totalTick = 0;

            cpuInfo.forEach(cpu => {
                for (const type in cpu.times) {
                    totalTick += cpu.times[type];
                }
                totalIdle += cpu.times.idle;
            });

            const cpuUsage = {
                idle: totalIdle / cpuCount,
                total: totalTick / cpuCount,
                usage: 100 - (totalIdle / totalTick * 100) // percentage
            };

            // Get disk space
            const diskSpace = await this.getDiskSpace();

            // Calculate uptime
            const serviceUptime = Date.now() - this.startTime;

            return {
                timestamp: new Date().toISOString(),
                memory: {
                    process: {
                        rss: memoryUsage.rss,
                        heapTotal: memoryUsage.heapTotal,
                        heapUsed: memoryUsage.heapUsed,
                        external: memoryUsage.external
                    },
                    system: systemMemory
                },
                cpu: {
                    count: cpuCount,
                    model: cpuModel,
                    usage: cpuUsage
                },
                disk: diskSpace,
                system: {
                    platform: platform(),
                    release: release(),
                    uptime: uptime(),
                    serviceUptime: serviceUptime,
                },
                activity: {
                    apiCalls: this.apiCalls,
                    errors: this.errors,
                    errorRate: this.apiCalls > 0 ? (this.errors / this.apiCalls) : 0,
                    diskChecks: this.diskChecks
                },
                snapshots: this.getSnapshotsCount()
            };
        } catch (error) {
            console.error('Error getting system metrics:', error);
            return {
                error: 'Failed to retrieve system metrics',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get available disk space
     * @returns {Promise<Object>} - Disk space information
     */
    async getDiskSpace() {
        try {
            // Get current directory
            const currentDir = process.cwd();

            // On Windows, check drive space
            if (platform() === 'win32') {
                const drive = currentDir.split(path.sep)[0];
                const stats = await fs.statfs(drive + path.sep);

                return {
                    total: stats.bsize * stats.blocks,
                    free: stats.bsize * stats.bfree,
                    used: stats.bsize * (stats.blocks - stats.bfree),
                    path: drive
                };
            } else {
                // For Unix-like systems
                const stats = await fs.statfs(currentDir);

                return {
                    total: stats.bsize * stats.blocks,
                    free: stats.bsize * stats.bfree,
                    used: stats.bsize * (stats.blocks - stats.bfree),
                    path: currentDir
                };
            }
        } catch (error) {
            console.error('Error checking disk space:', error);
            return {
                error: 'Failed to check disk space',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Take a snapshot of current metrics
     */
    async takeSnapshot() {
        try {
            const metrics = await this.getMetrics();

            // Add snapshot with timestamp
            this.snapshots.push({
                timestamp: new Date().toISOString(),
                memory: metrics.memory,
                cpu: metrics.cpu,
                disk: metrics.disk,
                activity: metrics.activity
            });

            // Keep only the max number of snapshots
            if (this.snapshots.length > this.maxSnapshots) {
                this.snapshots.shift();
            }
        } catch (error) {
            console.error('Error taking system metrics snapshot:', error);
        }
    }

    /**
     * Get the number of snapshots
     * @returns {number} - Number of snapshots
     */
    getSnapshotsCount() {
        return this.snapshots.length;
    }

    /**
     * Get all snapshots
     * @returns {Array} - Array of snapshots
     */
    getSnapshots() {
        return this.snapshots;
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.initializeMetrics();
        this.snapshots = [];
        console.log('System metrics reset');
    }

    /**
     * Clean up resources on shutdown
     */
    shutdown() {
        if (this.snapshotTimer) {
            clearInterval(this.snapshotTimer);
            this.snapshotTimer = null;
        }
        console.log('System metrics service shut down');
    }
}

// Export singleton instance
const systemMetrics = new SystemMetricsService();
export default systemMetrics; 