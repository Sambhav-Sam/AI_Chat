/**
 * Browser Metrics Service
 * 
 * Tracks browser-related metrics such as page load times, resource usage,
 * and error rates across browsing sessions.
 */

class BrowserMetricsService {
    constructor() {
        this.initializeMetrics();
    }

    /**
     * Initialize or reset all metrics to default values
     */
    initializeMetrics() {
        // Page load metrics
        this.loadTimes = {
            total: 0,
            count: 0,
            max: 0,
            min: Number.MAX_SAFE_INTEGER,
            samples: [],
            lastUpdated: null,
        };

        // Error metrics
        this.errors = {
            total: 0,
            byType: {},
            byUrl: {},
            recentErrors: [],
            lastError: null,
        };

        // Resource usage
        this.resourceUsage = {
            memoryUsage: {
                total: 0,
                count: 0,
                max: 0,
                samples: [],
            },
            cpuUsage: {
                total: 0,
                count: 0,
                max: 0,
                samples: [],
            }
        };

        // Navigation metrics
        this.navigation = {
            totalPageLoads: 0,
            uniqueUrls: new Set(),
            pageTransitions: 0,
            failedNavigations: 0,
        };

        // Session metrics
        this.sessions = {
            total: 0,
            active: 0,
            avgSessionTime: 0,
            totalSessionTime: 0,
        };
    }

    /**
     * Record a page load event
     * @param {Object} data - Page load data
     * @param {string} data.url - The URL that was loaded
     * @param {number} data.loadTime - Time in milliseconds it took to load
     * @param {Object} data.resources - Resource information (optional)
     */
    recordPageLoad(data) {
        const { url, loadTime, resources } = data;

        // Update load time metrics
        this.loadTimes.total += loadTime;
        this.loadTimes.count += 1;
        this.loadTimes.max = Math.max(this.loadTimes.max, loadTime);
        this.loadTimes.min = loadTime < this.loadTimes.min ? loadTime : this.loadTimes.min;
        this.loadTimes.lastUpdated = new Date().toISOString();

        // Keep only the last 50 samples
        if (this.loadTimes.samples.length >= 50) {
            this.loadTimes.samples.shift();
        }

        this.loadTimes.samples.push({
            url,
            loadTime,
            timestamp: new Date().toISOString(),
        });

        // Update navigation metrics
        this.navigation.totalPageLoads += 1;
        this.navigation.uniqueUrls.add(url);
        this.navigation.pageTransitions += 1;

        // Update resource metrics if provided
        if (resources) {
            if (resources.memory) {
                this.resourceUsage.memoryUsage.total += resources.memory;
                this.resourceUsage.memoryUsage.count += 1;
                this.resourceUsage.memoryUsage.max =
                    Math.max(this.resourceUsage.memoryUsage.max, resources.memory);

                if (this.resourceUsage.memoryUsage.samples.length >= 50) {
                    this.resourceUsage.memoryUsage.samples.shift();
                }

                this.resourceUsage.memoryUsage.samples.push({
                    url,
                    memory: resources.memory,
                    timestamp: new Date().toISOString(),
                });
            }

            if (resources.cpu) {
                this.resourceUsage.cpuUsage.total += resources.cpu;
                this.resourceUsage.cpuUsage.count += 1;
                this.resourceUsage.cpuUsage.max =
                    Math.max(this.resourceUsage.cpuUsage.max, resources.cpu);

                if (this.resourceUsage.cpuUsage.samples.length >= 50) {
                    this.resourceUsage.cpuUsage.samples.shift();
                }

                this.resourceUsage.cpuUsage.samples.push({
                    url,
                    cpu: resources.cpu,
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }

    /**
     * Record a browser error
     * @param {Object} data - Error data
     * @param {string} data.url - The URL where the error occurred
     * @param {string} data.type - Error type (e.g., 'javascript', 'network', 'resource')
     * @param {string} data.message - Error message
     * @param {string} data.stack - Error stack trace (optional)
     */
    recordError(data) {
        const { url, type, message, stack } = data;

        // Update error metrics
        this.errors.total += 1;

        // Update by type
        if (!this.errors.byType[type]) {
            this.errors.byType[type] = 0;
        }
        this.errors.byType[type] += 1;

        // Update by URL
        if (!this.errors.byUrl[url]) {
            this.errors.byUrl[url] = 0;
        }
        this.errors.byUrl[url] += 1;

        // Add to recent errors
        const errorData = {
            url,
            type,
            message,
            stack,
            timestamp: new Date().toISOString(),
        };

        if (this.errors.recentErrors.length >= 50) {
            this.errors.recentErrors.shift();
        }

        this.errors.recentErrors.push(errorData);
        this.errors.lastError = errorData;

        // If this was during navigation, update failed navigations
        if (type === 'navigation') {
            this.navigation.failedNavigations += 1;
        }
    }

    /**
     * Record browser session start
     */
    recordSessionStart() {
        this.sessions.total += 1;
        this.sessions.active += 1;
    }

    /**
     * Record browser session end
     * @param {number} durationMs - Session duration in milliseconds
     */
    recordSessionEnd(durationMs) {
        if (this.sessions.active > 0) {
            this.sessions.active -= 1;
        }

        // Update average session time
        const prevTotal = this.sessions.totalSessionTime;
        const prevCount = this.sessions.total > 0 ? this.sessions.total - 1 : 0;

        this.sessions.totalSessionTime += durationMs;

        if (prevCount > 0) {
            this.sessions.avgSessionTime = this.sessions.totalSessionTime / prevCount;
        } else {
            this.sessions.avgSessionTime = durationMs;
        }
    }

    /**
     * Get all browser metrics
     * @returns {Object} All browser metrics
     */
    getMetrics() {
        return {
            loadTimes: this.getLoadTimeMetrics(),
            errors: this.getErrorMetrics(),
            resourceUsage: this.getResourceMetrics(),
            navigation: this.getNavigationMetrics(),
            sessions: {
                total: this.sessions.total,
                active: this.sessions.active,
                avgSessionTime: this.sessions.avgSessionTime,
                totalSessionTime: this.sessions.totalSessionTime,
            },
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get load time metrics
     * @returns {Object} Load time metrics
     */
    getLoadTimeMetrics() {
        const avgLoadTime = this.loadTimes.count > 0
            ? this.loadTimes.total / this.loadTimes.count
            : 0;

        return {
            avgLoadTime,
            maxLoadTime: this.loadTimes.max,
            minLoadTime: this.loadTimes.min === Number.MAX_SAFE_INTEGER ? 0 : this.loadTimes.min,
            totalPageLoads: this.loadTimes.count,
            recentLoads: this.loadTimes.samples.slice(-10),
            lastUpdated: this.loadTimes.lastUpdated,
        };
    }

    /**
     * Get error metrics
     * @returns {Object} Error metrics
     */
    getErrorMetrics() {
        // Convert uniqueUrls Set to array length for the response
        const uniqueUrlCount = this.navigation.uniqueUrls.size;

        return {
            totalErrors: this.errors.total,
            byType: this.errors.byType,
            byUrl: this.errors.byUrl,
            recentErrors: this.errors.recentErrors.slice(-10),
            lastError: this.errors.lastError,
            errorRate: uniqueUrlCount > 0
                ? this.errors.total / uniqueUrlCount
                : 0,
        };
    }

    /**
     * Get resource usage metrics
     * @returns {Object} Resource usage metrics
     */
    getResourceMetrics() {
        const avgMemory = this.resourceUsage.memoryUsage.count > 0
            ? this.resourceUsage.memoryUsage.total / this.resourceUsage.memoryUsage.count
            : 0;

        const avgCpu = this.resourceUsage.cpuUsage.count > 0
            ? this.resourceUsage.cpuUsage.total / this.resourceUsage.cpuUsage.count
            : 0;

        return {
            memory: {
                avgMemoryUsage: avgMemory,
                peakMemoryUsage: this.resourceUsage.memoryUsage.max,
                samples: this.resourceUsage.memoryUsage.samples.slice(-5),
            },
            cpu: {
                avgCpuUsage: avgCpu,
                peakCpuUsage: this.resourceUsage.cpuUsage.max,
                samples: this.resourceUsage.cpuUsage.samples.slice(-5),
            },
        };
    }

    /**
     * Get navigation metrics
     * @returns {Object} Navigation metrics
     */
    getNavigationMetrics() {
        return {
            totalPageLoads: this.navigation.totalPageLoads,
            uniqueUrlsVisited: this.navigation.uniqueUrls.size,
            pageTransitions: this.navigation.pageTransitions,
            failedNavigations: this.navigation.failedNavigations,
            successRate: this.navigation.totalPageLoads > 0
                ? (this.navigation.totalPageLoads - this.navigation.failedNavigations) / this.navigation.totalPageLoads
                : 0,
        };
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.initializeMetrics();
    }
}

// Create and export singleton instance
const browserMetrics = new BrowserMetricsService();
export default browserMetrics; 