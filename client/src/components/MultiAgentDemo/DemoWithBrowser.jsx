import React, { useState, useEffect, useRef } from 'react';
import { Box, Grid, Paper, Typography, TextField, Button, IconButton, Divider, CircularProgress } from '@mui/material';
import { Send, Clear, PlayArrow, Pause, TouchApp, SmartToy } from '@mui/icons-material';
import io from 'socket.io-client';
import './DemoWithBrowser.css';

// Import remote browser components
import BrowserView from '../RemoteAgent/BrowserView';
import ChatPanel from '../RemoteAgent/ChatPanel';
import ReasoningPanel from '../RemoteAgent/ReasoningPanel';
import LogPanel from '../RemoteAgent/LogPanel';
import ActionHistory from '../RemoteAgent/ActionHistory';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const DemoWithBrowser = () => {
  // State for demo
  const [demoState, setDemoState] = useState('idle'); // idle, running, error
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  
  // State for remote browser
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserImage, setBrowserImage] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [agentStatus, setAgentStatus] = useState('idle');
  const [controlMode, setControlMode] = useState('agent');
  const [currentTask, setCurrentTask] = useState(null);
  const [reasoningSteps, setReasoningSteps] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Refs
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const logsEndRef = useRef(null);
  
  // Connect to WebSocket
  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io(SOCKET_URL);
    
    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected');
      addMessage('system', 'Connected to server');
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      addMessage('system', 'Disconnected from server');
      setDemoState('error');
    });
    
    // Demo-specific events
    socketRef.current.on('demo:task-status', (data) => {
      addMessage('system', data.message);
      setDemoState(data.status === 'complete' ? 'idle' : 'running');
      
      if (data.result) {
        addMessage('response', data.result.response);
      }
    });
    
    socketRef.current.on('demo:error', (data) => {
      addMessage('error', data.message);
      setDemoState('error');
    });
    
    // Browser visibility events
    socketRef.current.on('demo:show-browser', (data) => {
      setShowBrowser(true);
      addMessage('system', data.message);
    });
    
    socketRef.current.on('demo:hide-browser', (data) => {
      setShowBrowser(false);
      addMessage('system', data.message);
    });
    
    // Remote browser events
    socketRef.current.on('browser:screenshot', (data) => {
      setBrowserImage(`data:image/jpeg;base64,${data.image}`);
    });
    
    socketRef.current.on('browser:cursor', (data) => {
      setCursorPosition({ x: data.x, y: data.y });
      setShowCursor(true);
      
      // Hide cursor after 3 seconds of inactivity
      setTimeout(() => {
        setShowCursor(false);
      }, 3000);
    });
    
    // Agent status events
    socketRef.current.on('agent:status', (data) => {
      setAgentStatus(data.status);
      setControlMode(data.control || 'agent');
    });
    
    socketRef.current.on('agent:control', (data) => {
      setControlMode(data.mode);
    });
    
    // Agent task events
    socketRef.current.on('agent:task', (data) => {
      switch (data.status) {
        case 'start':
          setCurrentTask(data);
          setReasoningSteps([]);
          break;
          
        case 'complete':
          setCurrentTask({ ...currentTask, status: 'complete' });
          addMessage('system', `Task completed in ${(data.duration / 1000).toFixed(2)}s`);
          break;
          
        case 'error':
          setCurrentTask({ ...currentTask, status: 'error', error: data.error });
          addMessage('error', `Task failed: ${data.error}`);
          break;
          
        default:
          break;
      }
    });
    
    // Reasoning events
    socketRef.current.on('agent:reasoning', (data) => {
      setReasoningSteps(prev => [...prev, data]);
      addLog('info', `Reasoning: ${data.reasoning}`);
    });
    
    // Action events
    socketRef.current.on('agent:action', (data) => {
      addLog(data.status === 'error' ? 'error' : 'action', 
        `${data.action} ${data.target ? data.target : ''} - ${data.status}${data.error ? ': ' + data.error : ''}`);
      
      // Add actions to chat as well
      if (data.status === 'start') {
        addMessage('action', `${data.action} ${data.target || ''}`);
      }
    });
    
    // History events
    socketRef.current.on('agent:history', (data) => {
      setActionHistory(data.history);
    });
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Scroll to bottom of logs when logs change
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  // Add a message to the chat
  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text, timestamp: new Date() }]);
  };
  
  // Add a log entry
  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };
  
  // Clear messages
  const clearMessages = () => {
    setMessages([]);
    addMessage('system', 'Messages cleared');
  };
  
  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('system', 'Logs cleared');
  };
  
  // Submit a task
  const handleSubmitTask = async () => {
    if (!prompt.trim() || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setDemoState('running');
      addMessage('user', prompt);
      
      // Send to server for execution
      socketRef.current.emit('demo:execute-task', {
        prompt: prompt.trim(),
        options: {}
      });
      
      setPrompt('');
    } catch (error) {
      console.error('Error submitting task:', error);
      addMessage('error', `Error: ${error.message}`);
      setDemoState('error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Pause agent
  const handlePause = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('agent:pause');
  };
  
  // Resume agent
  const handleResume = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('agent:resume');
  };
  
  // Switch to manual control
  const handleSwitchToManual = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('agent:manual');
  };
  
  // Switch to agent control
  const handleSwitchToAgent = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('agent:auto');
  };
  
  // Undo last action
  const handleUndoAction = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('agent:undo');
  };
  
  // Send manual browser command
  const handleSendManualCommand = (command) => {
    if (!socketRef.current || controlMode !== 'manual') return;
    socketRef.current.emit('browser:command', command);
  };
  
  return (
    <Box className="demo-with-browser">
      <Box className="demo-header">
        <Typography variant="h4" component="h1">
          AI Assistant with Browser Automation
        </Typography>
        <Typography variant="subtitle1">
          Ask a question or provide a task. For web browsing, simply ask to search or visit a website.
        </Typography>
      </Box>
      
      {/* Two-column layout when browser is shown, single column otherwise */}
      <Box className={`demo-content ${showBrowser ? 'with-browser' : ''}`}>
        {/* Left side: Chat and input (always shown) */}
        <Box className="demo-chat-column">
          <Paper elevation={3} className="demo-chat-container">
            <Box className="demo-chat-header">
              <Typography variant="h6">Chat</Typography>
              <IconButton onClick={clearMessages} size="small">
                <Clear fontSize="small" />
              </IconButton>
            </Box>
            
            <Box className="demo-chat-messages">
              <ChatPanel messages={messages} chatEndRef={chatEndRef} />
            </Box>
            
            <Box className="demo-chat-input">
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Enter a task or question..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitTask();
                  }
                }}
                disabled={isSubmitting || demoState === 'running'}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      color="primary"
                      onClick={handleSubmitTask}
                      disabled={isSubmitting || demoState === 'running' || !prompt.trim()}
                    >
                      {isSubmitting ? <CircularProgress size={24} /> : <Send />}
                    </IconButton>
                  )
                }}
              />
            </Box>
          </Paper>
          
          {/* Logs panel (only shown when browser is not active) */}
          {!showBrowser && (
            <Paper elevation={3} className="demo-logs-container">
              <Box className="demo-logs-header">
                <Typography variant="h6">Logs</Typography>
                <IconButton onClick={clearLogs} size="small">
                  <Clear fontSize="small" />
                </IconButton>
              </Box>
              
              <Box className="demo-logs-content">
                <LogPanel logs={logs} logsEndRef={logsEndRef} />
              </Box>
            </Paper>
          )}
        </Box>
        
        {/* Right side: Browser UI (only shown during browser tasks) */}
        {showBrowser && (
          <Box className="demo-browser-column">
            <Paper elevation={3} className="demo-browser-container">
              <Box className="demo-browser-header">
                <Typography variant="h6">Remote Browser</Typography>
                <Box>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    size="small"
                    startIcon={controlMode === 'manual' ? <SmartToy /> : <TouchApp />}
                    onClick={controlMode === 'manual' ? handleSwitchToAgent : handleSwitchToManual}
                    sx={{ mr: 1 }}
                  >
                    {controlMode === 'manual' ? 'Agent Control' : 'Manual Control'}
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="secondary"
                    size="small"
                    startIcon={agentStatus === 'paused' ? <PlayArrow /> : <Pause />}
                    onClick={agentStatus === 'paused' ? handleResume : handlePause}
                    disabled={!currentTask}
                  >
                    {agentStatus === 'paused' ? 'Resume' : 'Pause'}
                  </Button>
                </Box>
              </Box>
              
              <Box className="demo-browser-view">
                <BrowserView 
                  image={browserImage} 
                  cursorPosition={cursorPosition} 
                  showCursor={showCursor}
                  onManualCommand={handleSendManualCommand}
                  manualMode={controlMode === 'manual'}
                />
              </Box>
              
              <Box className="demo-browser-footer">
                <ActionHistory 
                  actions={actionHistory} 
                  onUndo={handleUndoAction}
                />
              </Box>
            </Paper>
            
            <Paper elevation={3} className="demo-reasoning-container">
              <Box className="demo-reasoning-header">
                <Typography variant="h6">Chain of Thought</Typography>
              </Box>
              
              <Box className="demo-reasoning-content">
                <ReasoningPanel 
                  steps={reasoningSteps} 
                  currentTask={currentTask}
                />
              </Box>
            </Paper>
            
            <Paper elevation={3} className="demo-browser-logs-container">
              <Box className="demo-browser-logs-header">
                <Typography variant="h6">Logs</Typography>
                <IconButton onClick={clearLogs} size="small">
                  <Clear fontSize="small" />
                </IconButton>
              </Box>
              
              <Box className="demo-browser-logs-content">
                <LogPanel logs={logs} logsEndRef={logsEndRef} />
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DemoWithBrowser; 