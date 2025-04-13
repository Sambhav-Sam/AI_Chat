/**
 * ParsedTaskView component for displaying the AI-parsed task structure
 */
const ParsedTaskView = ({ parsedTask, automationTask }) => {
  if (!parsedTask) return null;
  
  return (
    <div className="parsed-task-view">
      <h3>AI Task Interpretation</h3>
      
      <div className="task-stages">
        <div className="stage">
          <div className="stage-header">
            <h4>Natural Language → Structured Intent</h4>
          </div>
          <div className="stage-content">
            <pre>{JSON.stringify(parsedTask, null, 2)}</pre>
          </div>
        </div>
        
        {automationTask && (
          <div className="stage">
            <div className="stage-header">
              <h4>Intent → Automation Actions</h4>
            </div>
            <div className="stage-content">
              <pre>{JSON.stringify(automationTask, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
      
      <div className="explanation">
        <h4>How It Works</h4>
        <ol>
          <li>
            <strong>Natural Language Processing:</strong> Your instructions are analyzed by our AI to determine intent and extract parameters.
          </li>
          <li>
            <strong>Task Conversion:</strong> The structured intent is converted into specific browser automation actions.
          </li>
          <li>
            <strong>Automation Execution:</strong> A headless browser performs the actions and captures results.
          </li>
        </ol>
      </div>
    </div>
  );
};

export default ParsedTaskView; 