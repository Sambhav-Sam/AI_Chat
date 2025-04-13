/**
 * Error Analysis Utility
 * 
 * Provides tools for analyzing, categorizing, and generating insights from errors
 * that occur during task execution.
 */

/**
 * Error categories with their typical patterns and causes
 */
const ERROR_CATEGORIES = {
    NETWORK: {
        patterns: [
            'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'fetch failed',
            'network error', 'socket hang up', 'connection refused',
            'Failed to fetch', 'Network request failed'
        ],
        description: 'Errors related to network connectivity issues'
    },
    TIMEOUT: {
        patterns: [
            'timeout', 'timed out', 'deadline exceeded', 'ETIMEOUT'
        ],
        description: 'Errors related to operations taking too long to complete'
    },
    PERMISSION: {
        patterns: [
            'EACCES', 'permission denied', 'not authorized', 'insufficient permissions',
            'access denied', 'forbidden', '403'
        ],
        description: 'Errors related to permission issues or access control'
    },
    RESOURCE: {
        patterns: [
            'ENOMEM', 'out of memory', 'resource exhausted', 'memory limit exceeded',
            'disk space', 'ENOSPC', 'CPU limit'
        ],
        description: 'Errors related to resource limitations or exhaustion'
    },
    INPUT: {
        patterns: [
            'invalid input', 'Invalid argument', 'invalid parameter', 'validation failed',
            'expected', 'required parameter', 'must be a', 'not found in input'
        ],
        description: 'Errors related to invalid or missing input parameters'
    },
    PARSING: {
        patterns: [
            'SyntaxError', 'JSON', 'parsing', 'unexpected token', 'invalid JSON',
            'failed to parse', 'malformed'
        ],
        description: 'Errors related to parsing data formats'
    },
    EXTERNAL_API: {
        patterns: [
            'API returned', 'API responded with', 'API rate limit', 'service unavailable',
            'external service', 'third-party', 'status code', 'response code'
        ],
        description: 'Errors related to external API failures or limitations'
    },
    DATABASE: {
        patterns: [
            'database', 'query failed', 'connection lost', 'duplicate entry',
            'constraint violation', 'transaction', 'deadlock'
        ],
        description: 'Errors related to database operations'
    },
    INTERNAL: {
        patterns: [
            'internal error', 'unexpected error', 'unhandled exception',
            'internal server error', 'system error', 'unknown error'
        ],
        description: 'Internal errors or unhandled exceptions'
    }
};

/**
 * Task-specific error patterns
 */
const TASK_SPECIFIC_ERRORS = {
    'search': {
        patterns: [
            'no results found', 'search engine', 'query syntax', 'search limit exceeded'
        ],
        description: 'Errors specific to search operations'
    },
    'navigate': {
        patterns: [
            'navigation failed', 'page not found', 'redirect loop', 'navigation timeout',
            'invalid URL', 'cannot navigate'
        ],
        description: 'Errors specific to web navigation'
    },
    'scrape': {
        patterns: [
            'selector not found', 'element not found', 'scraping blocked', 'captcha',
            'robot detection', 'content blocked', 'anti-scraping'
        ],
        description: 'Errors specific to web scraping'
    },
    'py_web_scrape': {
        patterns: [
            'selector not found', 'element not found', 'scraping blocked', 'captcha',
            'robot detection', 'content blocked', 'anti-scraping', 'beautifulsoup',
            'xpath', 'css selector'
        ],
        description: 'Errors specific to Python web scraping'
    },
    'py_data_analysis': {
        patterns: [
            'dataframe', 'pandas', 'numpy', 'invalid dataset', 'column not found',
            'data type', 'analysis failed', 'statistics', 'data processing'
        ],
        description: 'Errors specific to Python data analysis'
    }
};

/**
 * Analyze an error and categorize it
 * @param {Error|Object} error - The error object to analyze
 * @param {string} taskType - The type of task that produced the error
 * @returns {Object} Analysis results
 */
export function analyzeError(error, taskType) {
    const errorMessage = error.message || error.toString();
    const errorStack = error.stack || '';

    // Combine message and stack for better pattern matching
    const fullErrorText = `${errorMessage} ${errorStack}`;

    // Find matching categories
    const categories = findErrorCategories(fullErrorText);

    // Find matching task-specific patterns
    const taskSpecific = findTaskSpecificPatterns(fullErrorText, taskType);

    // Generate likely causes based on categories and task type
    const likelyCauses = generateLikelyCauses(categories, taskSpecific, taskType);

    // Generate potential fixes
    const potentialFixes = generatePotentialFixes(categories, taskSpecific, taskType);

    return {
        originalError: {
            message: errorMessage,
            stack: errorStack,
            details: error.details || {}
        },
        analysis: {
            categories,
            taskSpecific,
            likelyCauses,
            potentialFixes,
            severity: determineSeverity(categories, errorMessage)
        },
        metadata: {
            taskType,
            timestamp: new Date().toISOString(),
            isRecurring: false, // This would be set by the metrics service
            frequency: 1 // This would be set by the metrics service
        }
    };
}

/**
 * Find matching error categories for an error message
 * @param {string} errorText - The error text to analyze
 * @returns {Array} Matching categories with their descriptions
 */
function findErrorCategories(errorText) {
    const matches = [];

    for (const [category, info] of Object.entries(ERROR_CATEGORIES)) {
        for (const pattern of info.patterns) {
            if (errorText.toLowerCase().includes(pattern.toLowerCase())) {
                matches.push({
                    category,
                    description: info.description,
                    matchedPattern: pattern
                });
                break; // Found a match for this category, move to next
            }
        }
    }

    // If no specific category matches, categorize as INTERNAL
    if (matches.length === 0) {
        matches.push({
            category: 'INTERNAL',
            description: ERROR_CATEGORIES.INTERNAL.description,
            matchedPattern: 'uncategorized error'
        });
    }

    return matches;
}

/**
 * Find task-specific error patterns
 * @param {string} errorText - The error text to analyze
 * @param {string} taskType - The type of task
 * @returns {Array} Matching task-specific patterns
 */
function findTaskSpecificPatterns(errorText, taskType) {
    const matches = [];

    // Find the task or similar tasks in our task-specific patterns
    const taskPatterns = TASK_SPECIFIC_ERRORS[taskType];

    // If no specific task type defined, check for partial matches
    if (!taskPatterns) {
        for (const [type, info] of Object.entries(TASK_SPECIFIC_ERRORS)) {
            if (taskType.includes(type) || type.includes(taskType)) {
                // Found a partial match
                for (const pattern of info.patterns) {
                    if (errorText.toLowerCase().includes(pattern.toLowerCase())) {
                        matches.push({
                            category: `TASK_${type.toUpperCase()}`,
                            description: info.description,
                            matchedPattern: pattern
                        });
                        break;
                    }
                }
            }
        }
    } else {
        // We have this specific task type
        for (const pattern of taskPatterns.patterns) {
            if (errorText.toLowerCase().includes(pattern.toLowerCase())) {
                matches.push({
                    category: `TASK_${taskType.toUpperCase()}`,
                    description: taskPatterns.description,
                    matchedPattern: pattern
                });
                break;
            }
        }
    }

    return matches;
}

/**
 * Generate likely causes based on error categories and task type
 * @param {Array} categories - Error categories
 * @param {Array} taskSpecific - Task-specific patterns
 * @param {string} taskType - The type of task
 * @returns {Array} Likely causes of the error
 */
function generateLikelyCauses(categories, taskSpecific, taskType) {
    const causes = [];

    // Add general causes based on categories
    for (const category of categories) {
        switch (category.category) {
            case 'NETWORK':
                causes.push(
                    'Connection to remote server failed',
                    'DNS resolution issues',
                    'Firewall or network restrictions',
                    'Target server may be down'
                );
                break;
            case 'TIMEOUT':
                causes.push(
                    'Operation took too long to complete',
                    'Remote server is responding slowly',
                    'Resource-intensive task exceeded time limit',
                    'Deadlock or infinite loop in processing'
                );
                break;
            case 'PERMISSION':
                causes.push(
                    'Insufficient permissions to access resource',
                    'Authentication failure',
                    'Expired credentials',
                    'Resource requires authorization'
                );
                break;
            case 'RESOURCE':
                causes.push(
                    'System ran out of memory',
                    'Disk space limitation',
                    'CPU usage limits exceeded',
                    'Resource contention'
                );
                break;
            case 'INPUT':
                causes.push(
                    'Invalid parameters provided to task',
                    'Missing required parameters',
                    'Parameter type mismatch',
                    'Input validation failed'
                );
                break;
            case 'PARSING':
                causes.push(
                    'Malformed response data',
                    'Invalid JSON formatting',
                    'Unexpected data structure',
                    'Character encoding issues'
                );
                break;
            case 'EXTERNAL_API':
                causes.push(
                    'External API returned an error',
                    'API rate limits exceeded',
                    'API service is unavailable',
                    'API contract changed'
                );
                break;
            case 'DATABASE':
                causes.push(
                    'Database connection issues',
                    'Query syntax error',
                    'Constraint violation',
                    'Transaction conflict'
                );
                break;
            case 'INTERNAL':
                causes.push(
                    'Unhandled exception in task code',
                    'Internal system error',
                    'Bug in implementation',
                    'Edge case not properly handled'
                );
                break;
        }
    }

    // Add task-specific causes
    for (const specific of taskSpecific) {
        if (specific.category === 'TASK_SEARCH') {
            causes.push(
                'Search query yielded no results',
                'Search engine limitations or restrictions',
                'Query syntax error'
            );
        } else if (specific.category === 'TASK_NAVIGATE') {
            causes.push(
                'Target URL does not exist',
                'Navigation was blocked',
                'Page requires authentication',
                'Too many redirects'
            );
        } else if (specific.category === 'TASK_SCRAPE' || specific.category === 'TASK_PY_WEB_SCRAPE') {
            causes.push(
                'Target website has anti-scraping measures',
                'HTML structure changed since selector was defined',
                'Content is loaded dynamically with JavaScript',
                'CAPTCHA or bot detection triggered'
            );
        } else if (specific.category === 'TASK_PY_DATA_ANALYSIS') {
            causes.push(
                'Dataset structure does not match expectations',
                'Missing or invalid columns in dataset',
                'Statistical operation not applicable to data type',
                'Dataset too large for available memory'
            );
        }
    }

    // Remove duplicates and limit to top 5 most likely causes
    return [...new Set(causes)].slice(0, 5);
}

/**
 * Generate potential fixes based on error categories and task type
 * @param {Array} categories - Error categories
 * @param {Array} taskSpecific - Task-specific patterns
 * @param {string} taskType - The type of task
 * @returns {Array} Potential fixes for the error
 */
function generatePotentialFixes(categories, taskSpecific, taskType) {
    const fixes = [];

    // Add general fixes based on categories
    for (const category of categories) {
        switch (category.category) {
            case 'NETWORK':
                fixes.push(
                    'Check network connectivity',
                    'Verify target URL is correct and accessible',
                    'Check if server is behind firewall or requires VPN',
                    'Implement retry mechanism with exponential backoff'
                );
                break;
            case 'TIMEOUT':
                fixes.push(
                    'Increase timeout threshold for the task',
                    'Break task into smaller sub-tasks',
                    'Optimize task execution',
                    'Add caching mechanism'
                );
                break;
            case 'PERMISSION':
                fixes.push(
                    'Update authentication credentials',
                    'Request increased permissions',
                    'Verify API keys are valid',
                    'Check if IP address is blocked'
                );
                break;
            case 'RESOURCE':
                fixes.push(
                    'Increase memory allocation for the task',
                    'Optimize resource usage',
                    'Process data in smaller batches',
                    'Implement streaming for large datasets'
                );
                break;
            case 'INPUT':
                fixes.push(
                    'Validate input parameters before task execution',
                    'Provide all required parameters',
                    'Check parameter types and formats',
                    'Add default values for optional parameters'
                );
                break;
            case 'PARSING':
                fixes.push(
                    'Implement more robust parsing logic',
                    'Add error handling for malformed data',
                    'Validate data structure before parsing',
                    'Use schema validation'
                );
                break;
            case 'EXTERNAL_API':
                fixes.push(
                    'Implement API rate limiting compliance',
                    'Add retry mechanism for temporary API issues',
                    'Cache API responses where appropriate',
                    'Check if API contract has changed'
                );
                break;
            case 'DATABASE':
                fixes.push(
                    'Check database connection settings',
                    'Verify query syntax',
                    'Implement transaction retry logic',
                    'Optimize database operations'
                );
                break;
            case 'INTERNAL':
                fixes.push(
                    'Review task implementation for bugs',
                    'Add additional error handling',
                    'Implement logging for better debugging',
                    'Update task code with patches'
                );
                break;
        }
    }

    // Add task-specific fixes
    for (const specific of taskSpecific) {
        if (specific.category === 'TASK_SEARCH') {
            fixes.push(
                'Broaden search query',
                'Try alternative search syntax',
                'Use different search provider',
                'Implement fallback search methods'
            );
        } else if (specific.category === 'TASK_NAVIGATE') {
            fixes.push(
                'Verify URL is correctly formatted',
                'Check if page requires authentication',
                'Increase navigation timeout',
                'Add user-agent header'
            );
        } else if (specific.category === 'TASK_SCRAPE' || specific.category === 'TASK_PY_WEB_SCRAPE') {
            fixes.push(
                'Update CSS selectors or XPath expressions',
                'Add delay between requests to avoid rate limiting',
                'Use headless browser for JavaScript-heavy sites',
                'Implement rotating proxies and user agents',
                'Add CAPTCHA solving capability'
            );
        } else if (specific.category === 'TASK_PY_DATA_ANALYSIS') {
            fixes.push(
                'Validate dataset structure before analysis',
                'Handle missing values appropriately',
                'Implement type checking for columns',
                'Use more memory-efficient data structures',
                'Process large datasets in chunks'
            );
        }
    }

    // Remove duplicates and limit to top 5 most actionable fixes
    return [...new Set(fixes)].slice(0, 5);
}

/**
 * Determine the severity of an error
 * @param {Array} categories - Error categories
 * @param {string} errorMessage - The original error message
 * @returns {string} Severity level: 'LOW', 'MEDIUM', or 'HIGH'
 */
function determineSeverity(categories, errorMessage) {
    // Check for critical keywords in error message
    const criticalKeywords = [
        'critical', 'severe', 'crashed', 'failure', 'security', 'breach',
        'unauthorized', 'corruption', 'data loss', 'fatal'
    ];

    for (const keyword of criticalKeywords) {
        if (errorMessage.toLowerCase().includes(keyword)) {
            return 'HIGH';
        }
    }

    // Check categories for severity
    for (const category of categories) {
        switch (category.category) {
            case 'RESOURCE':
            case 'DATABASE':
            case 'PERMISSION':
                return 'HIGH';
            case 'NETWORK':
            case 'TIMEOUT':
            case 'EXTERNAL_API':
                return 'MEDIUM';
        }
    }

    // Default severity
    return 'LOW';
}

/**
 * Generate a human-readable error report
 * @param {Object} analysis - The error analysis object
 * @returns {string} Human-readable error report
 */
export function generateErrorReport(analysis) {
    const { originalError, analysis: errorAnalysis, metadata } = analysis;

    const categoriesList = errorAnalysis.categories
        .map(c => `- ${c.category}: ${c.description}`)
        .join('\n');

    const causesList = errorAnalysis.likelyCauses
        .map(cause => `- ${cause}`)
        .join('\n');

    const fixesList = errorAnalysis.potentialFixes
        .map(fix => `- ${fix}`)
        .join('\n');

    return `
ERROR ANALYSIS REPORT
=====================
Task Type: ${metadata.taskType}
Timestamp: ${metadata.timestamp}
Severity: ${errorAnalysis.severity}

Original Error
-------------
${originalError.message}

Error Categories
---------------
${categoriesList}

Likely Causes
------------
${causesList}

Potential Fixes
--------------
${fixesList}

${errorAnalysis.severity === 'HIGH' ? 'ATTENTION: This is a high-severity error that requires immediate attention.' : ''}
`.trim();
}

/**
 * Calculate error frequency metrics from a collection of errors
 * @param {Array} errors - Collection of errors to analyze
 * @returns {Object} Error frequency metrics
 */
export function calculateErrorFrequency(errors) {
    const categoryCounts = {};
    const taskTypeCounts = {};
    const patternCounts = {};
    const timeDistribution = {
        'last_hour': 0,
        'last_day': 0,
        'last_week': 0
    };

    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000);
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    for (const error of errors) {
        // Count by category
        if (error.analysis && error.analysis.categories) {
            for (const category of error.analysis.categories) {
                const categoryName = category.category;
                categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;

                // Count by pattern
                const pattern = category.matchedPattern;
                patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
            }
        }

        // Count by task type
        if (error.metadata && error.metadata.taskType) {
            const taskType = error.metadata.taskType;
            taskTypeCounts[taskType] = (taskTypeCounts[taskType] || 0) + 1;
        }

        // Count by time
        if (error.metadata && error.metadata.timestamp) {
            const errorTime = new Date(error.metadata.timestamp);

            if (errorTime >= hourAgo) {
                timeDistribution.last_hour++;
            }

            if (errorTime >= dayAgo) {
                timeDistribution.last_day++;
            }

            if (errorTime >= weekAgo) {
                timeDistribution.last_week++;
            }
        }
    }

    // Sort categories by frequency
    const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count }));

    // Sort task types by frequency
    const sortedTaskTypes = Object.entries(taskTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([taskType, count]) => ({ taskType, count }));

    // Sort patterns by frequency
    const sortedPatterns = Object.entries(patternCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([pattern, count]) => ({ pattern, count }));

    return {
        totalErrors: errors.length,
        byCategory: sortedCategories,
        byTaskType: sortedTaskTypes,
        byPattern: sortedPatterns,
        timeDistribution
    };
}

export default {
    analyzeError,
    generateErrorReport,
    calculateErrorFrequency,
    ERROR_CATEGORIES
}; 