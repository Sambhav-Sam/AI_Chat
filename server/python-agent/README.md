# Python Task Runner Agent

A Python-based service that executes tasks based on natural language instructions. This service works in conjunction with the Node.js backend for task parsing.

## Setup

1. Copy `.env.example` to `.env` and update with your API keys
2. Install dependencies: `pip install -r requirements.txt`
3. Run the service: `python task_runner.py`

## API Endpoints

- `GET /`: Check if the service is running
- `POST /task/execute`: Execute a task based on natural language input
- `GET /task/{task_id}`: Get the status and result of a task by ID

## Docker

Build the Docker image:
```
docker build -t python-agent .
```

Run the container:
```
docker run -p 8000:8000 --env-file .env python-agent
```

## Integration with Node.js Backend

This service communicates with the Node.js backend via HTTP. The NODEJS_API_URL environment variable specifies the URL of the Node.js API endpoint for task parsing. 