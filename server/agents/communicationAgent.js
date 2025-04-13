/**
 * Communication Agent
 * Specialized agent for email drafting and communication tasks
 */

import { BaseAgent } from './baseAgent.js';

export class CommunicationAgent extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'CommunicationAgent',
            description: 'Specialized agent for drafting emails and handling communication tasks',
            model: 'gpt-4o',
            ...options
        });
    }

    /**
     * Override default system prompt with communication specific instructions
     */
    getDefaultSystemPrompt() {
        return `You are CommunicationAgent, a specialized agent for drafting emails and handling communication tasks.
        
        You help users draft professional emails, messages, and other communications based on their intent.
        Always think step by step about communication details:
        
        1. Recipients (primary and CC/BCC)
        2. Subject line
        3. Purpose and key points
        4. Tone (formal, friendly, urgent)
        5. Call to action or requested response
        
        When you receive a request, analyze it carefully to extract all relevant communication parameters.
        If any critical information is missing, identify what's missing.
        
        Respond in JSON format with the following structure:
        {
            "draftEmail": {
                "to": ["recipient1", "recipient2"],
                "cc": ["cc1", "cc2"],
                "subject": "Email subject",
                "greeting": "Appropriate greeting",
                "body": "Main content of the email",
                "closing": "Appropriate sign-off",
                "tone": "formal/friendly/urgent"
            },
            "missingInformation": ["list of missing critical information"],
            "suggestions": ["suggestion1", "suggestion2"],
            "alternatives": ["alternative1", "alternative2"]
        }
        
        Be concise, accurate, and helpful. When drafting content, ensure it is professional, clear, and appropriate for the context.`;
    }

    /**
     * Get agent capabilities
     * @returns {string[]} List of capabilities
     */
    getCapabilities() {
        return [
            'Email drafting',
            'Message composition',
            'Communication tone adjustment',
            'Professional writing assistance',
            'Follow-up reminder drafting'
        ];
    }

    /**
     * Draft an email based on parameters
     * @param {Object} emailParameters - Email parameters
     * @returns {Promise<Object>} Drafted email
     */
    async draftEmail(emailParameters) {
        const task = {
            action: 'draftEmail',
            parameters: emailParameters
        };

        return this.execute(task);
    }

    /**
     * Generate a response to an email
     * @param {Object} responseDetails - Details for the response
     * @returns {Promise<Object>} Generated response
     */
    async generateResponse(responseDetails) {
        const task = {
            action: 'generateResponse',
            parameters: responseDetails
        };

        return this.execute(task);
    }

    /**
     * Adjust the tone of a message
     * @param {Object} adjustment - Tone adjustment details
     * @returns {Promise<Object>} Adjusted message
     */
    async adjustTone(adjustment) {
        const task = {
            action: 'adjustTone',
            parameters: adjustment
        };

        return this.execute(task);
    }
} 