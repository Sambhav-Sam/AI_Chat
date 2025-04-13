/**
 * Agent Controller
 * Manages the agent's reasoning and browser control actions
 */

import BrowserController from './browserController.js';
import { createReasoningChain } from './reasoningEngine.js';
import mongoose from 'mongoose';
import TaskLog from '../models/TaskLog.js';

class AgentController {
    constructor(io) {
        this.browserController = new BrowserController(io);
        this.io = io;
        this.isRunning = false;
        this.isPaused = false;
        this.manualControl = false;
        this.currentTask = null;
        this.reasoningSteps = [];
        this.taskId = null;
    }

    /**
     * Initialize the agent
     */
    async initialize() {
        try {
            // Initialize the browser controller
            const browserInitialized = await this.browserController.initialize();
            if (!browserInitialized) {
                throw new Error('Failed to initialize browser controller');
            }

            this.isRunning = true;

            // Set up Socket.IO event handlers
            this.setupSocketHandlers();

            return true;
        } catch (error) {
            console.error('Failed to initialize agent:', error);
            return false;
        }
    }

    /**
     * Set up Socket.IO event handlers
     */
    setupSocketHandlers() {
        // Handle client commands
        this.io.on('connection', (socket) => {
            console.log('Client connected to agent controller');

            // Send current state to new clients
            this.sendStatusUpdate();

            // Execute a task from the user
            socket.on('agent:execute', async (data) => {
                try {
                    const { prompt, options } = data;
                    await this.executeTask(prompt, options);
                } catch (error) {
                    console.error('Error executing task:', error);
                    this.io.emit('agent:error', { message: error.message });
                }
            });

            // Pause the agent
            socket.on('agent:pause', () => {
                this.pause();
            });

            // Resume the agent
            socket.on('agent:resume', () => {
                this.resume();
            });

            // Take manual control
            socket.on('agent:manual', () => {
                this.enableManualControl();
            });

            // Return to agent control
            socket.on('agent:auto', () => {
                this.disableManualControl();
            });

            // Handle manual browser commands
            socket.on('browser:command', async (data) => {
                if (!this.manualControl) {
                    return this.io.emit('agent:error', { message: 'Manual control is not enabled' });
                }

                await this.executeManualCommand(data);
            });

            // Undo last action
            socket.on('agent:undo', async () => {
                await this.undoLastAction();
            });

            // Disconnect event
            socket.on('disconnect', () => {
                console.log('Client disconnected from agent controller');
            });
        });
    }

    /**
     * Execute a task based on user prompt
     */
    async executeTask(prompt, options = {}) {
        if (!this.isRunning) {
            throw new Error('Agent is not initialized');
        }

        if (this.isPaused) {
            this.resume();
        }

        // Disable manual control when executing a task
        this.manualControl = false;

        try {
            // Create a new task ID and log
            this.taskId = new mongoose.Types.ObjectId();
            this.currentTask = { prompt, options, startTime: Date.now() };
            this.reasoningSteps = [];

            // Log task start
            await this.logTaskStep('task_start', { prompt, options });

            // Emit task start event
            this.io.emit('agent:task', {
                status: 'start',
                prompt,
                taskId: this.taskId.toString()
            });

            // Generate reasoning chain
            const reasoningChain = await createReasoningChain(prompt);

            // Execute each step in the reasoning chain
            for (const [index, step] of reasoningChain.entries()) {
                if (this.isPaused) {
                    // Wait until resumed
                    await new Promise(resolve => {
                        const checkInterval = setInterval(() => {
                            if (!this.isPaused) {
                                clearInterval(checkInterval);
                                resolve();
                            }
                        }, 100);
                    });
                }

                if (!this.isRunning) {
                    break; // Agent was stopped
                }

                // Add step to reasoning steps
                this.reasoningSteps.push(step);

                // Emit reasoning step
                this.io.emit('agent:reasoning', {
                    step: index + 1,
                    total: reasoningChain.length,
                    reasoning: step.reasoning,
                    action: step.action
                });

                // Log reasoning step
                await this.logTaskStep('reasoning', {
                    step: index + 1,
                    reasoning: step.reasoning,
                    action: step.action
                });

                // Execute the action for this step
                if (step.action) {
                    await this.executeAction(step.action);
                }

                // Small delay between steps for visual clarity
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Mark task as complete
            this.currentTask.endTime = Date.now();
            this.currentTask.duration = this.currentTask.endTime - this.currentTask.startTime;

            // Log task completion
            await this.logTaskStep('task_complete', {
                duration: this.currentTask.duration,
                steps: this.reasoningSteps.length
            });

            // Emit task complete event
            this.io.emit('agent:task', {
                status: 'complete',
                taskId: this.taskId.toString(),
                duration: this.currentTask.duration,
                stepsExecuted: this.reasoningSteps.length
            });

            return true;
        } catch (error) {
            console.error('Error executing task:', error);

            // Log task error
            await this.logTaskStep('task_error', { error: error.message });

            // Emit task error event
            this.io.emit('agent:task', {
                status: 'error',
                error: error.message,
                taskId: this.taskId?.toString()
            });

            return false;
        }
    }

    /**
     * Execute a browser action
     */
    async executeAction(action) {
        if (!action || !action.type) {
            throw new Error('Invalid action: missing type');
        }

        // Log action start
        await this.logTaskStep('action_start', { action });

        try {
            switch (action.type) {
                case 'navigate':
                    await this.browserController.navigate(action.url);
                    break;

                case 'click':
                    await this.browserController.click(action.selector, action.description);
                    break;

                case 'type':
                    await this.browserController.type(action.selector, action.text, action.description);
                    break;

                case 'wait':
                    await new Promise(resolve => setTimeout(resolve, action.duration || 1000));
                    this.io.emit('agent:action', {
                        action: 'Waiting',
                        duration: action.duration || 1000,
                        status: 'complete'
                    });
                    break;

                default:
                    throw new Error(`Unsupported action type: ${action.type}`);
            }

            // Log action completion
            await this.logTaskStep('action_complete', { action, success: true });

            return true;
        } catch (error) {
            console.error(`Error executing action ${action.type}:`, error);

            // Log action error
            await this.logTaskStep('action_error', { action, error: error.message });

            return false;
        }
    }

    /**
     * Execute a manual command from the user
     */
    async executeManualCommand(command) {
        if (!this.manualControl) {
            throw new Error('Manual control is not enabled');
        }

        try {
            switch (command.type) {
                case 'navigate':
                    await this.browserController.navigate(command.url);
                    break;

                case 'click':
                    await this.browserController.click(command.selector, command.description);
                    break;

                case 'type':
                    await this.browserController.type(command.selector, command.text, command.description);
                    break;

                case 'executeScript':
                    await this.browserController.executeScript(command.script);
                    break;

                default:
                    throw new Error(`Unsupported command type: ${command.type}`);
            }

            return true;
        } catch (error) {
            console.error(`Error executing manual command ${command.type}:`, error);
            this.io.emit('agent:error', { message: error.message });
            return false;
        }
    }

    /**
     * Log a task step to MongoDB
     */
    async logTaskStep(stepType, data) {
        try {
            if (!this.taskId) return;

            const logEntry = new TaskLog({
                taskId: this.taskId,
                prompt: this.currentTask?.prompt,
                timestamp: Date.now(),
                stepType,
                data
            });

            await logEntry.save();
        } catch (error) {
            console.error('Error logging task step:', error);
        }
    }

    /**
     * Undo the last action
     */
    async undoLastAction() {
        try {
            await this.browserController.undoLastAction();
            return true;
        } catch (error) {
            console.error('Error undoing last action:', error);
            this.io.emit('agent:error', { message: error.message });
            return false;
        }
    }

    /**
     * Pause the agent
     */
    pause() {
        this.isPaused = true;
        this.browserController.pause();
        this.io.emit('agent:status', { status: 'paused' });
        return true;
    }

    /**
     * Resume the agent
     */
    resume() {
        this.isPaused = false;
        this.browserController.resume();
        this.io.emit('agent:status', { status: 'running' });
        return true;
    }

    /**
     * Enable manual control mode
     */
    enableManualControl() {
        this.manualControl = true;
        this.pause(); // Pause automatic execution
        this.io.emit('agent:control', { mode: 'manual' });
        return true;
    }

    /**
     * Disable manual control mode
     */
    disableManualControl() {
        this.manualControl = false;
        this.io.emit('agent:control', { mode: 'agent' });
        return true;
    }

    /**
     * Send current status to clients
     */
    sendStatusUpdate() {
        this.io.emit('agent:status', {
            status: this.isPaused ? 'paused' : 'running',
            control: this.manualControl ? 'manual' : 'agent',
            isTaskRunning: !!this.currentTask
        });

        // If there's a current task, send task info
        if (this.currentTask) {
            this.io.emit('agent:task', {
                status: 'running',
                prompt: this.currentTask.prompt,
                taskId: this.taskId?.toString(),
                stepsExecuted: this.reasoningSteps.length
            });
        }
    }

    /**
     * Clean up resources
     */
    async close() {
        this.isRunning = false;

        // Close browser controller
        await this.browserController.close();

        return true;
    }
}

export default AgentController; 