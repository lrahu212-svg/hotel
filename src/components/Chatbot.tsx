import React, { useState, useEffect } from 'react';
import type { MenuItem } from '../data/menu'; // Added OrderItem import
import type { Order, OrderItem } from '../types';
import { Bot, Send } from 'lucide-react'; // Assuming lucide-react is available
import { CHATBOT_QA } from '../data/chatbot_qa';

interface ChatbotProps {
  menuItems: MenuItem[];
  orders: Order[];
  onPlaceOrder: (items: OrderItem[]) => void; // Added onPlaceOrder prop
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  image?: string;
  suggestedItems?: MenuItem[];
}

export const Chatbot: React.FC<ChatbotProps> = ({ menuItems, orders, onPlaceOrder }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: "Hello! I'm your food assistant. Ask me anything about our menu, or for a recommendation!"
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [suggestedItem, setSuggestedItem] = useState<MenuItem | null>(null); // To handle ordering flow

  const simulateBotTyping = (text: string, image?: string, suggestedItems?: MenuItem[], showCategories?: boolean) => {
    if (showCategories) {
      setMessages((prev) => [...prev, { sender: 'bot', text, image, suggestedItems, showCategories }]);
      return;
    }
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'bot', text, image, suggestedItems, showCategories }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Simulate typing delay
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');

    processBotResponse(userMessage);
  };

  const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return tmp[a.length][b.length];
  };

  const isFuzzyMatch = (word1: string, word2: string): boolean => {
    const w1 = word1.toLowerCase();
    const w2 = word2.toLowerCase();
    if (w1.includes(w2) || w2.includes(w1)) return true;
    const distance = getLevenshteinDistance(w1, w2);
    if (w1.length <= 5) return distance <= 1;
    return distance <= 2;
  };

  const processBotResponse = (query: string) => {
    console.log('Processing query:', query);
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/[\s,?.!]+/).filter(w => w.length >= 3);
    const hasCategoryMatch = (keywords: string[]): boolean => {
      return queryWords.some(qWord => keywords.some(kw => isFuzzyMatch(qWord, kw)));
    };
    let response = "I'm sorry, I don't have information on that, or I didn't understand your request. Please ask about food items on our menu, or for a recommendation.";
    
    // Reset suggested item if new query, unless it's a 'yes/no' to a previous suggestion
    if (!lowerQuery.includes('yes') && !lowerQuery.includes('confirm') && !lowerQuery.includes('no') && !lowerQuery.includes('cancel')) {
        setSuggestedItem(null);
    }

    // --- Agent Logic: Handle Order Confirmation First ---
    console.log('Checking for order confirmation...');
    if (suggestedItem && (lowerQuery.includes('yes') || lowerQuery.includes('confirm') || lowerQuery.includes('order it'))) {
        console.log('Order confirmation detected.');
        onPlaceOrder([{
            menuItemId: suggestedItem.id,
            quantity: 1,
            notes: '',
            name: suggestedItem.name,
            price: suggestedItem.price
        }]);
        response = `Great! I've placed an order for one ${suggestedItem.name}. It will be prepared shortly.`;
        const itemImage = suggestedItem.image;
        setSuggestedItem(null); // Reset suggested item
        simulateBotTyping(response, itemImage);
        return;
    } else if (suggestedItem && (lowerQuery.includes('no') || lowerQuery.includes('cancel'))) {
        console.log('Order cancellation detected.');
        response = `Okay, I've cancelled the suggestion for ${suggestedItem.name}. Is there anything else I can help you with?`;
        setSuggestedItem(null);
        simulateBotTyping(response);
        return;
    }

    // --- Agent Logic: Try to find matching menu items by query keywords ---
    console.log('Checking for specific menu item matches...');
    const searchKeywords = lowerQuery.split(/[\s,?.!]+/).filter(w => w.length >= 3 && !['need', 'want', 'have', 'show', 'give', 'please', 'with', 'some', 'like', 'order', 'food'].includes(w));
    
    let matchedSpecificItems: MenuItem[] = [];
    // 1. Check exact full name substring first
    const sortedMenuItems = [...menuItems].sort((a, b) => b.name.length - a.name.length);
    const exactMatch = sortedMenuItems.find(item => lowerQuery.includes(item.name.toLowerCase()));
    if (exactMatch) {
        matchedSpecificItems = [exactMatch];
    } else if (searchKeywords.length > 0) {
        // 2. Fuzzy match against name words
        matchedSpecificItems = menuItems.filter(item => {
            const itemWords = item.name.toLowerCase().split(/[\s,?.!]+/);
            return searchKeywords.some(qWord => 
                itemWords.some(iWord => isFuzzyMatch(qWord, iWord))
            );
        });
    }

    if (matchedSpecificItems.length > 0) {
        if (matchedSpecificItems.length === 1) {
            const item = matchedSpecificItems[0];
            response = `Yes, we have ${item.name} for ₹${item.price.toFixed(2)} in our ${item.category} category. Would you like to order it?`;
            setSuggestedItem(item);
            simulateBotTyping(response, item.image, [item]);
        } else {
            response = `I found these matching items on our menu:`;
            // Suggest the first one by default for quick ordering
            setSuggestedItem(matchedSpecificItems[0]);
            simulateBotTyping(response, matchedSpecificItems[0].image, matchedSpecificItems.slice(0, 6));
        }
    }

    // --- Agent Logic: Check for intent keywords to trigger category buttons ---
    const intentKeywords = ['want', 'like', 'love', 'eat', 'immediately', 'immidiatly', 'hungry', 'food', 'recommend', 'something'];
    const hasIntentMatch = queryWords.some(qWord => intentKeywords.some(kw => isFuzzyMatch(qWord, kw))) || 
                           ['want', 'like', 'love', 'eat', 'hungry', 'food'].some(kw => lowerQuery.includes(kw));

    if (hasIntentMatch) {
        response = "What are you in the mood for? Select one of our food categories below:";
        simulateBotTyping(response, undefined, undefined, true);
        return;
    }

    // --- Agent Logic: Food Type & Popularity-based Recommendations ---
    console.log('Checking for food types and popularity...');
    
    // 1. Calculate item popularity
    const itemPopularity: { [id: string]: number } = {};
    orders.forEach(o => {
      if (o.status !== 'Cancelled') {
        o.items.forEach(it => {
          itemPopularity[it.menuItemId] = (itemPopularity[it.menuItemId] || 0) + it.quantity;
        });
      }
    });

    // 2. Extract all foodType values present in the menu
    const customTypes = new Set<string>();
    menuItems.forEach(item => {
      if (item.foodType) {
        customTypes.add(item.foodType.toLowerCase());
      }
    });

    // 3. Find if any of the food types are mentioned in the query
    let matchedType: string | null = null;
    const allTypesToCheck = ['spicy', 'sweet', 'sour', ...Array.from(customTypes)];
    for (const t of allTypesToCheck) {
      if (lowerQuery.includes(t)) {
        matchedType = t;
        break;
      }
    }

    if (matchedType) {
      const matchingItems = menuItems.filter(item => {
        if (matchedType === 'spicy' && (item.spicy || item.foodType?.toLowerCase() === 'spicy')) {
          return true;
        }
        return item.foodType?.toLowerCase() === matchedType;
      });

      if (matchingItems.length > 0) {
        const stopWords = ['recommend', 'something', 'food', 'have', 'want', 'order', 'show', 'find', 'like', 'with', 'dish', 'dishes', 'option', 'options', 'please', 'you', 'give', 'get', 'any', 'me', 'some', 'the', 'a', 'an', 'is', 'are', 'spicy', 'sweet', 'sour', ...Array.from(customTypes)];
        const queryWords = lowerQuery.split(/[\s,?.!]+/).filter(w => w.length > 2 && !stopWords.includes(w));

        let finalMatching = matchingItems;
        let isKeywordSearch = false;
        if (queryWords.length > 0) {
          const keywordMatchedItems = matchingItems.filter(item => {
            return queryWords.some(word => 
              item.name.toLowerCase().includes(word) || 
              item.description.toLowerCase().includes(word) ||
              item.category.toLowerCase().includes(word)
            );
          });
          if (keywordMatchedItems.length > 0) {
            finalMatching = keywordMatchedItems;
            isKeywordSearch = true;
          }
        }

        const sortedByPopularity = [...finalMatching].sort((a, b) => {
          const popA = itemPopularity[a.id] || 0;
          const popB = itemPopularity[b.id] || 0;
          return popB - popA;
        });

        const bestItem = sortedByPopularity[0];
        const bestPopularity = itemPopularity[bestItem.id] || 0;

        let responseText = '';
        const searchContext = isKeywordSearch ? `${matchedType} matching "${queryWords.join(' ')}"` : `${matchedType} food`;
        if (bestPopularity > 0) {
          responseText = `Our most popular option for ${searchContext} is the **${bestItem.name}** (₹${bestItem.price.toFixed(2)}), which has been ordered ${bestPopularity} times!`;
        } else {
          responseText = `We have **${bestItem.name}** (₹${bestItem.price.toFixed(2)}) which is a great option if you're looking for something ${searchContext}.`;
        }

        responseText += `\n\nHere are some options:`;
        
        setSuggestedItem(bestItem);
        simulateBotTyping(responseText, bestItem.image, sortedByPopularity.slice(0, 4));
        return;
      }
    }

    // --- Agent Logic: Process Questions from CHATBOT_QA ---
    console.log('Checking CHATBOT_QA...');
    for (const qa of CHATBOT_QA) {
      if (qa.keywords.some(keyword => lowerQuery.includes(keyword))) {
        console.log('Matched QA keyword for:', qa.keywords);
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
            response = `${qa.responseTemplate(itemToSuggest)}\n\nHere are some options:`;
            setSuggestedItem(itemToSuggest || null);
            simulateBotTyping(response, itemToSuggest?.image, responseItems);
        } else {
            response = qa.responseTemplate(); // Use template without item if none found
            setSuggestedItem(null);
            simulateBotTyping(response);
        }
        return;
      }
    }

    // --- Agent Logic: Generic Category/Attribute Fallbacks ---
    console.log('Checking generic category fallbacks...');
    if (hasCategoryMatch(['coffee', 'espresso', 'cafe'])) {
        console.log('Matched coffee/espresso generic fallback.');
        const coffeeItems = menuItems.filter(item => item.category === 'Coffee & Espresso');
        let suggested: MenuItem | null = null;
        if (coffeeItems.length > 0) {
            response = `Our coffee and espresso selections include:`;
            suggested = coffeeItems[Math.floor(Math.random() * coffeeItems.length)];
            setSuggestedItem(suggested); // Suggest a random one
        } else {
            response = "We do not have any coffee or espresso items on the menu.";
        }
        simulateBotTyping(response, suggested?.image, coffeeItems.slice(0, 4));
        return;
    }
    // Add similar blocks for other categories/attributes if not covered by CHATBOT_QA
    if (hasCategoryMatch(['tea', 'infusion', 'chai'])) {
      console.log('Matched tea/infusion generic fallback.');
      const teaItems = menuItems.filter(item => item.category === 'Teas & Infusions');
      let suggested: MenuItem | null = null;
      if (teaItems.length > 0) {
          response = `Our tea and infusion selections include:`;
          suggested = teaItems[Math.floor(Math.random() * teaItems.length)];
          setSuggestedItem(suggested);
      } else {
          response = "We do not have any tea or infusion items on the menu.";
      }
      simulateBotTyping(response, suggested?.image, teaItems.slice(0, 4));
      return;
    }
    if (hasCategoryMatch(['cold beverage', 'drink', 'shake', 'smoothie', 'juice', 'jice'])) {
      console.log('Matched cold beverage generic fallback.');
      const coldDrinkItems = menuItems.filter(item => item.category === 'Cold Beverages');
      let suggested: MenuItem | null = null;
      if (coldDrinkItems.length > 0) {
          response = `Our cold beverages include:`;
          suggested = coldDrinkItems[Math.floor(Math.random() * coldDrinkItems.length)];
          setSuggestedItem(suggested);
      } else {
          response = "We do not have any cold beverages on the menu.";
      }
      simulateBotTyping(response, suggested?.image, coldDrinkItems.slice(0, 4));
      return;
    }
    if (hasCategoryMatch(['breakfast', 'bakery', 'pastry', 'muffin', 'croissant'])) {
      console.log('Matched breakfast/bakery generic fallback.');
      const breakfastItems = menuItems.filter(item => item.category === 'Breakfast & Bakery');
      let suggested: MenuItem | null = null;
      if (breakfastItems.length > 0) {
          response = `Our breakfast and bakery items include:`;
          suggested = breakfastItems[Math.floor(Math.random() * breakfastItems.length)];
          setSuggestedItem(suggested);
      } else {
          response = "We do not have any breakfast or bakery items on the menu.";
      }
      simulateBotTyping(response, suggested?.image, breakfastItems.slice(0, 4));
      return;
    }
    if (hasCategoryMatch(['sandwich', 'salad', 'soup', 'lunch'])) {
      console.log('Matched sandwich/salad/soup generic fallback.');
      const lunchItems = menuItems.filter(item => item.category === 'Sandwiches & Salads');
      let suggested: MenuItem | null = null;
      if (lunchItems.length > 0) {
          response = `Our sandwiches, salads, and soups include:`;
          suggested = lunchItems[Math.floor(Math.random() * lunchItems.length)];
          setSuggestedItem(suggested);
      } else {
          response = "We do not have any sandwiches, salads, or soups on the menu.";
      }
      simulateBotTyping(response, suggested?.image, lunchItems.slice(0, 4));
      return;
    }

    // --- Final Fallback ---
    console.log('Falling back to generic response.');
    response = "I'm sorry, I couldn't find specific information for that. Could you please rephrase or ask about specific menu items or categories?";
    setSuggestedItem(null);
    simulateBotTyping(response);
  };

  const intentKeywords = ['want', 'like', 'love', 'eat', 'immediately', 'immidiatly', 'hungry', 'food', 'recommend', 'something'];
  const showSuggestions = intentKeywords.some(kw => input.toLowerCase().includes(kw));

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
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              gap: '0.5rem',
              width: '100%'
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
              {msg.image && !msg.suggestedItems && (
                <div style={{ marginTop: '0.75rem', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={msg.image} alt="Food item" style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'cover' }} />
                </div>
              )}
            </div>
            {msg.suggestedItems && msg.suggestedItems.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                overflowX: 'auto',
                padding: '0.5rem 0',
                maxWidth: '95%',
                alignSelf: 'flex-start',
                scrollbarWidth: 'thin'
              }}>
                {msg.suggestedItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      flex: '0 0 140px',
                      background: 'rgba(30, 41, 59, 0.9)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <div style={{ width: '100%', height: '80px', overflow: 'hidden' }}>
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '0.25rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 500 }}>
                          ₹{item.price.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onPlaceOrder([{
                            menuItemId: item.id,
                            quantity: 1,
                            notes: '',
                            name: item.name,
                            price: item.price
                          }]);
                          setMessages((prev) => [...prev, {
                            sender: 'bot',
                            text: `Great choice! I've placed an order for one ${item.name}.`
                          }]);
                        }}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'background-color 0.2s',
                          width: '100%'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {msg.showCategories && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginTop: '0.5rem',
                maxWidth: '95%',
                alignSelf: 'flex-start'
              }}>
                {[
                  { label: '☕ Coffee & Espresso', query: 'coffee' },
                  { label: '🍵 Teas & Infusions', query: 'tea' },
                  { label: '🥤 Cold Beverages', query: 'cold beverages' },
                  { label: '🥐 Breakfast & Bakery', query: 'breakfast' },
                  { label: '🥪 Sandwiches & Salads', query: 'sandwich' },
                  { label: '🌶️ Spicy Options', query: 'spicy' },
                  { label: '🍰 Sweet Options', query: 'sweet' }
                ].map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMessages((prev) => [...prev, { sender: 'user', text: `I want ${cat.query}` }]);
                      processBotResponse(cat.query);
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '16px',
                      padding: '0.4rem 0.8rem',
                      color: '#fff',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: 600
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)';
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
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
        position: 'relative'
      }}>
        {showSuggestions && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '1rem',
            right: '1rem',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px 12px 0 0',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            boxShadow: '0 -8px 20px rgba(0,0,0,0.5)',
            zIndex: 10
          }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>What kind of food are you looking for?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {[
                { label: '☕ Coffee', query: 'coffee' },
                { label: '🍵 Tea', query: 'tea' },
                { label: '🥤 Cold Drinks', query: 'cold beverages' },
                { label: '🥐 Bakery & Breakfast', query: 'breakfast' },
                { label: '🥪 Sandwiches & Salads', query: 'sandwich' },
                { label: '🌶️ Spicy Food', query: 'spicy' },
                { label: '🍰 Sweet Desserts', query: 'sweet' }
              ].map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMessages((prev) => [...prev, { sender: 'user', text: `I want ${cat.query}` }]);
                    setInput('');
                    processBotResponse(cat.query);
                  }}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '12px',
                    padding: '0.3rem 0.6rem',
                    color: '#fff',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.3)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)')}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
