import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Box, Grid, Paper, Typography, Button, TextField, IconButton, Divider } from '@mui/material';
import { PlayArrow, Pause, Undo, TouchApp, SmartToy, Clear, Send } from '@mui/icons-material';
import BrowserView from './BrowserView';
import ChatPanel from './ChatPanel';
import ReasoningPanel from './ReasoningPanel';
import LogPanel from './LogPanel';
import ActionHistory from './ActionHistory';
import './RemoteAgent.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const RemoteAgent = () => {
  // State
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [browserImage, setBrowserImage] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [agentStatus, setAgentStatus] = useState('idle');
  const [controlMode, setControlMode] = useState('agent');
  const [currentTask, setCurrentTask] = useState(null);
  const [reasoningSteps, setReasoningSteps] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const logsEndRef = useRef(null);
  
  // Connect to WebSocket
  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io(SOCKET_URL);
    setSocket(socketRef.current);
    
    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket.IO connected');
      setConnected(true);
      addLog('system', 'Connected to server');
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setConnected(false);
      addLog('error', 'Disconnected from server');
    });
    
    socketRef.current.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setConnected(false);
      addLog('error', `Connection error: ${error.message}`);
    });
    
    // Screenshot events
    socketRef.current.on('browser:screenshot', (data) => {
      setBrowserImage(`data:image/jpeg;base64,${data.image}`);
    });
    
    // Cursor events
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
      addLog('system', `Agent status: ${data.status}, Control mode: ${data.control || 'agent'}`);
    });
    
    // Agent control mode events
    socketRef.current.on('agent:control', (data) => {
      setControlMode(data.mode);
      addLog('system', `Control mode changed to: ${data.mode}`);
    });
    
    // Agent task events
    socketRef.current.on('agent:task', (data) => {
      switch (data.status) {
        case 'start':
          setCurrentTask(data);
          setReasoningSteps([]);
          addLog('system', `Task started: ${data.prompt}`);
          addChatMessage('system', `Starting task: ${data.prompt}`);
          break;
          
        case 'complete':
          setCurrentTask({ ...currentTask, status: 'complete' });
          addLog('system', `Task completed in ${(data.duration / 1000).toFixed(2)}s`);
          addChatMessage('system', `Task completed successfully in ${(data.duration / 1000).toFixed(2)} seconds`);
          break;
          
        case 'error':
          setCurrentTask({ ...currentTask, status: 'error', error: data.error });
          addLog('error', `Task failed: ${data.error}`);
          addChatMessage('system', `Task failed: ${data.error}`);
          break;
          
        default:
          break;
      }
    });
    
    // Reasoning events
    socketRef.current.on('agent:reasoning', (data) => {
      setReasoningSteps(prev => [...prev, data]);
      addLog('info', `Reasoning step ${data.step}/${data.total}: ${data.reasoning}`);
    });
    
    // Action events
    socketRef.current.on('agent:action', (data) => {
      addLog(data.status === 'error' ? 'error' : 'action', 
        `${data.action} ${data.target ? data.target : ''} - ${data.status}${data.error ? ': ' + data.error : ''}`);
      
      if (data.status === 'start') {
        addChatMessage('action', `${data.action} ${data.target || ''}`);
      }
    });
    
    // Agent history events
    socketRef.current.on('agent:history', (data) => {
      setActionHistory(data.history);
    });
    
    // Browser events
    socketRef.current.on('browser:console', (data) => {
      addLog('browser', `Console ${data.type}: ${data.text}`);
    });
    
    socketRef.current.on('browser:navigation', (data) => {
      addLog('browser', `Navigated to: ${data.url}`);
    });
    
    // Error events
    socketRef.current.on('agent:error', (data) => {
      addLog('error', `Error: ${data.message}`);
      addChatMessage('system', `Error: ${data.message}`);
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
  }, [chatMessages]);
  
  // Scroll to bottom of logs when logs change
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  // Add a log message
  const addLog = (type, message) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };
  
  // Add a chat message
  const addChatMessage = (sender, text) => {
    setChatMessages(prev => [...prev, { sender, text, timestamp: new Date() }]);
  };
  
  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('system', 'Logs cleared');
  };
  
  // Clear chat
  const clearChat = () => {
    setChatMessages([]);
    addChatMessage('system', 'Chat cleared');
  };
  
  // Submit a prompt to the agent
  const handleSubmitPrompt = async () => {
    if (!prompt.trim() || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      addChatMessage('user', prompt);
      
      // Send prompt to agent via API
      const response = await fetch(`${API_URL}/agent/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt.trim() })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        addChatMessage('system', `Error: ${data.error}`);
        addLog('error', `Failed to start task: ${data.error}`);
      }
      
      setPrompt('');
    } catch (error) {
      console.error('Error submitting prompt:', error);
      addChatMessage('system', `Error: ${error.message}`);
      addLog('error', `Error submitting prompt: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Pause agent
  const handlePause = () => {
    if (!socket) return;
    socket.emit('agent:pause');
  };
  
  // Resume agent
  const handleResume = () => {
    if (!socket) return;
    socket.emit('agent:resume');
  };
  
  // Switch to manual control
  const handleSwitchToManual = () => {
    if (!socket) return;
    socket.emit('agent:manual');
  };
  
  // Switch to agent control
  const handleSwitchToAgent = () => {
    if (!socket) return;
    socket.emit('agent:auto');
  };
  
  // Undo last action
  const handleUndoAction = () => {
    if (!socket) return;
    socket.emit('agent:undo');
  };
  
  // Send manual command in manual mode
  const handleSendManualCommand = (command) => {
    if (!socket || controlMode !== 'manual') return;
    socket.emit('browser:command', command);
  };
  
  return (
    <Box className="remote-agent-container">
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Left side: Browser view */}
        <Grid item xs={12} md={7} lg={8} sx={{ height: '100%' }}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5">Remote Browser</Typography>
              <Box>
                <Button 
                  variant="outlined" 
                  color="primary"
                  startIcon={controlMode === 'manual' ? <SmartToy /> : <TouchApp />}
                  onClick={controlMode === 'manual' ? handleSwitchToAgent : handleSwitchToManual}
                  sx={{ mr: 1 }}
                >
                  {controlMode === 'manual' ? 'Agent Control' : 'Manual Control'}
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary"
                  startIcon={agentStatus === 'paused' ? <PlayArrow /> : <Pause />}
                  onClick={agentStatus === 'paused' ? handleResume : handlePause}
                  disabled={!currentTask}
                >
                  {agentStatus === 'paused' ? 'Resume' : 'Pause'}
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
              <BrowserView 
                image={browserImage} 
                cursorPosition={cursorPosition} 
                showCursor={showCursor}
                onManualCommand={handleSendManualCommand}
                manualMode={controlMode === 'manual'}
              />
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <ActionHistory 
                actions={actionHistory} 
                onUndo={handleUndoAction}
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Right side: Chat, Reasoning, and Logs */}
        <Grid item xs={12} md={5} lg={4} sx={{ height: '100%' }}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h5">Chain of Thought</Typography>
              <Typography variant="body2" color="textSecondary">
                {connected ? 'Connected' : 'Disconnected'}
              </Typography>
            </Box>
            
            {/* Chat and input */}
            <Box sx={{ mb: 2, flexGrow: 0, height: '30%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Chat</Typography>
                <IconButton onClick={clearChat} size="small">
                  <Clear fontSize="small" />
                </IconButton>
              </Box>
              <ChatPanel 
                messages={chatMessages} 
                chatEndRef={chatEndRef}
              />
              <Box sx={{ display: 'flex', mt: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="Enter a task for the agent..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitPrompt();
                    }
                  }}
                  disabled={isSubmitting || !connected}
                />
                <IconButton 
                  color="primary" 
                  onClick={handleSubmitPrompt} 
                  disabled={isSubmitting || !connected || !prompt.trim()}
                >
                  <Send />
                </IconButton>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Reasoning steps */}
            <Box sx={{ mb: 2, flexGrow: 0, height: '30%' }}>
              <Typography variant="h6">Reasoning Steps</Typography>
              <ReasoningPanel 
                steps={reasoningSteps} 
                currentTask={currentTask}
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Logs */}
            <Box sx={{ flexGrow: 1, height: '40%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Logs</Typography>
                <IconButton onClick={clearLogs} size="small">
                  <Clear fontSize="small" />
                </IconButton>
              </Box>
              <LogPanel 
                logs={logs} 
                logsEndRef={logsEndRef}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RemoteAgent; 