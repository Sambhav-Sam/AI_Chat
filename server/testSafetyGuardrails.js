/**
 * Test Script for AgentRunner Safety Guardrails
 * 
 * This script demonstrates how the safety guardrails work by executing
 * various tasks with critical intents and restricted domains.
 */

import { AgentRunner } from './agents/agentRunner.js';

// Initialize AgentRunner in mock mode for testing
const runner = new AgentRunner({ mockMode: true });

// Test function to run various scenarios
async function testSafetyGuardrails() {
    console.log('===== TESTING SAFETY GUARDRAILS =====\n');

    // Test 1: Regular non-critical task
    console.log('Test 1: Regular non-critical task');
    const result1 = await runner.execute('Schedule a meeting for tomorrow at 2 PM');
    console.log(`Result: ${result1.success ? 'SUCCESS' : 'FAILED'}`, result1.safetyReport || {});
    console.log('\n');

    // Test 2: Task with critical intent (sending email)
    console.log('Test 2: Task with critical intent (sending email)');
    const result2 = await runner.execute('Send an email to the team about project updates');
    console.log(`Result: ${result2.success ? 'SUCCESS' : 'FAILED'}`);
    console.log('Reason:', result2.reason);
    console.log('Tasks needing confirmation:', result2.tasksNeedingConfirmation?.length || 0);
    console.log('\n');

    // Test 3: Task with restricted domain (data deletion)
    console.log('Test 3: Task with restricted domain (data deletion)');
    const result3 = await runner.execute('Perform data_deletion on old user records');
    console.log(`Result: ${result3.success ? 'SUCCESS' : 'FAILED'}`);
    console.log('Reason:', result3.reason);
    console.log('Blocked tasks:', result3.blockedTasks?.length || 0);
    console.log('\n');

    // Test 4: Using confirmation callback
    console.log('Test 4: Using confirmation callback');
    const result4 = await runner.execute(
        'Send an email to the team about project updates',
        {
            confirmationCallback: async (tasksNeedingConfirmation) => {
                console.log('Confirmation needed for tasks:',
                    tasksNeedingConfirmation.map(t => t.task));
                console.log('Simulating user confirming all tasks...');
                return tasksNeedingConfirmation.map(t => t.id);
            }
        }
    );
    console.log(`Result: ${result4.success ? 'SUCCESS' : 'FAILED'}`);
    console.log('Safety report:', result4.safetyReport || {});
    console.log('\n');

    // Test 5: Using safety overrides
    console.log('Test 5: Using safety overrides for restricted domains');
    const result5 = await runner.execute(
        'Perform data_deletion on old user records',
        {
            safetyOverrides: {
                allowRestrictedDomains: ['data_deletion']
            }
        }
    );
    console.log(`Result: ${result5.success ? 'SUCCESS' : 'FAILED'}`);
    console.log('Safety report:', result5.safetyReport || {});
    console.log('\n');

    // Test 6: Mixed task types
    console.log('Test 6: Mixed task types (critical, restricted, and normal)');
    const result6 = await runner.execute(
        'Schedule a meeting, send an email about it, and perform admin_access operations',
        {
            safetyOverrides: {
                allowCriticalIntents: ['send_email']
            }
        }
    );
    console.log(`Result: ${result6.success ? 'SUCCESS' : 'FAILED'}`);
    if (result6.success) {
        console.log('Safety report:', result6.safetyReport || {});
    } else {
        console.log('Reason:', result6.reason);
        console.log('Blocked tasks:', result6.blockedTasks?.length || 0);
    }
    console.log('\n');
}

// Run the tests
testSafetyGuardrails().catch(error => {
    console.error('Error running tests:', error);
}); 