#!/usr/bin/env python3
import os
import json
import requests
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import uvicorn
import openai
import sys
import time

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Task Runner API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client if API key is available
openai_api_key = os.getenv("OPENAI_API_KEY")
client = None
if openai_api_key:
    client = openai.OpenAI(api_key=openai_api_key)

# Define Pydantic models
class TaskRequest(BaseModel):
    input: str

class TaskResponse(BaseModel):
    status: str
    task_id: str = None
    result: dict = None

# Dictionary to store tasks
tasks = {}

# Core function to execute a task
def execute_task(task):
    """
    Execute a task based on the parsed task object.
    This function can be called from the API or directly when running in a container.
    
    Args:
        task (dict): The parsed task object with intent and parameters
        
    Returns:
        dict: Result of the task execution
    """
    try:
        print(f"Executing Python task with intent: {task.get('intent', 'unknown')}")
        
        # Extract intent and parameters
        intent = task.get('intent', '').lower()
        parameters = task.get('parameters', {})
        
        # Initialize result structure
        result = {
            'success': True,
            'screenshots': [],
            'errors': [],
            'taskType': 'python_' + intent,
            'timestamp': time.time()
        }
        
        # Execute task based on intent
        if intent == 'web_scrape':
            result.update(execute_web_scrape_task(parameters))
        elif intent == 'data_analysis':
            result.update(execute_data_analysis_task(parameters))
        elif intent == 'image_processing':
            result.update(execute_image_processing_task(parameters))
        else:
            # Default handler for unknown intents
            result.update({
                'success': False,
                'errors': [f"Unknown Python task intent: {intent}"],
                'data': {'message': 'This intent is not implemented in the Python agent'}
            })
            
        return result
    
    except Exception as e:
        print(f"Error executing Python task: {str(e)}")
        traceback.print_exc()
        return {
            'success': False,
            'screenshots': [],
            'errors': [str(e)],
            'taskType': 'python_task',
            'timestamp': time.time()
        }

# Sample task implementations
def execute_web_scrape_task(parameters):
    """Execute a web scraping task"""
    # This is a placeholder implementation
    print(f"Web scraping parameters: {parameters}")
    return {
        'data': {
            'scraped_content': f"Sample scraped content from {parameters.get('url', 'unknown')}"
        }
    }

def execute_data_analysis_task(parameters):
    """Execute a data analysis task"""
    # This is a placeholder implementation
    print(f"Data analysis parameters: {parameters}")
    return {
        'data': {
            'analysis_result': f"Sample analysis of {parameters.get('dataset', 'unknown_dataset')}"
        }
    }

def execute_image_processing_task(parameters):
    """Execute an image processing task"""
    # This is a placeholder implementation
    print(f"Image processing parameters: {parameters}")
    return {
        'data': {
            'processed_image': f"Sample processed image from {parameters.get('image_url', 'unknown')}"
        }
    }

@app.get("/")
async def root():
    return {"message": "Task Runner API is running"}

@app.post("/task/execute", response_model=TaskResponse)
async def api_execute_task(request: TaskRequest):
    """
    Execute a task based on the natural language input.
    This endpoint will call the Node.js backend to parse the task,
    then execute the task based on the structured data.
    """
    try:
        # Call Node.js backend to parse the task
        nodejs_url = os.getenv("NODEJS_API_URL", "http://server:5000/api/parse-task")
        response = requests.post(
            nodejs_url,
            json={"input": request.input},
            timeout=30
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to parse task")
        
        parsed_task = response.json()
        
        # Execute the task based on intent
        task_id = str(len(tasks) + 1)
        
        # Call the core execution function
        result = execute_task(parsed_task)
        
        # Store the task
        tasks[task_id] = {
            "input": request.input,
            "parsed_task": parsed_task,
            "status": "completed",
            "result": result
        }
        
        return {
            "status": "success",
            "task_id": task_id,
            "result": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/task/{task_id}")
async def get_task(task_id: str):
    """Get the status and result of a task by ID"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return tasks[task_id]

# This allows the module to be run directly or imported
if __name__ == "__main__":
    # Check if we're being run as a direct script with a task input file
    if len(sys.argv) > 1 and sys.argv[1] == '--execute-task':
        try:
            task_file = sys.argv[2]
            with open(task_file, 'r') as f:
                task = json.load(f)
            
            result = execute_task(task)
            output_file = task_file.replace('_input.', '_output.')
            with open(output_file, 'w') as f:
                json.dump(result, f)
            print(f"Task executed successfully, results written to {output_file}")
            sys.exit(0)
        except Exception as e:
            print(f"Error executing task: {str(e)}")
            traceback.print_exc()
            sys.exit(1)
    else:
        # Start the API server
        port = int(os.getenv("PYTHON_PORT", "8000"))
        print(f"Starting Task Runner API on port {port}")
        uvicorn.run("task_runner:app", host="0.0.0.0", port=port, reload=False) 