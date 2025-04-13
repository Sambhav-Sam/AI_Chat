/**
 * AI Agent Module
 * Parses natural language instructions into task objects using OpenAI's API
 */

import dotenv from 'dotenv';
import { executeTask } from './taskExecutor.js';
import redisCache from './services/redisCache.js';

// Load environment variables
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Parses a natural language instruction into a structured task object
 * @param {string} input - The natural language instruction
 * @returns {Promise<Object>} A parsed task object with intent and parameters
 */
export async function parseTask(input) {
    console.log(`Parsing task from input: "${input}"`);

    try {
        // If OpenAI API is configured, use it
        if (OPENAI_API_KEY && OPENAI_API_KEY.length > 0 && !OPENAI_API_KEY.includes('your_api_key')) {
            return await parseTaskWithOpenAI(input);
        } else {
            // Fallback to simple parsing rules
            console.log('OpenAI API key not configured. Using fallback parser.');
            return parseTaskWithRules(input);
        }
    } catch (error) {
        console.error('Error parsing task:', error);
        // Fallback to simple parsing in case of errors
        return parseTaskWithRules(input);
    }
}

/**
 * Use OpenAI API to parse the instruction into a structured task
 * @param {string} input - The natural language instruction
 * @returns {Promise<Object>} A parsed task object with intent and parameters
 */
async function parseTaskWithOpenAI(input) {
    try {
        // Check if we have a cached result first
        if (redisCache.connected) {
            const cacheKey = redisCache.generateKey('task_parse', input, {
                model: 'gpt-4o',
                temperature: 0.3
            });

            const cachedTask = await redisCache.get(cacheKey);
            if (cachedTask) {
                console.log('Using cached task parsing result');
                return cachedTask;
            }
        }

        // Dynamic import OpenAI SDK to avoid issues if not installed
        const { OpenAI } = await import('openai');

        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY
        });

        // Define the system prompt for the AI
        const systemPrompt = `You are an AI task parser that converts natural language instructions into structured task objects.
Extract the user's intention and relevant parameters from their instruction.
Return a JSON object with:
1. "intent" - The main action (e.g., search, navigate, fill_form)
2. "parameters" - Key-value pairs of relevant details
3. "context" - A brief description of the user's goal

Available intents: search, navigate, fill_form
For search: extract query, site (optional)
For navigate: extract url
For fill_form: extract form_type and any form fields`;

        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        // Parse the JSON response
        const result = JSON.parse(response.choices[0].message.content);
        console.log('OpenAI parsed task:', JSON.stringify(result, null, 2));

        // Cache the result if Redis is available (1 hour TTL)
        if (redisCache.connected) {
            const cacheKey = redisCache.generateKey('task_parse', input, {
                model: 'gpt-4o',
                temperature: 0.3
            });
            await redisCache.set(cacheKey, result, 3600);
        }

        return result;
    } catch (error) {
        console.error('Error with OpenAI task parsing:', error);
        // Fallback to rule-based parsing
        return parseTaskWithRules(input);
    }
}

/**
 * Use simple rules to parse the instruction into a structured task
 * @param {string} input - The natural language instruction
 * @returns {Object} A parsed task object with intent and parameters
 */
function parseTaskWithRules(input) {
    const lowerInput = input.toLowerCase();

    // Detect search intent
    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('look up')) {
        const query = lowerInput.replace(/search for|search|find|look up/gi, '').trim();
        return {
            intent: 'search',
            parameters: {
                query,
                site: lowerInput.includes('google') ? 'google.com' : undefined
            },
            context: 'User wants to search for information'
        };
    }

    // Detect form filling intent
    if (lowerInput.includes('fill') && lowerInput.includes('form')) {
        return {
            intent: 'fill_form',
            parameters: {
                form_type: 'contact',
                first_name: lowerInput.includes('name') ? 'John Doe' : undefined,
                email: lowerInput.includes('email') ? 'example@example.com' : undefined,
                message: lowerInput.includes('message') ? 'This is an automated message' : undefined
            },
            context: 'User wants to fill out a form'
        };
    }

    // Detect navigation intent
    if (lowerInput.includes('go to') || lowerInput.includes('visit') || lowerInput.includes('navigate')) {
        let url = lowerInput.replace(/go to|visit|navigate to|open/gi, '').trim();

        // Handle common websites
        if (url.includes('google')) url = 'google.com';
        else if (url.includes('facebook')) url = 'facebook.com';
        else if (url.includes('twitter')) url = 'twitter.com';
        else if (url.includes('youtube')) url = 'youtube.com';
        else if (url === '') url = 'example.com';

        return {
            intent: 'navigate',
            parameters: {
                url
            },
            context: 'User wants to navigate to a website'
        };
    }

    // Default to navigate as a fallback
    return {
        intent: 'navigate',
        parameters: {
            url: 'example.com'
        },
        context: 'Could not determine specific intent'
    };
}

/**
 * Process instruction, parse into a task, and execute it
 * @param {string} instruction - Natural language instruction
 * @returns {Promise<Object>} Results of task execution
 */
export async function processInstructionAndExecute(instruction) {
    try {
        // Parse the natural language instruction
        const parsedTask = await parseTask(instruction);

        // Execute the task using our framework
        const result = await executeTask(parsedTask);

        return {
            parsedTask,
            result
        };
    } catch (error) {
        console.error('Error processing instruction:', error);
        throw error;
    }
}

// Example usage:
// const task = await parseTask("Book a flight from New York to London on July 15th");
// console.log(task); 