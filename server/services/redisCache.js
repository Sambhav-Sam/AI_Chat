/**
 * Redis Cache Service
 * Provides caching for AI responses to reduce latency and API costs
 * Falls back to in-memory cache if Redis is not available
 */

import { createClient } from 'redis';

class RedisCacheService {
    constructor() {
        this.client = null;
        this.connected = false;
        this.DEFAULT_TTL = 3600; // Default expiration time in seconds (1 hour)
        // Reference to the metrics service - will be set after initialization
        this.metrics = null;

        // In-memory fallback cache
        this.inMemoryCache = new Map();
        this.useInMemory = false;
    }

    /**
     * Initialize the Redis connection
     */
    async initialize() {
        try {
            // Create Redis client
            this.client = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                socket: {
                    reconnectStrategy: (retries) => {
                        // Give up after 3 retry attempts
                        if (retries >= 3) {
                            console.log('Redis unavailable after 3 attempts, using in-memory cache instead');
                            this.useInMemory = true;
                            this.connected = false;
                            return false; // don't retry anymore
                        }
                        return 1000; // retry after 1 second
                    }
                }
            });

            // Set up event handlers
            this.client.on('error', (err) => {
                console.error('Redis Error:', err);
                this.connected = false;

                // Use in-memory cache after connection errors
                if (!this.useInMemory) {
                    console.log('Switching to in-memory cache due to Redis errors');
                    this.useInMemory = true;
                }
            });

            this.client.on('connect', () => {
                console.log('Redis connected');
                this.connected = true;
                this.useInMemory = false;
            });

            // Connect to Redis
            await this.client.connect().catch(err => {
                console.log('Failed to connect to Redis, using in-memory cache instead:', err.message);
                this.useInMemory = true;
                return null;
            });

            if (this.connected) {
                // Warm up the connection by performing a simple operation
                await this.client.ping();
            }

            // Initialize metrics tracking
            this._initializeMetrics();

            if (this.useInMemory) {
                console.log('Using in-memory cache fallback - Redis unavailable');
            }

            return true;
        } catch (error) {
            console.error('Failed to initialize Redis:', error);
            this.connected = false;
            this.useInMemory = true;
            console.log('Using in-memory cache fallback');
            return true; // Still return true because we have a fallback
        }
    }

    /**
     * Initialize metrics tracking
     * @private
     */
    async _initializeMetrics() {
        try {
            // Dynamically import metrics service to avoid circular dependencies
            const { default: cacheMetrics } = await import('./cacheMetrics.js');
            this.metrics = cacheMetrics;
            await this.metrics.initialize();
        } catch (error) {
            console.error('Failed to initialize cache metrics:', error);
            this.metrics = null;
        }
    }

    /**
     * Get a value from the cache
     * @param {string} key - Cache key
     * @returns {Promise<Object|null>} Cached value or null if not found
     */
    async get(key) {
        // Use in-memory cache if Redis is not available
        if (this.useInMemory) {
            const cacheItem = this.inMemoryCache.get(key);

            if (!cacheItem) {
                if (this.metrics) {
                    const prefix = this._extractPrefix(key);
                    this.metrics.recordMiss(prefix);
                }
                return null;
            }

            // Check if expired
            if (cacheItem.expiry && cacheItem.expiry < Date.now()) {
                this.inMemoryCache.delete(key);
                if (this.metrics) {
                    const prefix = this._extractPrefix(key);
                    this.metrics.recordMiss(prefix);
                }
                return null;
            }

            if (this.metrics) {
                const prefix = this._extractPrefix(key);
                this.metrics.recordHit(prefix);
            }

            return cacheItem.value;
        }

        // Use Redis if available
        if (!this.connected || !this.client) {
            return null;
        }

        try {
            const value = await this.client.get(key);

            // Record metrics if available
            if (this.metrics) {
                const prefix = this._extractPrefix(key);
                if (value) {
                    this.metrics.recordHit(prefix);
                } else {
                    this.metrics.recordMiss(prefix);
                }
            }

            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    /**
     * Set a value in the cache
     * @param {string} key - Cache key
     * @param {Object} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl = this.DEFAULT_TTL) {
        // Use in-memory cache if Redis is not available
        if (this.useInMemory) {
            const serializedValue = JSON.stringify(value);
            const sizeInBytes = new TextEncoder().encode(serializedValue).length;

            this.inMemoryCache.set(key, {
                value: value,
                expiry: Date.now() + (ttl * 1000),
                size: sizeInBytes
            });

            // Update size metrics if available
            if (this.metrics) {
                const prefix = this._extractPrefix(key);
                this.metrics.updateSize(prefix, sizeInBytes);
            }

            return true;
        }

        // Use Redis if available
        if (!this.connected || !this.client) {
            return false;
        }

        try {
            const serializedValue = JSON.stringify(value);
            const sizeInBytes = new TextEncoder().encode(serializedValue).length;

            await this.client.set(key, serializedValue, { EX: ttl });

            // Update size metrics if available
            if (this.metrics) {
                const prefix = this._extractPrefix(key);
                this.metrics.updateSize(prefix, sizeInBytes);
            }

            return true;
        } catch (error) {
            console.error('Redis set error:', error);
            return false;
        }
    }

    /**
     * Delete a value from the cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        // Use in-memory cache if Redis is not available
        if (this.useInMemory) {
            return this.inMemoryCache.delete(key);
        }

        if (!this.connected || !this.client) {
            return false;
        }

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('Redis delete error:', error);
            return false;
        }
    }

    /**
     * Clear the entire cache
     * @returns {Promise<boolean>} Success status
     */
    async clear() {
        // Use in-memory cache if Redis is not available
        if (this.useInMemory) {
            this.inMemoryCache.clear();

            // Reset metrics if available
            if (this.metrics) {
                this.metrics.resetMetrics();
            }

            return true;
        }

        if (!this.connected || !this.client) {
            return false;
        }

        try {
            await this.client.flushDb();

            // Reset metrics if available
            if (this.metrics) {
                this.metrics.resetMetrics();
            }

            return true;
        } catch (error) {
            console.error('Redis clear error:', error);
            return false;
        }
    }

    /**
     * Get all keys matching a pattern
     * @param {string} pattern - Key pattern to match (e.g., 'ai_response:*')
     * @returns {Promise<string[]>} Array of matching keys
     */
    async getKeys(pattern) {
        // Use in-memory cache if Redis is not available
        if (this.useInMemory) {
            // Simple glob-like pattern matching for in-memory cache
            const regex = new RegExp(pattern.replace('*', '.*'));
            return Array.from(this.inMemoryCache.keys()).filter(key => regex.test(key));
        }

        if (!this.connected || !this.client) {
            return [];
        }

        try {
            return await this.client.keys(pattern);
        } catch (error) {
            console.error('Redis getKeys error:', error);
            return [];
        }
    }

    /**
     * Get metrics about the Redis cache
     * @returns {Promise<Object>} Cache metrics
     */
    async getMetrics() {
        if (this.useInMemory) {
            // Calculate metrics for in-memory cache
            const totalItems = this.inMemoryCache.size;
            let totalSizeBytes = 0;

            for (const item of this.inMemoryCache.values()) {
                if (item.size) {
                    totalSizeBytes += item.size;
                }
            }

            return {
                connected: false,
                using_fallback: true,
                total_keys: totalItems,
                memory_usage: {
                    used_memory: totalSizeBytes,
                    used_memory_human: this._formatBytes(totalSizeBytes)
                },
                hit_rate: this.metrics ? this.metrics.getHitRate() : null,
                key_stats: this.metrics ? this.metrics.getKeyStats() : null
            };
        }

        if (!this.connected || !this.client) {
            return { connected: false };
        }

        try {
            // Get Redis stats
            const info = await this.client.info();
            const dbSize = await this.client.dbSize();

            // Parse Redis info
            const memory = {};
            const keyspace = {};
            const lines = info.split('\n');

            for (const line of lines) {
                if (line.startsWith('used_memory:')) {
                    memory.used_memory = parseInt(line.split(':')[1].trim());
                }
                if (line.startsWith('used_memory_human:')) {
                    memory.used_memory_human = line.split(':')[1].trim();
                }
                if (line.startsWith('db0:')) {
                    const dbInfo = line.split(':')[1].trim();
                    const parts = dbInfo.split(',');
                    for (const part of parts) {
                        const [key, value] = part.split('=');
                        keyspace[key] = parseInt(value);
                    }
                }
            }

            return {
                connected: this.connected,
                using_fallback: false,
                total_keys: dbSize,
                memory_usage: memory,
                keyspace: keyspace,
                hit_rate: this.metrics ? this.metrics.getHitRate() : null,
                key_stats: this.metrics ? this.metrics.getKeyStats() : null
            };
        } catch (error) {
            console.error('Redis getMetrics error:', error);
            return {
                connected: this.connected,
                error: error.message
            };
        }
    }

    /**
     * Generate a cache key based on prefix and content
     * @param {string} prefix - Key prefix (e.g., 'ai_response')
     * @param {string} prompt - The prompt or content to hash
     * @param {Object} options - Additional options to include in the key
     * @returns {string} Generated cache key
     */
    generateKey(prefix, prompt, options = {}) {
        // Create a stable hash of the prompt and options
        const optionsStr = Object.keys(options).length > 0
            ? `:${this.hashString(JSON.stringify(options))}`
            : '';

        return `${prefix}:${this.hashString(prompt)}${optionsStr}`;
    }

    /**
     * Generate a hash of a string
     * @param {string} str - String to hash
     * @returns {string} Hashed string
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Extract the prefix from a key
     * @private
     */
    _extractPrefix(key) {
        return key.includes(':') ? key.split(':')[0] : 'unknown';
    }

    /**
     * Format bytes to human readable string
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Close the Redis connection
     */
    async close() {
        if (this.connected && this.client) {
            try {
                await this.client.quit();
                this.connected = false;
                console.log('Redis connection closed');
                return true;
            } catch (error) {
                console.error('Error closing Redis connection:', error);
                return false;
            }
        }
        return true;
    }
}

// Export singleton instance
const redisCache = new RedisCacheService();
export default redisCache; 