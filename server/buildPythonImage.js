/**
 * Script to build the Python Docker image for task isolation
 * Run with: node buildPythonImage.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify exec for easier use
const execPromise = promisify(exec);

// Constants
const PYTHON_DOCKER_IMAGE = 'ai-task-python-agent';
const PYTHON_AGENT_DIR = path.join(__dirname, 'python-agent');

/**
 * Build the Python Docker image
 */
async function buildPythonImage() {
    try {
        console.log(`Building Docker image: ${PYTHON_DOCKER_IMAGE}`);
        console.log(`Using Python agent directory: ${PYTHON_AGENT_DIR}`);

        // Build the image
        const { stdout, stderr } = await execPromise(`docker build -t ${PYTHON_DOCKER_IMAGE} ${PYTHON_AGENT_DIR}`);

        // Print results
        if (stdout) {
            console.log('Build output:');
            console.log(stdout);
        }

        if (stderr) {
            console.warn('Build warnings/errors:');
            console.warn(stderr);
        }

        console.log(`Docker image ${PYTHON_DOCKER_IMAGE} built successfully`);

        // Verify the image
        const { stdout: verifyStdout } = await execPromise(`docker image ls ${PYTHON_DOCKER_IMAGE}`);
        console.log('Image verification:');
        console.log(verifyStdout);
    } catch (error) {
        console.error('Error building Python Docker image:', error);
        process.exit(1);
    }
}

// Run the build
buildPythonImage().catch(console.error); 