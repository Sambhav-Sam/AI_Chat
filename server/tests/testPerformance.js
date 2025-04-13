/**
 * Performance Test Script
 * Tests the performance of the Redis caching and browser reuse features
 * 
 * Run with: node tests/testPerformance.js
 */

import { parseTask } from '../aiAgent.js';
import { automateWebsite, cleanupBrowserResources } from '../automation/automateWebsites.js';
import { BaseAgent } from '../agents/baseAgent.js';
import redisCache from '../services/redisCache.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, 'results');

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
}

// Test parameters
const TEST_ITERATIONS = 5;
const SAMPLE_TASK_INPUT = 'Search for javascript performance optimization techniques';
const SAMPLE_AGENT_PROMPT = 'What are the best practices for optimizing web applications?';

// Agent for testing
class TestAgent extends BaseAgent {
    constructor() {
        super({
            name: 'TestAgent',
            description: 'An agent for performance testing',
            model: 'gpt-3.5-turbo' // Using a cheaper model for testing
        });
    }
}

/**
 * Initialize testing environment
 */
async function setup() {
    console.log('Setting up test environment...');

    // Initialize Redis
    const redisConnected = await redisCache.initialize();
    console.log(`Redis connection: ${redisConnected ? 'SUCCESS' : 'FAILED'}`);

    // Clear Redis cache
    if (redisConnected) {
        await redisCache.clear();
        console.log('Redis cache cleared');
    }

    return redisConnected;
}

/**
 * Test task parsing performance
 */
async function testTaskParsing() {
    console.log('\n=== Testing Task Parsing Performance ===\n');

    const results = {
        withoutCache: [],
        withCache: []
    };

    // First run - without cache
    for (let i = 0; i < TEST_ITERATIONS; i++) {
        console.log(`Iteration ${i + 1}/${TEST_ITERATIONS} without cache`);
        const start = Date.now();

        try {
            // Clear cache before each iteration to ensure no caching
            if (redisCache.connected) {
                const cacheKey = redisCache.generateKey('task_parse', SAMPLE_TASK_INPUT, {
                    model: 'gpt-4o',
                    temperature: 0.3
                });
                await redisCache.delete(cacheKey);
            }

            await parseTask(SAMPLE_TASK_INPUT);
            const duration = Date.now() - start;
            results.withoutCache.push(duration);
            console.log(`  Duration: ${duration}ms`);
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
    }

    // Second run - with cache
    for (let i = 0; i < TEST_ITERATIONS; i++) {
        console.log(`Iteration ${i + 1}/${TEST_ITERATIONS} with cache`);
        const start = Date.now();

        try {
            await parseTask(SAMPLE_TASK_INPUT);
            const duration = Date.now() - start;
            results.withCache.push(duration);
            console.log(`  Duration: ${duration}ms`);
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
    }

    // Calculate and log results
    const avgWithoutCache = results.withoutCache.reduce((a, b) => a + b, 0) / results.withoutCache.length;
    const avgWithCache = results.withCache.reduce((a, b) => a + b, 0) / results.withCache.length;
    const improvement = ((avgWithoutCache - avgWithCache) / avgWithoutCache) * 100;

    console.log('\nTask Parsing Results:');
    console.log(`  Without Cache: ${avgWithoutCache.toFixed(2)}ms average`);
    console.log(`  With Cache: ${avgWithCache.toFixed(2)}ms average`);
    console.log(`  Improvement: ${improvement.toFixed(2)}%`);

    return results;
}

/**
 * Test browser reuse performance
 */
async function testBrowserReuse() {
    console.log('\n=== Testing Browser Reuse Performance ===\n');

    const results = {
        withoutReuse: [],
        withReuse: []
    };

    // Sample task
    const task = {
        url: 'https://example.com',
        actions: [
            { type: 'wait', milliseconds: 1000 },
            { type: 'screenshot', name: 'test_screenshot' }
        ]
    };

    // First run - without reuse
    for (let i = 0; i < TEST_ITERATIONS; i++) {
        console.log(`Iteration ${i + 1}/${TEST_ITERATIONS} without browser reuse`);
        const start = Date.now();

        try {
            await automateWebsite(task, {
                outputDir: resultsDir,
                reuseContext: false
            });
            const duration = Date.now() - start;
            results.withoutReuse.push(duration);
            console.log(`  Duration: ${duration}ms`);
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
    }

    // Second run - with reuse
    for (let i = 0; i < TEST_ITERATIONS; i++) {
        console.log(`Iteration ${i + 1}/${TEST_ITERATIONS} with browser reuse`);
        const start = Date.now();

        try {
            await automateWebsite(task, {
                outputDir: resultsDir,
                reuseContext: true
            });
            const duration = Date.now() - start;
            results.withReuse.push(duration);
            console.log(`  Duration: ${duration}ms`);
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
    }

    // Calculate and log results
    const avgWithoutReuse = results.withoutReuse.reduce((a, b) => a + b, 0) / results.withoutReuse.length;
    const avgWithReuse = results.withReuse.reduce((a, b) => a + b, 0) / results.withReuse.length;
    const improvement = ((avgWithoutReuse - avgWithReuse) / avgWithoutReuse) * 100;

    console.log('\nBrowser Reuse Results:');
    console.log(`  Without Reuse: ${avgWithoutReuse.toFixed(2)}ms average`);
    console.log(`  With Reuse: ${avgWithReuse.toFixed(2)}ms average`);
    console.log(`  Improvement: ${improvement.toFixed(2)}%`);

    return results;
}

/**
 * Test agent response caching
 */
async function testAgentCache() {
    console.log('\n=== Testing Agent Response Caching ===\n');

    const results = {
        withoutCache: [],
        withCache: []
    };

    // Create test agents
    const agentWithoutCache = new TestAgent();
    agentWithoutCache.enableCache = false;

    const agentWithCache = new TestAgent();
    agentWithCache.enableCache = true;

    // First run - without cache
    for (let i = 0; i < TEST_ITERATIONS; i++) {
        console.log(`Iteration ${i + 1}/${TEST_ITERATIONS} without cache`);
        const start = Date.now();

        try {
            await agentWithoutCache.execute({ prompt: SAMPLE_AGENT_PROMPT });
            const duration = Date.now() - start;
            results.withoutCache.push(duration);
            console.log(`  Duration: ${duration}ms`);
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
    }

    // Second run - with cache
    for (let i = 0; i < TEST_ITERATIONS; i++) {
        console.log(`Iteration ${i + 1}/${TEST_ITERATIONS} with cache`);
        const start = Date.now();

        try {
            await agentWithCache.execute({ prompt: SAMPLE_AGENT_PROMPT });
            const duration = Date.now() - start;
            results.withCache.push(duration);
            console.log(`  Duration: ${duration}ms`);
        } catch (error) {
            console.error(`  Error: ${error.message}`);
        }
    }

    // Calculate and log results
    const avgWithoutCache = results.withoutCache.reduce((a, b) => a + b, 0) / results.withoutCache.length;
    const avgWithCache = results.withCache.reduce((a, b) => a + b, 0) / results.withCache.length;
    const improvement = ((avgWithoutCache - avgWithCache) / avgWithoutCache) * 100;

    console.log('\nAgent Caching Results:');
    console.log(`  Without Cache: ${avgWithoutCache.toFixed(2)}ms average`);
    console.log(`  With Cache: ${avgWithCache.toFixed(2)}ms average`);
    console.log(`  Improvement: ${improvement.toFixed(2)}%`);

    return results;
}

/**
 * Save test results to a file
 */
function saveResults(results) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const resultsPath = path.join(resultsDir, `performance_test_${timestamp}.json`);

    fs.writeFileSync(
        resultsPath,
        JSON.stringify(results, null, 2)
    );

    console.log(`\nResults saved to ${resultsPath}`);
}

/**
 * Main test function
 */
async function runTests() {
    console.log('Performance Testing Started');
    console.log('========================\n');

    const redisConnected = await setup();

    if (!process.env.OPENAI_API_KEY) {
        console.warn('WARNING: OPENAI_API_KEY not set. Some tests will fail.');
    }

    const results = {
        timestamp: new Date().toISOString(),
        redisConnected,
        taskParsing: null,
        browserReuse: null,
        agentCache: null
    };

    try {
        // Run tests
        if (process.env.OPENAI_API_KEY) {
            results.taskParsing = await testTaskParsing();
            results.agentCache = await testAgentCache();
        } else {
            console.log('Skipping OpenAI-dependent tests due to missing API key');
        }

        results.browserReuse = await testBrowserReuse();

        // Save results
        saveResults(results);
    } catch (error) {
        console.error('Test execution error:', error);
    } finally {
        // Cleanup
        console.log('\nCleaning up...');

        if (redisCache.connected) {
            await redisCache.close();
            console.log('Redis connection closed');
        }

        await cleanupBrowserResources();
        console.log('Browser resources cleaned up');

        console.log('\nPerformance Testing Completed');
    }
}

// Run the tests
runTests().catch(console.error); 