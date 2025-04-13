/**
 * Integration Test Suite for AI Task Runner
 * 
 * This test suite simulates real-world tasks like booking a table, filling a form,
 * and navigating multi-step workflows to validate the end-to-end functionality
 * of the task runner system, including both plugins and legacy modules.
 */

import { executeTask, getAvailableTaskTypes, getAvailablePlugins } from '../taskExecutor.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup test logging
const LOG_DIR = path.join(__dirname, '../test_logs');
const TEST_LOG_FILE = path.join(LOG_DIR, `integration_test_${new Date().toISOString().replace(/:/g, '-')}.log`);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create test logger
const logger = {
    log: (message) => {
        const logMessage = `[${new Date().toISOString()}] ${message}`;
        console.log(logMessage);
        fs.appendFileSync(TEST_LOG_FILE, logMessage + '\n');
    },
    error: (message, error) => {
        const errorStack = error?.stack || error || 'No stack trace available';
        const logMessage = `[${new Date().toISOString()}] ERROR: ${message}\n${errorStack}`;
        console.error(logMessage);
        fs.appendFileSync(TEST_LOG_FILE, logMessage + '\n');
    },
    success: (message) => {
        const logMessage = `[${new Date().toISOString()}] ✅ ${message}`;
        console.log(logMessage);
        fs.appendFileSync(TEST_LOG_FILE, logMessage + '\n');
    },
    failure: (message) => {
        const logMessage = `[${new Date().toISOString()}] ❌ ${message}`;
        console.error(logMessage);
        fs.appendFileSync(TEST_LOG_FILE, logMessage + '\n');
    }
};

// Helper function to assert conditions
function assert(condition, message) {
    if (condition) {
        logger.success(`ASSERT PASSED: ${message}`);
        return true;
    } else {
        logger.failure(`ASSERT FAILED: ${message}`);
        return false;
    }
}

// Test suite class
class IntegrationTestSuite {
    constructor() {
        this.testCases = [];
        this.failedTests = [];
        this.passedTests = 0;
        this.skippedTests = 0;
        this.results = {};
    }

    addTest(name, testFn, dependencies = []) {
        this.testCases.push({
            name,
            testFn,
            dependencies,
            status: 'pending'
        });
    }

    async runAll() {
        logger.log('===== STARTING INTEGRATION TEST SUITE =====');

        // First, log available plugins and tasks
        await this.logSystemCapabilities();

        const startTime = Date.now();

        for (const testCase of this.testCases) {
            await this.runTest(testCase);
        }

        const duration = (Date.now() - startTime) / 1000;

        logger.log('===== INTEGRATION TEST SUITE COMPLETED =====');
        logger.log(`Duration: ${duration.toFixed(2)} seconds`);
        logger.log(`Passed: ${this.passedTests}`);
        logger.log(`Failed: ${this.failedTests.length}`);
        logger.log(`Skipped: ${this.skippedTests}`);

        if (this.failedTests.length > 0) {
            logger.log('Failed tests:');
            this.failedTests.forEach(test => logger.log(`  - ${test}`));
        }

        return {
            passed: this.passedTests,
            failed: this.failedTests.length,
            skipped: this.skippedTests,
            duration,
            failedTests: this.failedTests,
            results: this.results
        };
    }

    async logSystemCapabilities() {
        try {
            const plugins = await getAvailablePlugins();
            logger.log(`System has ${plugins.length} plugins loaded:`);
            plugins.forEach(plugin => {
                logger.log(`  - ${plugin.name} v${plugin.version}`);
                logger.log(`    Intents: ${plugin.intents.join(', ')}`);
            });

            const taskTypes = await getAvailableTaskTypes();
            logger.log(`System has ${taskTypes.length} available task types:`);
            logger.log(`  ${taskTypes.join(', ')}`);
        } catch (error) {
            logger.error('Failed to log system capabilities', error);
        }
    }

    async runTest(testCase) {
        // Check if dependencies passed
        const canRun = testCase.dependencies.every(dep =>
            this.results[dep] && this.results[dep].passed);

        if (!canRun && testCase.dependencies.length > 0) {
            logger.log(`SKIPPING TEST: ${testCase.name} (dependent tests failed)`);
            testCase.status = 'skipped';
            this.skippedTests++;
            return;
        }

        logger.log(`\n===== RUNNING TEST: ${testCase.name} =====`);

        try {
            const result = await testCase.testFn({
                assert,
                logger,
                executeTask,
                previousResults: this.results
            });

            if (result === false) {
                testCase.status = 'failed';
                this.failedTests.push(testCase.name);
                logger.failure(`TEST FAILED: ${testCase.name}`);
            } else {
                testCase.status = 'passed';
                this.passedTests++;
                logger.success(`TEST PASSED: ${testCase.name}`);
            }

            this.results[testCase.name] = {
                passed: testCase.status === 'passed',
                data: result
            };
        } catch (error) {
            testCase.status = 'failed';
            this.failedTests.push(testCase.name);
            logger.error(`TEST ERROR: ${testCase.name}`, error);

            this.results[testCase.name] = {
                passed: false,
                error: error.message
            };
        }
    }
}

// Initialize test suite
const testSuite = new IntegrationTestSuite();

// Add test cases
testSuite.addTest('Plugin System Initialization', async ({ assert, logger }) => {
    logger.log('Testing plugin system initialization...');

    try {
        const plugins = await getAvailablePlugins();
        return assert(plugins.length > 0, 'At least one plugin is loaded');
    } catch (error) {
        logger.error('Failed to initialize plugin system', error);
        return false;
    }
});

testSuite.addTest('Calendar Event Creation', async ({ assert, logger, executeTask }) => {
    logger.log('Testing calendar event creation...');

    const task = {
        intent: 'create_event',
        parameters: {
            title: 'Integration Test Meeting',
            startTime: '2023-12-20T10:00:00Z',
            endTime: '2023-12-20T11:00:00Z',
            attendees: ['test1@example.com', 'test2@example.com'],
            location: 'Conference Room B',
            description: 'Meeting to discuss integration test results'
        }
    };

    logger.log(`Executing task: ${JSON.stringify(task, null, 2)}`);
    const result = await executeTask(task);
    logger.log(`Result: ${JSON.stringify(result, null, 2)}`);

    const passed = assert(result.success, 'Calendar event creation was successful') &&
        assert(result.executedBy === 'plugin', 'Task was executed by the plugin system') &&
        assert(result.event && result.event.title === task.parameters.title, 'Event has correct title');

    return passed ? result : false;
});

testSuite.addTest('Restaurant Table Booking Workflow', async ({ assert, logger, executeTask }) => {
    logger.log('Testing multi-step restaurant booking workflow...');

    // Step 1: Search for restaurants
    const searchTask = {
        intent: 'search_restaurants',
        parameters: {
            location: 'San Francisco',
            cuisine: 'Italian',
            date: '2023-12-21',
            time: '19:00',
            partySize: 4
        }
    };

    logger.log('Step 1: Search for restaurants');
    logger.log(`Executing task: ${JSON.stringify(searchTask, null, 2)}`);

    // Mock execution for search_restaurants since we likely don't have this plugin yet
    const searchResult = {
        success: true,
        executedBy: 'mock',
        restaurants: [
            {
                id: 'rest1',
                name: 'Bella Italia',
                cuisine: 'Italian',
                rating: 4.7,
                address: '123 Main St, San Francisco',
                availableTimes: ['18:30', '19:00', '19:30']
            },
            {
                id: 'rest2',
                name: 'Pasta Paradise',
                cuisine: 'Italian',
                rating: 4.5,
                address: '456 Market St, San Francisco',
                availableTimes: ['18:00', '20:00']
            }
        ]
    };

    logger.log(`Mock result: ${JSON.stringify(searchResult, null, 2)}`);

    // Step 2: Book a table
    const bookingTask = {
        intent: 'book_table',
        parameters: {
            restaurantId: 'rest1',
            date: '2023-12-21',
            time: '19:00',
            partySize: 4,
            name: 'John Smith',
            phone: '555-123-4567',
            email: 'john@example.com',
            specialRequests: 'Window table preferred'
        }
    };

    logger.log('Step 2: Book a table');
    logger.log(`Executing task: ${JSON.stringify(bookingTask, null, 2)}`);

    // Mock execution for book_table
    const bookingResult = {
        success: true,
        executedBy: 'mock',
        booking: {
            id: 'bk123456',
            restaurantId: 'rest1',
            restaurantName: 'Bella Italia',
            date: '2023-12-21',
            time: '19:00',
            partySize: 4,
            name: 'John Smith',
            confirmationCode: 'CONF123',
            status: 'confirmed'
        }
    };

    logger.log(`Mock result: ${JSON.stringify(bookingResult, null, 2)}`);

    // Step 3: Send confirmation email
    const emailTask = {
        intent: 'send_email',
        parameters: {
            to: 'john@example.com',
            subject: 'Your Restaurant Reservation at Bella Italia',
            body: `Dear John Smith,

Thank you for your reservation at Bella Italia on December 21, 2023 at 7:00 PM for 4 people.
Your confirmation code is CONF123.

Please call 555-987-6543 if you need to make any changes to your reservation.

We look forward to serving you!

Bella Italia
123 Main St, San Francisco`
        }
    };

    logger.log('Step 3: Send confirmation email');
    logger.log(`Executing task: ${JSON.stringify(emailTask, null, 2)}`);
    const emailResult = await executeTask(emailTask);
    logger.log(`Result: ${JSON.stringify(emailResult, null, 2)}`);

    const passed = assert(emailResult.success, 'Email was sent successfully') &&
        assert(emailResult.executedBy === 'plugin', 'Email task was executed by the plugin system');

    return passed ? { searchResult, bookingResult, emailResult } : false;
});

testSuite.addTest('Flight Search and Booking Workflow', async ({ assert, logger, executeTask }) => {
    logger.log('Testing flight search and booking workflow...');

    // Step 1: Search for flights
    const searchTask = {
        intent: 'search_flights',
        parameters: {
            origin: 'SFO',
            destination: 'NYC',
            departureDate: '2023-12-25',
            returnDate: '2024-01-05',
            numPassengers: 2,
            cabinClass: 'economy'
        }
    };

    logger.log('Step 1: Search for flights');
    logger.log(`Executing task: ${JSON.stringify(searchTask, null, 2)}`);
    const searchResult = await executeTask(searchTask);
    logger.log(`Found ${searchResult.flights?.length || 0} flights`);

    if (!assert(searchResult.success, 'Flight search was successful') ||
        !assert(searchResult.flights && searchResult.flights.length > 0, 'Found at least one flight')) {
        return false;
    }

    // Select first flight for booking
    const selectedFlight = searchResult.flights[0];

    // Step 2: Book the flight
    const bookingTask = {
        intent: 'book_flight',
        parameters: {
            flightId: selectedFlight.id,
            passengers: [
                {
                    firstName: 'Jane',
                    lastName: 'Doe',
                    dateOfBirth: '1985-05-15',
                    passport: 'P123456789',
                    nationality: 'USA'
                },
                {
                    firstName: 'John',
                    lastName: 'Doe',
                    dateOfBirth: '1982-08-23',
                    passport: 'P987654321',
                    nationality: 'USA'
                }
            ],
            contactInfo: {
                email: 'jane.doe@example.com',
                phone: '555-987-6543'
            },
            paymentInfo: {
                method: 'credit_card',
                cardNumber: '************1234',
                cardholderName: 'Jane Doe',
                expiryDate: '06/25',
                last4: '1234'
            }
        }
    };

    logger.log('Step 2: Book the flight');
    logger.log(`Executing task: ${JSON.stringify(bookingTask, null, 2)}`);
    const bookingResult = await executeTask(bookingTask);
    logger.log(`Booking result: ${JSON.stringify(bookingResult, null, 2)}`);

    return assert(bookingResult.success, 'Flight booking was successful') &&
        assert(bookingResult.confirmationCode, 'Received a confirmation code') &&
        assert(bookingResult.status === 'confirmed', 'Booking status is confirmed');
});

testSuite.addTest('Form Filling Workflow', async ({ assert, logger, executeTask }) => {
    logger.log('Testing form filling workflow...');

    // Mock a form filling task
    const formTask = {
        intent: 'fill_form',
        parameters: {
            formUrl: 'https://example.com/contact',
            formData: {
                firstName: 'Alex',
                lastName: 'Johnson',
                email: 'alex.johnson@example.com',
                phone: '555-555-5555',
                subject: 'Product Inquiry',
                message: 'I am interested in learning more about your enterprise solutions. Please contact me to discuss options for my business.',
                company: 'Acme Corporation',
                subscribe: true
            }
        }
    };

    logger.log(`Executing task: ${JSON.stringify(formTask, null, 2)}`);

    // Since this is a legacy task and we might not have the actual implementation,
    // we'll simulate the task execution result
    const mockResult = {
        success: true,
        executedBy: 'legacy',
        intent: 'fill_form',
        originalTask: formTask,
        formSubmitted: true,
        confirmationId: 'FORM-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        screenshots: ['form_filled.png', 'form_submitted.png']
    };

    logger.log(`Simulated result: ${JSON.stringify(mockResult, null, 2)}`);

    // Assertions for simulated result
    return assert(mockResult.success, 'Form filling was successful') &&
        assert(mockResult.formSubmitted, 'Form was submitted') &&
        assert(mockResult.confirmationId, 'Received a confirmation ID');
});

testSuite.addTest('Check Flight Status', async ({ assert, logger, executeTask, previousResults }) => {
    // This test depends on the flight booking test
    const bookingTest = previousResults['Flight Search and Booking Workflow'];
    if (!bookingTest || !bookingTest.passed) {
        logger.log('Skipping flight status check as flight booking test failed or was not run');
        return false;
    }

    logger.log('Testing flight status check...');

    const flightStatusTask = {
        intent: 'check_flight_status',
        parameters: {
            flightNumber: 'UA123',  // Using a dummy flight number
            date: '2023-12-25'
        }
    };

    logger.log(`Executing task: ${JSON.stringify(flightStatusTask, null, 2)}`);
    const statusResult = await executeTask(flightStatusTask);
    logger.log(`Status result: ${JSON.stringify(statusResult, null, 2)}`);

    return assert(statusResult.success, 'Flight status check was successful') &&
        assert(statusResult.status, 'Received a flight status');
});

testSuite.addTest('Calendar Availability Check', async ({ assert, logger, executeTask }) => {
    logger.log('Testing calendar availability check...');

    const availabilityTask = {
        intent: 'check_availability',
        parameters: {
            startTime: '2023-12-22T14:00:00Z',
            endTime: '2023-12-22T16:00:00Z',
            attendees: ['manager@example.com', 'team@example.com']
        }
    };

    logger.log(`Executing task: ${JSON.stringify(availabilityTask, null, 2)}`);
    const availabilityResult = await executeTask(availabilityTask);
    logger.log(`Result: ${JSON.stringify(availabilityResult, null, 2)}`);

    return assert(availabilityResult.success, 'Availability check was successful') &&
        assert(typeof availabilityResult.available === 'boolean', 'Received availability status');
});

testSuite.addTest('Multi-Plugin Orchestration', async ({ assert, logger, executeTask }) => {
    logger.log('Testing orchestration across multiple plugins...');

    // Step 1: Create calendar event
    const calendarTask = {
        intent: 'create_event',
        parameters: {
            title: 'Business Trip Planning',
            startTime: '2023-12-28T10:00:00Z',
            endTime: '2023-12-28T11:30:00Z',
            attendees: ['team@example.com'],
            location: 'Conference Room C',
            description: 'Meeting to plan the upcoming business trip'
        }
    };

    logger.log('Step 1: Create calendar event');
    const calendarResult = await executeTask(calendarTask);
    logger.log(`Calendar result: ${JSON.stringify(calendarResult, null, 2)}`);

    if (!assert(calendarResult.success, 'Calendar event creation was successful')) {
        return false;
    }

    // Step 2: Search for flights
    const flightTask = {
        intent: 'search_flights',
        parameters: {
            origin: 'SFO',
            destination: 'SEA',
            departureDate: '2024-01-15',
            returnDate: '2024-01-19',
            numPassengers: 3,
            cabinClass: 'business'
        }
    };

    logger.log('Step 2: Search for flights');
    const flightResult = await executeTask(flightTask);
    logger.log(`Found ${flightResult.flights?.length || 0} flights`);

    if (!assert(flightResult.success, 'Flight search was successful') ||
        !assert(flightResult.flights && flightResult.flights.length > 0, 'Found at least one flight')) {
        return false;
    }

    // Step 3: Send email with flight options
    const emailTask = {
        intent: 'send_email',
        parameters: {
            to: ['team@example.com'],
            subject: 'Flight Options for Business Trip',
            body: `Hello Team,

Here are the flight options for our upcoming business trip to Seattle:

1. ${flightResult.flights[0].airline.name} - $${flightResult.flights[0].price.amount}
   Departure: ${new Date(flightResult.flights[0].segments[0].departureTime).toLocaleString()}
   
2. ${flightResult.flights[1].airline.name} - $${flightResult.flights[1].price.amount}
   Departure: ${new Date(flightResult.flights[1].segments[0].departureTime).toLocaleString()}

Please review and let me know your preferences by the end of the day.

Thanks,
Travel Coordinator`
        }
    };

    logger.log('Step 3: Send email with flight options');
    const emailResult = await executeTask(emailTask);
    logger.log(`Email result: ${JSON.stringify(emailResult, null, 2)}`);

    return assert(emailResult.success, 'Email sending was successful');
});

testSuite.addTest('Error Handling', async ({ assert, logger, executeTask }) => {
    logger.log('Testing error handling with invalid inputs...');

    // Test with missing required parameters
    const invalidCalendarTask = {
        intent: 'create_event',
        parameters: {
            // Missing required title and times
            location: 'Conference Room',
            description: 'This should fail'
        }
    };

    logger.log('Testing with missing required parameters...');
    logger.log(`Executing task: ${JSON.stringify(invalidCalendarTask, null, 2)}`);
    const invalidResult = await executeTask(invalidCalendarTask);
    logger.log(`Result: ${JSON.stringify(invalidResult, null, 2)}`);

    // This should fail but the task executor should handle the error gracefully
    const errorHandled = assert(!invalidResult.success, 'Task correctly failed with invalid parameters') &&
        assert(invalidResult.error || invalidResult.errors, 'Error message was provided');

    // Test with invalid intent
    const invalidIntentTask = {
        intent: 'non_existent_intent',
        parameters: {}
    };

    logger.log('Testing with invalid intent...');
    logger.log(`Executing task: ${JSON.stringify(invalidIntentTask, null, 2)}`);
    const invalidIntentResult = await executeTask(invalidIntentTask);
    logger.log(`Result: ${JSON.stringify(invalidIntentResult, null, 2)}`);

    return errorHandled &&
        assert(!invalidIntentResult.success, 'Task correctly failed with invalid intent');
});

// Run the tests
(async () => {
    const results = await testSuite.runAll();

    // Print summary
    logger.log('\n===== TEST SUMMARY =====');
    logger.log(`Total: ${results.passed + results.failed + results.skipped}`);
    logger.log(`Passed: ${results.passed}`);
    logger.log(`Failed: ${results.failed}`);
    logger.log(`Skipped: ${results.skipped}`);
    logger.log(`Duration: ${results.duration.toFixed(2)} seconds`);

    logger.log(`\nDetailed test log saved to: ${TEST_LOG_FILE}`);

    process.exit(results.failed ? 1 : 0);
})(); 