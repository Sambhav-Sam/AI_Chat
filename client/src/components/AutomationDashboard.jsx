import { useState } from 'react';
import TaskForm from './TaskForm';
import TaskResults from './TaskResults';
import ParsedTaskView from './ParsedTaskView';
import * as api from '../services/api';

/**
 * Main dashboard component that integrates all automation UI components
 */
const AutomationDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [parsedTask, setParsedTask] = useState(null);
  const [automationTask, setAutomationTask] = useState(null);
  const [error, setError] = useState(null);
  
  // Force demo mode since we don't have a backend running
  const isDemoMode = true;
  
  // Function to handle submission of natural language instructions
  const handleSubmit = async (instruction) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setParsedTask(null);
    setAutomationTask(null);
    
    try {
      if (!isDemoMode) {
        // In production, use the API
        try {
          // Run the full automation through the API
          const response = await api.runAutomation(instruction);
          
          // Extract the results
          setParsedTask(response.parsedTask);
          setAutomationTask(response.automationTask);
          setResults(response.results);
        } catch (apiError) {
          console.error('API error:', apiError);
          throw new Error(`API error: ${apiError.message}`);
        }
      } else {
        // In demo mode, simulate the API response
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate parsed task from AI
        const simulatedParsedTask = simulateTaskParsing(instruction);
        setParsedTask(simulatedParsedTask);
        
        // Simulate converting parsed task to automation task
        await new Promise(resolve => setTimeout(resolve, 1000));
        const simulatedAutomationTask = convertParsedTaskToAutomationTask(simulatedParsedTask);
        setAutomationTask(simulatedAutomationTask);
        
        // Simulate running the automation
        await new Promise(resolve => setTimeout(resolve, 3000));
        const simulatedResults = simulateAutomationResults(simulatedAutomationTask);
        setResults(simulatedResults);
      }
    } catch (err) {
      console.error('Error running automation:', err);
      setError('Failed to run automation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to simulate task parsing (in production, you would call your API)
  const simulateTaskParsing = (instruction) => {
    const lowerInstruction = instruction.toLowerCase();
    
    if (lowerInstruction.includes('search')) {
      // Extract search terms
      const searchTerms = lowerInstruction.replace(/search for|search|look up|find/gi, '').trim();
      return {
        intent: 'search',
        parameters: {
          query: searchTerms,
          site: lowerInstruction.includes('google') ? 'google.com' : undefined
        },
        context: 'User wants to search for information'
      };
    } else if (lowerInstruction.includes('fill') && lowerInstruction.includes('form')) {
      return {
        intent: 'fill_form',
        parameters: {
          form_type: 'contact',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          message: 'This is a test message from the automation script'
        },
        context: 'User wants to fill out a contact form'
      };
    } else if (lowerInstruction.includes('go to') || lowerInstruction.includes('navigate')) {
      // Extract URL
      let url = lowerInstruction.replace(/go to|navigate to|visit|open/gi, '').trim();
      
      // Add common domains if they're mentioned
      if (url.includes('google')) url = 'google.com';
      else if (url.includes('facebook')) url = 'facebook.com';
      else if (url.includes('twitter')) url = 'twitter.com';
      else if (url.includes('react')) url = 'reactjs.org';
      
      return {
        intent: 'navigate',
        parameters: {
          url: url
        },
        context: 'User wants to visit a website'
      };
    } else if (lowerInstruction.includes('book') && (lowerInstruction.includes('flight') || lowerInstruction.includes('ticket'))) {
      // Extract flight details
      let origin = 'New York';
      let destination = 'London';
      let date = 'next week';
      
      // Basic extraction logic (would be more sophisticated in a real app)
      if (lowerInstruction.includes('from')) {
        const parts = lowerInstruction.split('from')[1].split('to');
        if (parts.length > 1) {
          origin = parts[0].trim();
          const destParts = parts[1].split('on');
          destination = destParts[0].trim();
          if (destParts.length > 1) {
            date = destParts[1].trim();
          }
        }
      }
      
      return {
        intent: 'book_flight',
        parameters: {
          origin: origin,
          destination: destination,
          date: date
        },
        context: 'User wants to book a flight'
      };
    }
    
    // Default fallback
    return {
      intent: 'unknown',
      parameters: {},
      context: 'Could not determine user intent'
    };
  };
  
  // Helper function to convert parsed task to automation task
  const convertParsedTaskToAutomationTask = (parsedTask) => {
    // Default URL if none provided
    let url = 'https://example.com';
    const actions = [];
    
    // Handle different intents
    switch (parsedTask.intent) {
      case 'search':
        if (parsedTask.parameters.site) {
          url = `https://${parsedTask.parameters.site}`;
        } else {
          url = 'https://www.google.com';
        }
        
        // Add search actions
        actions.push({ type: 'wait', selector: 'input[type="text"], input[type="search"]' });
        
        if (parsedTask.parameters.query) {
          actions.push({ 
            type: 'type', 
            selector: 'input[type="text"], input[type="search"]', 
            text: parsedTask.parameters.query 
          });
          actions.push({ 
            type: 'click', 
            selector: 'button[type="submit"], input[type="submit"]',
            screenshotAfter: true
          });
        }
        
        actions.push({ type: 'wait', milliseconds: 2000 });
        actions.push({ type: 'screenshot', name: 'search_results' });
        break;
        
      case 'fill_form':
        url = 'https://getbootstrap.com/docs/5.3/examples/checkout/';
        
        // Wait for the form to load
        actions.push({ type: 'wait', selector: 'form' });
        
        // Fill out form fields from parameters
        Object.entries(parsedTask.parameters).forEach(([key, value]) => {
          if (key !== 'form_type') {
            actions.push({ 
              type: 'type', 
              selector: `input[name="${key}"], input[placeholder*="${key}"], input[id*="${key}"]`, 
              text: value 
            });
          }
        });
        
        // Submit the form
        actions.push({ 
          type: 'click', 
          selector: 'button[type="submit"], input[type="submit"]',
          screenshotAfter: true
        });
        break;
        
      case 'navigate':
        if (parsedTask.parameters.url) {
          url = parsedTask.parameters.url;
          if (!url.startsWith('http')) {
            url = `https://${url}`;
          }
        }
        
        // Just navigate and take a screenshot
        actions.push({ type: 'wait', milliseconds: 2000 });
        actions.push({ type: 'screenshot', name: 'navigation_result' });
        break;
        
      case 'book_flight':
        url = 'https://www.kayak.com';
        
        // Simulate flight booking actions
        actions.push({ type: 'wait', selector: '[data-placeholder="From?"]' });
        actions.push({ type: 'click', selector: '[data-placeholder="From?"]' });
        actions.push({ type: 'type', selector: '.k_my-input', text: parsedTask.parameters.origin });
        actions.push({ type: 'wait', milliseconds: 1000 });
        actions.push({ type: 'click', selector: '.JyN0-item' });
        
        actions.push({ type: 'click', selector: '[data-placeholder="To?"]' });
        actions.push({ type: 'type', selector: '.k_my-input', text: parsedTask.parameters.destination });
        actions.push({ type: 'wait', milliseconds: 1000 });
        actions.push({ type: 'click', selector: '.JyN0-item' });
        
        actions.push({ type: 'click', selector: '[placeholder="Depart"]' });
        actions.push({ type: 'click', selector: '.nextMonth .startDate' });
        actions.push({ type: 'click', selector: '.primaryButtonBold' });
        
        actions.push({ type: 'wait', selector: '.results' });
        actions.push({ type: 'screenshot', name: 'flight_results' });
        break;
        
      default:
        // Generic actions for unknown intents
        actions.push({ type: 'wait', milliseconds: 2000 });
        actions.push({ type: 'screenshot', name: 'page_loaded' });
    }
    
    return {
      url,
      actions,
      intent: parsedTask.intent
    };
  };
  
  // Helper function to simulate automation results
  const simulateAutomationResults = (automationTask) => {
    // Generate simulated timestamps
    const now = Date.now();
    const timestamps = Array.from({ length: 5 }, (_, i) => now + i * 1000);
    
    // Generate simulated screenshots
    const screenshots = [
      `./screenshots/initial_${timestamps[0]}.png`,
      `./screenshots/screenshot_1_${timestamps[1]}.png`,
      `./screenshots/screenshot_2_${timestamps[2]}.png`,
      `./screenshots/final_${timestamps[3]}.png`,
    ];
    
    // Generate simulated logs
    const logs = [
      `Starting automation for ${automationTask.url}`,
      `Navigating to ${automationTask.url}`,
      `Took initial screenshot: ${screenshots[0]}`,
    ];
    
    // Add logs for each action
    automationTask.actions.forEach((action, i) => {
      logs.push(`Executing action ${i + 1}: ${action.type}`);
      
      switch (action.type) {
        case 'click':
          logs.push(`Clicked element: ${action.selector}`);
          break;
        case 'type':
          logs.push(`Typed "${action.text}" into ${action.selector}`);
          break;
        case 'wait':
          if (action.selector) {
            logs.push(`Waited for selector: ${action.selector}`);
          } else if (action.milliseconds) {
            logs.push(`Waited for ${action.milliseconds}ms`);
          } else {
            logs.push('Waited for network to be idle');
          }
          break;
        case 'screenshot':
          logs.push(`Took screenshot: ${screenshots[Math.min(i + 1, screenshots.length - 1)]}`);
          break;
      }
    });
    
    logs.push(`Took final screenshot: ${screenshots[3]}`);
    logs.push('Automation completed successfully');
    logs.push('Browser closed');
    
    return {
      success: true,
      screenshots,
      logs,
      errors: []
    };
  };

  return (
    <div className="automation-dashboard">
      <div className="dashboard-header">
        <h1>AI-Powered Web Automation</h1>
        <p>Use natural language to describe what you want to automate on the web</p>
        {isDemoMode && (
          <div className="demo-badge">Demo Mode</div>
        )}
      </div>
      
      <div className="dashboard-content">
        <div className="form-container">
          <TaskForm onSubmit={handleSubmit} isLoading={loading} />
        </div>
        
        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}
        
        {(parsedTask || automationTask) && (
          <div className="task-analysis">
            <ParsedTaskView 
              parsedTask={parsedTask} 
              automationTask={automationTask} 
            />
          </div>
        )}
        
        {results && (
          <div className="results-container">
            <TaskResults 
              results={results} 
              taskDetails={automationTask} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationDashboard; 