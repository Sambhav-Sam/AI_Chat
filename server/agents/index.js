/**
 * Agents Module Index
 * Exports all agent components for easy importing
 */

export { BaseAgent } from './baseAgent.js';
export { FlightBookingAgent } from './flightBookingAgent.js';
export { CalendarAgent } from './calendarAgent.js';
export { CommunicationAgent } from './communicationAgent.js';
export { AgentRunner } from './agentRunner.js';

// Export a convenience function to create a new AgentRunner
export function createAgentRunner(options = {}) {
    return new AgentRunner(options);
} 