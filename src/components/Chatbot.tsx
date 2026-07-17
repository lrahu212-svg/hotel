import React, { useState, useEffect } from 'react';
import type { MenuItem } from '../data/menu';
import { Bot, Send } from 'lucide-react'; // Assuming lucide-react is available

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

  const processBotResponse = (query: string) => {
    const lowerQuery = query.toLowerCase();
    let response = "I'm sorry, I don't have information on that, or I didn't understand your request. Please ask about food items on our menu.";

    // --- Low Calorie Logic ---
    if (lowerQuery.includes('low calorie') || lowerQuery.includes('healthy')) {
      const lowCalorieThreshold = 300; // Define what's considered low calorie
      const healthyItems = menuItems.filter(item =>
        (item.calories !== undefined && item.calories <= lowCalorieThreshold && !item.isJunk) ||
        (item.vegetarian && item.category === 'Sandwiches & Salads' && !item.isJunk) ||
        (item.category === 'Teas & Infusions' && item.calories !== undefined && item.calories < 150) ||
        (item.category === 'Cold Beverages' && !item.isJunk && item.calories !== undefined && item.calories < 200 && (lowerQuery.includes('juice') || lowerQuery.includes('smoothie')))
      );
      
      if (lowerQuery.includes('sweet') || lowerQuery.includes('dessert')) {
        const lowCalorieSweets = healthyItems.filter(item => 
            (item.category === 'Breakfast & Bakery' || item.category === 'Cold Beverages') && // Consider these categories for sweets/desserts
            (item.name.toLowerCase().includes('muffin') || item.name.toLowerCase().includes('parfait') || item.name.toLowerCase().includes('smoothie'))
        );
        if (lowCalorieSweets.length > 0) {
            response = `Here are some healthier/low-calorie sweet options from our menu:\n${lowCalorieSweets.map(item => `- ${item.name} (${item.calories || 0} kcal)`).join('\n')}`;
        } else {
            response = "I couldn't find any specific low-calorie sweet items. You might consider fruit-based options like our Green Detox Smoothie or Oatmeal with Fresh Berries for a healthier treat.";
        }
      } else if (healthyItems.length > 0) {
        response = `Here are some healthier/low-calorie options from our menu:\n${healthyItems.map(item => `- ${item.name} (${item.calories || 0} kcal)`).join('\n')}`;
      } else {
        response = "I couldn't find many low-calorie options based on your request. Most of our dishes are designed for a balanced experience, but I can help you find other types of food!";
      }
    } 
    // --- Low Sugar Logic ---
    else if (lowerQuery.includes('low sugar') || lowerQuery.includes('sugar free')) {
        const lowSugarItems = menuItems.filter(item => !item.isJunk && (item.category === 'Teas & Infusions' || item.category === 'Sandwiches & Salads' || item.name.toLowerCase().includes('black coffee')));
        
        if (lowerQuery.includes('sweet')) {
            const lowSugarSweets = lowSugarItems.filter(item => 
                (item.name.toLowerCase().includes('berry') || item.name.toLowerCase().includes('fruit')) && (item.category === 'Breakfast & Bakery' || item.category === 'Cold Beverages')
            );
            if (lowSugarSweets.length > 0) {
                response = `Here are some low-sugar sweet options:\n${lowSugarSweets.map(item => `- ${item.name}`).join('\n')}`;
            } else {
                response = "We don't have many explicitly low-sugar sweet items. You could try our unsweetened teas or ask for no sugar added to certain beverages.";
            }
        } else if (lowSugarItems.length > 0) {
            response = `Here are some low-sugar options from our menu:\n${lowSugarItems.map(item => `- ${item.name}`).join('\n')}`;
        } else {
            response = "I couldn't find many explicitly low-sugar items. Our savory dishes generally have lower sugar content than desserts.";
        }
    }
    // --- Vegetarian Logic ---
    else if (lowerQuery.includes('vegetarian')) {
      const vegetarianItems = menuItems.filter(item => item.vegetarian);
      if (vegetarianItems.length > 0) {
        response = `Here are our vegetarian options:\n${vegetarianItems.map(item => `- ${item.name} (${item.category})`).join('\n')}`;
      } else {
        response = "We currently do not have any vegetarian items on the menu.";
      }
    }
    // --- Spicy Logic ---
    else if (lowerQuery.includes('spicy')) {
      const spicyItems = menuItems.filter(item => item.spicy);
      if (spicyItems.length > 0) {
        response = `Here are our spicy options:\n${spicyItems.map(item => `- ${item.name} (${item.category})`).join('\n')}`;
      } else {
        response = "We currently do not have any spicy items on the menu.";
      }
    }
    // --- Category Specific Questions ---
    else if (lowerQuery.includes('coffee') || lowerQuery.includes('espresso')) {
        const coffeeItems = menuItems.filter(item => item.category === 'Coffee & Espresso');
        if (coffeeItems.length > 0) {
            response = `Here are our coffee and espresso selections:\n${coffeeItems.map(item => `- ${item.name}`).join('\n')}`;
        } else {
            response = "We do not have any coffee or espresso items.";
        }
    }
    else if (lowerQuery.includes('tea') || lowerQuery.includes('infusion')) {
        const teaItems = menuItems.filter(item => item.category === 'Teas & Infusions');
        if (teaItems.length > 0) {
            response = `Here are our tea and infusion selections:\n${teaItems.map(item => `- ${item.name}`).join('\n')}`;
        } else {
            response = "We do not have any tea or infusion items.";
        }
    }
    else if (lowerQuery.includes('cold beverage') || lowerQuery.includes('drink')) {
        const coldDrinks = menuItems.filter(item => item.category === 'Cold Beverages');
        if (coldDrinks.length > 0) {
            response = `Here are our cold beverages:\n${coldDrinks.map(item => `- ${item.name}`).join('\n')}`;
        } else {
            response = "We do not have any cold beverages.";
        }
    }
    else if (lowerQuery.includes('breakfast') || lowerQuery.includes('bakery') || lowerQuery.includes('pastry')) {
        const breakfastItems = menuItems.filter(item => item.category === 'Breakfast & Bakery');
        if (breakfastItems.length > 0) {
            response = `Here are our breakfast and bakery items:\n${breakfastItems.map(item => `- ${item.name}`).join('\n')}`;
        } else {
            response = "We do not have any breakfast or bakery items.";
        }
    }
    else if (lowerQuery.includes('sandwich') || lowerQuery.includes('salad') || lowerQuery.includes('soup')) {
        const lunchItems = menuItems.filter(item => item.category === 'Sandwiches & Salads');
        if (lunchItems.length > 0) {
            response = `Here are our sandwiches, salads, and soups:\n${lunchItems.map(item => `- ${item.name}`).join('\n')}`;
        } else {
            response = "We do not have any sandwiches, salads, or soups.";
        }
    }
    // --- Generic Food Questions ---
    else if (lowerQuery.includes('menu') || lowerQuery.includes('food options') || lowerQuery.includes('dishes')) {
      response = "Our menu includes categories like Coffee & Espresso, Teas & Infusions, Cold Beverages, Breakfast & Bakery, and Sandwiches & Salads. What are you in the mood for?";
    } else if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
      response = "Hello there! How can I assist you with our menu today?";
    } else if (lowerQuery.includes('thank you') || lowerQuery.includes('thanks')) {
      response = "You're welcome! Feel free to ask if you have more questions.";
    }

    simulateBotTyping(response);
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