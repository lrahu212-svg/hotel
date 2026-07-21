import React, { useState } from 'react';
import type { MenuItem } from '../data/menu'; // Added OrderItem import
import type { Order, OrderItem } from '../types';
import { Send } from 'lucide-react'; // Assuming lucide-react is available

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  image?: string;
  suggestedItems?: MenuItem[];
  showCategories?: boolean;
}

interface ChatbotProps {
  menuItems: MenuItem[];
  orders: Order[];
  onPlaceOrder: (items: OrderItem[]) => void; // Added onPlaceOrder prop
  isMobile?: boolean;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const getFoodAdvantagesLocal = (item: MenuItem): string => {
  const name = item.name.toLowerCase();
  
  if (name.includes('avocado')) {
    return '🥑 Rich in heart-healthy monounsaturated fats, dietary fiber, and loaded with potassium and essential vitamins (C, E, K, B6). Boosts skin glow and supports overall heart function.';
  }
  if (name.includes('salad') || name.includes('greek') || name.includes('caesar')) {
    return '🥗 Exceptionally high in dietary fiber, raw vitamins, and antioxidants. Aids digestion, supports weight management, and strengthens natural immunity.';
  }
  if (name.includes('protein') || item.isProteinRich) {
    return '💪 High-quality lean protein source. Crucial for muscle repair, tissue growth, keeping you full longer, and stabilizing blood sugar levels.';
  }
  if (name.includes('croissant') || name.includes('muffin') || name.includes('roll')) {
    return '🥐 High energy density. Quick carbohydrates that supply instantaneous energy for brain function and muscle work, perfect for a morning boost.';
  }
  if (name.includes('matcha') || name.includes('green tea')) {
    return '🍵 Packed with L-theanine and powerful EGCG catechins. Enhances focus and calmness, speeds up metabolism, and guards against cellular damage.';
  }
  if (name.includes('espresso') || name.includes('coffee') || name.includes('latte') || name.includes('americano')) {
    return '⚡ High caffeine content. Boosts cognitive focus, improves reaction times, increases metabolic rate for fat-burning, and provides rich antioxidants.';
  }
  
  switch (item.category) {
    case 'Coffee & Espresso':
      return '⚡ Enhances focus, increases alertness, boosts physical activity endurance, and contains essential antioxidants that reduce oxidative stress.';
    case 'Teas & Infusions':
      return '🍃 Promotes relaxation, supports gut health, is naturally hydrating, and helps fight inflammation with rich polyphenols.';
    case 'Cold Beverages':
      return '💧 Instantly rehydrates, replenishes essential electrolytes, and provides a quick, cooling nutrient boost to keep you refreshed.';
    case 'Breakfast & Bakery':
      return '🌾 Provides fast-releasing carbohydrates to fuel early morning physical tasks and brain activity.';
    case 'Sandwiches & Salads':
      return '🥦 High nutritional yield. Delivers balanced macronutrients, dietary fiber, essential vitamins, and supports digestive health.';
    default:
      return '🥗 Provides balanced energy, clean nutrients, and satisfies appetite while maintaining steady cellular vitality.';
  }
};

export const Chatbot: React.FC<ChatbotProps> = ({ menuItems, orders, onPlaceOrder, isMobile = false, messages, setMessages }) => {
  console.log('Active orders length:', orders.length);
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

  const processBotResponse = (query: string) => {
    console.log('Processing query:', query);
    const lowerQuery = query.toLowerCase();
    
    // Reset suggested item if new query, unless it's a 'yes/no' to a previous suggestion
    if (!lowerQuery.includes('yes') && !lowerQuery.includes('confirm') && !lowerQuery.includes('no') && !lowerQuery.includes('cancel')) {
        setSuggestedItem(null);
    }

    // 1. Confirm/Cancel Suggestion Intent (Yes/No response)
    if (suggestedItem && (lowerQuery.includes('yes') || lowerQuery.includes('confirm') || lowerQuery.includes('order it') || lowerQuery.includes('ok') || lowerQuery.includes('sure'))) {
        onPlaceOrder([{
            menuItemId: suggestedItem.id,
            quantity: 1,
            notes: '',
            name: suggestedItem.name,
            price: suggestedItem.price
        }]);
        simulateBotTyping(`Great choice! I've placed an order for one ${suggestedItem.name}. It will be ready shortly.`, suggestedItem.image);
        setSuggestedItem(null);
        return;
    } else if (suggestedItem && (lowerQuery.includes('no') || lowerQuery.includes('cancel') || lowerQuery.includes('stop'))) {
        simulateBotTyping(`No problem! I've cancelled the recommendation for ${suggestedItem.name}. Let me know if you would like something else!`);
        setSuggestedItem(null);
        return;
    }

    // 2. Greeting Intent
    const greetingWords = ['hi', 'hello', 'hey', 'greetings', 'morning', 'evening', 'who are you', 'howdy', 'hola'];
    const isGreeting = greetingWords.some(gw => lowerQuery.startsWith(gw) || lowerQuery === gw);
    if (isGreeting) {
      simulateBotTyping("Hello! 👋 I am your smart AI Food Assistant. I can analyze ingredients, costs, calories, and categories to find exactly what you need (e.g. 'spicy food under 150', 'high protein breakfast', 'something with avocado'). What are you looking for?");
      return;
    }

    // 2b. Specific Detail Intent (e.g. "tell me about Matcha Latte", "explain Peppermint Tea")
    const isDetailsIntent = lowerQuery.includes('detail') || lowerQuery.includes('explain') || lowerQuery.includes('describe') || lowerQuery.includes('info') || lowerQuery.includes('tell me about') || lowerQuery.includes('what is') || lowerQuery.includes('about') || lowerQuery.includes('ingredient') || lowerQuery.includes('nutri');
    
    // Find matching item by name similarity
    const scoredMenuItemsForDetails = menuItems.map(item => {
      const qWords = lowerQuery.split(/[\s,?.!]+/);
      const nameWords = item.name.toLowerCase().split(/[\s,?.!]+/);
      let nameMatches = 0;
      for (const qw of qWords) {
        if (qw.length < 3 || ['want', 'like', 'love', 'eat', 'hungry', 'food', 'order', 'please', 'with', 'have', 'show', 'give', 'detail', 'explain', 'describe', 'info', 'about', 'what', 'is'].includes(qw)) continue;
        for (const nw of nameWords) {
          if (nw.includes(qw) || qw.includes(nw) || getLevenshteinDistance(qw, nw) <= 1) {
            nameMatches++;
            break;
          }
        }
      }
      const score = nameMatches / Math.max(qWords.length - 2, nameWords.length);
      return { item, score };
    }).filter(x => x.score > 0.25).sort((a, b) => b.score - a.score);

    const bestDetailMatch = scoredMenuItemsForDetails.length > 0 ? scoredMenuItemsForDetails[0].item : null;

    if (isDetailsIntent && bestDetailMatch) {
      const advantages = getFoodAdvantagesLocal(bestDetailMatch);
      const explanation = `**${bestDetailMatch.name}** (${bestDetailMatch.category})\n\n` +
        `• **Description**: ${bestDetailMatch.description || 'Freshly prepared'}\n` +
        `• **Price**: ₹${bestDetailMatch.price.toFixed(2)}\n` +
        `• **Nutrition**: 🔥 ${bestDetailMatch.calories || 0} kcal | 💪 ${bestDetailMatch.protein || 0}g protein\n` +
        `• **Ingredients**: ${bestDetailMatch.ingredients?.join(', ') || 'Fresh ingredients'}\n` +
        `• **Health Benefits**: ${advantages}`;
        
      setSuggestedItem(bestDetailMatch);
      simulateBotTyping(explanation, bestDetailMatch.image, [bestDetailMatch]);
      return;
    }

    // 3. Parse Constraints from User Query
    const budgetMatch = lowerQuery.match(/\b(\d+)\b/);
    const hasStrictBudget = budgetMatch !== null;
    const budgetLimit = budgetMatch ? parseInt(budgetMatch[1], 10) : null;
    const isCheapPreferred = lowerQuery.includes('cheap') || lowerQuery.includes('budget') || lowerQuery.includes('pocket friendly') || lowerQuery.includes('low price') || lowerQuery.includes('cheapest') || lowerQuery.includes('low cost');

    const isHighProtein = lowerQuery.includes('protein') || lowerQuery.includes('muscle') || lowerQuery.includes('gym') || lowerQuery.includes('protein rich') || lowerQuery.includes('high protein');
    const isLowCalorie = lowerQuery.includes('low calorie') || lowerQuery.includes('low cal') || lowerQuery.includes('diet friendly') || lowerQuery.includes('weight loss');
    const isHighCalorie = lowerQuery.includes('high calorie') || lowerQuery.includes('heavy') || lowerQuery.includes('fill me up');
    
    const isSpicy = lowerQuery.includes('spicy') || lowerQuery.includes('hot') || lowerQuery.includes('chili') || lowerQuery.includes('spic');
    const isSweet = lowerQuery.includes('sweet') || lowerQuery.includes('sugar') || lowerQuery.includes('dessert') || lowerQuery.includes('bakery');
    const isVeg = lowerQuery.includes('veg') || lowerQuery.includes('vegetarian') || lowerQuery.includes('vegan');

    const commonIngredients = ['avocado', 'chocolate', 'cheese', 'coffee', 'espresso', 'milk', 'egg', 'cream', 'berry', 'berries', 'strawberry', 'tomato', 'basil', 'salad', 'bread', 'syrup', 'cinnamon', 'mint', 'lemon', 'ginger', 'honey', 'matcha', 'tea'];
    const matchedIngredients = commonIngredients.filter(ing => lowerQuery.includes(ing));

    const categories = ['Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages', 'Breakfast & Bakery', 'Sandwiches & Salads'];
    const matchedCategories = categories.filter(cat => {
      const catLower = cat.toLowerCase();
      return lowerQuery.includes(catLower) || 
             (catLower.includes('coffee') && lowerQuery.includes('coffee')) ||
             (catLower.includes('tea') && lowerQuery.includes('tea')) ||
             (catLower.includes('beverage') && lowerQuery.includes('drink')) ||
             (catLower.includes('breakfast') && lowerQuery.includes('breakfast')) ||
             (catLower.includes('sandwich') && lowerQuery.includes('sandwich')) ||
             (catLower.includes('salad') && lowerQuery.includes('salad'));
    });

    // 4. Filter and Score Menu Items
    let eligibleItems = [...menuItems];

    if (hasStrictBudget && budgetLimit !== null) {
      eligibleItems = eligibleItems.filter(item => item.price <= budgetLimit);
    }
    if (isVeg) {
      eligibleItems = eligibleItems.filter(item => item.vegetarian);
    }

    const scoredItems = eligibleItems.map(item => {
      let score = 0;

      const qWords = lowerQuery.split(/[\s,?.!]+/);
      const nameWords = item.name.toLowerCase().split(/[\s,?.!]+/);
      let nameMatches = 0;
      for (const qw of qWords) {
        if (qw.length < 3 || ['want', 'like', 'love', 'eat', 'hungry', 'food', 'order', 'please', 'with', 'have', 'show', 'give'].includes(qw)) continue;
        for (const nw of nameWords) {
          if (nw.includes(qw) || qw.includes(nw) || getLevenshteinDistance(qw, nw) <= 1) {
            nameMatches++;
            break;
          }
        }
      }
      const nameSimilarity = nameMatches / Math.max(qWords.length - 2, nameWords.length);
      score += nameSimilarity * 20;

      if (matchedCategories.includes(item.category)) {
        score += 15;
      }

      if (matchedIngredients.length > 0) {
        const hasIng = matchedIngredients.some(ing => 
          item.name.toLowerCase().includes(ing) || 
          item.description?.toLowerCase().includes(ing) || 
          item.ingredients?.some(i => i.toLowerCase().includes(ing))
        );
        if (hasIng) score += 15;
      }

      if (isSpicy && (item.spicy || item.foodType?.toLowerCase() === 'spicy')) {
        score += 12;
      }

      if (isSweet && (item.category === 'Breakfast & Bakery' || item.foodType?.toLowerCase() === 'sweet')) {
        score += 12;
      }

      if (isHighProtein && item.protein) {
        score += item.protein * 1.5;
      }

      if (isLowCalorie && item.calories) {
        score += (600 - item.calories) * 0.05;
      }
      if (isHighCalorie && item.calories) {
        score += item.calories * 0.05;
      }

      if (isCheapPreferred) {
        score += (300 - item.price) * 0.1;
      }

      return { item, score };
    });

    const filteredScored = scoredItems
      .filter(x => x.score > 0 || (hasStrictBudget && x.item.price <= (budgetLimit || 9999)))
      .sort((a, b) => b.score - a.score);

    if (filteredScored.length > 0) {
      const bestSuggestion = filteredScored[0].item;
      setSuggestedItem(bestSuggestion);

      const reasons: string[] = [];
      if (hasStrictBudget) reasons.push(`fits your ₹${budgetLimit} budget`);
      if (isCheapPreferred) reasons.push(`is budget friendly (₹${bestSuggestion.price})`);
      if (isVeg && bestSuggestion.vegetarian) reasons.push(`is vegetarian`);
      if (isSpicy && (bestSuggestion.spicy || bestSuggestion.foodType === 'Spicy')) reasons.push(`is spicy`);
      if (isHighProtein && bestSuggestion.protein) reasons.push(`has high protein (${bestSuggestion.protein}g)`);
      if (isLowCalorie && bestSuggestion.calories) reasons.push(`has low calories (${bestSuggestion.calories} kcal)`);
      
      const matchedIngName = matchedIngredients.find(ing => 
        bestSuggestion.name.toLowerCase().includes(ing) || 
        bestSuggestion.ingredients?.some(i => i.toLowerCase().includes(ing))
      );
      if (matchedIngName) reasons.push(`contains ${matchedIngName}`);

      let explanationText = `Based on your request, I recommend the **${bestSuggestion.name}** (₹${bestSuggestion.price.toFixed(2)}).`;
      if (reasons.length > 0) {
        explanationText += ` It ${reasons.join(', and ')}.`;
      }
      explanationText += `\n\nWould you like me to add it to your order?`;

      const isOrderIntent = lowerQuery.includes('order') || lowerQuery.includes('add') || lowerQuery.includes('buy') || lowerQuery.includes('want') || lowerQuery.includes('get');
      if (isOrderIntent) {
        onPlaceOrder([{
          menuItemId: bestSuggestion.id,
          quantity: 1,
          notes: '',
          name: bestSuggestion.name,
          price: bestSuggestion.price
        }]);
        simulateBotTyping(`Perfect! I've analyzed our ingredients & prices and added one **${bestSuggestion.name}** to your order (₹${bestSuggestion.price.toFixed(2)}).`, bestSuggestion.image);
        setSuggestedItem(null);
        return;
      }

      simulateBotTyping(explanationText, bestSuggestion.image, filteredScored.map(x => x.item).slice(0, 4));
      return;
    }

    // --- Final Fallback ---
    console.log('Falling back to generic response.');
    simulateBotTyping("I'm sorry, I couldn't find specific items matching all those criteria. Could you please rephrase or ask about specific menu items, ingredients, or budget ranges?");
    setSuggestedItem(null);
  };

  const intentKeywords = ['want', 'like', 'love', 'eat', 'immediately', 'immidiatly', 'hungry', 'food', 'recommend', 'something'];
  const showSuggestions = intentKeywords.some(kw => input.toLowerCase().includes(kw));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%', // Take full height of responsive parent wrapper
      border: '1px solid var(--border-glass)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'rgba(15, 23, 42, 0.75)', // Darker glass-panel background
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '1.5rem 1.25rem',
        background: '#111c3a', // Deep navy/dark blue background like screenshot
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        color: '#fff'
      }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Hi there! 👋
        </div>
        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>
          Start a chat. We're here to help you 24/7.
        </div>
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
        paddingRight: isMobile ? '76px' : '1rem',
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
            minWidth: '0', // Allow input to shrink on small screens
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
            padding: isMobile ? '0.75rem' : '0.75rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '0' : '0.5rem',
            fontWeight: 600,
            transition: 'background-color 0.2s',
            width: isMobile ? '40px' : 'auto',
            height: isMobile ? '40px' : 'auto',
            flexShrink: 0 // Prevent button from shrinking
          }}
        >
          <Send size={18} />
          {!isMobile && 'Send'}
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
