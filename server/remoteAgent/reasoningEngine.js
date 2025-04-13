/**
 * Reasoning Engine
 * Generates Chain of Thought (CoT) reasoning steps for browser tasks
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Initialize OpenAI client if API key is available
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to reasoning templates
const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Create a reasoning chain for a given prompt
 * @param {string} prompt User prompt for browser task
 * @returns {Array} Array of reasoning steps with actions
 */
export async function createReasoningChain(prompt) {
  // If OpenAI API key is available, use it to generate reasoning
  if (openai) {
    return await generateReasoningWithAI(prompt);
  } else {
    console.warn('No OpenAI API key found, using mock reasoning');
    return await generateMockReasoning(prompt);
  }
}

/**
 * Generate reasoning chain using OpenAI API
 * @param {string} prompt User prompt for browser task
 * @returns {Array} Array of reasoning steps with actions
 */
async function generateReasoningWithAI(prompt) {
  try {
    // Load system prompt template
    const systemPromptTemplate = await fs.readFile(
      path.join(TEMPLATES_DIR, 'system-prompt.txt'),
      'utf-8'
    );
    
    // Prepare the system prompt with prompt specific details
    const systemPrompt = systemPromptTemplate.replace('{{TASK_PROMPT}}', prompt);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    // Extract and parse reasoning steps
    const content = completion.choices[0].message.content;
    const result = JSON.parse(content);
    
    if (!result.steps || !Array.isArray(result.steps)) {
      throw new Error('Invalid response format from AI: missing steps array');
    }
    
    return result.steps.map(step => ({
      reasoning: step.reasoning,
      action: step.action
    }));
  } catch (error) {
    console.error('Error generating reasoning with AI:', error);
    
    // Fallback to mock reasoning
    return await generateMockReasoning(prompt);
  }
}

/**
 * Generate mock reasoning chain for testing without API key
 * @param {string} prompt User prompt for browser task
 * @returns {Array} Array of mock reasoning steps with actions
 */
async function generateMockReasoning(prompt) {
  console.log('Generating mock reasoning for prompt:', prompt);
  
  // Analyze prompt to determine type of task
  const lowerPrompt = prompt.toLowerCase();
  
  // Generate appropriate mock reasoning based on prompt
  if (lowerPrompt.includes('search') || lowerPrompt.includes('find information')) {
    return generateSearchReasoning(prompt);
  } else if (lowerPrompt.includes('fill') || lowerPrompt.includes('form')) {
    return generateFormReasoning(prompt);
  } else if (lowerPrompt.includes('book') || lowerPrompt.includes('reservation')) {
    return generateBookingReasoning(prompt);
  } else if (lowerPrompt.includes('buy') || lowerPrompt.includes('purchase')) {
    return generateShoppingReasoning(prompt);
  } else {
    // Default reasoning for general browsing
    return generateGeneralBrowsingReasoning(prompt);
  }
}

/**
 * Generate mock reasoning for search tasks
 */
function generateSearchReasoning(prompt) {
  // Extract search term from prompt
  const searchTermMatch = prompt.match(/search for (.+?)($|\s+and\s+|\s+then\s+)/i);
  const searchTerm = searchTermMatch ? searchTermMatch[1] : 'example search term';
  
  return [
    {
      reasoning: `I need to search for information about "${searchTerm}". First, I'll navigate to a search engine.`,
      action: {
        type: 'navigate',
        url: 'https://www.google.com'
      }
    },
    {
      reasoning: `Now I'll enter the search term "${searchTerm}" into the search box.`,
      action: {
        type: 'type',
        selector: 'input[name="q"]',
        text: searchTerm,
        description: 'search input'
      }
    },
    {
      reasoning: "I'll submit the search by pressing Enter.",
      action: {
        type: 'click',
        selector: 'input[value="Google Search"], .gNO89b',
        description: 'search button'
      }
    },
    {
      reasoning: "Now I'll examine the search results to find relevant information.",
      action: {
        type: 'wait',
        duration: 2000,
        description: 'examining search results'
      }
    },
    {
      reasoning: "I found a relevant result that might have the information we're looking for. I'll click on it to learn more.",
      action: {
        type: 'click',
        selector: '.g a, .yuRUbf a',
        description: 'first search result'
      }
    }
  ];
}

/**
 * Generate mock reasoning for form filling tasks
 */
function generateFormReasoning(prompt) {
  return [
    {
      reasoning: "I need to fill out a form. Let's navigate to a sample form page.",
      action: {
        type: 'navigate',
        url: 'https://httpbin.org/forms/post'
      }
    },
    {
      reasoning: "Now I'll fill in the customer name field.",
      action: {
        type: 'type',
        selector: 'input[name="custname"]',
        text: 'John Doe',
        description: 'customer name field'
      }
    },
    {
      reasoning: "Next, I'll select a size option from the radio buttons.",
      action: {
        type: 'click',
        selector: 'input[value="medium"]',
        description: 'medium size radio button'
      }
    },
    {
      reasoning: "I'll select a topping from the checkboxes.",
      action: {
        type: 'click',
        selector: 'input[name="topping"][value="bacon"]',
        description: 'bacon topping checkbox'
      }
    },
    {
      reasoning: "Now I'll add a special instruction in the text area.",
      action: {
        type: 'type',
        selector: 'textarea[name="comments"]',
        text: 'Please deliver as soon as possible.',
        description: 'comments field'
      }
    },
    {
      reasoning: "Finally, I'll submit the form.",
      action: {
        type: 'click',
        selector: 'button[type="submit"]',
        description: 'submit button'
      }
    }
  ];
}

/**
 * Generate mock reasoning for booking/reservation tasks
 */
function generateBookingReasoning(prompt) {
  return [
    {
      reasoning: "I need to make a reservation. I'll start by navigating to a booking site.",
      action: {
        type: 'navigate',
        url: 'https://www.booking.com'
      }
    },
    {
      reasoning: "I need to select a destination for the reservation.",
      action: {
        type: 'type',
        selector: 'input[name="ss"], input[placeholder="Where are you going?"]',
        text: 'New York',
        description: 'destination input'
      }
    },
    {
      reasoning: "Next, I need to select the dates for the reservation.",
      action: {
        type: 'click',
        selector: '.xp__dates-inner',
        description: 'date picker'
      }
    },
    {
      reasoning: "I'll select a check-in date about a month from now.",
      action: {
        type: 'click',
        selector: '.bui-calendar__date:not(.bui-calendar__date--disabled)[data-date="2023-12-15"]',
        description: 'check-in date'
      }
    },
    {
      reasoning: "And for the check-out date, I'll select 3 days later.",
      action: {
        type: 'click',
        selector: '.bui-calendar__date:not(.bui-calendar__date--disabled)[data-date="2023-12-18"]',
        description: 'check-out date'
      }
    },
    {
      reasoning: "Now I'll search for available options.",
      action: {
        type: 'click',
        selector: '.sb-searchbox__button',
        description: 'search button'
      }
    }
  ];
}

/**
 * Generate mock reasoning for shopping tasks
 */
function generateShoppingReasoning(prompt) {
  // Extract product from prompt
  const productMatch = prompt.match(/buy (?:a |an )?(.+?)($|\s+and\s+|\s+then\s+)/i);
  const product = productMatch ? productMatch[1] : 'laptop';
  
  return [
    {
      reasoning: `I need to shop for a ${product}. I'll start by going to an e-commerce site.`,
      action: {
        type: 'navigate',
        url: 'https://www.amazon.com'
      }
    },
    {
      reasoning: `Now I'll search for ${product} in the search box.`,
      action: {
        type: 'type',
        selector: '#twotabsearchtextbox',
        text: product,
        description: 'search input'
      }
    },
    {
      reasoning: "I'll submit the search to see available options.",
      action: {
        type: 'click',
        selector: '#nav-search-submit-button',
        description: 'search button'
      }
    },
    {
      reasoning: "I'll look through the search results and select a well-rated product.",
      action: {
        type: 'wait',
        duration: 2000,
        description: 'examining search results'
      }
    },
    {
      reasoning: "This product looks good based on the ratings and description. I'll click on it to view details.",
      action: {
        type: 'click',
        selector: '.s-result-item[data-index="2"] h2 a, .s-result-item a.a-link-normal',
        description: 'product link'
      }
    },
    {
      reasoning: "Now I'll add this product to the cart.",
      action: {
        type: 'click',
        selector: '#add-to-cart-button',
        description: 'add to cart button'
      }
    }
  ];
}

/**
 * Generate mock reasoning for general browsing tasks
 */
function generateGeneralBrowsingReasoning(prompt) {
  // Extract website from prompt or default to example.com
  const urlMatch = prompt.match(/(?:go to|visit|open|navigate to) (.+?)($|\s+and\s+|\s+then\s+)/i);
  let url = urlMatch ? urlMatch[1].trim() : 'example.com';
  
  // Add https:// if not present
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  
  return [
    {
      reasoning: `I need to navigate to ${url} as requested.`,
      action: {
        type: 'navigate',
        url: url
      }
    },
    {
      reasoning: "I'll examine the page to understand its structure and content.",
      action: {
        type: 'wait',
        duration: 2000,
        description: 'examining page'
      }
    },
    {
      reasoning: "This appears to be the main page. I'll look for the main navigation menu to explore further.",
      action: {
        type: 'click',
        selector: 'nav a, .navigation a, .menu a, header a',
        description: 'navigation link'
      }
    },
    {
      reasoning: "I'll scroll down to see more content on this page.",
      action: {
        type: 'wait',
        duration: 1500,
        description: 'scrolling down'
      }
    },
    {
      reasoning: "I found an interesting section or article. I'll click to read more.",
      action: {
        type: 'click',
        selector: 'article a, .content a, .section a, main a',
        description: 'content link'
      }
    }
  ];
}

/**
 * Create template directory and files if they don't exist
 */
export async function initializeTemplates() {
  try {
    // Create templates directory if it doesn't exist
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    
    // Create system prompt template if it doesn't exist
    const systemPromptPath = path.join(TEMPLATES_DIR, 'system-prompt.txt');
    
    try {
      await fs.access(systemPromptPath);
      console.log('System prompt template already exists');
    } catch (error) {
      // Template doesn't exist, create it
      const defaultSystemPrompt = `You are a browser automation assistant that breaks down tasks into step-by-step reasoning and actions.

Task: {{TASK_PROMPT}}

For this task, generate a sequence of steps that include both your reasoning and the specific browser actions to take.

For each step, include:
1. Your reasoning about what to do next and why
2. The specific browser action to perform

Browser actions should be one of:
- navigate: Go to a URL
- click: Click on an element (must include selector)
- type: Type text into an input (must include selector and text)
- wait: Wait for a specified duration in milliseconds

Return your response as a JSON object with the following structure:
{
  "steps": [
    {
      "reasoning": "I need to navigate to Google first to search",
      "action": {
        "type": "navigate",
        "url": "https://www.google.com"
      }
    },
    {
      "reasoning": "Now I'll search for the requested information",
      "action": {
        "type": "type",
        "selector": "input[name='q']",
        "text": "search query",
        "description": "search input"
      }
    }
  ]
}

Use clear, precise selectors for elements. Try to use common selectors like CSS classes, IDs, or attributes that are likely to work across different sites.

The user will see your reasoning along with the browser actions being performed.`;
      
      await fs.writeFile(systemPromptPath, defaultSystemPrompt);
      console.log('Created default system prompt template');
    }
  } catch (error) {
    console.error('Error initializing templates:', error);
  }
}

// Initialize templates on module load
initializeTemplates().catch(console.error); 