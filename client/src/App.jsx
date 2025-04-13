import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Alert, Snackbar, Tabs, Tab } from '@mui/material';
import RemoteAgent from './components/RemoteAgent/RemoteAgent';
import DemoWithBrowser from './components/MultiAgentDemo/DemoWithBrowser';
import './App.css';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        },
      },
    },
  },
});

function App() {
  const [backendConnected, setBackendConnected] = useState(false);
  const [alertOpen, setAlertOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Check if backend is available on component mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          setBackendConnected(true);
        }
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendConnected(false);
      }
    };

    checkBackend();
    // Check every 10 seconds in case backend comes up later
    const interval = setInterval(checkBackend, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleCloseAlert = () => {
    setAlertOpen(false);
  };

  const handleChangeTab = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {!backendConnected && alertOpen && (
        <Snackbar 
          open={true} 
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            severity="warning" 
            onClose={handleCloseAlert}
            sx={{ width: '100%' }}
          >
            Backend server not detected. Make sure it's running.
          </Alert>
        </Snackbar>
      )}
      
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleChangeTab} centered>
            <Tab label="Remote Browser" />
            <Tab label="Multi-Agent Demo" />
          </Tabs>
        </Box>
        
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeTab === 0 ? (
            <RemoteAgent />
          ) : (
            <DemoWithBrowser />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
