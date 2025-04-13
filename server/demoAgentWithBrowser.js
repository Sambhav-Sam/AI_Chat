/**
 * Demo Agent with Browser Integration
 * Integrates remote browser capabilities into the demo system
 */

import AgentController from './remoteAgent/agentController.js';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DemoAgentWithBrowser {
    constructor(io) {
        this.io = io;
        this.remoteAgentController = null;
        this.isRemoteAgentActive = false;
    }

    /**
     * Initialize the demo agent
     */
    async initialize() {
        try {
            // Connect to MongoDB if not already connected
            if (mongoose.connection.readyState === 0) {
                await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/demo-agent');
                console.log('MongoDB connected for demo agent');
            }

            // Set up event handlers
            this.setupEventHandlers();

            return true;
        } catch (error) {
            console.error('Failed to initialize demo agent:', error);
            return false;
        }
    }

    /**
     * Set up WebSocket event handlers
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Client connected to demo agent');

            // Handle task execution request
            socket.on('demo:execute-task', async (data) => {
                try {
                    const { prompt, options } = data;
                    await this.executeTask(prompt, options);
                } catch (error) {
                    console.error('Error executing demo task:', error);
                    this.io.emit('demo:error', { message: error.message });
                }
            });

            // Handle explicit browser task execution
            socket.on('demo:execute-browser-task', async (data) => {
                try {
                    const { prompt, options } = data;
                    await this.executeBrowserTask(prompt, options);
                } catch (error) {
                    console.error('Error executing browser task:', error);
                    this.io.emit('demo:error', { message: error.message });
                }
            });

            // Handle demo task completion
            socket.on('demo:task-complete', () => {
                this.cleanupRemoteAgent();
            });

            // Disconnect event
            socket.on('disconnect', () => {
                console.log('Client disconnected from demo agent');
            });
        });
    }

    /**
     * Execute a task based on type
     */
    async executeTask(prompt, options = {}) {
        // Analyze prompt to determine if browser automation is needed
        const needsBrowser = this.taskNeedsBrowser(prompt);

        if (needsBrowser) {
            // Execute as browser task
            await this.executeBrowserTask(prompt, options);
        } else {
            // Execute as regular demo task
            await this.executeRegularTask(prompt, options);
        }
    }

    /**
     * Determine if a task requires browser automation
     */
    taskNeedsBrowser(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        const browserKeywords = [
            'search', 'browse', 'visit', 'go to', 'open website', 'navigate',
            'click', 'fill', 'form', 'login', 'book', 'reservation', 'buy',
            'purchase', 'check', 'lookup', 'find on'
        ];

        return browserKeywords.some(keyword => lowerPrompt.includes(keyword));
    }

    /**
     * Execute a browser automation task
     */
    async executeBrowserTask(prompt, options = {}) {
        try {
            // Initialize remote agent controller if needed
            if (!this.remoteAgentController) {
                this.remoteAgentController = new AgentController(this.io);
                const initialized = await this.remoteAgentController.initialize();

                if (!initialized) {
                    throw new Error('Failed to initialize remote agent controller');
                }

                this.isRemoteAgentActive = true;
            }

            // Emit event to shift UI for browser view
            this.io.emit('demo:show-browser', {
                prompt,
                message: 'Starting browser automation task...'
            });

            // Execute the task with the remote agent
            const result = await this.remoteAgentController.executeTask(prompt, options);

            return result;
        } catch (error) {
            console.error('Error executing browser task:', error);

            // Cleanup on error
            this.cleanupRemoteAgent();

            // Emit error event
            this.io.emit('demo:error', { message: error.message });

            throw error;
        }
    }

    /**
     * Execute a regular demo task (non-browser)
     */
    async executeRegularTask(prompt, options = {}) {
        // Implement regular task execution here
        // This would be your existing demo task execution logic

        this.io.emit('demo:task-status', {
            status: 'processing',
            message: 'Executing regular demo task...'
        });

        // Simulate task processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        this.io.emit('demo:task-status', {
            status: 'complete',
            message: 'Regular task completed',
            result: {
                prompt,
                executionTime: '2s',
                response: `Executed task: ${prompt}`
            }
        });

        return true;
    }

    /**
     * Clean up remote agent resources
     */
    async cleanupRemoteAgent() {
        if (this.remoteAgentController) {
            await this.remoteAgentController.close();
            this.remoteAgentController = null;
            this.isRemoteAgentActive = false;

            // Emit event to restore regular UI
            this.io.emit('demo:hide-browser', {
                message: 'Browser task completed'
            });
        }
    }

    /**
     * Close and clean up resources
     */
    async close() {
        await this.cleanupRemoteAgent();

        return true;
    }
}

export default DemoAgentWithBrowser; 