/**
 * Calendar Plugin
 * Handles calendar operations like creating events, checking availability, etc.
 */

// Plugin manifest - required for all plugins
export const manifest = {
    name: "Calendar Plugin",
    version: "1.0.0",
    description: "Handles calendar operations like creating events and checking availability",
    author: "AI Task Runner Team",
    // List of intents this plugin can handle
    intents: [
        "create_event",
        "check_availability",
        "reschedule_event",
        "cancel_event",
        "get_events",
        "calendar_query"
    ]
};

/**
 * Create a calendar event
 * @param {Object} params - Event parameters
 * @returns {Promise<Object>} Created event
 */
export async function createCalendarEvent(params) {
    const {
        title,
        startTime,
        endTime,
        attendees = [],
        location = "",
        description = "",
        reminders = []
    } = params;

    console.log(`Creating calendar event: "${title}"`);

    // Validation
    if (!title) {
        throw new Error("Event title is required");
    }
    if (!startTime) {
        throw new Error("Event start time is required");
    }
    if (!endTime) {
        throw new Error("Event end time is required");
    }

    // In a real implementation, this would connect to a calendar API (Google Calendar, Outlook, etc.)
    // Mock implementation
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const event = {
        id: eventId,
        title,
        startTime,
        endTime,
        attendees,
        location,
        description,
        reminders,
        created: new Date().toISOString(),
        status: "confirmed"
    };

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
        success: true,
        event
    };
}

/**
 * Check calendar availability
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Availability information
 */
export async function checkAvailability(params) {
    const {
        startTime,
        endTime,
        attendees = []
    } = params;

    console.log(`Checking availability from ${startTime} to ${endTime}`);

    // Validation
    if (!startTime) {
        throw new Error("Start time is required");
    }
    if (!endTime) {
        throw new Error("End time is required");
    }

    // In a real implementation, this would query a calendar API
    // Mock implementation
    const isAvailable = Math.random() > 0.3; // 70% chance of being available

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
        success: true,
        available: isAvailable,
        conflictingEvents: isAvailable ? [] : [
            {
                id: `evt_mock_${Math.random().toString(36).substring(2, 7)}`,
                title: "Existing Meeting",
                startTime: startTime,
                endTime: new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString()
            }
        ]
    };
}

/**
 * Get events in date range
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} List of events
 */
export async function getEvents(params) {
    const {
        startDate,
        endDate,
        calendar = "primary"
    } = params;

    console.log(`Getting events from ${startDate} to ${endDate}`);

    // Validation
    if (!startDate) {
        throw new Error("Start date is required");
    }

    // Default to a day if end date not provided
    const queryEndDate = endDate || new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000).toISOString();

    // In a real implementation, this would query a calendar API
    // Mock implementation - generate 0-5 random events
    const eventCount = Math.floor(Math.random() * 6);
    const events = [];

    for (let i = 0; i < eventCount; i++) {
        const eventStartTime = new Date(startDate);
        eventStartTime.setHours(9 + Math.floor(Math.random() * 8)); // Between 9 AM and 5 PM

        const eventEndTime = new Date(eventStartTime);
        eventEndTime.setHours(eventStartTime.getHours() + 1); // 1 hour meeting

        events.push({
            id: `evt_mock_${i}_${Math.random().toString(36).substring(2, 7)}`,
            title: `Mock Event ${i + 1}`,
            startTime: eventStartTime.toISOString(),
            endTime: eventEndTime.toISOString(),
            attendees: ["user@example.com"],
            location: "Virtual",
            status: "confirmed"
        });
    }

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 250));

    return {
        success: true,
        events
    };
}

/**
 * Cancel a calendar event
 * @param {Object} params - Event parameters
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelEvent(params) {
    const { eventId } = params;

    console.log(`Cancelling event: ${eventId}`);

    // Validation
    if (!eventId) {
        throw new Error("Event ID is required");
    }

    // In a real implementation, this would call a calendar API
    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
        success: true,
        eventId,
        status: "cancelled"
    };
}

/**
 * Execute a task using the appropriate function from this plugin
 * @param {string} intent - Task intent
 * @param {Object} parameters - Task parameters
 * @returns {Promise<Object>} Result of task execution
 */
export async function execute(intent, parameters) {
    switch (intent) {
        case "create_event":
            return await createCalendarEvent(parameters);

        case "check_availability":
            return await checkAvailability(parameters);

        case "get_events":
        case "calendar_query":
            return await getEvents(parameters);

        case "cancel_event":
            return await cancelEvent(parameters);

        case "reschedule_event":
            // This would be a combination of cancel and create
            // For now, just returning a mock result
            return {
                success: true,
                message: "Event rescheduled",
                eventId: parameters.eventId,
                newStartTime: parameters.newStartTime
            };

        default:
            throw new Error(`Unsupported intent: ${intent}`);
    }
} 