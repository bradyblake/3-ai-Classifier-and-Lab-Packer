// AgentPanel - Dashboard AI Assistant
// Simplified agent interface for the right pane

import React, { useState } from "react";
import PropTypes from "prop-types";

export default function AgentPanel({ calendarEvents, addEventToCalendar, activeTool, openTool }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      text: '🤖 Hello! I\'m your unboXed Dashboard assistant. I can help you navigate tools, manage calendar events, and answer questions about your workflow.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Process message and generate response
    setTimeout(() => {
      const response = generateResponse(inputText, { calendarEvents, activeTool });
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        text: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 500);

    setInputText('');
  };

  const generateResponse = (input, context) => {
    const lowerInput = input.toLowerCase();

    // Tool navigation
    if (lowerInput.includes('open') || lowerInput.includes('launch')) {
      if (lowerInput.includes('home')) {
        openTool('TileDock');
        return '🏠 Opening the home dashboard for you!';
      }
      return '🔧 I can help you navigate tools. Currently, only the TileDock (home) is available. More tools will be added soon!';
    }

    // Calendar queries
    if (lowerInput.includes('calendar') || lowerInput.includes('event')) {
      const eventCount = context.calendarEvents?.length || 0;
      return `📅 You have ${eventCount} calendar event${eventCount !== 1 ? 's' : ''}. You can add events using the + button in the calendar panel above.`;
    }

    // Status queries
    if (lowerInput.includes('status') || lowerInput.includes('what') || lowerInput.includes('help')) {
      return `📊 Dashboard Status:
• Currently in: ${context.activeTool}
• Calendar Events: ${context.calendarEvents?.length || 0}
• Available Tools: TileDock (more coming soon)

I can help with navigation and basic queries. Ask me to "open home" or questions about your calendar!`;
    }

    // Default response
    return `🤔 I understand you said: "${input}"

I'm currently a simple assistant that can help with:
• Tool navigation ("open home")
• Calendar information ("show calendar")
• Status updates ("what's my status")

More AI capabilities will be added as we integrate tools!`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="agent-panel">
      {/* Messages */}
      <div className="agent-messages">
        {messages.map(message => (
          <div
            key={message.id}
            className={`agent-message ${message.type}`}
          >
            <div className="text-sm">
              {message.text}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="agent-input-container">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          className="agent-input"
        />
        <button
          onClick={handleSendMessage}
          className="agent-send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

AgentPanel.propTypes = {
  calendarEvents: PropTypes.array,
  addEventToCalendar: PropTypes.func,
  activeTool: PropTypes.string,
  openTool: PropTypes.func.isRequired,
};