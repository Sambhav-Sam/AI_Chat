# Task Isolation System

This document explains the task isolation system used in our automation framework. The isolation system provides security and resource management by running automation tasks in isolated environments.

## Overview

The task isolation system has two main isolation methods:

1. **JavaScript Task Isolation**: Runs JavaScript tasks in separate Node.js child processes
2. **Python Task Isolation**: Runs Python tasks in isolated Docker containers

## Architecture

```
┌───────────────────┐
│  Task Execution   │
│     Framework     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Task Isolation   │
│     Manager       │
└────┬──────────┬───┘
     │          │
     ▼          ▼
┌─────────┐ ┌──────────┐
│ Node.js │ │  Docker  │
│  Child  │ │Container │
│ Process │ │(Python)  │
└─────────┘ └──────────┘
```

## Components

### 1. taskExecutor.js

The main task execution framework that routes tasks to the appropriate modules. It uses `taskIsolationManager.js` to run tasks in isolation.

### 2. taskIsolationManager.js

Central manager for task isolation that:
- Determines whether to run tasks in Node.js child processes or Docker containers
- Creates temporary files and runs isolation processes
- Manages timeouts and error handling
- Collects results and logs

### 3. Python Task Modules

JavaScript modules (like `py_web_scrape.js` and `py_data_analysis.js`) that serve as bridges between the Node.js server and Python containers.

### 4. Python Agent

The `python-agent` directory contains:
- `Dockerfile`: Defines the Python environment
- `task_runner.py`: Core Python task execution code
- `requirements.txt`: Python dependencies

## How It Works

### JavaScript Task Isolation

1. A temporary JavaScript file is created for the task
2. The file is executed in a separate Node.js process using `child_process.spawn`
3. The process runs with its own memory space and is constrained by a timeout
4. Results are communicated via temporary files and process exit codes

### Python Task Isolation

1. Task parameters are written to a temporary JSON file
2. A Docker container is started with mounted input/output files
3. The Python code in the container reads the input, executes the task, and writes results
4. The container is automatically removed after execution
5. Results are read from the output file

## Security Considerations

- All input/output is handled through files, not command-line arguments
- Container execution uses read-only mounts where possible
- Timeouts prevent runaway processes
- Resource limits are applied to containers
- All errors are caught and do not crash the main server

## Example Usage

### Execute a JavaScript Task in Isolation

```javascript
const task = {
    intent: 'search',
    parameters: {
        query: 'isolation examples',
        site: 'google.com'
    }
};

const result = await executeTask(task);
```

### Execute a Python Task in Isolation

```javascript
const task = {
    intent: 'py_web_scrape',
    parameters: {
        url: 'https://example.com',
        depth: 1
    },
    executor: 'python'
};

const result = await executeTask(task);
```

## Setup Instructions

1. Build the Python Docker image:
   ```
   node buildPythonImage.js
   ```

2. Run the isolation tests:
   ```
   node testIsolation.js
   ```

3. Use the API endpoint for isolated execution:
   ```
   POST /api/tasks/execute-isolated
   ```

## Adding New Task Types

### For JavaScript Tasks:

1. Create a new file in `server/tasks/` with your task implementation
2. Export an `execute()` function

### For Python Tasks:

1. Add a new task handler in `python-agent/task_runner.py`
2. Create a corresponding bridge module in `server/tasks/py_yourTask.js` 