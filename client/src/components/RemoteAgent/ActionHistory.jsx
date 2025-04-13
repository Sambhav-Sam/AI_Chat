import React from 'react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Undo, History } from '@mui/icons-material';
import { format } from 'date-fns';
import './ActionHistory.css';

const ActionHistory = ({ actions, onUndo }) => {
  // Format timestamp
  const formatTime = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm:ss');
  };
  
  // Get action description based on type
  const getActionDescription = (action) => {
    switch (action.type) {
      case 'navigation':
        return `Navigate to ${action.url}`;
      case 'click':
        return `Click ${action.description || action.selector}`;
      case 'type':
        return `Type "${action.text}" in ${action.description || action.selector}`;
      default:
        return `${action.type} action`;
    }
  };
  
  // Get recent actions (last 5)
  const recentActions = actions.slice(-5).reverse();
  
  return (
    <Box className="action-history">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center' }}>
          <History fontSize="small" sx={{ mr: 0.5 }} />
          Recent Actions
        </Typography>
        <Tooltip title="Undo Last Action">
          <span>
            <IconButton 
              size="small" 
              onClick={onUndo}
              disabled={actions.length === 0}
            >
              <Undo fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      
      <Box className="action-chips">
        {recentActions.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No actions yet.
          </Typography>
        ) : (
          recentActions.map((action, index) => (
            <Chip
              key={index}
              label={getActionDescription(action)}
              size="small"
              variant="outlined"
              className="action-chip"
              title={`${formatTime(action.timestamp)}`}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default ActionHistory; 