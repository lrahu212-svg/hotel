import React, { useState } from 'react';
import type { MenuItem } from '../data/menu'; // Added OrderItem import
import type { Order, OrderItem } from '../types';
import { Send } from 'lucide-react'; // Assuming lucide-react is available
import { CHATBOT_QA } from '../data/chatbot_qa';

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

    // 1. Calculate Token-Based Similarity for all menu items to get precise/fuzzy hits
    const scoredMenuItems = menuItems.map(item => {
      const qWords = lowerQuery.split(/[\s,?.!]+/);
      const nameWords = item.name.toLowerCase().split(/[\s,?.!]+/);
      
      let matches = 0;
      for (const qw of qWords) {
        if (qw.length < 3 || ['want', 'like', 'love', 'eat', 'hungry', 'food', 'order', 'please', 'with', 'have', 'show', 'give'].includes(qw)) continue;
        for (const nw of nameWords) {
          if (nw.includes(qw) || qw.includes(nw) || getLevenshteinDistance(qw, nw) <= 1) {
            matches++;
            break;
          }
        }
      }
      const score = matches / Math.max(qWords.length - 2, nameWords.length); // Adjusted divisor for better query handling
      return { item, score };
    }).filter(x => x.score > 0.25).sort((a, b) => b.score - a.score);

    const bestMatch = scoredMenuItems.length > 0 ? scoredMenuItems[0].item : null;

    // 2. Greeting Intent
    const greetingWords = ['hi', 'hello', 'hey', 'greetings', 'morning', 'evening', 'who are you', 'howdy', 'hola'];
    const isGreeting = greetingWords.some(gw => lowerQuery.startsWith(gw) || lowerQuery === gw);
    if (isGreeting) {
      simulateBotTyping("Hello! 👋 I am your virtual food assistant. I can recommend options by price (e.g. 'under 100'), ingredients (e.g. 'with avocado'), nutrition (e.g. 'high protein', 'low calorie'), or tell you about specific dishes (e.g. 'tell me about Peppermint Tea'). What can I get for you?");
      return;
    }

    // 3. Confirm/Cancel Suggestion Intent (Yes/No response)
    if (suggestedItem && (lowerQuery.includes('yes') || lowerQuery.includes('confirm') || lowerQuery.includes('order it') || lowerQuery.includes('ok') || lowerQuery.includes('sure'))) {
        onPlaceOrder([{
            menuItemId: suggestedItem.id,
            quantity: 1,
            notes: '',
            name: suggestedItem.name,
            price: suggestedItem.price
        }]);
        response = `Great choice! I've placed an order for one ${suggestedItem.name}. It will be ready shortly.`;
        const itemImage = suggestedItem.image;
        setSuggestedItem(null);
        simulateBotTyping(response, itemImage);
        return;
    } else if (suggestedItem && (lowerQuery.includes('no') || lowerQuery.includes('cancel') || lowerQuery.includes('stop'))) {
        response = `No problem! I've cancelled the recommendation for ${suggestedItem.name}. Let me know if you would like something else!`;
        setSuggestedItem(null);
        simulateBotTyping(response);
        return;
    }

    // 4. Order Action Intent (e.g. "order mocha", "add avocado toast to cart")
    const isOrderIntent = lowerQuery.includes('order') || lowerQuery.includes('add') || lowerQuery.includes('buy') || lowerQuery.includes('want') || lowerQuery.includes('get');
    if (isOrderIntent && bestMatch) {
      onPlaceOrder([{
        menuItemId: bestMatch.id,
        quantity: 1,
        notes: '',
        name: bestMatch.name,
        price: bestMatch.price
      }]);
      simulateBotTyping(`Perfect! I've automatically added one **${bestMatch.name}** (₹${bestMatch.price.toFixed(2)}) to your order.`, bestMatch.image);
      return;
    }

    // 5. Specific Detail Intent (e.g. "tell me about Matcha Latte", "explain Peppermint Tea")
    const isDetailsIntent = lowerQuery.includes('detail') || lowerQuery.includes('explain') || lowerQuery.includes('describe') || lowerQuery.includes('info') || lowerQuery.includes('tell me about') || lowerQuery.includes('what is') || lowerQuery.includes('about') || lowerQuery.includes('ingredient') || lowerQuery.includes('nutri');
    if (isDetailsIntent && bestMatch) {
      const advantages = getFoodAdvantagesLocal(bestMatch);
      const explanation = `**${bestMatch.name}** (${bestMatch.category})\n\n` +
        `• **Description**: ${bestMatch.description || 'Freshly prepared'}\n` +
        `• **Price**: ₹${bestMatch.price.toFixed(2)}\n` +
        `• **Nutrition**: 🔥 ${bestMatch.calories || 0} kcal | 💪 ${bestMatch.protein || 0}g protein\n` +
        `• **Ingredients**: ${bestMatch.ingredients?.join(', ') || 'Fresh ingredients'}\n` +
        `• **Health Benefits**: ${advantages}`;
        
      setSuggestedItem(bestMatch);
      simulateBotTyping(explanation, bestMatch.image, [bestMatch]);
      return;
    }

    // 6. Budget/Price Filters (e.g. "under 100", "pocket friendly", "cheap")
    const budgetMatch = lowerQuery.match(/\b(\d+)\b/);
    const isCheapQuery = lowerQuery.includes('cheap') || lowerQuery.includes('budget') || lowerQuery.includes('pocket friendly') || lowerQuery.includes('low price') || lowerQuery.includes('cheapest');
    if (budgetMatch || isCheapQuery) {
      let budgetLimit = budgetMatch ? parseInt(budgetMatch[1], 10) : null;
      let matchedItems = [...menuItems];
      
      if (budgetLimit) {
        matchedItems = matchedItems.filter(item => item.price <= budgetLimit);
      }
      
      matchedItems.sort((a, b) => a.price - b.price);
      
      if (matchedItems.length > 0) {
        let responseText = '';
        if (budgetLimit) {
          responseText = `Here are the best options under ₹${budgetLimit} (cheapest first). Would you like to order the **${matchedItems[0].name}**?`;
        } else {
          responseText = `Here are our most budget-friendly options. Would you like to order the **${matchedItems[0].name}**?`;
        }
        setSuggestedItem(matchedItems[0]);
        simulateBotTyping(responseText, matchedItems[0].image, matchedItems.slice(0, 4));
        return;
      } else if (budgetLimit) {
        const cheapest = [...menuItems].sort((a, b) => a.price - b.price)[0];
        simulateBotTyping(`I couldn't find any items under ₹${budgetLimit}. Our cheapest option is the **${cheapest.name}** for ₹${cheapest.price.toFixed(2)}. Would you like to order it?`, cheapest.image, [cheapest]);
        setSuggestedItem(cheapest);
        return;
      }
    }

    // 7. Protein & Nutrition Filters
    const isProteinQuery = lowerQuery.includes('protein') || lowerQuery.includes('muscle') || lowerQuery.includes('gym') || lowerQuery.includes('protein rich') || lowerQuery.includes('high protein');
    const isHealthyQuery = lowerQuery.includes('healthy') || lowerQuery.includes('diet') || lowerQuery.includes('nutrition') || lowerQuery.includes('nutritious');
    const isLowCalQuery = lowerQuery.includes('low calorie') || lowerQuery.includes('low cal') || lowerQuery.includes('diet friendly') || lowerQuery.includes('weight loss');
    const isHighCalQuery = lowerQuery.includes('high calorie') || lowerQuery.includes('heavy') || lowerQuery.includes('fill me up');

    if (isProteinQuery || isHealthyQuery || isLowCalQuery || isHighCalQuery) {
      let matchedItems = [...menuItems];
      let responseText = '';
      
      if (isProteinQuery) {
        matchedItems.sort((a, b) => (b.protein || 0) - (a.protein || 0));
        responseText = `Here are our highest protein options. Would you like to order the **${matchedItems[0].name}** (💪 ${matchedItems[0].protein || 0}g protein)?`;
      } else if (isLowCalQuery) {
        matchedItems.sort((a, b) => (a.calories || 9999) - (b.calories || 9999));
        responseText = `Here are our lowest calorie options. Would you like to order the **${matchedItems[0].name}** (🔥 ${matchedItems[0].calories || 0} kcal)?`;
      } else if (isHighCalQuery) {
        matchedItems.sort((a, b) => (b.calories || 0) - (a.calories || 0));
        responseText = `Here are our most filling, high-calorie options. Would you like to order the **${matchedItems[0].name}** (🔥 ${matchedItems[0].calories || 0} kcal)?`;
      } else {
        matchedItems.sort((a, b) => {
          const scoreA = (a.protein || 0) * 10 - (a.calories || 0) * 0.1;
          const scoreB = (b.protein || 0) * 10 - (b.calories || 0) * 0.1;
          return scoreB - scoreA;
        });
        responseText = `Here are some of our healthiest options. Would you like to order the **${matchedItems[0].name}**?`;
      }
      
      if (matchedItems.length > 0) {
        setSuggestedItem(matchedItems[0]);
        simulateBotTyping(responseText, matchedItems[0].image, matchedItems.slice(0, 4));
        return;
      }
    }

    // 7b. Food Type, Attribute & Category Filters (e.g. "spicy", "sweet", "vegetarian", "coffee", "tea")
    const isSpicy = lowerQuery.includes('spicy') || lowerQuery.includes('hot') || lowerQuery.includes('chili') || lowerQuery.includes('spic');
    const isSweet = lowerQuery.includes('sweet') || lowerQuery.includes('sugar') || lowerQuery.includes('dessert') || lowerQuery.includes('bakery');
    const isVeg = lowerQuery.includes('veg') || lowerQuery.includes('vegetarian') || lowerQuery.includes('vegan');
    
    let attributeFilteredItems: MenuItem[] = [];
    let attributeName = '';
    
    if (isSpicy) {
      attributeFilteredItems = menuItems.filter(item => item.spicy || item.foodType?.toLowerCase() === 'spicy');
      attributeName = 'spicy';
    } else if (isSweet) {
      attributeFilteredItems = menuItems.filter(item => item.category === 'Breakfast & Bakery' || item.foodType?.toLowerCase() === 'sweet');
      attributeName = 'sweet';
    } else if (isVeg) {
      attributeFilteredItems = menuItems.filter(item => item.vegetarian);
      attributeName = 'vegetarian';
    }
    
    if (attributeFilteredItems.length > 0) {
      const responseText = `Here are some delicious **${attributeName}** options on our menu. Would you like to order the **${attributeFilteredItems[0].name}**?`;
      setSuggestedItem(attributeFilteredItems[0]);
      simulateBotTyping(responseText, attributeFilteredItems[0].image, attributeFilteredItems.slice(0, 4));
      return;
    }

    const categories = ['Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages', 'Breakfast & Bakery', 'Sandwiches & Salads'];
    const matchedCategory = categories.find(cat => {
      const catLower = cat.toLowerCase();
      return lowerQuery.includes(catLower) || 
             (catLower.includes('coffee') && lowerQuery.includes('coffee')) ||
             (catLower.includes('tea') && lowerQuery.includes('tea')) ||
             (catLower.includes('beverage') && lowerQuery.includes('drink')) ||
             (catLower.includes('breakfast') && lowerQuery.includes('breakfast')) ||
             (catLower.includes('sandwich') && lowerQuery.includes('sandwich')) ||
             (catLower.includes('salad') && lowerQuery.includes('salad'));
    });
    
    if (matchedCategory) {
      const categoryItems = menuItems.filter(item => item.category === matchedCategory);
      if (categoryItems.length > 0) {
        const responseText = `Here are the options in our **${matchedCategory}** category. Would you like to order the **${categoryItems[0].name}**?`;
        setSuggestedItem(categoryItems[0]);
        simulateBotTyping(responseText, categoryItems[0].image, categoryItems.slice(0, 4));
        return;
      }
    }

    // 8. Ingredient Analysis / Search
    const commonIngredients = ['avocado', 'chocolate', 'cheese', 'coffee', 'espresso', 'milk', 'egg', 'cream', 'berry', 'berries', 'strawberry', 'tomato', 'basil', 'salad', 'bread', 'syrup', 'cinnamon', 'mint', 'lemon', 'ginger', 'honey', 'matcha', 'tea'];
    let matchedIngredient = commonIngredients.find(ing => lowerQuery.includes(ing));
    if (matchedIngredient) {
      const matchedItems = menuItems.filter(item => {
        const inName = item.name.toLowerCase().includes(matchedIngredient);
        const inDesc = item.description?.toLowerCase().includes(matchedIngredient);
        const inIng = item.ingredients?.some(i => i.toLowerCase().includes(matchedIngredient));
        return inName || inDesc || inIng;
      });
      
      if (matchedItems.length > 0) {
        const responseText = `Here are the options containing **${matchedIngredient}**. Would you like to order the **${matchedItems[0].name}**?`;
        setSuggestedItem(matchedItems[0]);
        simulateBotTyping(responseText, matchedItems[0].image, matchedItems.slice(0, 4));
        return;
      }
    }

    // 9. Standard Food Item recommendations
    if (bestMatch) {
      simulateBotTyping(`Yes, we have **${bestMatch.name}** for ₹${bestMatch.price.toFixed(2)}. Would you like to order it?`, bestMatch.image, [bestMatch]);
      setSuggestedItem(bestMatch);
      return;
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
