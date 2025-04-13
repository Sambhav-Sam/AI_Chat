/**
 * Test script for task isolation
 * Run with: node testIsolation.js
 */

import { executeTask } from './taskExecutor.js';

// Sample tasks to test
const tasks = [
    // JavaScript task - Search
    {
        intent: 'search',
        parameters: {
            query: 'JavaScript task isolation',
            site: 'google.com'
        }
    },
    // JavaScript task - Navigate
    {
        intent: 'navigate',
        parameters: {
            url: 'reactjs.org'
        }
    },
    // Python task - Web Scrape
    {
        intent: 'py_web_scrape',
        parameters: {
            url: 'https://news.ycombinator.com',
            depth: 1,
            max_pages: 2
        },
        executor: 'python'
    },
    // Python task - Data Analysis
    {
        intent: 'py_data_analysis',
        parameters: {
            dataset: 'sample_data',
            analysis_type: 'summary_statistics'
        },
        executor: 'python'
    }
];

async function runIsolationTests() {
    try {
        console.log('==== Running Task Isolation Tests ====');

        // Execute each test task
        for (const task of tasks) {
            console.log(`\n----- Testing task with intent: ${task.intent} -----`);
            console.log('Task parameters:', JSON.stringify(task.parameters, null, 2));

            try {
                const startTime = Date.now();
                const result = await executeTask(task);
                const duration = Date.now() - startTime;

                console.log(`Task execution ${result.success ? 'succeeded' : 'failed'} in ${duration}ms`);

                // Display any errors
                if (result.errors && result.errors.length > 0) {
                    console.log('Errors:');
                    result.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
                }

                // Display results summary
                console.log('Results summary:');
                console.log(`  - Task type: ${result.taskType || 'unknown'}`);
                console.log(`  - Screenshots: ${result.screenshots ? result.screenshots.length : 0}`);

                if (result.data) {
                    console.log('  - Data:');
                    Object.entries(result.data).forEach(([key, value]) => {
                        console.log(`    - ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                    });
                }

                // If task has logs, display them
                if (result.logs) {
                    console.log('\nTask logs:');
                    if (result.logs.stdout && result.logs.stdout.trim()) {
                        console.log('  - stdout: ' + result.logs.stdout.substring(0, 200) +
                            (result.logs.stdout.length > 200 ? '...' : ''));
                    }
                    if (result.logs.stderr && result.logs.stderr.trim()) {
                        console.log('  - stderr: ' + result.logs.stderr.substring(0, 200) +
                            (result.logs.stderr.length > 200 ? '...' : ''));
                    }
                }
            } catch (error) {
                console.error(`Error executing task with intent '${task.intent}':`, error);
            }

            console.log('-'.repeat(50));
        }

        console.log('\nAll isolation tests completed.');
    } catch (error) {
        console.error('Test suite error:', error);
    }
}

console.log('='.repeat(80));
console.log('TASK ISOLATION FRAMEWORK TEST');
console.log('='.repeat(80));

runIsolationTests().catch(console.error); 