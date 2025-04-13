import React from 'react';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';
import './LogPanel.css';

const LogPanel = ({ logs, logsEndRef }) => {
  // Format timestamp
  const formatTime = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm:ss');
  };
  
  // Get log style based on type
  const getLogStyle = (type) => {
    switch (type) {
      case 'error':
        return 'log-error';
      case 'action':
        return 'log-action';
      case 'browser':
        return 'log-browser';
      case 'info':
        return 'log-info';
      case 'system':
      default:
        return 'log-system';
    }
  };
  
  return (
    <Box className="log-panel">
      {logs.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            No logs yet.
          </Typography>
        </Box>
      ) : (
        logs.map((log, index) => (
          <Box
            key={index}
            className={`log-item ${getLogStyle(log.type)}`}
          >
            <Typography variant="caption" className="log-time">
              {formatTime(log.timestamp)}
            </Typography>
            <Typography variant="body2" className="log-message">
              {log.message}
            </Typography>
          </Box>
        ))
      )}
      <div ref={logsEndRef} />
    </Box>
  );
};

export default LogPanel; 