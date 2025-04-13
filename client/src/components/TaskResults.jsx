/**
 * TaskResults component for displaying the results of an automation task
 */
const TaskResults = ({ results, taskDetails }) => {
  if (!results) return null;
  
  const { success, screenshots, logs, errors } = results;
  
  // Function to extract filename from full path
  const getFileName = (path) => {
    if (!path) return '';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };
  
  // Function to format log entries
  const formatLog = (log) => {
    if (log.includes('Took screenshot:')) {
      return <span className="log-screenshot">{log}</span>;
    } else if (log.includes('Error')) {
      return <span className="log-error">{log}</span>;
    } else if (log.includes('Clicked') || log.includes('Typed')) {
      return <span className="log-action">{log}</span>;
    } else {
      return <span>{log}</span>;
    }
  };

  return (
    <div className={`task-results ${success ? 'success' : 'failure'}`}>
      <div className="results-header">
        <h2>Task Results</h2>
        <div className="status-badge">
          {success ? 'Success' : 'Failed'}
        </div>
      </div>
      
      {taskDetails && (
        <div className="task-details">
          <h3>Task Details</h3>
          <div className="details-card">
            <p><strong>URL:</strong> {taskDetails.url}</p>
            <p><strong>Actions:</strong> {taskDetails.actions?.length || 0}</p>
            {taskDetails.intent && (
              <p><strong>Intent:</strong> {taskDetails.intent}</p>
            )}
          </div>
        </div>
      )}
      
      {screenshots && screenshots.length > 0 && (
        <div className="screenshots-section">
          <h3>Screenshots ({screenshots.length})</h3>
          <div className="screenshots-grid">
            {screenshots.map((screenshot, index) => (
              <div key={index} className="screenshot-item">
                <div className="screenshot-label">{getFileName(screenshot)}</div>
                <img 
                  src={'/screenshots/demo_screenshot.svg'} 
                  alt={`Screenshot ${index + 1}`} 
                  className="demo-placeholder"
                />
              </div>
            ))}
          </div>
          <p className="screenshots-note">
            <small>Note: Running in demo mode with simulated screenshots. In production, actual screenshots would be displayed.</small>
          </p>
        </div>
      )}
      
      {errors && errors.length > 0 && (
        <div className="errors-section">
          <h3>Errors ({errors.length})</h3>
          <ul className="errors-list">
            {errors.map((error, index) => (
              <li key={index} className="error-item">{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {logs && logs.length > 0 && (
        <div className="logs-section">
          <h3>Execution Log</h3>
          <div className="logs-container">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">
                {formatLog(log)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskResults; 