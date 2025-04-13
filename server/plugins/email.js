/**
 * Email Plugin
 * Handles email operations like composing, sending, and searching emails
 */

// Plugin manifest - required for all plugins
export const manifest = {
    name: "Email Plugin",
    version: "1.0.0",
    description: "Handles email operations like sending and searching emails",
    author: "AI Task Runner Team",
    // List of intents this plugin can handle
    intents: [
        "send_email",
        "draft_email",
        "search_emails",
        "read_email",
        "reply_to_email",
        "forward_email"
    ]
};

/**
 * Send an email
 * @param {Object} params - Email parameters
 * @returns {Promise<Object>} Sending result
 */
export async function sendEmail(params) {
    const {
        to,
        cc = [],
        bcc = [],
        subject,
        body,
        attachments = [],
        priority = "normal"
    } = params;

    console.log(`Sending email to ${to} with subject "${subject}"`);

    // Validation
    if (!to || (Array.isArray(to) && to.length === 0)) {
        throw new Error("Recipient (to) is required");
    }
    if (!subject) {
        throw new Error("Email subject is required");
    }
    if (!body) {
        throw new Error("Email body is required");
    }

    // In a real implementation, this would connect to an email API (SMTP, Gmail API, etc.)
    // Mock implementation
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        success: true,
        messageId,
        sentAt: new Date().toISOString(),
        recipients: {
            to: Array.isArray(to) ? to : [to],
            cc,
            bcc
        }
    };
}

/**
 * Create an email draft without sending it
 * @param {Object} params - Email parameters
 * @returns {Promise<Object>} Draft creation result
 */
export async function draftEmail(params) {
    const {
        to = [],
        cc = [],
        bcc = [],
        subject = "",
        body = "",
        attachments = []
    } = params;

    console.log(`Creating email draft with subject "${subject}"`);

    // In a real implementation, this would connect to an email API
    // Mock implementation
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
        success: true,
        draftId,
        draft: {
            to: Array.isArray(to) ? to : to ? [to] : [],
            cc,
            bcc,
            subject,
            body,
            attachments,
            createdAt: new Date().toISOString()
        }
    };
}

/**
 * Search for emails
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
export async function searchEmails(params) {
    const {
        query,
        folder = "inbox",
        startDate,
        endDate,
        from,
        to,
        hasAttachment,
        maxResults = 10
    } = params;

    console.log(`Searching emails with query "${query}" in folder "${folder}"`);

    // Validation
    if (!query && !from && !to && !startDate && !endDate) {
        throw new Error("At least one search parameter is required");
    }

    // In a real implementation, this would query an email API
    // Mock implementation - generate 0-maxResults random emails
    const resultCount = Math.floor(Math.random() * (maxResults + 1));
    const searchResults = [];

    for (let i = 0; i < resultCount; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days

        searchResults.push({
            id: `email_mock_${i}_${Math.random().toString(36).substring(2, 7)}`,
            subject: `Mock Email Result ${i + 1}${query ? ` related to "${query}"` : ""}`,
            from: "sender@example.com",
            to: ["recipient@example.com"],
            date: date.toISOString(),
            hasAttachments: Math.random() > 0.7,
            snippet: `This is a preview of email ${i + 1}. It contains some content related to the search.`,
            folder,
            read: Math.random() > 0.5
        });
    }

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 350));

    return {
        success: true,
        results: searchResults,
        totalFound: resultCount,
        query
    };
}

/**
 * Get details of a specific email
 * @param {Object} params - Email parameters
 * @returns {Promise<Object>} Email details
 */
export async function readEmail(params) {
    const { emailId, markAsRead = true } = params;

    console.log(`Reading email with ID: ${emailId}`);

    // Validation
    if (!emailId) {
        throw new Error("Email ID is required");
    }

    // In a real implementation, this would fetch from an email API
    // Mock implementation
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 7)); // Random date in last week

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 250));

    return {
        success: true,
        email: {
            id: emailId,
            subject: "Mock Email Subject",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            cc: [],
            bcc: [],
            date: date.toISOString(),
            body: "This is the full body of the mock email. It contains detailed content and formatting that would be present in a real email.\n\nBest regards,\nSender",
            hasAttachments: false,
            attachments: [],
            folder: "inbox",
            read: markAsRead,
            labels: ["important"]
        }
    };
}

/**
 * Reply to an email
 * @param {Object} params - Reply parameters
 * @returns {Promise<Object>} Reply result
 */
export async function replyToEmail(params) {
    const {
        emailId,
        body,
        includeAll = false,
        attachments = []
    } = params;

    console.log(`Replying to email with ID: ${emailId}`);

    // Validation
    if (!emailId) {
        throw new Error("Email ID is required");
    }
    if (!body) {
        throw new Error("Reply body is required");
    }

    // In a real implementation, this would connect to an email API
    // Mock implementation
    const messageId = `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Simulating API delay
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
        success: true,
        messageId,
        sentAt: new Date().toISOString(),
        inReplyTo: emailId
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
        case "send_email":
            return await sendEmail(parameters);

        case "draft_email":
            return await draftEmail(parameters);

        case "search_emails":
            return await searchEmails(parameters);

        case "read_email":
            return await readEmail(parameters);

        case "reply_to_email":
            return await replyToEmail(parameters);

        case "forward_email":
            // Similar to reply but with different recipients
            return await sendEmail({
                ...parameters,
                subject: `Fwd: ${parameters.subject || 'Forwarded email'}`,
                forwardedFrom: parameters.emailId
            });

        default:
            throw new Error(`Unsupported intent: ${intent}`);
    }
} 