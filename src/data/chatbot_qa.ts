import type { MenuItem } from './menu';

interface ChatbotQA {
  keywords: string[];
  responseTemplate: (item?: MenuItem) => string; // Function to generate response, optionally with a menu item
  suggestedItemId?: string; // Optional: ID of a menu item to suggest for ordering
  categoryFilter?: string; // Optional: category to filter for a random suggestion
  attributeFilter?: 'spicy' | 'vegetarian' | 'low_calorie' | 'low_sugar'; // Optional: attribute to filter for
}

export const CHATBOT_QA: ChatbotQA[] = [
  {
    keywords: ['hello', 'hi', 'hey'],
    responseTemplate: () => "Hello there! I'm your AI food assistant. How can I help you today?"
  },
  {
    keywords: ['menu', 'food options', 'dishes'],
    responseTemplate: () => "Our menu includes categories like Coffee & Espresso, Teas & Infusions, Cold Beverages, Breakfast & Bakery, and Sandwiches & Salads. What are you in the mood for?"
  },
  {
    keywords: ['low calorie sweet', 'healthy dessert', 'light sweet'],
    responseTemplate: (item) => item ? `For a healthier sweet option, how about our ${item.name} (${item.calories} kcal)? Would you like to order it?` : "I couldn't find any specific low-calorie sweet items. You might consider fruit-based options like our Green Detox Smoothie or Oatmeal with Fresh Berries for a healthier treat.",
    categoryFilter: 'Breakfast & Bakery',
    attributeFilter: 'low_calorie'
  },
  {
    keywords: ['low sugar sweet', 'sugar free dessert'],
    responseTemplate: (item) => item ? `Looking for low sugar? Our ${item.name} could be a good choice. It's priced at ₹${item.price.toFixed(2)}. Would you like to order it?` : "We don't have many explicitly low-sugar sweet items. You could try our unsweetened teas or ask for no sugar added to certain beverages.",
    categoryFilter: 'Breakfast & Bakery',
    attributeFilter: 'low_sugar'
  },
  {
    keywords: ['vegetarian option', 'veg food'],
    responseTemplate: (item) => item ? `How about our ${item.name} (${item.category})? It's vegetarian and priced at ₹${item.price.toFixed(2)}. Would you like to order it?` : "We have several delicious vegetarian options!",
    attributeFilter: 'vegetarian'
  },
  {
    keywords: ['random spicy food', 'spicy recommendation'],
    responseTemplate: (item) => item ? `How about a ${item.name} (${item.category})? It's priced at ₹${item.price.toFixed(2)}. Would you like to order it?` : "I couldn't find any spicy food items on the menu right now.",
    attributeFilter: 'spicy'
  },
  {
    keywords: ['coffee recommendation', 'best coffee'],
    responseTemplate: (item) => item ? `Many customers love our ${item.name}! It's a great choice for coffee lovers, priced at ₹${item.price.toFixed(2)}. Would you like to order one?` : "We have a great selection of coffee and espresso drinks. What kind of flavor profile are you looking for?",
    categoryFilter: 'Coffee & Espresso',
    suggestedItemId: 'c8' // Latte
  },
  {
    keywords: ['sandwich', 'lunch sandwich'],
    responseTemplate: (item) => item ? `Our ${item.name} is a fantastic sandwich option, priced at ₹${item.price.toFixed(2)}. Can I get this for you?` : "We have a variety of sandwiches and salads for lunch!",
    categoryFilter: 'Sandwiches & Salads',
    suggestedItemId: 's1' // Turkey & Swiss Croissant Sandwich
  },
  {
    keywords: ['hot tea', 'tea types'],
    responseTemplate: (item) => item ? `You might enjoy our ${item.name}, a delightful infusion priced at ₹${item.price.toFixed(2)}. Would you like to order it?` : "We offer various hot teas and infusions. Do you prefer black, green, or herbal?",
    categoryFilter: 'Teas & Infusions',
    suggestedItemId: 't2' // Earl Grey Tea
  },
  {
    keywords: ['something light', 'light meal'],
    responseTemplate: (item) => item ? `For something light, our ${item.name} is a great choice, priced at ₹${item.price.toFixed(2)}. Can I add this to your order?` : "How about a fresh salad or a lighter sandwich option?",
    attributeFilter: 'low_calorie' // Filter for low-calorie for light meal
  },
  {
    keywords: ['thank you', 'thanks'],
    responseTemplate: () => "You're most welcome! Feel free to ask if you have any more questions."
  },
];
