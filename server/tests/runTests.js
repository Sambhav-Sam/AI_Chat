/**
 * Test Runner
 * 
 * This script runs all available test files and generates an HTML report
 * of the results for easier visualization.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TEST_DIR = __dirname;
const REPORT_DIR = path.join(__dirname, '../test_reports');
const TEST_FILES = [
    'integrationTests.js'
];

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Results storage
const testResults = {
    startTime: new Date(),
    endTime: null,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    files: []
};

/**
 * Run a test file and collect results
 * @param {string} testFile - Test file path
 * @returns {Promise<Object>} Test results
 */
function runTestFile(testFile) {
    return new Promise((resolve, reject) => {
        console.log(`\n===== RUNNING TEST FILE: ${testFile} =====`);

        const testPath = path.join(TEST_DIR, testFile);
        const process = spawn('node', [testPath], { stdio: ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            console.log(output.trim());
        });

        process.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            console.error(output.trim());
        });

        process.on('close', (code) => {
            console.log(`\nTest file ${testFile} completed with exit code: ${code}`);

            // Parse results from stdout
            const results = {
                file: testFile,
                success: code === 0,
                exitCode: code,
                stdout,
                stderr,
                passedTests: (stdout.match(/✅ TEST PASSED/g) || []).length,
                failedTests: (stdout.match(/❌ TEST FAILED/g) || []).length,
                skippedTests: (stdout.match(/SKIPPING TEST/g) || []).length,
                tests: []
            };

            // Extract individual test results
            const testLines = stdout.split('\n').filter(line =>
                line.includes('RUNNING TEST:') ||
                line.includes('TEST PASSED:') ||
                line.includes('TEST FAILED:') ||
                line.includes('SKIPPING TEST:'));

            let currentTest = null;

            for (const line of testLines) {
                if (line.includes('RUNNING TEST:')) {
                    currentTest = {
                        name: line.split('RUNNING TEST:')[1].trim(),
                        status: 'running',
                        assertions: []
                    };
                    results.tests.push(currentTest);
                } else if (line.includes('TEST PASSED:') && currentTest) {
                    currentTest.status = 'passed';
                } else if (line.includes('TEST FAILED:') && currentTest) {
                    currentTest.status = 'failed';
                } else if (line.includes('SKIPPING TEST:')) {
                    results.tests.push({
                        name: line.split('SKIPPING TEST:')[1].split('(')[0].trim(),
                        status: 'skipped',
                        assertions: []
                    });
                }
            }

            // Extract assertions
            const assertionLines = stdout.split('\n').filter(line =>
                line.includes('ASSERT PASSED:') ||
                line.includes('ASSERT FAILED:'));

            for (const line of assertionLines) {
                if (!currentTest) continue;

                if (line.includes('ASSERT PASSED:')) {
                    currentTest.assertions.push({
                        message: line.split('ASSERT PASSED:')[1].trim(),
                        passed: true
                    });
                } else if (line.includes('ASSERT FAILED:')) {
                    currentTest.assertions.push({
                        message: line.split('ASSERT FAILED:')[1].trim(),
                        passed: false
                    });
                }
            }

            resolve(results);
        });

        process.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Run all test files
 * @returns {Promise<void>}
 */
async function runAllTests() {
    console.log('===== STARTING TEST RUNNER =====');
    console.log(`Found ${TEST_FILES.length} test files to run`);

    for (const testFile of TEST_FILES) {
        try {
            const results = await runTestFile(testFile);
            testResults.files.push(results);

            // Update summary
            testResults.totalTests += results.passedTests + results.failedTests + results.skippedTests;
            testResults.passedTests += results.passedTests;
            testResults.failedTests += results.failedTests;
            testResults.skippedTests += results.skippedTests;
        } catch (error) {
            console.error(`Error running test file ${testFile}:`, error);
            testResults.files.push({
                file: testFile,
                success: false,
                error: error.message
            });
        }
    }

    testResults.endTime = new Date();

    // Generate report
    generateHtmlReport(testResults);

    // Print summary
    console.log('\n===== TEST RUN COMPLETED =====');
    console.log(`Duration: ${((testResults.endTime - testResults.startTime) / 1000).toFixed(2)} seconds`);
    console.log(`Total: ${testResults.totalTests}`);
    console.log(`Passed: ${testResults.passedTests}`);
    console.log(`Failed: ${testResults.failedTests}`);
    console.log(`Skipped: ${testResults.skippedTests}`);

    const reportPath = path.join(REPORT_DIR, `test_report_${testResults.startTime.toISOString().replace(/:/g, '-')}.html`);
    console.log(`\nHTML report generated at: ${reportPath}`);
}

/**
 * Generate HTML report from test results
 * @param {Object} results - Test results
 */
function generateHtmlReport(results) {
    const reportPath = path.join(REPORT_DIR, `test_report_${results.startTime.toISOString().replace(/:/g, '-')}.html`);

    // Calculate duration
    const duration = (results.endTime - results.startTime) / 1000;

    // Create HTML content
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${results.startTime.toISOString()}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        
        h1, h2, h3 {
            color: #444;
        }
        
        .summary {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 20px;
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
        }
        
        .summary-item {
            margin-right: 30px;
        }
        
        .counts {
            display: flex;
            margin-bottom: 20px;
        }
        
        .count-box {
            min-width: 120px;
            margin-right: 15px;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        
        .total {
            background-color: #e0e0e0;
        }
        
        .passed {
            background-color: #dff0d8;
            color: #3c763d;
        }
        
        .failed {
            background-color: #f2dede;
            color: #a94442;
        }
        
        .skipped {
            background-color: #fcf8e3;
            color: #8a6d3b;
        }
        
        .file-results {
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        
        .file-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            cursor: pointer;
        }
        
        .file-name {
            font-weight: bold;
        }
        
        .file-success {
            padding: 5px 10px;
            border-radius: 3px;
        }
        
        .file-content {
            display: none;
            margin-top: 10px;
        }
        
        .test-item {
            margin-bottom: 10px;
            padding: 10px;
            border-radius: T 3px;
        }
        
        .test-passed {
            background-color: #dff0d8;
        }
        
        .test-failed {
            background-color: #f2dede;
        }
        
        .test-skipped {
            background-color: #fcf8e3;
        }
        
        .assertion {
            margin: 5px 0;
            padding: 5px;
            border-radius: 3px;
        }
        
        .assertion-passed {
            background-color: #d0e9c6;
        }
        
        .assertion-failed {
            background-color: #ebcccc;
        }
        
        .toggle-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
        }
        
        .hidden {
            display: none;
        }
        
        .expanded-content {
            display: block !important;
        }
    </style>
</head>
<body>
    <h1>Test Report</h1>
    
    <div class="summary">
        <div class="summary-item">
            <strong>Start Time:</strong> ${results.startTime.toISOString()}
        </div>
        <div class="summary-item">
            <strong>End Time:</strong> ${results.endTime.toISOString()}
        </div>
        <div class="summary-item">
            <strong>Duration:</strong> ${duration.toFixed(2)} seconds
        </div>
        <div class="summary-item">
            <strong>Files:</strong> ${results.files.length}
        </div>
    </div>
    
    <div class="counts">
        <div class="count-box total">
            <div style="font-size: 24px;">${results.totalTests}</div>
            <div>Total Tests</div>
        </div>
        <div class="count-box passed">
            <div style="font-size: 24px;">${results.passedTests}</div>
            <div>Passed</div>
        </div>
        <div class="count-box failed">
            <div style="font-size: 24px;">${results.failedTests}</div>
            <div>Failed</div>
        </div>
        <div class="count-box skipped">
            <div style="font-size: 24px;">${results.skippedTests}</div>
            <div>Skipped</div>
        </div>
    </div>
    
    <h2>Test Files</h2>
    
    ${results.files.map(file => `
    <div class="file-results">
        <div class="file-header" onclick="toggleFileContent('${file.file.replace(/\./g, '_')}')">
            <span class="file-name">${file.file}</span>
            <span class="file-success ${file.success ? 'passed' : 'failed'}">${file.success ? 'PASSED' : 'FAILED'}</span>
            <button class="toggle-btn" id="toggle-btn-${file.file.replace(/\./g, '_')}">+</button>
        </div>
        
        <div class="counts">
            <div class="count-box passed">
                <div>${file.passedTests || 0}</div>
                <div>Passed</div>
            </div>
            <div class="count-box failed">
                <div>${file.failedTests || 0}</div>
                <div>Failed</div>
            </div>
            <div class="count-box skipped">
                <div>${file.skippedTests || 0}</div>
                <div>Skipped</div>
            </div>
        </div>
        
        <div class="file-content" id="file-content-${file.file.replace(/\./g, '_')}">
            ${file.tests ? file.tests.map(test => `
            <div class="test-item test-${test.status}">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${test.name}</strong>
                    <span>${test.status.toUpperCase()}</span>
                </div>
                
                ${test.assertions && test.assertions.length ? `
                <div style="margin-top: 10px;">
                    <strong>Assertions:</strong>
                    ${test.assertions.map(assertion => `
                    <div class="assertion assertion-${assertion.passed ? 'passed' : 'failed'}">
                        ${assertion.message}
                    </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            `).join('') : `
            <div>No test details available</div>
            `}
            
            ${file.error ? `
            <div class="test-item test-failed">
                <strong>Error:</strong> ${file.error}
            </div>
            ` : ''}
        </div>
    </div>
    `).join('')}
    
    <script>
        function toggleFileContent(fileId) {
            const content = document.getElementById('file-content-' + fileId);
            const btn = document.getElementById('toggle-btn-' + fileId);
            
            if (content.classList.contains('expanded-content')) {
                content.classList.remove('expanded-content');
                btn.textContent = '+';
            } else {
                content.classList.add('expanded-content');
                btn.textContent = '-';
            }
        }
    </script>
</body>
</html>`;

    // Write HTML to file
    fs.writeFileSync(reportPath, html);
}

// Run all tests
runAllTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
}); 