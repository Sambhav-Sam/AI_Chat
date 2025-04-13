# Plugin System for AI Task Runner

This document explains the plugin system architecture and how to create new plugins for the AI Task Runner.

## Overview

The plugin system allows the task runner to be extended with new capabilities through modular JavaScript files. Each plugin is a separate module that can handle one or more task intents, providing a clean separation of concerns and making the system more maintainable and extensible.

## Architecture

The plugin system consists of the following components:

1. **Plugin Loader** (`plugins/pluginLoader.js`) - Core module that discovers, loads, and manages plugins
2. **Individual Plugins** (`plugins/*.js`) - Separate modules that implement specific functionality (calendar, email, etc.)
3. **Task Executor Integration** (`taskExecutor.js`) - Modified to use plugins when available

### Plugin Discovery Flow:

```
┌─────────────────┐     ┌───────────────┐     ┌─────────────────┐
│  Task Executor  │────▶│ Plugin Loader │────▶│ Plugin Registry │
└─────────────────┘     └───────────────┘     └─────────────────┘
         │                                            │
         │                                            ▼
         │                                    ┌─────────────────┐
         │                                    │  Plugin Files   │
         │                                    └─────────────────┘
         ▼                                            │
┌─────────────────┐                                   │
│  Task Execution │◀───────────────────────────────────
└─────────────────┘
```

### Task Execution Flow:

1. Task is received with an intent and parameters
2. Plugin system checks if a plugin can handle the intent
3. If a matching plugin is found, the task is executed by the plugin
4. If no plugin is found, falls back to the legacy execution system

## Creating a New Plugin

To create a new plugin, follow these steps:

1. Create a new file in the `plugins` directory (e.g., `myPlugin.js`)
2. Implement the required plugin structure
3. Export the required functions

### Required Plugin Structure

Each plugin must export:

1. **manifest** - Object that describes the plugin
2. **execute** - Function that handles task execution
3. **Plugin-specific functions** - Functions that implement the plugin's capabilities

### Plugin Manifest

The manifest object describes the plugin and its capabilities:

```javascript
export const manifest = {
    name: "My Plugin",
    version: "1.0.0",
    description: "Handles specific tasks related to my functionality",
    author: "Your Name",
    intents: [
        "my_intent_1",
        "my_intent_2"
    ]
};
```

### Execute Function

The `execute` function is the main entry point for task execution:

```javascript
export async function execute(intent, parameters) {
    switch (intent) {
        case "my_intent_1":
            return await myFunction1(parameters);
        case "my_intent_2":
            return await myFunction2(parameters);
        default:
            throw new Error(`Unsupported intent: ${intent}`);
    }
}
```

### Implementation Functions

These functions implement the specific capabilities of your plugin:

```javascript
export async function myFunction1(params) {
    // Function implementation
    return {
        success: true,
        result: "Some result"
    };
}

export async function myFunction2(params) {
    // Another function implementation
    return {
        success: true,
        data: {
            // Some data
        }
    };
}
```

## Example: Creating a Weather Plugin

Here's an example of a simple weather plugin:

```javascript
// plugins/weather.js

// Plugin manifest
export const manifest = {
    name: "Weather Plugin",
    version: "1.0.0",
    description: "Retrieves weather forecasts and conditions",
    author: "AI Task Runner Team",
    intents: [
        "get_weather",
        "get_forecast"
    ]
};

// Get current weather
export async function getCurrentWeather(params) {
    const { location } = params;
    
    // Validate inputs
    if (!location) {
        throw new Error("Location is required");
    }
    
    // In a real implementation, this would call a weather API
    // Mock implementation for demonstration
    return {
        success: true,
        weather: {
            location,
            temperature: 72,
            condition: "Sunny",
            humidity: 45,
            timestamp: new Date().toISOString()
        }
    };
}

// Get weather forecast
export async function getForecast(params) {
    const { location, days = 5 } = params;
    
    // Validate inputs
    if (!location) {
        throw new Error("Location is required");
    }
    
    // In a real implementation, this would call a weather API
    // Mock implementation for demonstration
    const forecast = [];
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        forecast.push({
            date: date.toISOString(),
            temperature: 70 + Math.floor(Math.random() * 10),
            condition: ["Sunny", "Partly Cloudy", "Cloudy", "Rainy"][Math.floor(Math.random() * 4)]
        });
    }
    
    return {
        success: true,
        forecast,
        location
    };
}

// Execute function - main entry point
export async function execute(intent, parameters) {
    switch (intent) {
        case "get_weather":
            return await getCurrentWeather(parameters);
        case "get_forecast":
            return await getForecast(parameters);
        default:
            throw new Error(`Unsupported intent: ${intent}`);
    }
}
```

## Testing Plugins

To test your plugins, use the provided test script:

```bash
node server/testPlugins.js
```

This script will demonstrate how the plugins are loaded and executed.

## Best Practices

1. **Maintain consistent error handling** - Always return objects with `success` property
2. **Validate input parameters** - Check that required parameters are provided
3. **Document your plugin** - Include clear comments and JSDoc annotations
4. **Include mock implementations** - Useful for testing without external dependencies
5. **Follow the existing plugin patterns** - For consistency across the codebase

## Advanced Topics

### Plugin Dependencies

If your plugin depends on external libraries, you'll need to:

1. Add them to the project's `package.json`
2. Import them in your plugin file

### Plugin Configuration

For plugins that need configuration:

1. Create a config object in your plugin file
2. Load configuration from environment variables or configuration files

```javascript
// Example configuration
const config = {
    apiKey: process.env.MY_PLUGIN_API_KEY || 'default_key',
    endpoint: process.env.MY_PLUGIN_ENDPOINT || 'https://api.example.com'
};
```

### Extending the Plugin System

To extend the plugin system itself:

1. Modify `pluginLoader.js` to add new capabilities
2. Update the plugin interface as needed
3. Document changes in this README 