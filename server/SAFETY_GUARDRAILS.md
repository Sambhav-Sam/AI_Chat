# Safety Guardrails for Agent Runner

This document describes the safety guardrails implemented in the AgentRunner class to prevent unintended or potentially harmful actions.

## Overview

The safety guardrails system provides two key protection mechanisms:

1. **Critical Intent Detection** - Identifies tasks that perform sensitive operations and requires explicit user confirmation before proceeding
2. **Restricted Domain Blocking** - Prevents execution of tasks in restricted domains unless specifically overridden

## Critical Intents

The following intents are considered critical and require user confirmation:

- `make_payment` - Any task involving financial transactions
- `delete_data` - Tasks that delete data from systems
- `send_email` - Tasks that send emails to recipients
- `submit_form` - Tasks that submit forms to external systems
- `purchase` - Tasks involving purchases or subscriptions
- `modify_permissions` - Tasks that change access rights or permissions
- `execute_code` - Tasks that execute arbitrary code
- `install_software` - Tasks that install software or packages

When the system detects a task with a critical intent, it will:

1. Mark the task as requiring confirmation
2. Return a response to the caller with `success: false` and `reason: "confirmation_required"`
3. Include the list of tasks needing confirmation in the response

## Restricted Domains

The following domains are restricted and tasks in these domains will be blocked:

- `admin_access` - Administrative operations
- `system_modification` - Changes to system configuration
- `social_media_posting` - Posting to social media accounts
- `data_deletion` - Deleting data from systems
- `cryptocurrency_transfer` - Cryptocurrency operations
- `external_api_access` - Access to external APIs
- `banking_operations` - Banking and financial operations
- `confidential_data_access` - Access to confidential data

When the system detects a task in a restricted domain, it will:

1. Mark the task as blocked
2. Add the task to the blocked tasks list
3. Return information about blocked tasks in the execution response

## User Confirmation

To confirm tasks that require user confirmation, you can provide a `confirmationCallback` function:

```javascript
const result = await agentRunner.execute('Send an email to the team', {
  confirmationCallback: async (tasksNeedingConfirmation) => {
    // Show tasks to user and get confirmation
    const confirmedTaskIds = await promptUserForConfirmation(tasksNeedingConfirmation);
    return confirmedTaskIds; // Return array of confirmed task IDs
  }
});
```

The confirmation callback receives the list of tasks needing confirmation and should return an array of task IDs that the user has approved.

## Safety Overrides

You can override safety guardrails when necessary using the `safetyOverrides` option:

```javascript
const result = await agentRunner.execute('Delete old user data', {
  safetyOverrides: {
    // Allow specific critical intents (string array or true for all)
    allowCriticalIntents: ['delete_data'],
    
    // Allow specific restricted domains (string array or true for all)
    allowRestrictedDomains: ['data_deletion']
  }
});
```

Overrides can be:
- A boolean `true` to allow all critical intents or restricted domains
- An array of specific intents or domains to allow

## Safety Reports

Execution results include a `safetyReport` object with information about which tasks were approved, blocked, or required confirmation:

```javascript
{
  success: true,
  safetyReport: {
    approvedTasks: [
      { id: 'task1', task: 'Schedule meeting' }
    ],
    blockedTasks: [
      { id: 'task2', task: 'Delete user data', reason: 'Restricted domain: data_deletion' }
    ]
  },
  // Other result properties...
}
```

## Testing Safety Guardrails

You can test the safety guardrails using the provided `testSafetyGuardrails.js` script:

```
node server/testSafetyGuardrails.js
```

This script demonstrates various scenarios including:
- Regular non-critical tasks
- Tasks with critical intents
- Tasks in restricted domains
- Using confirmation callbacks
- Using safety overrides

## Best Practices

1. **Always review tasks needing confirmation** - Never automatically confirm critical tasks without user review
2. **Use restrictive overrides** - Prefer specific overrides (arrays of allowed intents/domains) over broad overrides (boolean true)
3. **Log safety actions** - The system logs all safety-related actions, review these logs regularly
4. **Update critical intents and restricted domains** - Adjust the lists as your application evolves 