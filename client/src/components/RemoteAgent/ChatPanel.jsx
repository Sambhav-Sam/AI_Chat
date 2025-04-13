import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { format } from 'date-fns';
import './ChatPanel.css';

const ChatPanel = ({ messages, chatEndRef }) => {
  // Format timestamp
  const formatTime = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm:ss');
  };
  
  // Get message style based on sender
  const getMessageStyle = (sender) => {
    switch (sender) {
      case 'user':
        return 'chat-message-user';
      case 'system':
        return 'chat-message-system';
      case 'action':
        return 'chat-message-action';
      default:
        return 'chat-message-system';
    }
  };
  
  return (
    <Box className="chat-panel">
      {messages.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            No messages yet. Start by entering a prompt.
          </Typography>
        </Box>
      ) : (
        messages.map((message, index) => (
          <Box
            key={index}
            className={`chat-message ${getMessageStyle(message.sender)}`}
          >
            <Paper 
              elevation={1} 
              className="chat-message-content"
              sx={{ 
                bgcolor: message.sender === 'user' ? 'primary.light' : 'background.paper'
              }}
            >
              <Typography variant="body2" component="div">
                {message.text}
              </Typography>
              <Typography variant="caption" color="textSecondary" className="chat-message-time">
                {formatTime(message.timestamp)}
              </Typography>
            </Paper>
          </Box>
        ))
      )}
      <div ref={chatEndRef} />
    </Box>
  );
};

export default ChatPanel; 