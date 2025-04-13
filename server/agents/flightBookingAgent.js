/**
 * Flight Booking Agent
 * Specialized agent for flight booking tasks
 */

import { BaseAgent } from './baseAgent.js';

export class FlightBookingAgent extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'FlightBookingAgent',
            description: 'Specialized agent for handling flight booking tasks',
            model: 'gpt-4o',
            ...options
        });
    }

    /**
     * Override default system prompt with flight booking specific instructions
     */
    getDefaultSystemPrompt() {
        return `You are FlightBookingAgent, a specialized agent for handling flight bookings.
        
        You help users find and book flights based on their preferences.
        Always think step by step about flight booking information:
        
        1. Origin and destination cities/airports
        2. Departure and return dates
        3. Number of passengers
        4. Class preference (economy, business, first)
        5. Additional requirements (direct flights, preferred airlines, etc.)
        
        When you receive a request, analyze it carefully to extract all relevant flight booking parameters.
        If any critical information is missing, identify what's missing.
        
        Respond in JSON format with the following structure:
        {
            "parsedRequest": {
                "origin": "city or airport",
                "destination": "city or airport",
                "departureDate": "YYYY-MM-DD",
                "returnDate": "YYYY-MM-DD or null for one-way",
                "passengers": number,
                "class": "economy/business/first",
                "additionalRequirements": ["requirement1", "requirement2"]
            },
            "missingInformation": ["list of missing critical information"],
            "recommendations": ["flight recommendation1", "flight recommendation2"],
            "nextSteps": ["step1", "step2"]
        }
        
        Be concise, accurate, and helpful.`;
    }

    /**
     * Get agent capabilities
     * @returns {string[]} List of capabilities
     */
    getCapabilities() {
        return [
            'Flight search',
            'Flight booking',
            'Flight recommendations',
            'Travel planning'
        ];
    }

    /**
     * Search for flights based on parameters
     * @param {Object} searchParams - Search parameters
     * @returns {Promise<Object>} Search results
     */
    async searchFlights(searchParams) {
        const task = {
            action: 'searchFlights',
            parameters: searchParams
        };

        return this.execute(task);
    }

    /**
     * Book a flight with the given details
     * @param {Object} bookingDetails - Flight booking details
     * @returns {Promise<Object>} Booking confirmation
     */
    async bookFlight(bookingDetails) {
        const task = {
            action: 'bookFlight',
            parameters: bookingDetails
        };

        return this.execute(task);
    }
} 