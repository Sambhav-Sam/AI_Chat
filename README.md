# Remote Browser Agent with Chain of Thought

This project implements a browser automation system with a visual interface that shows the agent's reasoning and browser actions in real-time.

## Features

- 🧠 **Chain of Thought Reasoning**: Shows step-by-step reasoning process
- 🌐 **Live Browser View**: Real-time view of browser actions using Playwright
- 🖱️ **Cursor Visualization**: Shows cursor movements and clicks
- ⏯️ **Pause/Resume**: Pause and resume agent actions
- 🔄 **Manual/Agent Control**: Switch between agent and manual control modes
- ↩️ **Action History**: View recent actions and undo functionality
- 📝 **Comprehensive Logs**: Detailed logging of all actions and events

## System Architecture

### Backend

- **Express.js**: API endpoints and static file serving
- **Socket.IO**: Real-time bidirectional communication
- **Playwright**: Browser automation in headed mode
- **MongoDB**: Logging tasks, reasoning steps, and actions for rollback
- **OpenAI**: Chain of thought reasoning generation (optional)

### Frontend

- **React**: UI components for the interface
- **Material-UI**: Component library for design
- **Socket.IO Client**: Real-time communication with the backend

## Setup

### Prerequisites

- Node.js 16+
- MongoDB (local or Atlas)
- Browser (Chrome recommended)

### Backend Setup

1. Install dependencies:
   ```
   cd server/remoteAgent
   npm install
   ```

2. Install Playwright browser:
   ```
   npx playwright install chromium
   ```

3. Create a `.env` file in the `server/remoteAgent` directory:
   ```
   MONGODB_URI=mongodb://localhost:27017/remote-agent
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key (optional)
   ```

4. Start the server:
   ```
   npm start
   ```

### Frontend Setup

1. Install dependencies:
   ```
   cd client
   npm install
   ```

2. Start the frontend development server:
   ```
   npm start
   ```

3. Open your browser to:
   ```
   http://localhost:3000
   ```

## Usage

1. **Start a Task**: Type a prompt in the chat box and press Enter (e.g., "Search for climate change")

2. **Observe the Process**:
   - Left side shows the live browser view
   - Right side shows chain of thought reasoning and logs

3. **Control Options**:
   - Use Pause/Resume button to control agent execution
   - Switch to Manual Control to take direct control
   - Use Undo button to revert the last action

4. **Manual Control Mode**:
   - Use the URL bar to navigate
   - Click on the browser view to interact
   - Switch back to Agent Control when done

## Example Prompts

- "Search for the latest news about artificial intelligence"
- "Go to wikipedia.org and search for climate change"
- "Fill out a contact form on example.com"
- "Buy a laptop on Amazon"
- "Book a hotel in New York for next weekend"

## Development

### Backend Structure

- `server.js`: Main server setup and Socket.IO initialization
- `agentController.js`: Manages agent state and task execution
- `browserController.js`: Controls browser using Playwright
- `reasoningEngine.js`: Generates chain of thought reasoning

### Frontend Structure

- `RemoteAgent.jsx`: Main component coordinating UI and WebSocket
- `BrowserView.jsx`: Displays browser screen and cursor
- `ChatPanel.jsx`: Manages chat interface
- `ReasoningPanel.jsx`: Displays reasoning steps
- `LogPanel.jsx`: Shows logs of browser and agent actions
- `ActionHistory.jsx`: Displays history of actions with undo

## Troubleshooting

### Common Issues

- **Browser not launching**: Make sure Playwright is installed correctly
- **WebSocket connection errors**: Check if the backend server is running
- **Missing browser view**: Ensure browser is not being launched in headless mode
- **MongoDB connection errors**: Verify MongoDB is running and connection string is correct

### Debugging

- View browser console for frontend errors
- Check server logs for backend and Playwright issues
- Increase logging verbosity in the `.env` file with `DEBUG=playwright:*` 