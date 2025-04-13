import { useState } from 'react';

/**
 * TaskForm component for submitting natural language commands
 * that will be processed by the AI and turned into automation tasks
 */
const TaskForm = ({ onSubmit, isLoading }) => {
  const [instruction, setInstruction] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (instruction.trim()) {
      onSubmit(instruction);
    }
  };
  
  const predefinedTasks = [
    'Search for React tutorials',
    'Fill out the contact form',
    'Navigate to reactjs.org',
    'Book a flight from New York to London',
    'Add items to shopping cart',
    'Login to my account'
  ];
  
  const handlePredefinedTask = (task) => {
    setInstruction(task);
  };

  return (
    <div className="task-form">
      <h2>Website Automation Tool</h2>
      <p className="description">
        Enter a natural language instruction to automate a website task.
        Our AI will convert your instruction into a series of automated browser actions.
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. 'Search for flights to New York' or 'Fill out the contact form'"
            rows={4}
            required
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading || !instruction.trim()}
        >
          {isLoading ? 'Processing...' : 'Run Automation'}
        </button>
      </form>
      
      <div className="predefined-tasks">
        <h3>Try These Examples:</h3>
        <div className="task-chips">
          {predefinedTasks.map((task, index) => (
            <button
              key={index}
              className="task-chip"
              onClick={() => handlePredefinedTask(task)}
              disabled={isLoading}
            >
              {task}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskForm; 