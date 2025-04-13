/**
 * Test Script for Plugin System
 * 
 * This script demonstrates how the plugin system works by executing
 * various tasks using different plugins.
 */

import { executeTask, getAvailableTaskTypes, getAvailablePlugins } from './taskExecutor.js';

// Run all the test cases
async function testPluginSystem() {
    console.log('===== TESTING PLUGIN SYSTEM =====\n');

    // Get and display available plugins
    console.log('Loading available plugins...');
    const plugins = await getAvailablePlugins();
    console.log(`Loaded ${plugins.length} plugins:`);

    for (const plugin of plugins) {
        console.log(`- ${plugin.name} v${plugin.version}`);
        console.log(`  Description: ${plugin.description}`);
        console.log(`  Supported intents: ${plugin.intents.join(', ')}`);
        console.log(`  Functions: ${plugin.functions.join(', ')}`);
        console.log();
    }

    // Get and display all available task types
    const taskTypes = await getAvailableTaskTypes();
    console.log(`Available task types (${taskTypes.length}):`);
    console.log(taskTypes.join(', '));
    console.log('\n');

    // Test calendar plugin
    console.log('===== TESTING CALENDAR PLUGIN =====');
    const calendarTask = {
        intent: 'create_event',
        parameters: {
            title: 'Team Meeting',
            startTime: '2023-12-15T14:00:00Z',
            endTime: '2023-12-15T15:00:00Z',
            attendees: ['john@example.com', 'sarah@example.com'],
            location: 'Conference Room A',
            description: 'Weekly team sync to discuss project progress'
        }
    };

    console.log('Executing calendar task:', JSON.stringify(calendarTask, null, 2));
    const calendarResult = await executeTask(calendarTask);
    console.log('Result:', JSON.stringify(calendarResult, null, 2));
    console.log('\n');

    // Test email plugin
    console.log('===== TESTING EMAIL PLUGIN =====');
    const emailTask = {
        intent: 'send_email',
        parameters: {
            to: ['team@example.com'],
            cc: ['manager@example.com'],
            subject: 'Meeting Invitation: Team Sync',
            body: 'Hello team,\n\nI would like to invite you to our weekly team sync meeting tomorrow at 2 PM.\n\nBest regards,\nYour Manager'
        }
    };

    console.log('Executing email task:', JSON.stringify(emailTask, null, 2));
    const emailResult = await executeTask(emailTask);
    console.log('Result:', JSON.stringify(emailResult, null, 2));
    console.log('\n');

    // Test flight booking plugin
    console.log('===== TESTING FLIGHT BOOKING PLUGIN =====');
    const flightTask = {
        intent: 'search_flights',
        parameters: {
            origin: 'SFO',
            destination: 'JFK',
            departureDate: '2023-12-20',
            returnDate: '2023-12-27',
            numPassengers: 2,
            cabinClass: 'economy'
        }
    };

    console.log('Executing flight search task:', JSON.stringify(flightTask, null, 2));
    const flightResult = await executeTask(flightTask);
    console.log('Found flights:', flightResult.flights.length);
    console.log('First flight:', JSON.stringify(flightResult.flights[0], null, 2));
    console.log('\n');

    // Test error handling with invalid intent
    console.log('===== TESTING ERROR HANDLING =====');
    const invalidTask = {
        intent: 'invalid_intent',
        parameters: {
            foo: 'bar'
        }
    };

    console.log('Executing invalid task:', JSON.stringify(invalidTask, null, 2));
    try {
        const invalidResult = await executeTask(invalidTask);
        console.log('Result:', JSON.stringify(invalidResult, null, 2));
    } catch (error) {
        console.error('Error executing invalid task:', error.message);
    }
    console.log('\n');

    // Test plugin system with legacy tasks
    console.log('===== TESTING LEGACY TASK FALLBACK =====');
    const legacyTask = {
        intent: 'search',
        parameters: {
            query: 'JavaScript plugin system',
            site: 'github.com'
        }
    };

    console.log('Executing legacy task:', JSON.stringify(legacyTask, null, 2));
    try {
        const legacyResult = await executeTask(legacyTask);
        console.log('Result:', JSON.stringify(legacyResult, null, 2));
    } catch (error) {
        console.error('Error executing legacy task:', error.message);
    }
    console.log('\n');

    console.log('===== PLUGIN SYSTEM TESTS COMPLETED =====');
}

// Run the tests
testPluginSystem().catch(error => {
    console.error('Error running plugin tests:', error);
}); 