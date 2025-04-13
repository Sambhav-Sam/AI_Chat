/**
 * Cache Metrics Service
 * Tracks and analyzes Redis cache performance metrics
 */

import redisCache from './redisCache.js';

class CacheMetricsService {
    constructor() {
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            errors: 0,
            lastReset: new Date().toISOString()
        };

        this.hourlySnapshots = [];
        this.snapshotInterval = null;

        // Hourly snapshot interval (1 hour)
        this.SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;
        // Keep 24 hours of snapshots
        this.MAX_SNAPSHOTS = 24;
    }

    /**
     * Initialize metrics tracking
     */
    initialize() {
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
        }

        // Take snapshots hourly for trend analysis
        this.snapshotInterval = setInterval(() => {
            this.takeSnapshot();
        }, this.SNAPSHOT_INTERVAL_MS);

        console.log('Cache metrics tracking initialized');
    }

    /**
     * Record a cache hit
     */
    recordHit() {
        this.metrics.hits++;
    }

    /**
     * Record a cache miss
     */
    recordMiss() {
        this.metrics.misses++;
    }

    /**
     * Record a cache set operation
     */
    recordSet() {
        this.metrics.sets++;
    }

    /**
     * Record a cache error
     */
    recordError() {
        this.metrics.errors++;
    }

    /**
     * Get current metrics
     * @returns {Object} Cache metrics
     */
    async getMetrics() {
        const totalOperations = this.metrics.hits + this.metrics.misses;
        const hitRate = totalOperations > 0 ? (this.metrics.hits / totalOperations) * 100 : 0;

        // Calculate hit rate over 24 hour period if available
        let hitRateTrend = null;
        if (this.hourlySnapshots.length > 0) {
            const totalSnapshotHits = this.hourlySnapshots.reduce((sum, snapshot) => sum + snapshot.hits, 0);
            const totalSnapshotOperations = this.hourlySnapshots.reduce(
                (sum, snapshot) => sum + snapshot.hits + snapshot.misses, 0
            );
            hitRateTrend = totalSnapshotOperations > 0
                ? (totalSnapshotHits / totalSnapshotOperations) * 100
                : 0;
        }

        return {
            current: {
                ...this.metrics,
                hitRate: hitRate.toFixed(2),
                totalOperations,
                calculatedAt: new Date().toISOString()
            },
            snapshots: this.hourlySnapshots,
            trends: {
                hitRateTrend: hitRateTrend !== null ? hitRateTrend.toFixed(2) : null
            }
        };
    }

    /**
     * Take a snapshot of current metrics for trend analysis
     */
    takeSnapshot() {
        const snapshotTime = new Date();
        const snapshot = {
            timestamp: snapshotTime.toISOString(),
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            sets: this.metrics.sets,
            errors: this.metrics.errors,
            hitRate: this.calculateHitRate()
        };

        this.hourlySnapshots.push(snapshot);

        // Keep only the most recent snapshots
        if (this.hourlySnapshots.length > this.MAX_SNAPSHOTS) {
            this.hourlySnapshots.shift();
        }

        console.log(`Cache metrics snapshot taken at ${snapshotTime.toISOString()}`);
    }

    /**
     * Calculate the current hit rate percentage
     * @returns {Number} Hit rate percentage
     */
    calculateHitRate() {
        const totalOperations = this.metrics.hits + this.metrics.misses;
        return totalOperations > 0 ? (this.metrics.hits / totalOperations) * 100 : 0;
    }

    /**
     * Reset metrics counters
     */
    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            sets: 0,
            errors: 0,
            lastReset: new Date().toISOString()
        };
        console.log('Cache metrics reset');
    }

    /**
     * Clean up resources when shutting down
     */
    shutdown() {
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
            this.snapshotInterval = null;
        }
        console.log('Cache metrics tracking stopped');
    }
}

// Singleton instance
const cacheMetrics = new CacheMetricsService();

export default cacheMetrics; 