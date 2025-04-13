/**
 * Base Agent Class
 * Provides common functionality for all specialized agents
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import redisCache from '../services/redisCache.js';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export class BaseAgent {
    /**
     * Constructor for the base agent
     * @param {Object} options - Configuration options for the agent
     */
    constructor(options = {}) {
        this.name = options.name || 'Agent';
        this.description = options.description || 'A general purpose agent';
        this.model = options.model || 'gpt-4o';
        this.systemPrompt = options.systemPrompt || this.getDefaultSystemPrompt();
        this.enableCache = options.enableCache !== false; // Enable cache by default
        this.cacheTTL = options.cacheTTL || 3600; // Cache TTL in seconds (1 hour default)

        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }

        this.openai = new OpenAI({
            apiKey: OPENAI_API_KEY
        });

        this.memory = [];
    }

    /**
     * Get the default system prompt for this agent
     * @returns {string} The default system prompt
     */
    getDefaultSystemPrompt() {
        return `You are ${this.name}, ${this.description}. 
        Your goal is to help the user accomplish their tasks.
        Be concise, helpful, and accurate.`;
    }

    /**
     * Execute a task with this agent
     * @param {Object} task - The task to execute
     * @param {Object} context - Additional context for the task
     * @returns {Promise<Object>} The result of the task execution
     */
    async execute(task, context = {}) {
        console.log(`[${this.name}] Executing task:`, JSON.stringify(task, null, 2));

        try {
            // Add task to memory
            this.memory.push({
                role: 'user',
                content: JSON.stringify(task)
            });

            // Build messages array with system prompt and memory
            const messages = [
                { role: 'system', content: this.systemPrompt },
                ...this.memory
            ];

            // Extract response from cache or API
            const responseContent = await this.getResponseWithCache(messages);

            // Add assistant response to memory
            this.memory.push({
                role: 'assistant',
                content: responseContent
            });

            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseContent);
            } catch (e) {
                parsedResponse = { raw: responseContent };
            }

            return {
                success: true,
                result: parsedResponse,
                agentName: this.name
            };
        } catch (error) {
            console.error(`[${this.name}] Error:`, error);
            return {
                success: false,
                error: error.message,
                agentName: this.name
            };
        }
    }

    /**
     * Get a response with caching layer
     * @param {Array} messages - The messages to send to OpenAI
     * @returns {Promise<string>} The response content
     */
    async getResponseWithCache(messages) {
        // If cache is disabled, call API directly
        if (!this.enableCache || !redisCache.connected) {
            return this.callOpenAIAPI(messages);
        }

        // Generate a cache key from the messages and model
        const messagesString = JSON.stringify(messages);
        const cacheKey = redisCache.generateKey('ai_response', messagesString, {
            model: this.model,
            temperature: 0.2
        });

        // Try to get from cache first
        const cachedResponse = await redisCache.get(cacheKey);
        if (cachedResponse) {
            console.log(`[${this.name}] Using cached response for task`);
            return cachedResponse;
        }

        // If not in cache, call the API
        const responseContent = await this.callOpenAIAPI(messages);

        // Cache the response
        await redisCache.set(cacheKey, responseContent, this.cacheTTL);

        return responseContent;
    }

    /**
     * Call the OpenAI API directly
     * @param {Array} messages - The messages to send to OpenAI
     * @returns {Promise<string>} The response content
     */
    async callOpenAIAPI(messages) {
        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0.2,
            max_tokens: 2000
        });

        return response.choices[0].message.content;
    }

    /**
     * Clear the agent's memory
     */
    clearMemory() {
        this.memory = [];
    }

    /**
     * Get agent metadata
     * @returns {Object} Agent metadata
     */
    getMetadata() {
        return {
            name: this.name,
            description: this.description,
            capabilities: this.getCapabilities(),
            cacheEnabled: this.enableCache
        };
    }

    /**
     * Get agent capabilities
     * @returns {string[]} List of capabilities
     */
    getCapabilities() {
        return ['general purpose tasks'];
    }
} 