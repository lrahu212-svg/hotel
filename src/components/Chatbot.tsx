import React, { useState, useEffect } from 'react';
import type { MenuItem } from '../data/menu'; // Added OrderItem import
import type { OrderItem } from '../types';
import { Bot, Send } from 'lucide-react'; // Assuming lucide-react is available
import { CHATBOT_QA } from '../data/chatbot_qa';

interface ChatbotProps {
  menuItems: MenuItem[];
  onPlaceOrder: (items: OrderItem[]) => void; // Added onPlaceOrder prop
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ menuItems, onPlaceOrder }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [suggestedItem, setSuggestedItem] = useState<MenuItem | null>(null); // To handle ordering flow

  const simulateBotTyping = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'bot', text }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Simulate typing delay
  };

  useEffect(() => {
    if (messages.length === 0) {
      simulateBotTyping("Hello! I'm your food assistant. Ask me anything about our menu, or for a recommendation!");
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
    let response = "I'm sorry, I don't have information on that, or I didn't understand your request. Please ask about food items on our menu, or for a recommendation.";
    
    // Reset suggested item if new query, unless it's a 'yes/no' to a previous suggestion
    if (!lowerQuery.includes('yes') && !lowerQuery.includes('confirm') && !lowerQuery.includes('no') && !lowerQuery.includes('cancel')) {
        setSuggestedItem(null);
    }

    // --- Agent Logic: Handle Order Confirmation First ---
    if (suggestedItem && (lowerQuery.includes('yes') || lowerQuery.includes('confirm') || lowerQuery.includes('order it'))) {
        onPlaceOrder([{
            menuItemId: suggestedItem.id,
            quantity: 1,
            notes: '',
            name: suggestedItem.name,
            price: suggestedItem.price
        }]);
        response = `Great! I've placed an order for one ${suggestedItem.name}. It will be prepared shortly.`;
        setSuggestedItem(null); // Reset suggested item
        simulateBotTyping(response);
        return;
    } else if (suggestedItem && (lowerQuery.includes('no') || lowerQuery.includes('cancel'))) {
        response = `Okay, I've cancelled the suggestion for ${suggestedItem.name}. Is there anything else I can help you with?`;
        setSuggestedItem(null);
        simulateBotTyping(response);
        return;
    }

    // --- Agent Logic: Try to find a specific menu item first ---
    const foundSpecificItem = menuItems.find(item => lowerQuery.includes(item.name.toLowerCase()));
    if (foundSpecificItem) {
        response = `Yes, we have ${foundSpecificItem.name} for ₹${foundSpecificItem.price.toFixed(2)} in our ${foundSpecificItem.category} category. Would you like to order it?`;
        setSuggestedItem(foundSpecificItem);
        simulateBotTyping(response);
        return;
    }

    // --- Agent Logic: Process Questions from CHATBOT_QA ---
    for (const qa of CHATBOT_QA) {
      if (qa.keywords.some(keyword => lowerQuery.includes(keyword))) {
        let itemToSuggest: MenuItem | undefined;
        let responseItems: MenuItem[] = [];

        if (qa.suggestedItemId) {
            itemToSuggest = menuItems.find(item => item.id === qa.suggestedItemId);
            if (itemToSuggest) responseItems = [itemToSuggest];
        } else if (qa.categoryFilter || qa.attributeFilter) {
            let filtered = menuItems;
            if (qa.categoryFilter) {
                filtered = filtered.filter(item => item.category === qa.categoryFilter);
            }
            if (qa.attributeFilter) {
                switch (qa.attributeFilter) {
                    case 'spicy':
                        filtered = filtered.filter(item => item.spicy);
                        break;
                    case 'vegetarian':
                        filtered = filtered.filter(item => item.vegetarian);
                        break;
                    case 'low_calorie':
                        filtered = filtered.filter(item => item.calories !== undefined && item.calories <= 300 && !item.isJunk);
                        break;
                    case 'low_sugar': // Using !isJunk as a proxy for low sugar
                        filtered = filtered.filter(item => !item.isJunk);
                        break;
                }
            }
            responseItems = filtered.slice(0, 3); // Suggest up to 3 items
            if (responseItems.length > 0) {
                itemToSuggest = responseItems[Math.floor(Math.random() * responseItems.length)]; // Pick one to "suggest" for order
            }
        }
        
        if (responseItems.length > 0) {
            const itemList = responseItems.map(item => `- ${item.name} (${item.category}) priced at ₹${item.price.toFixed(2)}`).join('\n');
            response = `${qa.responseTemplate(itemToSuggest)}\n\nSome options are:\n${itemList}\n\nWould you like to order the ${itemToSuggest?.name || 'suggested item'}?`;
            setSuggestedItem(itemToSuggest || null);
        } else {
            response = qa.responseTemplate(); // Use template without item if none found
            setSuggestedItem(null);
        }
        
        simulateBotTyping(response);
        return;
      }
    }

    // --- Agent Logic: Generic Category/Attribute Fallbacks ---
    if (lowerQuery.includes('coffee') || lowerQuery.includes('espresso')) {
        const coffeeItems = menuItems.filter(item => item.category === 'Coffee & Espresso');
        if (coffeeItems.length > 0) {
            const itemList = coffeeItems.map(item => `- ${item.name} (₹${item.price.toFixed(2)})`).join('\n');
            response = `Our coffee and espresso selections include:\n${itemList}\n\nWould you like to order one?`;
            setSuggestedItem(coffeeItems[Math.floor(Math.random() * coffeeItems.length)]); // Suggest a random one
        } else {
            response = "We do not have any coffee or espresso items on the menu.";
        }
        simulateBotTyping(response);
        return;
    }
    // Add similar blocks for other categories/attributes if not covered by CHATBOT_QA

    // --- Final Fallback ---
    response = "I'm sorry, I couldn't find specific information for that. Could you please rephrase or ask about specific menu items or categories?";
    setSuggestedItem(null);
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
