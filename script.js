// Configuration: API setup for Gemini
const API_KEY = "use your API key here";
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// DOM Elements: Get references to key UI elements
let inputBar = document.querySelector("input")
let button = document.querySelector(".button")
let chat = document.querySelector(".chat")

// Theme Management: Setup dark mode preferences and persistence
const themeToggle = document.querySelector('.theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Initialize theme: Check saved preference or system default
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
  document.body.classList.add('dark-mode');
}

// Add after DOM elements in script.js
let isLoading = false;

// Event Listeners: Handle user interactions
button.addEventListener("click", () => {
  sendMessage();
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
})

// Conversation State: Initialize chat history
let conversationHistory = [{
  role: "model",
  parts: [{
    text: "Do you have any question?"
  }]
}];

// Message Handling: Process and send user messages
async function sendMessage() {
  if (isLoading) return;
  
  isLoading = true;
  button.disabled = true;
  
  if (inputBar.value.trim() !== "") {
    const userMessage = inputBar.value;
    createMessage(userMessage, 'sent');
    
    const loadingContainer = createMessage('...', 'received');
    button.disabled = true;
    
    try {
      const response = await fetchGeminiResponse(userMessage);
      loadingContainer.remove();
      createMessage(response, 'received');
    } catch (error) {
      console.error('Error:', error);
      loadingContainer.remove();  // Remove loading indicator before showing error
      createMessage('Sorry, I encountered an error. Please try again.', 'received');
    } finally {
      isLoading = false;
      button.disabled = false;
    }

    inputBar.value = "";
  }
}

// UI Generation: Create and display message elements
function createMessage(text, type) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `${type}-message`;

  const messageBox = document.createElement("div");
  messageBox.className = `${type}-message-box`;

  if (text === '...') {
    // Create loading dots
    const loadingDots = document.createElement("div");
    loadingDots.className = 'loading-dots';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      loadingDots.appendChild(dot);
    }
    messageBox.appendChild(loadingDots);
  } else {
    const paragraph = document.createElement("p");
    const formattedText = processMessage(text);
    paragraph.innerHTML = formattedText;
    messageBox.appendChild(paragraph);
  }

  messageDiv.appendChild(messageBox);
  chat.appendChild(messageDiv);

  // Ensure latest message is visible
  chat.scrollTop = chat.scrollHeight;

  return messageDiv;
}

// Text Processing: Format message content with markdown and code highlighting
function processMessage(text) {
  if (typeof text !== 'string') {
    console.warn('Invalid text input:', text);
    return '';
  }

  // First escape any HTML to prevent rendering
  text = text.replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));

  // Store code blocks temporarily to protect them from other formatting
  const codeBlocks = [];
  text = text.replace(/```([\w]*)\n([\s\S]*?)```/g, (match, language, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push({
      language: language.trim(),
      code: code.trim()
    });
    return placeholder;
  });

  // Store inline code temporarily
  const inlineCode = [];
  text = text.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCode.length}__`;
    inlineCode.push(code.trim());
    return placeholder;
  });

  // Format text styling - bold
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');

  // Format text styling - italic
  text = text.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

  // Replace newlines with <br>
  text = text.replace(/\n/g, '<br>');

  // Restore code blocks with proper formatting
  codeBlocks.forEach((block, index) => {
    const language = block.language || 'plaintext';
    text = text.replace(
      `__CODE_BLOCK_${index}__`,
      `<pre><code class="language-${language}">${block.code}</code></pre>`
    );
  });

  // Restore inline code
  inlineCode.forEach((code, index) => {
    text = text.replace(
      `__INLINE_CODE_${index}__`,
      `<code>${code}</code>`
    );
  });

  return text;
}

// API Integration: Handle communication with Gemini API
async function fetchGeminiResponse(userMessage) {
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please wait a moment before sending another message.');
  }

  // Update conversation history with user message
  conversationHistory.push({
    role: "user",
    parts: [{
      text: userMessage
    }]
  });

  const requestBody = {
    contents: conversationHistory
  };

  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const aiResponse = data.candidates[0].content.parts[0].text;

  // Update conversation history with AI response
  conversationHistory.push({
    role: "model",
    parts: [{
      text: aiResponse
    }]
  });

  return aiResponse;
}

// Theme Management: Handle theme toggling and persistence
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
});

// Utility Functions: Helper functions for chat management
function clearConversation() {
  conversationHistory = [{
    role: "model",
    parts: [{
      text: "Do you have any question?"
    }]
  }];
  chat.innerHTML = '';
  createMessage("Do you have any question?", 'received');
}

// API Testing: Verify API key functionality
async function testAPIKey() {
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: "Hello, are you working?" }]
        }]
      })
    });
    
    if (!response.ok) {
      console.error('API Key test failed:', await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('API Key test error:', error);
    return false;
  }
}

// Initialization: Setup on page load
window.addEventListener('load', async () => {
  const isAPIWorking = await testAPIKey();
  if (!isAPIWorking) {
    createMessage('Warning: API connection test failed. Please check your API key.', 'received');
  }
});

function sanitizeInput(text) {
  return text
    .replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));
}

// Add after API configuration
const RATE_LIMIT = {
  maxRequests: 10,
  timeWindow: 60000, // 1 minute
  requests: []
};

function checkRateLimit() {
  const now = Date.now();
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => now - time < RATE_LIMIT.timeWindow);
  
  if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
    return false;
  }
  
  RATE_LIMIT.requests.push(now);
  return true;
}

// Add after API configuration
const logError = (error, context = '') => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${context}:`, error);
};