/**
 * Task Isolation Manager
 * Executes tasks in isolated environments for security and resource management
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Promisify exec for easier use
const execPromise = promisify(exec);

// Constants
const TASK_TIMEOUT = 30000; // 30 seconds
const PYTHON_DOCKER_IMAGE = 'ai-task-python-agent';
const TASK_OUTPUT_DIR = path.join(__dirname, 'task_outputs');

// Ensure task output directory exists
if (!fs.existsSync(TASK_OUTPUT_DIR)) {
    fs.mkdirSync(TASK_OUTPUT_DIR, { recursive: true });
}

/**
 * Run a JavaScript task in an isolated subprocess
 * @param {Object} task - The task object to execute
 * @param {string} taskModulePath - Path to the task module JS file
 * @returns {Promise<Object>} Results of the task execution
 */
export async function runJsTaskIsolated(task, taskModulePath) {
    return new Promise((resolve, reject) => {
        // Generate a unique ID for this task execution
        const taskId = crypto.randomUUID();
        const outputFile = path.join(TASK_OUTPUT_DIR, `${taskId}.json`);

        // Create a temporary runner script that will execute our task module
        const tempRunnerPath = path.join(TASK_OUTPUT_DIR, `${taskId}_runner.js`);

        // Write the runner script
        const runnerScript = `
            import { execute } from '${taskModulePath}';
            import fs from 'fs';
            
            async function runTask() {
                try {
                    const task = ${JSON.stringify(task)};
                    const result = await execute(task.parameters);
                    fs.writeFileSync('${outputFile}', JSON.stringify(result));
                    process.exit(0);
                } catch (error) {
                    fs.writeFileSync('${outputFile}', JSON.stringify({
                        success: false,
                        errors: [error.message || "Unknown error"],
                        screenshots: []
                    }));
                    process.exit(1);
                }
            }
            
            runTask().catch(error => {
                console.error('Runner error:', error);
                process.exit(1);
            });
        `;

        fs.writeFileSync(tempRunnerPath, runnerScript);

        // Spawn a new Node.js process to run the task
        console.log(`Running JS task in isolated process: ${taskId}`);
        const childProcess = spawn('node', [tempRunnerPath], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdoutData = '';
        let stderrData = '';

        // Collect stdout
        childProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        // Collect stderr
        childProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        // Set a timeout to kill the process if it runs too long
        const timeout = setTimeout(() => {
            try {
                process.kill(childProcess.pid, 'SIGTERM');
            } catch (error) {
                console.error(`Error killing task ${taskId}:`, error);
            }

            reject(new Error(`Task execution timed out after ${TASK_TIMEOUT}ms`));
        }, TASK_TIMEOUT);

        // Handle process exit
        childProcess.on('exit', (code) => {
            clearTimeout(timeout);

            try {
                // Check if output file exists
                if (fs.existsSync(outputFile)) {
                    const resultData = fs.readFileSync(outputFile, 'utf8');
                    const result = JSON.parse(resultData);

                    // Add logs to the result
                    result.logs = {
                        stdout: stdoutData,
                        stderr: stderrData
                    };

                    // Clean up temporary files
                    try {
                        fs.unlinkSync(tempRunnerPath);
                        fs.unlinkSync(outputFile);
                    } catch (cleanupError) {
                        console.warn(`Could not clean up temp files for task ${taskId}:`, cleanupError);
                    }

                    resolve(result);
                } else {
                    reject(new Error(`Task execution failed with code ${code}: ${stderrData}`));
                }
            } catch (error) {
                reject(new Error(`Error processing task result: ${error.message}`));
            }
        });

        // Handle process error
        childProcess.on('error', (error) => {
            clearTimeout(timeout);
            reject(new Error(`Failed to start task process: ${error.message}`));
        });
    });
}

/**
 * Run a Python task in an isolated Docker container
 * @param {Object} task - The task object to execute
 * @returns {Promise<Object>} Results of the task execution
 */
export async function runPythonTaskIsolated(task) {
    return new Promise(async (resolve, reject) => {
        try {
            // Generate a unique ID for this task execution
            const taskId = crypto.randomUUID();
            const inputFile = path.join(TASK_OUTPUT_DIR, `${taskId}_input.json`);
            const outputFile = path.join(TASK_OUTPUT_DIR, `${taskId}_output.json`);

            // Write task to input file
            fs.writeFileSync(inputFile, JSON.stringify(task));

            // Ensure Docker image is built
            try {
                await execPromise('docker image inspect ' + PYTHON_DOCKER_IMAGE);
                console.log(`Using existing Docker image: ${PYTHON_DOCKER_IMAGE}`);
            } catch (err) {
                console.log(`Building Docker image: ${PYTHON_DOCKER_IMAGE}`);
                await execPromise(`docker build -t ${PYTHON_DOCKER_IMAGE} ./python-agent`);
            }

            // Run the task in a Docker container
            console.log(`Running Python task in Docker container: ${taskId}`);

            // Map the input and output files to the container
            const dockerCommand = `docker run --rm \
                -v "${inputFile}:/app/task_input.json" \
                -v "${outputFile}:/app/task_output.json" \
                --name task-${taskId} \
                ${PYTHON_DOCKER_IMAGE} \
                python -c "
import json
import sys
import task_runner

# Load task from input file
with open('/app/task_input.json', 'r') as f:
    task = json.load(f)

# Execute task
try:
    result = task_runner.execute_task(task)
    # Write result to output file
    with open('/app/task_output.json', 'w') as f:
        json.dump(result, f)
    sys.exit(0)
except Exception as e:
    error_result = {'success': False, 'errors': [str(e)], 'screenshots': []}
    with open('/app/task_output.json', 'w') as f:
        json.dump(error_result, f)
    sys.exit(1)
"`;

            // Execute Docker command with timeout
            const { stdout, stderr } = await execPromise(dockerCommand, { timeout: TASK_TIMEOUT });

            // Check if output file exists
            if (fs.existsSync(outputFile)) {
                const resultData = fs.readFileSync(outputFile, 'utf8');
                const result = JSON.parse(resultData);

                // Add logs to the result
                result.logs = {
                    stdout: stdout,
                    stderr: stderr
                };

                // Clean up temporary files
                try {
                    fs.unlinkSync(inputFile);
                    fs.unlinkSync(outputFile);
                } catch (cleanupError) {
                    console.warn(`Could not clean up temp files for task ${taskId}:`, cleanupError);
                }

                resolve(result);
            } else {
                reject(new Error(`Python task execution failed: ${stderr}`));
            }
        } catch (error) {
            reject(new Error(`Error running Python task: ${error.message}`));
        }
    });
}

/**
 * Execute a task in an isolated environment based on task type
 * @param {Object} task - The task object to execute
 * @returns {Promise<Object>} Results of the task execution
 */
export async function executeTaskIsolated(task) {
    if (!task || !task.intent) {
        throw new Error('Invalid task object or missing intent field');
    }

    const intent = task.intent.toLowerCase();

    // Check if this is a Python task
    if (intent.startsWith('py_') || task.executor === 'python') {
        return runPythonTaskIsolated(task);
    }

    // Otherwise, treat as a JavaScript task
    const taskModulePath = path.resolve(__dirname, 'tasks', `${intent}.js`);
    if (!fs.existsSync(taskModulePath)) {
        console.log(`No specific module found for intent '${intent}', using default`);
        return runJsTaskIsolated(task, path.resolve(__dirname, 'tasks', 'default.js'));
    }

    return runJsTaskIsolated(task, taskModulePath);
} 