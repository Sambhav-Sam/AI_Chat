import React, { useState, useEffect } from 'react';
import './MultiAgentDemo.css';

const MultiAgentDemo = () => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [history, setHistory] = useState([]);

  // Fetch available agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (!response.ok) throw new Error('Failed to fetch agents');
        const data = await response.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error('Error fetching agents:', err);
        setError('Failed to load agents. Please try again later.');
      }
    };

    fetchAgents();
  }, []);

  // Fetch execution history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/agents/history');
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    };

    fetchHistory();
  }, [result]); // Refresh history when result changes

  // Execute a task using the multi-agent system
  const executeTask = async (e) => {
    e.preventDefault();
    
    if (!instruction.trim()) {
      setError('Please enter an instruction');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instruction })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute task');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error executing task:', err);
      setError(err.message || 'An error occurred while executing the task');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear execution history
  const clearHistory = async () => {
    try {
      await fetch('/api/agents/history', {
        method: 'DELETE'
      });
      setHistory([]);
    } catch (err) {
      console.error('Error clearing history:', err);
      setError('Failed to clear history');
    }
  };

  // Sample instructions for quick testing
  const sampleInstructions = [
    "Book a flight from New York to San Francisco for next Monday, and schedule a meeting with the team at 2pm the day after arrival",
    "Draft an email to the team about the upcoming project deadline, and schedule a review meeting for next Friday at 10am",
    "Find the next available flight to Chicago and notify my manager about the business trip"
  ];

  return (
    <div className="multi-agent-demo">
      <h1>Multi-Agent Coordination System</h1>
      
      <section className="agents-section">
        <h2>Available Agents</h2>
        <div className="agents-list">
          {agents.map((agent) => (
            <div key={agent.id} className="agent-card">
              <h3>{agent.name}</h3>
              <p>{agent.description}</p>
              <h4>Capabilities:</h4>
              <ul>
                {agent.capabilities.map((capability, index) => (
                  <li key={index}>{capability}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="execution-section">
        <h2>Execute Multi-Agent Task</h2>
        <form onSubmit={executeTask} className="task-form">
          <div className="input-group">
            <label htmlFor="instruction">Enter your instruction:</label>
            <textarea
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Enter a high-level instruction for the multi-agent system..."
              rows={4}
            />
          </div>

          <div className="sample-instructions">
            <h4>Sample Instructions:</h4>
            <ul>
              {sampleInstructions.map((sample, index) => (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => setInstruction(sample)}
                  >
                    Use
                  </button>
                  <span>{sample}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            className="execute-button"
            disabled={isLoading}
          >
            {isLoading ? 'Executing...' : 'Execute Task'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="result-display">
            <h3>Execution Result</h3>
            
            <div className="result-section">
              <h4>Task Plan</h4>
              <ul className="subtasks-list">
                {(result.plan.subtasks || []).map((subtask) => (
                  <li key={subtask.id} className="subtask-item">
                    <strong>{subtask.id}:</strong> {subtask.task} 
                    <span className="subtask-agent">({subtask.agent})</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Display task execution details including failures and retries */}
            {result.results && Object.keys(result.results).length > 0 && (
              <div className="result-section">
                <h4>Task Execution Details</h4>
                <div className="task-execution-details">
                  {Object.entries(result.results).map(([taskId, data]) => (
                    <div key={taskId} className={`task-result ${data.result?.success ? 'success' : 'failure'}`}>
                      <h5>
                        Task {taskId}: {data.subtask.task}
                        {data.result?.retried && (
                          <span className="retry-badge">
                            Retried {data.result.retryCount} {data.result.retryCount === 1 ? 'time' : 'times'}
                          </span>
                        )}
                        <span className={`status-badge ${data.result?.success ? 'success' : 'failure'}`}>
                          {data.result?.success ? 'Success' : 'Failed'}
                        </span>
                      </h5>
                      
                      {/* Show error analysis if available */}
                      {data.result?.analysis && (
                        <div className="error-analysis">
                          <h6>Error Analysis:</h6>
                          
                          {data.result.analysis.likelyCauses && (
                            <div className="analysis-section">
                              <strong>Likely Causes:</strong>
                              <ul>
                                {data.result.analysis.likelyCauses.map((cause, i) => (
                                  <li key={i}>{cause}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {data.result.analysis.potentialFixes && (
                            <div className="analysis-section">
                              <strong>Potential Fixes:</strong>
                              <ul>
                                {data.result.analysis.potentialFixes.map((fix, i) => (
                                  <li key={i}>{fix}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {data.result.analysis.explanation && (
                            <div className="analysis-section">
                              <strong>Explanation:</strong>
                              <p>{data.result.analysis.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Show error message if no analysis available */}
                      {!data.result?.success && !data.result?.analysis && (
                        <div className="error-message">
                          <strong>Error:</strong> {data.result?.error || "Task failed with no specific error message"}
                          {data.result?.analysisAttempted && (
                            <p>Error analysis failed: {data.result?.analysisError || "Unknown analysis error"}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="result-section">
              <h4>Final Result</h4>
              {result.finalResult && (
                <div className="final-result">
                  <div className="result-item">
                    <strong>Summary:</strong> 
                    <p>{result.finalResult.summary}</p>
                  </div>
                  
                  {result.finalResult.recommendations && (
                    <div className="result-item">
                      <strong>Recommendations:</strong>
                      <ul>
                        {result.finalResult.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.finalResult.nextSteps && (
                    <div className="result-item">
                      <strong>Next Steps:</strong>
                      <ul>
                        {result.finalResult.nextSteps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="history-section">
        <div className="history-header">
          <h2>Execution History</h2>
          <button
            className="clear-history-button"
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            Clear History
          </button>
        </div>

        <div className="history-list">
          {history.length === 0 ? (
            <p>No execution history yet</p>
          ) : (
            history.map((item, index) => (
              <div key={index} className="history-item">
                <h4>Instruction: "{item.instruction}"</h4>
                <p><strong>Time:</strong> {new Date(item.timestamp).toLocaleString()}</p>
                <button
                  className="view-details-button"
                  onClick={() => setResult({
                    plan: item.plan,
                    results: item.results,
                    finalResult: item.finalResult
                  })}
                >
                  View Details
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default MultiAgentDemo; 