# React Website Automation Tool

A Node.js-based automation tool built with Playwright to interact with React-based websites.

## Features

- Navigate to websites and wait for page load
- Perform common UI interactions (click, type, select)
- Take screenshots during automation
- Handle errors gracefully with detailed logging
- Export results including screenshots and logs

## Installation

```bash
# Clone the repository
npm install
```

## Usage

### Basic Example

```javascript
import { automateWebsite } from './automateWebsites.js';

// Define your task with URL and actions
const task = {
  url: 'https://example.com',
  actions: [
    { type: 'wait', selector: '#app' },
    { type: 'click', selector: 'button.login' },
    { type: 'type', selector: 'input[name="username"]', text: 'testuser' },
    { type: 'type', selector: 'input[name="password"]', text: 'password123' },
    { type: 'click', selector: 'button[type="submit"]' },
    { type: 'wait', selector: '.dashboard' },
    { type: 'screenshot', name: 'logged_in' }
  ]
};

// Run the automation
const results = await automateWebsite(task, {
  headless: false,
  outputDir: './screenshots'
});

console.log('Automation results:', results);
```

### Available Actions

- **click**: Click on an element
  ```js
  { type: 'click', selector: 'button.submit', timeout: 5000 }
  ```

- **type**: Type text into an input field
  ```js
  { type: 'type', selector: 'input#email', text: 'user@example.com' }
  ```

- **select**: Select an option from a dropdown
  ```js
  { type: 'select', selector: 'select#country', value: 'USA' }
  ```

- **wait**: Wait for an element, network idle, or a specific time
  ```js
  { type: 'wait', selector: '.results' }
  { type: 'wait', milliseconds: 2000 }
  { type: 'wait' } // Waits for network idle
  ```

- **screenshot**: Take a screenshot
  ```js
  { type: 'screenshot', name: 'search_results' }
  ```

### Options

The `automateWebsite` function accepts the following options:

```javascript
{
  headless: true, // Run browser in headless mode
  outputDir: './screenshots' // Directory to save screenshots
}
```

## Running the Example

To run the included example:

```bash
npm run example
```

## License

ISC 