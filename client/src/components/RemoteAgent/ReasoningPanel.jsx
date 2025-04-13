import React from 'react';
import { Box, Typography, Paper, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import './ReasoningPanel.css';

const ReasoningPanel = ({ steps, currentTask }) => {
  return (
    <Box className="reasoning-panel">
      {!currentTask ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            No active task. Start a task to see reasoning steps.
          </Typography>
        </Box>
      ) : steps.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Waiting for reasoning steps...
          </Typography>
        </Box>
      ) : (
        <Stepper orientation="vertical" activeStep={steps.length - 1}>
          {steps.map((step, index) => (
            <Step key={index} completed={true}>
              <StepLabel>Step {step.step}/{step.total}</StepLabel>
              <StepContent>
                <Paper elevation={0} className="reasoning-step">
                  <Typography variant="body2" gutterBottom>
                    <strong>Reasoning:</strong> {step.reasoning}
                  </Typography>
                  {step.action && (
                    <Typography variant="body2" color="primary">
                      <strong>Action:</strong> {step.action.type} 
                      {step.action.type === 'navigate' && ` to ${step.action.url}`}
                      {step.action.type === 'click' && ` on ${step.action.description || step.action.selector}`}
                      {step.action.type === 'type' && ` in ${step.action.description || step.action.selector}: "${step.action.text}"`}
                      {step.action.type === 'wait' && ` for ${step.action.duration || 1000}ms`}
                    </Typography>
                  )}
                </Paper>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      )}
    </Box>
  );
};

export default ReasoningPanel; 