import { GoogleGenerativeAI } from "@google/generative-ai";

// Enhanced keyword-based AI assistant that requires no external API or models

// Securely access the API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log("API Key available:", !!API_KEY); // Will log true/false without exposing the key
console.log("API Key length:", API_KEY ? API_KEY.length : 0); // Check if it's a non-empty string

// Update the model name to the latest version
const MODEL_NAME = "gemini-1.5-pro";

// Initialize the Google Generative AI with your API key
let genAI;
let model;

try {
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: MODEL_NAME });
  console.log("Gemini model initialized successfully");
} catch (error) {
  console.error("Error initializing Gemini model:", error);
}

// System prompt to define the assistant's behavior
const SYSTEM_PROMPT =
  "You are a helpful assistant for a ToDo app. You help users manage tasks, " +
  "projects, and provide tips for productivity. Keep responses concise and " +
  "focused on task management. You can suggest features like task prioritization, " +
  "categorization, and time management techniques. If asked about features " +
  "outside the scope of task management, politely redirect to task-related topics.";

/**
 * Creates a chat session with the system prompt
 * @returns {ChatSession} A configured chat session
 */
const createChatSession = () => {
  try {
    if (!model) {
      console.error("Cannot create chat session: model is not initialized");
      return null;
    }

    const chatSession = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I understand my role as a task management assistant. I'll help users organize tasks, manage projects, and improve productivity with concise, focused responses.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
        topP: 0.8,
        topK: 40,
      },
    });

    console.log("Chat session created successfully");
    return chatSession;
  } catch (error) {
    console.error("Error creating chat session:", error);
    return null;
  }
};

// Store the chat session in memory
let currentChatSession = null;

// Define response categories with multiple variations for natural-sounding replies
const responseLibrary = {
  greeting: [
    "Hello! How can I help you with your tasks today?",
    "Hi there! Need help organizing your tasks?",
    "Welcome back! What can I assist you with today?",
    "Greetings! How can I make your task management easier?",
  ],

  task_creation: [
    "To create a new task, click the '+ Add New Task' button. You can set priority, category, and due date for better organization.",
    "Adding a task is simple! Just use the '+ Add New Task' button and fill in the details like title, priority, and due date.",
    "Need to add a task? Click the plus button, then enter the task details including any deadlines or priority levels.",
    "Creating tasks is easy - just click the add button and enter your task information. Don't forget to set a priority level!",
  ],

  task_priority: [
    "Tasks can be set to Low, Medium, or High priority. You can sort your tasks by priority using the sort dropdown menu.",
    "Priority levels help you focus on what matters most. Choose from Low, Medium, or High when creating or editing a task.",
    "You can prioritize tasks as Low, Medium, or High. High priority tasks are visually highlighted to catch your attention.",
    "Setting priorities (Low, Medium, High) helps you organize your workflow. You can filter or sort by priority level.",
  ],

  projects: [
    "Projects help you organize related tasks. You can create a new project from the Projects tab.",
    "Group related tasks together by creating a project. Access the Projects section from the main navigation.",
    "Projects are collections of related tasks. Create one from the Projects tab to better organize your work.",
    "Need to organize multiple related tasks? Create a project and assign tasks to it for better organization.",
  ],

  calendar: [
    "You can view your tasks in a calendar view to better plan your schedule. Tasks with due dates will appear on their respective days.",
    "The calendar view shows all tasks with due dates. It's perfect for planning your week or month ahead.",
    "Check the calendar view to see your tasks organized by date. It gives you a clear timeline of upcoming work.",
    "Planning your schedule? The calendar view displays all your tasks with deadlines on their respective dates.",
  ],

  deadlines: [
    "You can set due dates for your tasks to keep track of deadlines. Tasks approaching their due date will be highlighted.",
    "Never miss a deadline! Set due dates for your tasks, and the app will highlight them as the date approaches.",
    "Due dates help you stay on schedule. Add them to tasks, and you'll see visual reminders as deadlines approach.",
    "Track deadlines by adding due dates to your tasks. The app provides visual indicators for approaching deadlines.",
  ],

  categories: [
    "Categories help you organize tasks by type. You can filter tasks by category to focus on specific areas.",
    "Use categories to group similar tasks together. You can then filter your view to focus on specific categories.",
    "Categorizing tasks helps with organization. Add categories when creating tasks, then filter by category as needed.",
    "Sort your tasks into categories for better organization. You can then filter to see only tasks from specific categories.",
  ],

  filtering: [
    "You can filter and sort tasks by priority, category, due date, or completion status to find what you need quickly.",
    "Need to focus? Use filters to show only certain tasks based on priority, category, or deadline.",
    "The filter options let you view tasks by priority, category, due date, or completion status.",
    "Sorting and filtering options help you focus on what matters. Access them from the task list view.",
  ],

  completion: [
    "Mark tasks as complete by clicking the checkbox next to them. Completed tasks can be viewed in the completed section.",
    "When you finish a task, check the box next to it to mark it complete. You can view or hide completed tasks.",
    "Completed tasks are marked with a checkbox. You can toggle the view to show or hide completed items.",
    "Track your progress by marking tasks complete. Use the filter to show only completed or incomplete tasks.",
  ],

  help: [
    "I can help with task management, organization tips, and using app features. What specific help do you need?",
    "Need assistance? I can explain features, suggest organization methods, or help troubleshoot issues.",
    "I'm here to help you use the app effectively. Ask me about any feature or how to organize your tasks better.",
    "How can I assist you today? I can explain features, provide tips, or help you find what you need.",
  ],

  thanks: [
    "You're welcome! Let me know if you need help with anything else.",
    "Happy to help! Feel free to ask if you have other questions.",
    "Anytime! I'm here whenever you need assistance with your tasks.",
    "Glad I could help! Don't hesitate to reach out if you need anything else.",
  ],

  unknown: [
    "I'm not sure I understand. Could you rephrase your question about task management or using the app?",
    "I don't have information about that. Could you ask something related to task management or app features?",
    "I'm focused on helping with task management. Could you ask something about organizing tasks or using the app?",
    "I'm not sure how to help with that. I can answer questions about tasks, projects, and app features.",
  ],
};

// Context tracking for more natural conversations
let conversationContext = {
  lastTopic: null,
  mentionedFeatures: [],
  questionCount: 0,
};

/**
 * Sends a message to the AI and returns the response
 * @param {string} message - The user's message
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @returns {Promise<string>} - The AI's response
 */
export const sendMessageToAI = async (message, conversationHistory = []) => {
  console.log("Processing message:", message);

  // Update conversation context
  conversationContext.questionCount++;

  // Track the last few user messages for context
  const recentUserMessages = conversationHistory
    .filter((msg) => msg.type === "user")
    .slice(-3)
    .map((msg) => msg.text);

  // Add current message for analysis
  recentUserMessages.push(message);

  // Analyze the message to determine intent
  const lowerMessage = message.toLowerCase();
  let response;

  // Check for greetings
  if (messageMatches(lowerMessage, ["hello", "hi", "hey", "greetings"])) {
    response = getRandomResponse("greeting");
    conversationContext.lastTopic = "greeting";
  }

  // Check for gratitude
  else if (
    messageMatches(lowerMessage, ["thanks", "thank you", "appreciate"])
  ) {
    response = getRandomResponse("thanks");
    conversationContext.lastTopic = "thanks";
  }

  // Check for task creation questions
  else if (
    messageContainsAll(lowerMessage, ["create", "task"]) ||
    messageContainsAll(lowerMessage, ["add", "task"]) ||
    messageContainsAll(lowerMessage, ["new", "task"])
  ) {
    response = getRandomResponse("task_creation");
    conversationContext.lastTopic = "task_creation";
    conversationContext.mentionedFeatures.push("task_creation");
  }

  // Check for priority questions
  else if (
    messageMatches(lowerMessage, ["priority", "priorities", "important"])
  ) {
    response = getRandomResponse("task_priority");
    conversationContext.lastTopic = "task_priority";
    conversationContext.mentionedFeatures.push("task_priority");
  }

  // Check for project questions
  else if (messageMatches(lowerMessage, ["project", "projects", "group"])) {
    response = getRandomResponse("projects");
    conversationContext.lastTopic = "projects";
    conversationContext.mentionedFeatures.push("projects");
  }

  // Check for calendar questions
  else if (messageMatches(lowerMessage, ["calendar", "schedule", "timeline"])) {
    response = getRandomResponse("calendar");
    conversationContext.lastTopic = "calendar";
    conversationContext.mentionedFeatures.push("calendar");
  }

  // Check for deadline questions
  else if (
    messageMatches(lowerMessage, ["deadline", "due date", "due", "overdue"])
  ) {
    response = getRandomResponse("deadlines");
    conversationContext.lastTopic = "deadlines";
    conversationContext.mentionedFeatures.push("deadlines");
  }

  // Check for category questions
  else if (
    messageMatches(lowerMessage, [
      "category",
      "categories",
      "tag",
      "tags",
      "label",
    ])
  ) {
    response = getRandomResponse("categories");
    conversationContext.lastTopic = "categories";
    conversationContext.mentionedFeatures.push("categories");
  }

  // Check for filtering questions
  else if (messageMatches(lowerMessage, ["filter", "sort", "find", "search"])) {
    response = getRandomResponse("filtering");
    conversationContext.lastTopic = "filtering";
    conversationContext.mentionedFeatures.push("filtering");
  }

  // Check for completion questions
  else if (
    messageMatches(lowerMessage, ["complete", "finished", "done", "check off"])
  ) {
    response = getRandomResponse("completion");
    conversationContext.lastTopic = "completion";
    conversationContext.mentionedFeatures.push("completion");
  }

  // Check for help requests
  else if (
    messageMatches(lowerMessage, ["help", "assist", "support", "guide"])
  ) {
    response = getRandomResponse("help");
    conversationContext.lastTopic = "help";
  }

  // Handle follow-up questions based on context
  else if (
    conversationContext.lastTopic &&
    (messageMatches(lowerMessage, [
      "how",
      "what",
      "where",
      "when",
      "why",
      "can",
    ]) ||
      lowerMessage.endsWith("?"))
  ) {
    // Generate a contextual follow-up response
    response = getFollowUpResponse(conversationContext.lastTopic, lowerMessage);
  }

  // Default response if no patterns match
  else {
    response = getRandomResponse("unknown");

    // If this is not the first question, add a helpful suggestion
    if (
      conversationContext.questionCount > 1 &&
      conversationContext.mentionedFeatures.length > 0
    ) {
      const randomFeature =
        conversationContext.mentionedFeatures[
          Math.floor(
            Math.random() * conversationContext.mentionedFeatures.length
          )
        ];

      response +=
        " I can help with " +
        getFeatureName(randomFeature) +
        " or other task management features. Just let me know what you're interested in.";
    }
  }

  // Simulate network delay for a more natural feeling
  await new Promise((resolve) =>
    setTimeout(resolve, 500 + Math.random() * 1000)
  );

  return response;
};

/**
 * Resets the chat session
 */
export const resetChatSession = () => {
  console.log("Resetting chat session");
  conversationContext = {
    lastTopic: null,
    mentionedFeatures: [],
    questionCount: 0,
  };
};

/**
 * Tests the connection (always returns success since this is local)
 */
export const testConnection = async () => {
  return {
    success: true,
    response: "Local AI system active",
  };
};

// Helper functions

/**
 * Gets a random response from the specified category
 * @param {string} category - The category of responses
 * @returns {string} - A random response from the category
 */
const getRandomResponse = (category) => {
  const responses = responseLibrary[category];
  return responses[Math.floor(Math.random() * responses.length)];
};

/**
 * Checks if a message contains all specified keywords
 * @param {string} message - The message to check
 * @param {Array<string>} keywords - The keywords to look for
 * @returns {boolean} - True if all keywords are found, false otherwise
 */
const messageContainsAll = (message, keywords) => {
  return keywords.every((keyword) => message.includes(keyword));
};

/**
 * Checks if a message matches any of the specified keywords
 * @param {string} message - The message to check
 * @param {Array<string>} keywords - The keywords to look for
 * @returns {boolean} - True if any keyword is found, false otherwise
 */
const messageMatches = (message, keywords) => {
  return keywords.some((keyword) => message.includes(keyword));
};

/**
 * Generates a follow-up response based on the last topic
 * @param {string} lastTopic - The last topic discussed
 * @param {string} message - The current message
 * @returns {string} - A follow-up response
 */
const getFollowUpResponse = (lastTopic, message) => {
  // Implement logic to generate a follow-up response based on the last topic and current message
  // This is a placeholder implementation
  return `Sure, I can provide more details on ${getFeatureName(
    lastTopic
  )}. ${getRandomResponse(lastTopic)}`;
};

/**
 * Gets the feature name from a category key
 * @param {string} category - The category key
 * @returns {string} - The feature name
 */
const getFeatureName = (category) => {
  switch (category) {
    case "task_creation":
      return "task creation";
    case "task_priority":
      return "task prioritization";
    case "projects":
      return "projects";
    case "calendar":
      return "calendar view";
    case "deadlines":
      return "deadlines";
    case "categories":
      return "categories";
    case "filtering":
      return "filtering and sorting";
    case "completion":
      return "marking tasks as complete";
    default:
      return "task management features";
  }
};

/**
 * Fallback function that returns responses based on keywords
 * @param {string} message - The user's message
 * @returns {string} - A response based on keywords in the message
 */
const getKeywordBasedResponse = (message) => {
  console.log("Using fallback keyword-based response for:", message);

  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
    return "Hello! How can I assist you with your tasks today?";
  } else if (
    lowerMessage.includes("task") &&
    (lowerMessage.includes("create") || lowerMessage.includes("add"))
  ) {
    return "To create a new task, click the '+ Add New Task' button. You can set priority, category, and due date for better organization.";
  } else if (lowerMessage.includes("priority")) {
    return "Tasks can be set to Low, Medium, or High priority. You can sort your tasks by priority using the sort dropdown menu.";
  } else if (lowerMessage.includes("project")) {
    return "Projects help you organize related tasks. You can create a new project from the Projects tab.";
  } else if (
    lowerMessage.includes("calendar") ||
    lowerMessage.includes("schedule")
  ) {
    return "You can view your tasks in a calendar view to better plan your schedule. Tasks with due dates will appear on their respective days.";
  } else if (lowerMessage.includes("thank")) {
    return "You're welcome! Let me know if you need help with anything else.";
  } else if (
    lowerMessage.includes("deadline") ||
    lowerMessage.includes("due date")
  ) {
    return "You can set due dates for your tasks to keep track of deadlines. Tasks approaching their due date will be highlighted.";
  } else if (
    lowerMessage.includes("category") ||
    lowerMessage.includes("tag")
  ) {
    return "Categories help you organize tasks by type. You can filter tasks by category to focus on specific areas.";
  } else if (lowerMessage.includes("filter") || lowerMessage.includes("sort")) {
    return "You can filter and sort tasks by priority, category, due date, or completion status to find what you need quickly.";
  } else {
    return "I'm not sure I understand. Could you rephrase your question about task management or using the app?";
  }
};

// Add a simple test function to verify API connectivity
export const testGeminiConnection = async () => {
  try {
    if (!model) {
      return { success: false, error: "Model not initialized" };
    }

    const result = await model.generateContent(
      "Hello, can you respond with just the word 'Connected' to test the connection?"
    );
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      response: text,
    };
  } catch (error) {
    console.error("Test connection failed:", error);
    return {
      success: false,
      error: error.toString(),
    };
  }
};
