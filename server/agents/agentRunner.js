/**
 * Agent Runner
 * Orchestrates multiple specialized agents to work together on complex tasks
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { FlightBookingAgent } from './flightBookingAgent.js';
import { CalendarAgent } from './calendarAgent.js';
import { CommunicationAgent } from './communicationAgent.js';

dotenv.config();

// Critical intents that require user confirmation
const CRITICAL_INTENTS = [
    'make_payment',
    'delete_data',
    'send_email',
    'submit_form',
    'purchase',
    'modify_permissions',
    'execute_code',
    'install_software'
];

// Restricted actions/domains that are blocked unless override is provided
const RESTRICTED_DOMAINS = [
    'admin_access',
    'system_modification',
    'social_media_posting',
    'data_deletion',
    'cryptocurrency_transfer',
    'external_api_access',
    'banking_operations',
    'confidential_data_access'
];

export class AgentRunner {
    /**
     * Constructor for AgentRunner
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = options;
        this.model = options.model || 'gpt-4o';
        this.mockMode = options.mockMode || !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here';
        this.safetyOverrides = options.safetyOverrides || {};

        if (!this.mockMode) {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY environment variable is required');
            }

            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
        } else {
            console.log('⚠️ Running AgentRunner in mock mode. No real API calls will be made to OpenAI.');
        }

        // Initialize available agents
        this.agents = this.initializeAgents();

        // Task execution history
        this.history = [];
    }

    /**
     * Initialize available specialized agents
     * @returns {Object} Map of agent instances by name
     */
    initializeAgents() {
        return {
            flightBooking: new FlightBookingAgent(),
            calendar: new CalendarAgent(),
            communication: new CommunicationAgent(),
            // Add aliases for compatibility
            FlightBookingAgent: new FlightBookingAgent(),
            CalendarAgent: new CalendarAgent(),
            CommunicationAgent: new CommunicationAgent()
        };
    }

    /**
     * Execute a multi-agent task based on high-level instruction
     * @param {string} instruction - High-level instruction
     * @param {Object} options - Execution options including safety overrides
     * @returns {Promise<Object>} Result of task execution
     */
    async execute(instruction, options = {}) {
        console.log('Executing instruction:', instruction);

        // Merge execution options with instance options
        const execOptions = {
            ...this.options,
            ...options,
            safetyOverrides: {
                ...this.safetyOverrides,
                ...(options.safetyOverrides || {})
            }
        };

        try {
            // 1. Parse the instruction and plan subtasks
            const plan = await this.planSubtasks(instruction);

            // 2. Apply safety guardrails
            const { approvedTasks, blockedTasks, tasksNeedingConfirmation } =
                this.applySafetyGuardrails(plan, execOptions.safetyOverrides);

            // Handle blocked tasks
            if (blockedTasks.length > 0) {
                console.log(`⛔ Blocked ${blockedTasks.length} tasks due to safety guardrails`);

                // If all tasks are blocked, return early
                if (approvedTasks.length === 0 && tasksNeedingConfirmation.length === 0) {
                    return {
                        success: false,
                        error: "All tasks were blocked due to safety guardrails",
                        blockedTasks,
                        reason: "safety_violation"
                    };
                }
            }

            // Handle tasks needing confirmation
            if (tasksNeedingConfirmation.length > 0) {
                console.log(`⚠️ ${tasksNeedingConfirmation.length} tasks require user confirmation`);

                // If confirmation callback is provided, use it
                if (execOptions.confirmationCallback && typeof execOptions.confirmationCallback === 'function') {
                    const confirmedTaskIds = await execOptions.confirmationCallback(tasksNeedingConfirmation);

                    // Add confirmed tasks to approved tasks
                    if (Array.isArray(confirmedTaskIds) && confirmedTaskIds.length > 0) {
                        const confirmedTasks = tasksNeedingConfirmation
                            .filter(task => confirmedTaskIds.includes(task.id));
                        approvedTasks.push(...confirmedTasks);
                    }
                } else {
                    // No confirmation callback, return needing confirmation
                    return {
                        success: false,
                        error: "Tasks require user confirmation",
                        tasksNeedingConfirmation,
                        approvedTasks,
                        blockedTasks,
                        reason: "confirmation_required"
                    };
                }
            }

            // Update plan with only approved tasks
            const safetyFilteredPlan = { ...plan, subtasks: approvedTasks };

            // 3. Execute each approved subtask with the appropriate agent
            const results = await this.executeSubtasks(safetyFilteredPlan);

            // Add information about blocked tasks to results
            blockedTasks.forEach(task => {
                results[task.id] = {
                    subtask: task,
                    result: {
                        success: false,
                        error: "Task blocked by safety guardrails",
                        blocked: true,
                        blockReason: task.blockReason
                    }
                };
            });

            // 4. Synthesize the final result
            const finalResult = await this.synthesizeResults(results, instruction);

            // Record this execution in history
            this.history.push({
                timestamp: new Date().toISOString(),
                instruction,
                plan,
                safetyReport: {
                    approvedTaskCount: approvedTasks.length,
                    blockedTaskCount: blockedTasks.length,
                    confirmationRequiredCount: tasksNeedingConfirmation.length
                },
                results,
                finalResult
            });

            return {
                success: true,
                plan,
                safetyReport: {
                    approvedTasks: approvedTasks.map(t => ({ id: t.id, task: t.task })),
                    blockedTasks: blockedTasks.map(t => ({ id: t.id, task: t.task, reason: t.blockReason }))
                },
                results,
                finalResult
            };
        } catch (error) {
            console.error('Error executing multi-agent task:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Plan subtasks based on a high-level instruction
     * @param {string} instruction - High-level instruction
     * @returns {Promise<Array>} Planned subtasks
     */
    async planSubtasks(instruction) {
        // Mock mode bypass
        if (this.mockMode) {
            console.log('Mock mode: Generating mock plan for:', instruction);
            return this.generateMockPlan(instruction);
        }

        // Get agent capabilities for context
        const agentCapabilities = {};
        const validAgentKeys = ['flightBooking', 'calendar', 'communication'];

        for (const [name, agent] of Object.entries(this.agents)) {
            // Only include our main agent keys
            if (validAgentKeys.includes(name)) {
                agentCapabilities[name] = {
                    name: agent.name,
                    description: agent.description,
                    capabilities: agent.getCapabilities()
                };
            }
        }

        // Define system prompt for planning
        const systemPrompt = `You are a task planner for a multi-agent system.
        Your job is to break down a high-level instruction into subtasks that can be delegated to specialized agents.
        
        Available agents and their capabilities:
        ${JSON.stringify(agentCapabilities, null, 2)}
        
        For each subtask, determine:
        1. Which agent should handle it
        2. What specific task they need to perform
        3. What parameters they need
        4. The order/dependencies between subtasks
        
        IMPORTANT: You MUST use these exact agent identifiers in your plan:
        - "flightBooking" for flight booking tasks
        - "calendar" for calendar and scheduling tasks
        - "communication" for email and communication tasks
        
        Respond in JSON format with a "subtasks" field containing an array of subtasks:
        {
            "subtasks": [
                {
                    "id": "unique_subtask_id",
                    "agent": "agentName",  // Use exact identifiers listed above
                    "task": "specific task description",
                    "parameters": {
                        "param1": "value1",
                        "param2": "value2"
                    },
                    "dependsOn": ["id_of_prerequisite_task"] or [] if no dependencies
                }
            ]
        }
        
        Ensure your plan efficiently completes the overall instruction.`;

        // Call OpenAI API to plan subtasks
        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Please create a plan for this instruction: "${instruction}"` }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
        });

        // Parse and return the subtasks
        const planData = JSON.parse(response.choices[0].message.content);

        // Normalize the plan format
        let subtasks;
        if (Array.isArray(planData)) {
            // If the response is already an array of subtasks
            subtasks = planData;
        } else if (planData.subtasks && Array.isArray(planData.subtasks)) {
            // If the response has a subtasks field with an array
            subtasks = planData.subtasks;
        } else {
            // Try to extract any array we can find
            const possibleArrays = Object.values(planData).filter(value => Array.isArray(value));
            if (possibleArrays.length > 0) {
                subtasks = possibleArrays[0];
            } else {
                // Create a default plan with one task per agent
                console.warn('Could not extract subtasks from plan, creating default plan');
                subtasks = validAgentKeys.map((agentKey, index) => ({
                    id: `task${index + 1}`,
                    agent: agentKey,
                    task: `Handle ${agentKey} aspect of "${instruction}"`,
                    parameters: {},
                    dependsOn: []
                }));
            }
        }

        // Ensure all subtasks have the required fields
        subtasks = subtasks.map((task, index) => ({
            id: task.id || `task${index + 1}`,
            agent: task.agent || 'communication',
            task: task.task || `Subtask ${index + 1}`,
            parameters: task.parameters || {},
            dependsOn: task.dependsOn || []
        }));

        // Return normalized plan
        return {
            subtasks,
            originalPlan: planData
        };
    }

    /**
     * Generate a mock plan for testing without API key
     * @param {string} instruction - The instruction to plan for
     * @returns {Object} A mock plan
     */
    generateMockPlan(instruction) {
        // Extract potential keywords from the instruction
        const hasFlightKeywords = /flight|book|travel|trip|airplane/i.test(instruction);
        const hasCalendarKeywords = /schedul|meet|appointment|calendar/i.test(instruction);
        const hasEmailKeywords = /email|draft|message|notify|send/i.test(instruction);

        // Test for intentional error trigger words for testing error handling
        const triggerError = /fail|error|break|crash/i.test(instruction);

        const subtasks = [];
        let taskId = 1;

        // Add flight-related subtasks
        if (hasFlightKeywords) {
            subtasks.push({
                id: `task${taskId++}`,
                agent: 'flightBooking',
                task: 'Flight search',
                parameters: {
                    query: instruction
                },
                dependsOn: [],
                // Add error flag for testing if trigger words are present
                shouldFail: triggerError && Math.random() < 0.7
            });

            // If we have a flight search, add a booking that depends on it
            if (subtasks.length > 0) {
                subtasks.push({
                    id: `task${taskId++}`,
                    agent: 'flightBooking',
                    task: 'Flight booking',
                    parameters: {
                        flightDetails: 'details from task1'
                    },
                    dependsOn: ['task1'],
                    // Add error flag for testing if trigger words are present
                    shouldFail: triggerError && Math.random() < 0.5
                });
            }
        }

        // Add calendar-related subtasks
        if (hasCalendarKeywords) {
            subtasks.push({
                id: `task${taskId++}`,
                agent: 'calendar',
                task: 'Calendar management',
                parameters: {
                    event: instruction
                },
                dependsOn: [],  // No dependencies to avoid deadlocks
                // Add error flag for testing if trigger words are present
                shouldFail: triggerError && Math.random() < 0.6
            });
        }

        // Add email-related subtasks
        if (hasEmailKeywords) {
            subtasks.push({
                id: `task${taskId++}`,
                agent: 'communication',
                task: 'Email drafting',
                parameters: {
                    subject: 'Re: ' + instruction,
                    body: 'Mock email body about: ' + instruction
                },
                dependsOn: [],  // No dependencies to avoid deadlocks
                // Add error flag for testing if trigger words are present
                shouldFail: triggerError && Math.random() < 0.4
            });
        }

        // If no specific keywords were found, add one task for each agent type
        if (subtasks.length === 0) {
            subtasks.push({
                id: `task${taskId++}`,
                agent: 'flightBooking',
                task: 'General flight task',
                parameters: { query: instruction },
                dependsOn: [],
                // Add error flag for testing if trigger words are present
                shouldFail: triggerError && Math.random() < 0.5
            });

            subtasks.push({
                id: `task${taskId++}`,
                agent: 'calendar',
                task: 'General calendar task',
                parameters: { event: instruction },
                dependsOn: [],
                // Add error flag for testing if trigger words are present
                shouldFail: triggerError && Math.random() < 0.5
            });

            subtasks.push({
                id: `task${taskId++}`,
                agent: 'communication',
                task: 'General communication task',
                parameters: { subject: instruction },
                dependsOn: [],
                // Add error flag for testing if trigger words are present
                shouldFail: triggerError && Math.random() < 0.5
            });
        }

        return {
            subtasks,
            originalPlan: { instruction, mockGenerated: true }
        };
    }

    /**
     * Execute subtasks with the appropriate agents
     * @param {Object} plan - The execution plan with subtasks
     * @returns {Promise<Object>} Results from all subtasks
     */
    async executeSubtasks(plan) {
        // Normalize plan structure
        let subtasks;
        if (plan.subtasks && Array.isArray(plan.subtasks)) {
            subtasks = plan.subtasks;
        } else if (Array.isArray(plan)) {
            subtasks = plan;
        } else {
            throw new Error('Invalid plan format. Expected an array of subtasks or an object with a subtasks array.');
        }

        if (!Array.isArray(subtasks) || subtasks.length === 0) {
            throw new Error('Invalid plan format. Expected a non-empty array of subtasks.');
        }

        const results = {};
        const pendingTasks = [...subtasks];
        const completedTaskIds = new Set();

        // Execute tasks in order, respecting dependencies
        while (pendingTasks.length > 0) {
            const readyTasks = pendingTasks.filter(task => {
                const dependencies = task.dependsOn || [];
                return dependencies.every(depId => completedTaskIds.has(depId));
            });

            if (readyTasks.length === 0) {
                throw new Error('Deadlock detected in task dependencies');
            }

            // Execute all ready tasks in parallel
            await Promise.all(readyTasks.map(async (subtask) => {
                try {
                    const result = await this.executeTaskWithRetryAndAnalysis(subtask);

                    results[subtask.id] = {
                        subtask,
                        result
                    };

                    completedTaskIds.add(subtask.id);

                    // Remove this task from pending
                    const index = pendingTasks.findIndex(t => t.id === subtask.id);
                    if (index !== -1) {
                        pendingTasks.splice(index, 1);
                    }
                } catch (error) {
                    console.error(`Fatal error executing subtask ${subtask.id}:`, error);
                    results[subtask.id] = {
                        subtask,
                        error: error.message,
                        status: 'failed',
                        analysisAttempted: true,
                        analysisFailed: true,
                        failureReason: 'Fatal execution error, analysis could not be performed'
                    };

                    // Mark as completed to avoid deadlock
                    completedTaskIds.add(subtask.id);

                    // Remove this task from pending
                    const index = pendingTasks.findIndex(t => t.id === subtask.id);
                    if (index !== -1) {
                        pendingTasks.splice(index, 1);
                    }
                }
            }));
        }

        return results;
    }

    /**
     * Execute a task with retry logic and error analysis using GPT-4o
     * @param {Object} subtask - The subtask to execute
     * @returns {Promise<Object>} The result of the task execution
     */
    async executeTaskWithRetryAndAnalysis(subtask) {
        const MAX_RETRIES = 2;
        let retryCount = 0;
        let lastError = null;

        // Get the agent for this subtask
        const agentName = subtask.agent;
        const agent = this.agents[agentName] ||
            this.agents[agentName.toLowerCase()] ||
            this.getAgentByName(agentName);

        if (!agent) {
            throw new Error(`Agent ${agentName} not found`);
        }

        console.log(`[${agent.name}] Executing task:`, JSON.stringify({
            task: subtask.task,
            parameters: subtask.parameters
        }, null, 2));

        // In mock mode, handle error simulation for testing
        if (this.mockMode) {
            // Check if this task should fail (for testing error handling)
            if (subtask.shouldFail) {
                // Simulate retries for testing
                while (retryCount <= MAX_RETRIES) {
                    console.log(`[${agent.name}] Mock mode: Simulating failure for task ${subtask.id}, retry ${retryCount}`);

                    // On the last retry, proceed to error analysis
                    if (retryCount === MAX_RETRIES) {
                        const mockError = new Error(`Mock execution error: Task ${subtask.id} failed after ${MAX_RETRIES} retries`);
                        const mockAnalysis = this.generateMockErrorAnalysis(subtask, agent, mockError);

                        console.log(`[${agent.name}] Mock mode: Generated error analysis for task ${subtask.id}`);

                        return {
                            success: false,
                            error: mockError.message,
                            status: 'failed',
                            retried: true,
                            retryCount: MAX_RETRIES,
                            analysis: mockAnalysis,
                            agentName: agent.name,
                            mockGenerated: true
                        };
                    }

                    retryCount++;
                    // Simulate waiting between retries
                    const backoffTime = Math.pow(2, retryCount) * 100; // shorter wait for mocks
                    console.log(`[${agent.name}] Mock mode: Waiting ${backoffTime}ms before retry ${retryCount}`);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                }
            } else {
                // Task succeeds normally
                return {
                    success: true,
                    result: this.generateMockResult(subtask, agent),
                    agentName: agent.name,
                    mockGenerated: true
                };
            }
        }

        // Real mode with retries for non-mock execution
        while (retryCount <= MAX_RETRIES) {
            try {
                if (retryCount > 0) {
                    console.log(`[${agent.name}] Retry attempt ${retryCount} for task ${subtask.id}`);
                }

                const result = await agent.execute({
                    task: subtask.task,
                    parameters: subtask.parameters
                });

                // If successful, return the result
                if (result.success) {
                    if (retryCount > 0) {
                        result.retried = true;
                        result.retryCount = retryCount;
                    }
                    return result;
                } else {
                    // Task execution returned failure status
                    throw new Error(result.error || 'Task execution failed without specific error');
                }
            } catch (error) {
                lastError = error;
                retryCount++;

                if (retryCount <= MAX_RETRIES) {
                    // Wait before retrying (exponential backoff)
                    const backoffTime = Math.pow(2, retryCount) * 500;
                    console.log(`[${agent.name}] Task ${subtask.id} failed, retrying in ${backoffTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                }
            }
        }

        // If we get here, we've exhausted all retries
        console.log(`[${agent.name}] Task ${subtask.id} failed after ${MAX_RETRIES} retries. Analyzing failure...`);

        // Analyze the failure using GPT-4o
        try {
            const analysis = await this.analyzeTaskFailure(subtask, agent, lastError);

            return {
                success: false,
                error: lastError.message,
                status: 'failed',
                retried: true,
                retryCount: MAX_RETRIES,
                analysis,
                agentName: agent.name
            };
        } catch (analysisError) {
            console.error(`[${agent.name}] Error analyzing task failure:`, analysisError);

            return {
                success: false,
                error: lastError.message,
                status: 'failed',
                retried: true,
                retryCount: MAX_RETRIES,
                analysisAttempted: true,
                analysisFailed: true,
                analysisError: analysisError.message,
                agentName: agent.name
            };
        }
    }

    /**
     * Analyze a task failure using GPT-4o
     * @param {Object} subtask - The failed subtask
     * @param {Object} agent - The agent that executed the task
     * @param {Error} error - The error that occurred
     * @returns {Promise<Object>} Analysis of the failure
     */
    async analyzeTaskFailure(subtask, agent, error) {
        if (!this.openai) {
            throw new Error('OpenAI API client not available');
        }

        console.log(`[${agent.name}] Analyzing failure of task ${subtask.id} using GPT-4o...`);

        const systemPrompt = `You are a task debugging assistant specialized in analyzing failures in automated tasks.
        You're given information about a failed task execution in a multi-agent system.
        
        Analyze the task, agent information, parameters, and error message to:
        1. Identify likely causes of the failure
        2. Suggest potential fixes
        3. Recommend next steps
        
        Respond in JSON format with:
        {
            "likelyCauses": ["cause1", "cause2", ...],
            "potentialFixes": ["fix1", "fix2", ...],
            "nextSteps": ["step1", "step2", ...],
            "explanation": "Detailed explanation of the analysis"
        }`;

        const taskInfo = {
            taskId: subtask.id,
            taskDescription: subtask.task,
            agent: {
                name: agent.name,
                description: agent.description,
                capabilities: agent.getCapabilities()
            },
            parameters: subtask.parameters,
            error: {
                message: error.message,
                stack: error.stack
            }
        };

        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analyze this failed task: ${JSON.stringify(taskInfo, null, 2)}` }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            });

            const analysisContent = response.choices[0].message.content;
            const analysis = JSON.parse(analysisContent);

            console.log(`[${agent.name}] Failure analysis for task ${subtask.id} completed`);

            return {
                ...analysis,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[${agent.name}] Error during failure analysis:`, error);
            throw new Error(`Failed to analyze task failure: ${error.message}`);
        }
    }

    /**
     * Generate a mock result for a subtask
     * @param {Object} subtask - The subtask
     * @param {Object} agent - The agent
     * @returns {Object} A mock result
     */
    generateMockResult(subtask, agent) {
        const baseResult = {
            mockGenerated: true,
            taskId: subtask.id,
            taskName: subtask.task,
            agentName: agent.name,
            timestamp: new Date().toISOString()
        };

        switch (agent.name) {
            case 'FlightBookingAgent':
                return {
                    ...baseResult,
                    parsedRequest: {
                        origin: "New York",
                        destination: "San Francisco",
                        departureDate: "2023-10-30",
                        returnDate: null,
                        passengers: 1,
                        class: "economy"
                    },
                    recommendations: [
                        "Delta Airlines DL123, departs JFK 8:00 AM, arrives SFO 11:30 AM, $450",
                        "United Airlines UA456, departs EWR 9:15 AM, arrives SFO 12:45 PM, $425",
                        "American Airlines AA789, departs LGA 10:30 AM, arrives SFO 2:00 PM, $475"
                    ]
                };

            case 'CalendarAgent':
                return {
                    ...baseResult,
                    parsedEvent: {
                        title: "Business Meeting",
                        startDateTime: "2023-10-31 14:00",
                        endDateTime: "2023-10-31 15:00",
                        participants: ["team", "manager"],
                        location: "Conference Room A"
                    },
                    suggestedTimes: [
                        "2023-10-31 14:00",
                        "2023-10-31 15:30",
                        "2023-11-01 10:00"
                    ]
                };

            case 'CommunicationAgent':
                return {
                    ...baseResult,
                    draftEmail: {
                        to: ["team@example.com"],
                        cc: ["manager@example.com"],
                        subject: "Project Update and Meeting Notification",
                        greeting: "Hi Team,",
                        body: "I hope this email finds you well. I wanted to inform you about the upcoming project deadlines and schedule a meeting to discuss our progress.",
                        closing: "Best regards,\nYour Name",
                        tone: "professional"
                    }
                };

            default:
                return {
                    ...baseResult,
                    message: "Mock result for task " + subtask.task
                };
        }
    }

    /**
     * Synthesize final result from all subtask results
     * @param {Object} results - Results from all subtasks
     * @param {string} originalInstruction - The original high-level instruction
     * @returns {Promise<Object>} Synthesized final result
     */
    async synthesizeResults(results, originalInstruction) {
        // Mock mode bypass
        if (this.mockMode) {
            console.log('Mock mode: Generating mock synthesis for results');
            return this.generateMockSynthesis(results, originalInstruction);
        }

        // Check for failures and extract error analyses
        const failedTasks = [];
        const errorAnalyses = [];

        // Prepare the results in a format for synthesis
        const formattedResults = Object.entries(results).map(([id, data]) => {
            const isSuccess = data.result?.success || false;

            // Track failed tasks and their analyses
            if (!isSuccess) {
                failedTasks.push({
                    id,
                    task: data.subtask.task,
                    error: data.result?.error || 'Unknown error'
                });

                if (data.result?.analysis) {
                    errorAnalyses.push({
                        taskId: id,
                        taskName: data.subtask.task,
                        analysis: data.result.analysis
                    });
                }
            }

            return {
                id,
                task: data.subtask.task,
                agent: data.subtask.agent,
                result: data.result?.result || data.result,
                success: isSuccess,
                retried: data.result?.retried || false,
                retryCount: data.result?.retryCount || 0
            };
        });

        // Calculate success rate
        const totalTasks = formattedResults.length;
        const successfulTasks = formattedResults.filter(r => r.success).length;
        const successRate = totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0;

        // Add execution statistics
        const executionStats = {
            totalTasks,
            successfulTasks,
            failedTasks: totalTasks - successfulTasks,
            successRate: `${successRate.toFixed(0)}%`,
            retriedTasks: formattedResults.filter(r => r.retried).length
        };

        // Define system prompt for synthesis
        const systemPrompt = `You are a result synthesizer for a multi-agent system.
        Your job is to combine the results from multiple specialized agents into a coherent final response.
        
        Review the results from each subtask, including any failures and error analyses, and create a unified response that addresses the original user instruction.
        Highlight key information, summarize where appropriate, and present a clear, actionable response.
        
        Some tasks may have failed, retried, or received error analyses. Include this information in your synthesis to give a complete picture of the execution.
        
        Respond in JSON format with:
        {
            "summary": "Brief summary of what was accomplished and what failed",
            "details": {
                "key1": "value1",
                "key2": "value2"
            },
            "recommendations": ["recommendation1", "recommendation2"],
            "nextSteps": ["step1", "step2"],
            "errorSummary": "Summary of errors and their analyses, if any occurred"
        }`;

        // Call OpenAI API to synthesize results
        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: `Original instruction: "${originalInstruction}"
                    
                    Results from subtasks:
                    ${JSON.stringify(formattedResults, null, 2)}
                    
                    Execution statistics:
                    ${JSON.stringify(executionStats, null, 2)}
                    
                    ${failedTasks.length > 0 ? `Failed tasks: ${JSON.stringify(failedTasks, null, 2)}` : 'All tasks succeeded.'}
                    
                    ${errorAnalyses.length > 0 ? `Error analyses: ${JSON.stringify(errorAnalyses, null, 2)}` : ''}
                    
                    Please synthesize these results into a coherent response.`
                }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
        });

        // Parse and return the synthesized result
        const synthesizedResult = JSON.parse(response.choices[0].message.content);

        // Add execution statistics to the result
        return {
            ...synthesizedResult,
            statistics: executionStats,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate a mock synthesis for testing without API key
     * @param {Object} results - The results to synthesize
     * @param {string} originalInstruction - The original instruction
     * @returns {Object} A mock synthesis
     */
    generateMockSynthesis(results, originalInstruction) {
        const resultValues = Object.values(results);
        const taskTypes = resultValues.map(r => r.subtask.task);

        // Count successful and failed tasks
        const successfulTasks = resultValues.filter(r => r.result?.success).length;
        const failedTasks = resultValues.length - successfulTasks;
        const successRate = resultValues.length > 0 ? (successfulTasks / resultValues.length) * 100 : 0;

        // Get failed task info
        const failedTaskInfo = resultValues
            .filter(r => !r.result?.success)
            .map(r => ({
                task: r.subtask.task,
                error: r.result?.error || 'Unknown error',
                hasAnalysis: !!r.result?.analysis
            }));

        // Create a summary based on task types and success/failure
        let summary = `Completed ${resultValues.length} tasks related to "${originalInstruction}" with ${successRate.toFixed(0)}% success rate.`;

        if (taskTypes.some(t => t.includes('Flight'))) {
            summary += " Found and processed flight information.";
        }

        if (taskTypes.some(t => t.includes('Calendar') || t.includes('schedule'))) {
            summary += " Scheduled relevant events in the calendar.";
        }

        if (taskTypes.some(t => t.includes('Email') || t.includes('draft'))) {
            summary += " Prepared necessary communications.";
        }

        if (failedTasks > 0) {
            summary += ` However, ${failedTasks} task${failedTasks > 1 ? 's' : ''} failed and might require attention.`;
        }

        // Generate recommendations based on failures
        const recommendations = [
            "Consider reviewing all the task outputs for completeness",
            "Verify dates and times for any scheduled events",
            "Check email drafts before sending"
        ];

        // Add failure-specific recommendations
        if (failedTasks > 0) {
            recommendations.push("Review the failed tasks and their error analyses");
            recommendations.push("Consider retrying the failed tasks with corrected parameters");
        }

        // Generate error summary if there were failures
        let errorSummary = null;
        if (failedTasks > 0) {
            errorSummary = `${failedTasks} task${failedTasks > 1 ? 's' : ''} failed during execution. `;

            if (failedTaskInfo.some(t => t.hasAnalysis)) {
                errorSummary += "Error analyses suggest checking input parameters and retrying with corrected information.";
            } else {
                errorSummary += "Consider reviewing the task parameters and retry.";
            }
        }

        return {
            summary,
            details: {
                tasksCompleted: resultValues.length,
                tasksSucceeded: successfulTasks,
                tasksFailed: failedTasks,
                successRate: `${successRate.toFixed(0)}%`,
                instruction: originalInstruction,
                mockResponse: true
            },
            recommendations: recommendations.slice(0, 4), // Limit to 4 recommendations
            nextSteps: [
                "Confirm the specified actions",
                "Provide any missing information",
                "Execute the prepared tasks",
                failedTasks > 0 ? "Fix and retry the failed tasks" : "Monitor successful task completions"
            ],
            errorSummary,
            statistics: {
                totalTasks: resultValues.length,
                successfulTasks,
                failedTasks,
                successRate: `${successRate.toFixed(0)}%`
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get execution history
     * @returns {Array} Execution history
     */
    getHistory() {
        return this.history;
    }

    /**
     * Clear execution history
     */
    clearHistory() {
        this.history = [];
    }

    /**
     * Get an agent instance by name, with fallback matching
     * @param {string} name - The agent name to look for
     * @returns {Object} The agent instance or null if not found
     */
    getAgentByName(name) {
        // Try to find agent by normalizing names
        const normalizedName = name.toLowerCase().replace(/agent$/, '').trim();

        for (const [key, agent] of Object.entries(this.agents)) {
            const keyNormalized = key.toLowerCase().replace(/agent$/, '').trim();
            if (keyNormalized === normalizedName) {
                return agent;
            }

            // Also try matching by agent's name property
            const agentNameNormalized = agent.name.toLowerCase().replace(/agent$/, '').trim();
            if (agentNameNormalized === normalizedName) {
                return agent;
            }
        }

        return null;
    }

    /**
     * Generate a mock error analysis for testing in mock mode
     * @param {Object} subtask - The failed subtask
     * @param {Object} agent - The agent that executed the task
     * @param {Error} error - The error that occurred
     * @returns {Object} Mock analysis of the failure
     */
    generateMockErrorAnalysis(subtask, agent, error) {
        const taskType = subtask.task.toLowerCase();
        let likelyCauses = [];
        let potentialFixes = [];

        // Generate contextual causes and fixes based on the task type
        if (taskType.includes('flight')) {
            likelyCauses = [
                "Invalid flight parameters or date format",
                "Missing required origin or destination information",
                "Flight search API timeout or connection error",
                "Flight booking system unavailable"
            ];
            potentialFixes = [
                "Verify date format is YYYY-MM-DD",
                "Ensure both origin and destination are specified",
                "Retry with more specific flight parameters",
                "Check flight API status and credentials"
            ];
        } else if (taskType.includes('calendar')) {
            likelyCauses = [
                "Calendar event time conflict",
                "Invalid date/time format",
                "Missing required participants",
                "Calendar access permissions issue"
            ];
            potentialFixes = [
                "Choose an alternative time slot",
                "Ensure dates are in ISO format",
                "Add required participants to the meeting",
                "Verify calendar access permissions"
            ];
        } else if (taskType.includes('email') || taskType.includes('communication')) {
            likelyCauses = [
                "Invalid email address format",
                "Missing required email subject or body",
                "Email sending quota exceeded",
                "SMTP server connection error"
            ];
            potentialFixes = [
                "Verify email address format",
                "Ensure both subject and body are provided",
                "Wait and retry later when quota resets",
                "Check email service credentials and settings"
            ];
        } else {
            likelyCauses = [
                "Missing required parameters",
                "Invalid input format",
                "Service temporarily unavailable",
                "Rate limit exceeded"
            ];
            potentialFixes = [
                "Review required parameters for this task type",
                "Ensure all inputs are in the correct format",
                "Retry the task later",
                "Implement rate limiting and backoff strategy"
            ];
        }

        // Select 2-3 random causes and fixes to make each analysis different
        const selectRandom = (arr, count) => {
            const shuffled = [...arr].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, arr.length));
        };

        const selectedCauses = selectRandom(likelyCauses, 2 + Math.floor(Math.random() * 2));
        const selectedFixes = selectRandom(potentialFixes, 2 + Math.floor(Math.random() * 2));

        return {
            likelyCauses: selectedCauses,
            potentialFixes: selectedFixes,
            nextSteps: [
                "Review and correct the identified issues",
                "Retry the task with fixed parameters",
                "Consider alternative approaches if problem persists"
            ],
            explanation: `Mock analysis of task ${subtask.id} (${subtask.task}) failure. Error: ${error.message}. This analysis suggests reviewing the parameters and ensuring all required information is provided correctly.`,
            mockGenerated: true,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Handle failure recovery and dependency management when tasks fail
     * @param {Object} results - Current results from executed subtasks
     * @param {Array} remainingTasks - Tasks that are still waiting to be executed
     * @returns {Array} Updated remaining tasks with recovery strategies
     */
    async handleFailureRecovery(results, remainingTasks) {
        // Identify failed tasks
        const failedTaskIds = Object.entries(results)
            .filter(([id, data]) => !data.result?.success)
            .map(([id]) => id);

        if (failedTaskIds.length === 0) {
            return remainingTasks; // No failures to handle
        }

        console.log(`Handling recovery for ${failedTaskIds.length} failed tasks`);

        // Map of tasks that depend on failed tasks
        const affectedTasks = [];

        // Find tasks that depend on the failed tasks
        for (const task of remainingTasks) {
            if (task.dependencies && task.dependencies.some(depId => failedTaskIds.includes(depId))) {
                affectedTasks.push(task);
            }
        }

        if (affectedTasks.length === 0) {
            console.log('No dependent tasks affected by failures');
            return remainingTasks; // No affected tasks
        }

        console.log(`Found ${affectedTasks.length} tasks affected by failures`);

        // Update remaining tasks with recovery strategies
        const updatedTasks = [...remainingTasks];

        for (const task of affectedTasks) {
            const index = updatedTasks.indexOf(task);
            if (index === -1) continue;

            // Get the failed dependencies
            const failedDeps = task.dependencies.filter(depId => failedTaskIds.includes(depId));

            // Determine recovery strategy based on task type
            const recoveryStrategy = this.determineRecoveryStrategy(task, failedDeps, results);

            // Apply recovery strategy
            if (recoveryStrategy.shouldSkip) {
                // Remove the task from remaining tasks
                updatedTasks.splice(index, 1);
                console.log(`Skipping task ${task.id} due to failed dependencies: ${failedDeps.join(', ')}`);

                // Add a placeholder result for the skipped task
                results[task.id] = {
                    subtask: task,
                    result: {
                        success: false,
                        error: `Skipped due to failed dependencies: ${failedDeps.join(', ')}`,
                        skipped: true,
                        dependencyFailures: failedDeps.map(depId => ({
                            id: depId,
                            error: results[depId]?.result?.error || 'Unknown error'
                        }))
                    }
                };
            } else if (recoveryStrategy.canProceed) {
                // Modify the task to proceed without the failed dependencies
                updatedTasks[index] = {
                    ...task,
                    dependencies: task.dependencies.filter(depId => !failedDeps.includes(depId)),
                    task: `${task.task} (modified due to dependency failures)`,
                    parameters: {
                        ...task.parameters,
                        ...recoveryStrategy.modifiedParameters
                    },
                    recoveryStrategy: recoveryStrategy.strategy
                };

                console.log(`Modified task ${task.id} to proceed with recovery strategy: ${recoveryStrategy.strategy}`);
            } else {
                // Default: Mark the task as blocked but keep it in the queue
                // This allows for potential manual intervention or future recovery
                updatedTasks[index] = {
                    ...task,
                    blocked: true,
                    blockedReason: `Dependencies failed: ${failedDeps.join(', ')}`
                };

                console.log(`Marked task ${task.id} as blocked due to failed dependencies: ${failedDeps.join(', ')}`);
            }
        }

        // Filter out blocked tasks unless we're in a mode that can handle them
        const finalTasks = this.handleBlockedTasks ? updatedTasks : updatedTasks.filter(t => !t.blocked);

        return finalTasks;
    }

    /**
     * Determine the appropriate recovery strategy for a task with failed dependencies
     * @param {Object} task - The task that depends on failed tasks
     * @param {Array} failedDeps - IDs of the failed dependencies
     * @param {Object} results - Current results from executed subtasks
     * @returns {Object} Recovery strategy details
     */
    determineRecoveryStrategy(task, failedDeps, results) {
        // Default strategy - skip the task
        const defaultStrategy = {
            shouldSkip: true,
            canProceed: false,
            strategy: 'skip',
            modifiedParameters: {}
        };

        // If in mock mode, randomly choose recovery strategies for demonstration
        if (this.mockMode) {
            const strategies = [
                {
                    shouldSkip: true,
                    canProceed: false,
                    strategy: 'skip',
                    modifiedParameters: {}
                },
                {
                    shouldSkip: false,
                    canProceed: true,
                    strategy: 'proceed_with_defaults',
                    modifiedParameters: { useDefaults: true }
                },
                {
                    shouldSkip: false,
                    canProceed: true,
                    strategy: 'alternative_approach',
                    modifiedParameters: { useAlternativeMethod: true }
                }
            ];

            return strategies[Math.floor(Math.random() * strategies.length)];
        }

        // For real mode, determine strategy based on task type and failed dependencies

        // 1. Calendar tasks may proceed with alternative dates if flight booking failed
        if (task.agent === 'calendarAgent' &&
            failedDeps.some(depId => results[depId]?.subtask?.agent === 'flightBookingAgent')) {
            return {
                shouldSkip: false,
                canProceed: true,
                strategy: 'use_tentative_dates',
                modifiedParameters: {
                    tentative: true,
                    note: 'Dates are tentative pending flight confirmation'
                }
            };
        }

        // 2. Communication tasks may still proceed with partial information
        if (task.agent === 'communicationAgent') {
            return {
                shouldSkip: false,
                canProceed: true,
                strategy: 'proceed_with_partial_info',
                modifiedParameters: {
                    includeDisclaimer: true,
                    missingInfo: failedDeps.map(depId => results[depId]?.subtask?.task || depId).join(', ')
                }
            };
        }

        // 3. Flight booking tasks that depend on other flight information
        if (task.agent === 'flightBookingAgent' &&
            failedDeps.some(depId => results[depId]?.subtask?.agent === 'flightBookingAgent')) {
            // This is likely a multi-leg journey where earlier legs failed
            return {
                shouldSkip: true,
                canProceed: false,
                strategy: 'cannot_book_connecting_flight',
                modifiedParameters: {}
            };
        }

        // Default fallback to skip the task
        return defaultStrategy;
    }

    /**
     * Execute a plan with dependency management and failure recovery
     * @param {Array} plan - The plan to execute
     * @param {string} originalInstruction - The original high-level instruction
     * @returns {Promise<Object>} Results of the execution
     */
    async executePlanWithRecovery(plan, originalInstruction) {
        const results = {};
        let remainingTasks = [...plan];

        // Continue until all tasks are completed or we can't proceed further
    }

    /**
     * Apply safety guardrails to the planned tasks
     * @param {Object} plan - The task execution plan
     * @param {Object} overrides - Safety override flags
     * @returns {Object} Categorized tasks (approved, blocked, needingConfirmation)
     */
    applySafetyGuardrails(plan, overrides = {}) {
        const approvedTasks = [];
        const blockedTasks = [];
        const tasksNeedingConfirmation = [];

        // Normalize plan structure
        const subtasks = Array.isArray(plan) ? plan : (plan.subtasks || []);

        for (const task of subtasks) {
            // Check if task involves a critical intent
            const isCriticalIntent = this.isCriticalIntent(task);

            // Check if task involves a restricted domain
            const restrictionInfo = this.checkRestrictions(task);
            const isRestricted = restrictionInfo.restricted;

            // Handle overrides
            const hasCriticalOverride = overrides.allowCriticalIntents === true ||
                (Array.isArray(overrides.allowCriticalIntents) &&
                    overrides.allowCriticalIntents.some(intent => task.task.toLowerCase().includes(intent.toLowerCase())));

            const hasRestrictionOverride = overrides.allowRestrictedDomains === true ||
                (Array.isArray(overrides.allowRestrictedDomains) &&
                    overrides.allowRestrictedDomains.some(domain => domain === restrictionInfo.domain));

            // Apply safety rules
            if (isRestricted && !hasRestrictionOverride) {
                // Task is restricted and no override
                blockedTasks.push({
                    ...task,
                    blocked: true,
                    blockReason: `Restricted domain: ${restrictionInfo.domain}`
                });
            } else if (isCriticalIntent && !hasCriticalOverride) {
                // Critical intent requires confirmation
                tasksNeedingConfirmation.push({
                    ...task,
                    requiresConfirmation: true,
                    confirmationReason: `Critical intent: ${isCriticalIntent}`
                });
            } else {
                // Task is approved
                approvedTasks.push(task);
            }
        }

        return {
            approvedTasks,
            blockedTasks,
            tasksNeedingConfirmation
        };
    }

    /**
     * Check if a task involves a critical intent that requires confirmation
     * @param {Object} task - The task to check
     * @returns {string|false} The detected critical intent or false
     */
    isCriticalIntent(task) {
        const taskText = `${task.task} ${JSON.stringify(task.parameters || {})}`.toLowerCase();

        for (const intent of CRITICAL_INTENTS) {
            if (taskText.includes(intent.toLowerCase())) {
                return intent;
            }
        }

        // Also check if the task's intent directly matches a critical intent
        if (task.intent && CRITICAL_INTENTS.includes(task.intent.toLowerCase())) {
            return task.intent;
        }

        return false;
    }

    /**
     * Check if a task involves a restricted domain
     * @param {Object} task - The task to check
     * @returns {Object} Information about the restriction
     */
    checkRestrictions(task) {
        const taskText = `${task.task} ${JSON.stringify(task.parameters || {})}`.toLowerCase();

        for (const domain of RESTRICTED_DOMAINS) {
            if (taskText.includes(domain.toLowerCase())) {
                return { restricted: true, domain };
            }
        }

        // Also check if the task's domain directly matches a restricted domain
        if (task.domain && RESTRICTED_DOMAINS.includes(task.domain.toLowerCase())) {
            return { restricted: true, domain: task.domain };
        }

        return { restricted: false, domain: null };
    }
} 