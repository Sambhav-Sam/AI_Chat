/**
 * Test script for the task execution framework
 * Run with: node testTaskExecutor.js
 */

import { executeTask, getAvailableTaskTypes } from './taskExecutor.js';

// Sample tasks to test
const tasks = [
    {
        intent: 'search',
        parameters: {
            query: 'JavaScript frameworks 2023',
            site: 'google.com'
        }
    },
    {
        intent: 'fill_form',
        parameters: {
            form_type: 'contact',
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane.smith@example.com',
            message: 'This is a test message from the task execution framework'
        }
    },
    {
        intent: 'navigate',
        parameters: {
            url: 'reactjs.org'
        }
    },
    {
        intent: 'unknown_intent',
        parameters: {
            url: 'example.com'
        }
    }
];

async function runTests() {
    try {
        // Get available task types
        console.log('Getting available task types...');
        const taskTypes = await getAvailableTaskTypes();
        console.log('Available task types:', taskTypes);
        console.log('-'.repeat(50));

        // Execute each test task
        for (const task of tasks) {
            console.log(`\nExecuting task with intent: ${task.intent}`);
            console.log('Task parameters:', JSON.stringify(task.parameters, null, 2));

            try {
                const result = await executeTask(task);
                console.log('Execution result:',
                    JSON.stringify({
                        success: result.success,
                        screenshots: result.screenshots,
                        taskType: result.taskType,
                        errors: result.errors
                    }, null, 2)
                );
            } catch (error) {
                console.error(`Error executing task with intent '${task.intent}':`, error);
            }

            console.log('-'.repeat(50));
        }

        console.log('\nAll tests completed.');
    } catch (error) {
        console.error('Test suite error:', error);
    }
}

console.log('='.repeat(50));
console.log('TASK EXECUTION FRAMEWORK TEST');
console.log('='.repeat(50));

runTests().catch(console.error); 