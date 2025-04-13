/**
 * Test script for the visible automation endpoint
 * Run with: node testVisibleEndpoint.js
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/visible-automation/execute';

// Sample automation task
const testTask = {
    task: {
        url: 'https://www.google.com',
        actions: [
            { type: 'wait', milliseconds: 1000 },
            { type: 'screenshot', name: 'google-home' },
            { type: 'type', selector: 'input[name="q"]', text: 'Visible browser automation test' },
            { type: 'wait', milliseconds: 500 },
            { type: 'click', selector: 'input[name="btnK"]' },
            { type: 'wait', milliseconds: 2000 },
            { type: 'screenshot', name: 'search-results' }
        ]
    }
};

/**
 * Call the visible automation endpoint
 */
async function testVisibleAutomation() {
    console.log('=== Testing Visible Automation API Endpoint ===');
    console.log(`API URL: ${API_URL}`);
    console.log('Sending task:', JSON.stringify(testTask, null, 2));

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testTask)
        });

        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        console.log('\nAPI Response:');
        console.log(`Success: ${result.success}`);
        console.log(`Action Count: ${result.stats?.actionCount}`);
        console.log(`Duration: ${result.stats?.duration}ms`);

        if (result.screenshotUrls && result.screenshotUrls.length > 0) {
            console.log('\nScreenshot URLs:');
            result.screenshotUrls.forEach(url => {
                console.log(`- http://localhost:5000${url}`);
            });
        }

        console.log('\nLogs:');
        result.logs?.forEach(log => {
            console.log(`- ${log}`);
        });

        if (result.errors && result.errors.length > 0) {
            console.log('\nErrors:');
            result.errors.forEach(error => {
                console.log(`- ${error}`);
            });
        }
    } catch (error) {
        console.error('Error calling API:', error);
    }
}

// Run the test
testVisibleAutomation()
    .then(() => console.log('Test completed'))
    .catch(err => console.error('Test failed:', err)); 