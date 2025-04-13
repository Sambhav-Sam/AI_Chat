# Multi-Agent Coordination System

This document explains the multi-agent coordination system in our application. The system enables complex task execution by coordinating multiple specialized agents.

## Overview

The multi-agent system consists of:

1. **Specialized Agents**: Individual agents with specific capabilities (e.g., flight booking, calendar scheduling, communication)
2. **Agent Runner**: Orchestrates multiple agents to complete complex tasks
3. **API Interface**: Exposes the multi-agent system via REST endpoints

## Architecture

```
┌───────────────────┐
│    Agent Runner   │
│    Orchestrator   │
└───────┬───────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│                                         │
│ ┌─────────────┐ ┌───────────┐ ┌───────┐ │
│ │    Flight   │ │ Calendar  │ │ Email │ │
│ │  Booking    │ │ Scheduling│ │ Agent │ │
│ │   Agent     │ │   Agent   │ │       │ │
│ └─────────────┘ └───────────┘ └───────┘ │
│                                         │
└─────────────────────────────────────────┘
```

## Components

### 1. BaseAgent (baseAgent.js)

Abstract base class that provides common functionality for all agents:
- Communication with OpenAI API
- Memory management
- Task execution

### 2. Specialized Agents

- **FlightBookingAgent**: Handles flight search and booking
- **CalendarAgent**: Manages calendar events and scheduling
- **CommunicationAgent**: Drafts emails and communication content

Each agent implements:
- Domain-specific prompts and instructions
- Specialized task handling
- Result formatting

### 3. AgentRunner (agentRunner.js)

Coordinates multiple agents:
- Plans complex tasks into subtasks
- Routes subtasks to appropriate agents
- Manages dependencies between subtasks
- Synthesizes final results

### 4. API Interface (agentRoutes.js)

REST endpoints for interacting with the multi-agent system:
- `POST /api/agents/execute`: Execute a high-level instruction
- `GET /api/agents/history`: Get execution history
- `DELETE /api/agents/history`: Clear execution history
- `GET /api/agents`: List available agents

## How It Works

1. **Task Planning**: AgentRunner breaks down high-level instructions into subtasks
2. **Task Routing**: Subtasks are routed to specialized agents
3. **Parallel Execution**: Independent subtasks are executed in parallel
4. **Dependency Management**: Subtasks with dependencies wait for prerequisites
5. **Result Synthesis**: Individual results are combined into a coherent final result

## Example Usage

### API Example

```javascript
// Client-side code
const response = await fetch('/api/agents/execute', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        instruction: "Book a flight to New York for next Tuesday and notify my team"
    })
});

const result = await response.json();
```

### Programmatic Example

```javascript
import { AgentRunner } from './agents';

const runner = new AgentRunner();
const result = await runner.execute(
    "Schedule a team meeting for Friday at 2pm and send a reminder email"
);
```

## Sample Instructions

The system can handle complex instructions like:

- "Book a flight from New York to San Francisco for next Monday, and schedule a meeting with the team at 2pm the day after arrival"
- "Draft an email to the team about the upcoming project deadline, and schedule a review meeting for next Friday at 10am"
- "Find the next available flight to Chicago and notify my manager about the business trip"

## Adding New Agents

To add a new specialized agent:

1. Create a new agent class that extends BaseAgent
2. Implement domain-specific system prompts and capabilities
3. Add specialized methods for the agent's tasks
4. Register the agent in AgentRunner.initializeAgents()

## Testing

Run the test script to verify multi-agent coordination:

```
node testAgents.js
``` 