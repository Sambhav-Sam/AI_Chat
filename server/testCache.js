/**
 * Test the Redis Cache Service with fallback
 * Run with: node testCache.js
 */

import redisCache from './services/redisCache.js';

// Simple test data
const testData = {
    message: "This is test data",
    timestamp: new Date().toISOString(),
    items: [1, 2, 3, 4, 5]
};

async function testCacheService() {
    console.log('=== Redis Cache Service Test ===');

    try {
        // Initialize the cache
        console.log('Initializing cache service...');
        const initResult = await redisCache.initialize();
        console.log('Cache initialized:', initResult);
        console.log('Using in-memory fallback:', redisCache.useInMemory);

        // Test setting a value
        console.log('\nSetting test data...');
        const setResult = await redisCache.set('test:data', testData);
        console.log('Set result:', setResult);

        // Test getting the value
        console.log('\nRetrieving test data...');
        const retrievedData = await redisCache.get('test:data');
        console.log('Retrieved data:', retrievedData);

        // Test getting metrics
        console.log('\nGetting cache metrics...');
        const metrics = await redisCache.getMetrics();
        console.log('Cache metrics:', JSON.stringify(metrics, null, 2));

        // Test clearing the cache
        console.log('\nClearing cache...');
        const clearResult = await redisCache.clear();
        console.log('Clear result:', clearResult);

        // Verify data is gone
        console.log('\nVerifying data was cleared...');
        const clearedData = await redisCache.get('test:data');
        console.log('Data after clear:', clearedData);

        // Close connection
        console.log('\nClosing cache connection...');
        await redisCache.close();
        console.log('Cache connection closed');

    } catch (error) {
        console.error('Error in cache test:', error);
    }
}

// Run the test
testCacheService().catch(console.error); 