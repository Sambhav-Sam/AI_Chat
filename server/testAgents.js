/**
 * Test script for multi-agent coordination
 * Run with: node testAgents.js
 */

import { AgentRunner } from './agents/agentRunner.js';

// Sample high-level instructions
const instructions = [
    "Book a flight from New York to San Francisco for next Monday, and schedule a meeting with the team at 2pm the day after arrival",
    "Draft an email to the team about the upcoming project deadline, and schedule a review meeting for next Friday at 10am",
    "Find the next available flight to Chicago and notify my manager about the business trip"
];

// Create an instance of AgentRunner
const agentRunner = new AgentRunner();

async function runAgentTests() {
    try {
        console.log('==== Testing Multi-Agent Coordination ====\n');

        for (const instruction of instructions) {
            console.log(`\n----- Testing instruction: "${instruction}" -----\n`);

            try {
                const startTime = Date.now();
                const result = await agentRunner.execute(instruction);
                const duration = (Date.now() - startTime) / 1000;

                console.log(`Execution ${result.success ? 'succeeded' : 'failed'} in ${duration.toFixed(2)} seconds\n`);

                if (result.success) {
                    // Display plan
                    console.log('Task Plan:');
                    const subtasks = result.plan.hasOwnProperty('subtasks') ? result.plan.subtasks : result.plan;
                    subtasks.forEach(task => {
                        console.log(`  - Task ${task.id}: ${task.task} (Agent: ${task.agent})`);
                    });

                    // Display final result
                    console.log('\nFinal Result:');
                    console.log('  Summary:', result.finalResult.summary);

                    if (result.finalResult.recommendations && result.finalResult.recommendations.length > 0) {
                        console.log('\n  Recommendations:');
                        result.finalResult.recommendations.forEach(rec => {
                            console.log(`    - ${rec}`);
                        });
                    }

                    if (result.finalResult.nextSteps && result.finalResult.nextSteps.length > 0) {
                        console.log('\n  Next Steps:');
                        result.finalResult.nextSteps.forEach(step => {
                            console.log(`    - ${step}`);
                        });
                    }
                } else {
                    console.log('Error:', result.error);
                }
            } catch (error) {
                console.error('Error executing instruction:', error);
            }

            console.log('='.repeat(80));
        }

        console.log('\nAll agent tests completed.');
    } catch (error) {
        console.error('Test suite error:', error);
    }
}

// Run the tests
console.log('='.repeat(80));
console.log('MULTI-AGENT COORDINATION TEST');
console.log('='.repeat(80), '\n');

runAgentTests().catch(console.error); 