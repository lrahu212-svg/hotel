import React, { useState, useEffect } from 'react';
import type { MenuItem } from '../data/menu';
import { Bot, Send } from 'lucide-react'; // Assuming lucide-react is available

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

interface ChatbotProps {
  menuItems: MenuItem[];
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ menuItems }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const simulateBotTyping = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'bot', text }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Simulate typing delay
  };

  useEffect(() => {
    if (messages.length === 0) {
      simulateBotTyping("Hello! I'm your food assistant. Ask me anything about our menu!");
    }
  }, [messages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');

    processBotResponse(userMessage);
  };

const processBotResponse = async (query: string) => {
  simulateBotTyping("Thinking..."); // Indicate that the bot is processing

  const menuItemsString = menuItems.map(item =>
    `- ${item.name} (${item.category}, Price: $${item.price.toFixed(2)}, Calories: ${item.calories || 'N/A'}, Protein: ${item.protein || 'N/A'}g, Vegetarian: ${item.vegetarian ? 'Yes' : 'No'}, Spicy: ${item.spicy ? 'Yes' : 'No'}, Description: ${item.description})`
  ).join('\n');

  const systemMessage = `You are a helpful AI food assistant for a hotel restaurant. Your goal is to answer questions about the menu, recommend dishes, and provide information based on the available menu items.

  Here is the current menu:
  ${menuItemsString}

  When asked about food, ONLY suggest items from the provided menu. If a user asks for something not on the menu, politely state that you don't have it.
  For "low calorie" suggestions, recommend items with lower calorie counts or healthier options from the menu.
  For "low sugar" suggestions, recommend items that are not marked as "isJunk" and are generally less sweet, or offer modifications (e.g., "unsweetened tea").
  Keep your responses concise and helpful.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Using a common Groq model
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const botResponse = data.choices[0]?.message?.content || "I'm sorry, I couldn't get a response from the AI at this time.";
    setMessages((prev) => [...prev, { sender: 'bot', text: botResponse }]);

  } catch (error) {
    console.error("Error communicating with Groq API:", error);
    setMessages((prev) => [...prev, { sender: 'bot', text: "I'm sorry, I encountered an error. Please try again later." }]);
  } finally {
    setIsTyping(false);
  }
};

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '600px', // Fixed height for chatbot window
      border: '1px solid var(--border-glass)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'rgba(15, 23, 42, 0.7)', // Darker glass-panel background
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '1rem',
        background: 'rgba(14, 165, 233, 0.2)', // Accent color for header
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.1rem'
      }}>
        <Bot size={24} color="#10b981" /> AI Food Assistant
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '0.75rem 1rem',
                borderRadius: '18px',
                background: msg.sender === 'user' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.9rem',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              maxWidth: '70%',
              padding: '0.75rem 1rem',
              borderRadius: '18px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.9rem',
            }}>
              <span className="dot-animation">...</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} style={{
        padding: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(15, 23, 42, 0.7)',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about food..."
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '20px',
            border: '1px solid var(--border-glass)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            outline: 'none',
            fontSize: '0.9rem'
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            padding: '0.75rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            transition: 'background-color 0.2s',
          }}
        >
          <Send size={20} /> Send
        </button>
      </form>
      {/* Basic keyframe for typing animation */}
      <style>
        {`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .dot-animation {
          animation: blink 1s infinite;
        }
        `}
      </style>
    </div>
  );
};