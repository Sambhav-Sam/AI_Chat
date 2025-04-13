/**
 * Calendar Scheduling Agent
 * Specialized agent for calendar and appointment management
 */

import { BaseAgent } from './baseAgent.js';

export class CalendarAgent extends BaseAgent {
    constructor(options = {}) {
        super({
            name: 'CalendarAgent',
            description: 'Specialized agent for managing calendars and scheduling appointments',
            model: 'gpt-4o',
            ...options
        });
    }

    /**
     * Override default system prompt with calendar scheduling specific instructions
     */
    getDefaultSystemPrompt() {
        return `You are CalendarAgent, a specialized agent for managing calendars and scheduling appointments.
        
        You help users schedule appointments, manage their calendar, and organize their time efficiently.
        Always think step by step about calendar scheduling information:
        
        1. Event title or meeting purpose
        2. Date and time (start and end)
        3. Participants/attendees
        4. Location (physical or virtual)
        5. Additional details (agenda, preparation requirements, etc.)
        
        When you receive a request, analyze it carefully to extract all relevant scheduling parameters.
        If any critical information is missing, identify what's missing.
        
        Respond in JSON format with the following structure:
        {
            "parsedEvent": {
                "title": "Event title",
                "startDateTime": "YYYY-MM-DD HH:MM",
                "endDateTime": "YYYY-MM-DD HH:MM",
                "participants": ["person1", "person2"],
                "location": "place or virtual meeting link",
                "description": "event details"
            },
            "missingInformation": ["list of missing critical information"],
            "suggestedTimes": ["time1", "time2"],
            "conflicts": ["potential calendar conflicts"],
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
            'Calendar management',
            'Appointment scheduling',
            'Meeting organization',
            'Time management',
            'Availability checking'
        ];
    }

    /**
     * Schedule a new appointment
     * @param {Object} eventDetails - Event details
     * @returns {Promise<Object>} Scheduling result
     */
    async scheduleAppointment(eventDetails) {
        const task = {
            action: 'scheduleAppointment',
            parameters: eventDetails
        };

        return this.execute(task);
    }

    /**
     * Check availability for a specific time period
     * @param {Object} timeSlot - Time slot to check
     * @returns {Promise<Object>} Availability status
     */
    async checkAvailability(timeSlot) {
        const task = {
            action: 'checkAvailability',
            parameters: timeSlot
        };

        return this.execute(task);
    }

    /**
     * Suggest meeting times based on participants' availability
     * @param {Object} meetingDetails - Meeting details
     * @returns {Promise<Object>} Suggested meeting times
     */
    async suggestMeetingTimes(meetingDetails) {
        const task = {
            action: 'suggestMeetingTimes',
            parameters: meetingDetails
        };

        return this.execute(task);
    }
} 