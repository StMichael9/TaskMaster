import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendMessageToAI, resetChatSession } from '../services/aiService';

const AIAssistant = ({ isOpen, onClose, accentColor }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: "Hi there! I'm your personal task assistant. I can help you organize tasks, suggest improvements, and answer questions about using the app. What can I help you with today?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset chat session when assistant is closed
  useEffect(() => {
    if (!isOpen) {
      resetChatSession();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    
    try {
      // Check premium status
      if (!isPremium && messages.filter(m => m.type === 'user').length >= 3) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          text: "You've reached the limit of free messages. Upgrade to premium for unlimited AI assistance!",
          isPremiumPrompt: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        // Get conversation history for context
        const conversationHistory = messages.map(msg => ({
          type: msg.type,
          text: msg.text
        }));
        
        // Call the AI service with the user's message and conversation history
        const aiResponse = await sendMessageToAI(inputText, conversationHistory);
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          text: aiResponse,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Show error message to user
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        text: "I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleUpgrade = () => {
    // In a real app, this would open a payment flow
    alert("This would open a payment gateway in a real application.");
    setIsPremium(true);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col overflow-hidden z-50"
        >
          {/* Header */}
          <div 
            className="p-3 text-white font-medium flex justify-between items-center"
            style={{ backgroundColor: accentColor }}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Task Assistant
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Messages area */}
          <div className="flex-1 p-3 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`mb-3 flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-3/4 p-2 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : message.isPremiumPrompt 
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                  style={message.type === 'user' ? { backgroundColor: accentColor } : {}}
                >
                  <div>{message.text}</div>
                  <div className="text-xs opacity-70 mt-1 text-right">
                    {formatTime(message.timestamp)}
                  </div>
                  
                  {message.isPremiumPrompt && (
                    <button
                      onClick={handleUpgrade}
                      className="mt-2 w-full py-1 px-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded transition-colors"
                    >
                      Upgrade to Premium
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                style={{ focusRingColor: accentColor }}
              />
              <button
                onClick={handleSendMessage}
                className="p-2 rounded-r-lg text-white"
                style={{ backgroundColor: accentColor }}
                disabled={!inputText.trim() || isTyping}
              >
                {isTyping ? (
                  <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIAssistant;