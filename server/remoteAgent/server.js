/**
 * Remote Agent Server
 * Handles API endpoints and WebSocket connections for remote browser automation
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import AgentController from './agentController.js';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/remote-agent');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        return false;
    }
};

// Initialize Express
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Initialize Socket.IO with CORS settings
const io = new SocketIOServer(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Initialize agent controller
let agentController = null;

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// API endpoints for remote browser control
app.post('/api/agent/execute', async (req, res) => {
    try {
        const { prompt, options } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, error: 'Prompt is required' });
        }

        if (!agentController || !agentController.isRunning) {
            return res.status(503).json({
                success: false,
                error: 'Agent controller is not initialized'
            });
        }

        // This will execute asynchronously - we'll respond immediately
        // and the client will receive updates via WebSocket
        agentController.executeTask(prompt, options).catch(error => {
            console.error('Error executing task:', error);
        });

        res.json({
            success: true,
            message: 'Task execution started'
        });
    } catch (error) {
        console.error('Error processing execute request:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// Get agent status
app.get('/api/agent/status', (req, res) => {
    if (!agentController) {
        return res.json({
            status: 'uninitialized',
            isRunning: false
        });
    }

    res.json({
        status: agentController.isPaused ? 'paused' : 'running',
        control: agentController.manualControl ? 'manual' : 'agent',
        isRunning: agentController.isRunning,
        isTaskRunning: !!agentController.currentTask
    });
});

// Start the server
async function startServer() {
    // Database connection
    const dbConnected = await connectDB();
    if (!dbConnected) {
        console.error('Failed to connect to database. Server will start but functionality may be limited.');
    }

    // Initialize agent controller
    agentController = new AgentController(io);
    const initialized = await agentController.initialize();

    if (!initialized) {
        console.error('Failed to initialize agent controller. Please check the logs for details.');
    } else {
        console.log('Agent controller initialized successfully');
    }

    // Set up Socket.IO namespace for agent events
    const agentNamespace = io.of('/agent');

    agentNamespace.on('connection', (socket) => {
        console.log('Client connected to agent namespace');

        // Disconnect event
        socket.on('disconnect', () => {
            console.log('Client disconnected from agent namespace');
        });
    });

    // Start HTTP server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Remote Agent WebSocket available at ws://localhost:${PORT}`);
    });

    // Handle shutdown
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

// Clean up resources on shutdown
async function cleanup() {
    console.log('Shutting down server...');

    if (agentController) {
        await agentController.close();
    }

    // Close MongoDB connection
    if (mongoose.connection.readyState) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }

    // Exit process
    process.exit(0);
}

// Start the server
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
}); 