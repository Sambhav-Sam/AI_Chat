import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, CircularProgress, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';
import './BrowserView.css';

const BrowserView = ({ image, cursorPosition, showCursor, onManualCommand, manualMode }) => {
  const [url, setUrl] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const scale = useRef(1);
  
  // Handle navigation
  const handleNavigate = () => {
    if (!url.trim() || !manualMode || isNavigating) return;
    
    // Add https:// if not present
    let fullUrl = url;
    if (!/^https?:\/\//i.test(fullUrl)) {
      fullUrl = 'https://' + fullUrl;
    }
    
    setIsNavigating(true);
    
    // Send command to navigate
    onManualCommand({
      type: 'navigate',
      url: fullUrl
    });
    
    // Reset navigation state after a timeout
    setTimeout(() => {
      setIsNavigating(false);
    }, 3000);
  };
  
  // Handle manual click in manual mode
  const handleClick = (e) => {
    if (!manualMode || !containerRef.current || !imageRef.current) return;
    
    // Get click coordinates relative to the image
    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale.current;
    const y = (e.clientY - rect.top) / scale.current;
    
    // Send command to click at these coordinates
    onManualCommand({
      type: 'click',
      selector: `body`,
      description: `position (${Math.round(x)}, ${Math.round(y)})`,
      position: { x, y }
    });
  };
  
  // Update scale factor when the image or container size changes
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || !imageRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const imageNaturalWidth = imageRef.current.naturalWidth;
      
      if (imageNaturalWidth && containerWidth) {
        scale.current = containerWidth / imageNaturalWidth;
      }
    };
    
    // Call initially
    updateScale();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Clean up
    return () => {
      resizeObserver.disconnect();
    };
  }, [image]);
  
  return (
    <Box className="browser-view-container" ref={containerRef}>
      {/* URL bar */}
      <Box className="browser-url-bar">
        <TextField
          fullWidth
          size="small"
          placeholder="Enter URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleNavigate();
            }
          }}
          disabled={!manualMode || isNavigating}
          InputProps={{
            startAdornment: isNavigating ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : null,
            endAdornment: (
              <IconButton
                onClick={handleNavigate}
                disabled={!manualMode || !url.trim() || isNavigating}
                size="small"
              >
                <Search fontSize="small" />
              </IconButton>
            )
          }}
        />
      </Box>
      
      {/* Browser content view */}
      <Box 
        className="browser-content"
        onClick={handleClick}
      >
        {image ? (
          <img 
            ref={imageRef}
            src={image} 
            alt="Remote Browser" 
            className="browser-screenshot"
          />
        ) : (
          <Box className="browser-placeholder">
            <Typography variant="body1" color="textSecondary" align="center">
              Enter a prompt in the chat to start the browser
            </Typography>
          </Box>
        )}
        
        {/* Cursor overlay */}
        {showCursor && image && (
          <Box
            className="browser-cursor"
            sx={{
              left: `${cursorPosition.x * scale.current}px`,
              top: `${cursorPosition.y * scale.current}px`
            }}
          />
        )}
      </Box>
      
      {/* Manual mode indicator */}
      {manualMode && (
        <Box className="manual-mode-indicator">
          <Typography variant="body2">
            Manual Control Mode
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BrowserView; 