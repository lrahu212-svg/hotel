export interface MenuItem {
  id: string;
  name: string;
  price: number;
  costPrice: number; // cost of ingredients
  category: 'Coffee & Espresso' | 'Teas & Infusions' | 'Cold Beverages' | 'Breakfast & Bakery' | 'Sandwiches & Salads';
  description: string;
  spicy?: boolean;
  vegetarian?: boolean;
  image: string; // Unique Unsplash photo URL
  calories?: number;
  protein?: number;
  isProteinRich?: boolean;
  isJunk?: boolean;
  ingredients?: string[];
  foodType?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  // Coffee & Espresso (10 items)
  {
    id: 'c1',
    name: 'Espresso',
    price: 3.00,
    costPrice: 0.40,
    category: 'Coffee & Espresso',
    description: 'A bold, concentrated shot of espresso brewed from our signature dark roast beans.',
    image: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c2',
    name: 'Double Espresso',
    price: 3.75,
    costPrice: 0.60,
    category: 'Coffee & Espresso',
    description: 'Two rich, intense shots of freshly pulled espresso for double the boost.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c3',
    name: 'Americano',
    price: 3.50,
    costPrice: 0.50,
    category: 'Coffee & Espresso',
    description: 'Fresh espresso shots topped with hot water, yielding a smooth cup with a thin crema.',
    image: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c4',
    name: 'Macchiato',
    price: 3.75,
    costPrice: 0.70,
    category: 'Coffee & Espresso',
    description: 'An espresso shot gently marked with a spoonful of warm frothed milk.',
    image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c5',
    name: 'Cortado',
    price: 4.00,
    costPrice: 0.80,
    category: 'Coffee & Espresso',
    description: 'Equal parts bold espresso and velvety steamed milk to reduce acidity.',
    image: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c6',
    name: 'Cappuccino',
    price: 4.50,
    costPrice: 0.90,
    category: 'Coffee & Espresso',
    description: 'A classic favorite featuring equal layers of espresso, steamed milk, and heavy foam.',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c7',
    name: 'Flat White',
    price: 4.50,
    costPrice: 0.90,
    category: 'Coffee & Espresso',
    description: 'Strong ristretto espresso shots topped with velvety microfoam milk.',
    image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c8',
    name: 'Latte',
    price: 4.75,
    costPrice: 1.00,
    category: 'Coffee & Espresso',
    description: 'Rich espresso shots combined with plenty of steamed milk, finished with a thin layer of foam.',
    image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c9',
    name: 'Mocha',
    price: 5.25,
    costPrice: 1.20,
    category: 'Coffee & Espresso',
    description: 'Espresso mixed with premium dark chocolate sauce, steamed milk, and whipped cream.',
    image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'c10',
    name: 'Caramel Macchiato',
    price: 5.50,
    costPrice: 1.35,
    category: 'Coffee & Espresso',
    description: 'Steamed milk stained with espresso, sweet vanilla syrup, and a generous buttery caramel drizzle.',
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80'
  },

  // Teas & Infusions (10 items)
  {
    id: 't1',
    name: 'English Breakfast Tea',
    price: 3.50,
    costPrice: 0.35,
    category: 'Teas & Infusions',
    description: 'A traditional, robust black tea blend served hot, perfect with milk and sugar.',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't2',
    name: 'Earl Grey Tea',
    price: 3.75,
    costPrice: 0.40,
    category: 'Teas & Infusions',
    description: 'Premium black tea leaves infused with natural bergamot citrus essential oils.',
    image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't3',
    name: 'Jasmine Green Tea',
    price: 3.75,
    costPrice: 0.40,
    category: 'Teas & Infusions',
    description: 'Lightly roasted green tea leaves scented with fresh jasmine blossoms.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't4',
    name: 'Matcha Latte',
    price: 5.00,
    costPrice: 1.00,
    category: 'Teas & Infusions',
    description: 'Whisked organic stone-ground Uji matcha green tea with frothed hot milk.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't5',
    name: 'Chai Tea Latte',
    price: 4.75,
    costPrice: 0.90,
    category: 'Teas & Infusions',
    description: 'Black tea infused with cardamom, cinnamon, cloves, ginger, and steamed milk.',
    image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't6',
    name: 'Peppermint Tea',
    price: 3.50,
    costPrice: 0.35,
    category: 'Teas & Infusions',
    description: 'A refreshing, caffeine-free herbal infusion made from pure peppermint leaves.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't7',
    name: 'Chamomile Tea',
    price: 3.50,
    costPrice: 0.35,
    category: 'Teas & Infusions',
    description: 'Calming caffeine-free herbal infusion with sweet floral chamomile flowers.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't8',
    name: 'Hibiscus Iced Tea',
    price: 4.00,
    costPrice: 0.50,
    category: 'Teas & Infusions',
    description: 'A vibrant tart red iced herbal tea brewed from real hibiscus petals.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't9',
    name: 'Lemon Ginger Tea',
    price: 3.75,
    costPrice: 0.45,
    category: 'Teas & Infusions',
    description: 'A warming herbal infusion of spicy ginger root and fresh zesty lemon juice.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 't10',
    name: 'Peach Oolong Tea',
    price: 4.00,
    costPrice: 0.50,
    category: 'Teas & Infusions',
    description: 'A semi-oxidized premium oolong tea blended with natural sweet peach essence.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80'
  },

  // Cold Beverages (10 items)
  {
    id: 'b1',
    name: 'Iced Coffee',
    price: 4.00,
    costPrice: 0.60,
    category: 'Cold Beverages',
    description: 'Our house blend brewed hot, chilled quickly, and served over ice cubes.',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b2',
    name: 'Cold Brew',
    price: 4.50,
    costPrice: 0.70,
    category: 'Cold Beverages',
    description: 'Rich dark roast beans steeped in cold water for 18 hours for an ultra-smooth finish.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b3',
    name: 'Iced Latte',
    price: 4.75,
    costPrice: 0.90,
    category: 'Cold Beverages',
    description: 'Chilled milk, bold espresso shots, and ice cubes blended to refreshing perfection.',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b4',
    name: 'Iced Mocha',
    price: 5.25,
    costPrice: 1.10,
    category: 'Cold Beverages',
    description: 'Espresso combined with premium chocolate syrup, cold milk, ice, and whipped cream.',
    image: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b5',
    name: 'Vanilla Frappé',
    price: 5.75,
    costPrice: 1.40,
    category: 'Cold Beverages',
    description: 'Blended ice milk drink with premium sweet vanilla bean paste, topped with whipped cream.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b6',
    name: 'Strawberry Banana Smoothie',
    price: 6.00,
    costPrice: 1.30,
    category: 'Cold Beverages',
    description: 'Fresh strawberries and ripe banana blended with honey and chilled plain yogurt.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1553530979-7ee52a2670c4?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b7',
    name: 'Mango Passionfruit Smoothie',
    price: 6.25,
    costPrice: 1.40,
    category: 'Cold Beverages',
    description: 'Tropical blend of fresh mango pulp, passionfruit nectar, and crushed ice.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1600718374662-0483d2b9da44?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b8',
    name: 'Green Detox Smoothie',
    price: 6.50,
    costPrice: 1.50,
    category: 'Cold Beverages',
    description: 'A healthy blend of spinach, green apple, cucumber, celery, ginger, and lemon juice.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b9',
    name: 'Fresh Squeezed Orange Juice',
    price: 4.50,
    costPrice: 0.90,
    category: 'Cold Beverages',
    description: 'Pure, raw orange juice freshly squeezed in-house every morning.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'b10',
    name: 'Sparkling Lemonade',
    price: 4.25,
    costPrice: 0.75,
    category: 'Cold Beverages',
    description: 'Fresh lemon juice, sparkling mineral water, and sweet simple syrup served cold.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80'
  },

  // Breakfast & Bakery (10 items)
  {
    id: 'k1',
    name: 'Butter Croissant',
    price: 3.50,
    costPrice: 0.80,
    category: 'Breakfast & Bakery',
    description: 'Flaky, golden, laminated French butter pastry baked fresh daily.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k2',
    name: 'Almond Croissant',
    price: 4.25,
    costPrice: 1.10,
    category: 'Breakfast & Bakery',
    description: 'Twice-baked croissant stuffed with sweet almond frangipane cream and topped with sliced almonds.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k3',
    name: 'Chocolate Croissant',
    price: 4.00,
    costPrice: 1.00,
    category: 'Breakfast & Bakery',
    description: 'Classic Pain au Chocolat with double bars of rich semi-sweet Belgian chocolate.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k4',
    name: 'Blueberry Muffin',
    price: 3.75,
    costPrice: 0.75,
    category: 'Breakfast & Bakery',
    description: 'Sweet, moist muffin loaded with fresh juicy wild blueberries, topped with sugar crystals.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k5',
    name: 'Banana Nut Muffin',
    price: 3.75,
    costPrice: 0.75,
    category: 'Breakfast & Bakery',
    description: 'Delicious muffin baked with mashed ripe bananas, walnuts, and a hint of cinnamon.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k6',
    name: 'Cinnamon Roll',
    price: 4.50,
    costPrice: 1.10,
    category: 'Breakfast & Bakery',
    description: 'Soft yeast dough rolled with butter, brown sugar, cinnamon, and glazed with cream cheese icing.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k7',
    name: 'Classic Bagel with Cream Cheese',
    price: 4.00,
    costPrice: 0.90,
    category: 'Breakfast & Bakery',
    description: 'A toasted New York style plain bagel served with a side of premium cream cheese spread.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k8',
    name: 'Avocado Toast',
    price: 8.50,
    costPrice: 2.20,
    category: 'Breakfast & Bakery',
    description: 'Mashed seasoned avocado, cherry tomatoes, and microgreens served on toasted sourdough.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k9',
    name: 'Oatmeal with Fresh Berries',
    price: 6.50,
    costPrice: 1.20,
    category: 'Breakfast & Bakery',
    description: 'Warm steel-cut oatmeal served with fresh blueberries, strawberries, and a drizzle of maple syrup.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'k10',
    name: 'Greek Yogurt Parfait',
    price: 6.00,
    costPrice: 1.30,
    category: 'Breakfast & Bakery',
    description: 'Creamy Greek yogurt layered with wild honey, organic honey granola, and mixed fresh berries.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'
  },

  // Sandwiches & Salads (10 items)
  {
    id: 's1',
    name: 'Turkey & Swiss Croissant Sandwich',
    price: 9.50,
    costPrice: 3.20,
    category: 'Sandwiches & Salads',
    description: 'Thinly sliced turkey breast, Swiss cheese, honey mustard, and greens in a buttery croissant.',
    image: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's2',
    name: 'Caprese Panini',
    price: 9.00,
    costPrice: 2.80,
    category: 'Sandwiches & Salads',
    description: 'Ripe tomatoes, fresh mozzarella balls, basil pesto sauce, and balsamic glaze toasted in ciabatta bread.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1481070414801-51fd732d7184?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's3',
    name: 'Classic BLT (Bacon, Lettuce, Tomato)',
    price: 8.75,
    costPrice: 2.50,
    category: 'Sandwiches & Salads',
    description: 'Crispy bacon strips, butter lettuce, tomato slices, and garlic mayo served on toasted white pullman bread.',
    image: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's4',
    name: 'Chicken Salad Wrap',
    price: 9.25,
    costPrice: 2.90,
    category: 'Sandwiches & Salads',
    description: 'Shredded chicken, grapes, pecans, celery, and light mayo dressing wrapped in a spinach tortilla.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's5',
    name: 'Vegan Hummus & Veggie Wrap',
    price: 8.50,
    costPrice: 2.10,
    category: 'Sandwiches & Salads',
    description: 'Garlic hummus, cucumber, red bell peppers, shredded carrots, spinach, and avocado in a wheat wrap.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's6',
    name: 'Classic Caesar Salad',
    price: 9.50,
    costPrice: 2.60,
    category: 'Sandwiches & Salads',
    description: 'Crisp romaine lettuce, grated parmesan, sourdough garlic croutons, and creamy caesar dressing.',
    image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's7',
    name: 'Greek Salad',
    price: 9.50,
    costPrice: 2.50,
    category: 'Sandwiches & Salads',
    description: 'Cucumbers, cherry tomatoes, red onion, kalamata olives, and crumbly feta cheese tossed in Greek dressing.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's8',
    name: 'Quinoa & Roasted Veggie Bowl',
    price: 10.50,
    costPrice: 3.10,
    category: 'Sandwiches & Salads',
    description: 'Fluffy quinoa topped with roasted butternut squash, brussels sprouts, zucchini, and lemon herb dressing.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's9',
    name: 'Grilled Chicken Spinach Salad',
    price: 11.50,
    costPrice: 3.80,
    category: 'Sandwiches & Salads',
    description: 'Baby spinach leaves, grilled chicken strips, sliced almonds, dried cranberries, and balsamic vinaigrette.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 's10',
    name: 'Tomato Basil Soup',
    price: 6.50,
    costPrice: 1.40,
    category: 'Sandwiches & Salads',
    description: 'A smooth, velvety blend of roasted tomatoes and fresh basil leaves, served with toasted crostini.',
    vegetarian: true,
    image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=80'
  }
];

import { useState, useEffect } from 'react';

const enrichMenuItem = (item: MenuItem): MenuItem => {
  let calories = item.calories;
  let protein = item.protein;
  let isProteinRich = item.isProteinRich;
  let isJunk = item.isJunk;
  let ingredients = item.ingredients;

  if (calories === undefined) {
    if (item.category === 'Coffee & Espresso') {
      const lower = item.name.toLowerCase();
      if (lower.includes('latte') || lower.includes('mocha') || lower.includes('macchiato')) {
        calories = 180;
        protein = 7;
      } else if (lower.includes('cappuccino') || lower.includes('flat white')) {
        calories = 120;
        protein = 6;
      } else {
        calories = 10;
        protein = 0;
      }
    } else if (item.category === 'Teas & Infusions') {
      calories = 80;
      protein = 1;
    } else if (item.category === 'Cold Beverages') {
      const lower = item.name.toLowerCase();
      if (lower.includes('shake') || lower.includes('smoothie')) {
        calories = 360;
        protein = 8;
        isJunk = true;
      } else {
        calories = 140;
        protein = 0;
      }
    } else if (item.category === 'Breakfast & Bakery') {
      calories = 310;
      protein = 5;
      isJunk = true; // High-carb bakery treat
    } else if (item.category === 'Sandwiches & Salads') {
      const lower = item.name.toLowerCase();
      if (lower.includes('chicken') || lower.includes('turkey') || lower.includes('club') || lower.includes('beef') || lower.includes('tuna')) {
        calories = 440;
        protein = 26;
        isProteinRich = true;
      } else {
        calories = 310;
        protein = 11;
      }
    } else {
      calories = 200;
      protein = 4;
    }
  }

  if (protein && protein >= 15) {
    isProteinRich = true;
  }

  if (!ingredients) {
    const nameLower = item.name.toLowerCase();
    if (item.category === 'Coffee & Espresso') {
      if (nameLower.includes('latte')) {
        ingredients = ['Espresso', 'Steamed Milk', 'Milk Microfoam'];
      } else if (nameLower.includes('mocha')) {
        ingredients = ['Espresso', 'Dark Chocolate Sauce', 'Steamed Milk', 'Whipped Cream'];
      } else if (nameLower.includes('cappuccino')) {
        ingredients = ['Espresso', 'Steamed Milk', 'Velvety Milk Foam'];
      } else if (nameLower.includes('macchiato')) {
        ingredients = ['Espresso', 'Steamed Milk Foam', 'Caramel Drizzle'];
      } else if (nameLower.includes('flat white')) {
        ingredients = ['Double Ristretto Espresso', 'Velvety Microfoam'];
      } else if (nameLower.includes('cortado')) {
        ingredients = ['Espresso', 'Warm Steamed Milk'];
      } else if (nameLower.includes('americano')) {
        ingredients = ['Espresso', 'Hot Water'];
      } else {
        ingredients = ['Freshly Ground Roasted Coffee Beans', 'Hot Water'];
      }
    } else if (item.category === 'Teas & Infusions') {
      if (nameLower.includes('chai') || nameLower.includes('latte')) {
        ingredients = ['Black Tea leaves', 'Steamed Milk', 'Chai Spices', 'Sugar'];
      } else if (nameLower.includes('matcha')) {
        ingredients = ['Stone-ground Matcha Green Tea', 'Steamed Milk', 'Vanilla Syrup'];
      } else {
        ingredients = ['Premium Tea Leaves', 'Hot Water'];
      }
    } else if (item.category === 'Cold Beverages') {
      if (nameLower.includes('shake') || nameLower.includes('frapp')) {
        ingredients = ['Milk', 'Ice Cream Base', 'Flavored Syrup', 'Whipped Cream'];
      } else if (nameLower.includes('iced')) {
        ingredients = ['Espresso / Tea', 'Ice', 'Water / Milk'];
      } else {
        ingredients = ['Filtered Water', 'Fruit Extract', 'Sugar Syrup', 'Ice'];
      }
    } else if (item.category === 'Breakfast & Bakery') {
      if (nameLower.includes('croissant')) {
        ingredients = ['Laminated Yeast Dough', 'French Butter', 'Egg Wash'];
      } else if (nameLower.includes('muffin')) {
        ingredients = ['Wheat Flour', 'Sugar', 'Butter', 'Blueberries / Cocoa', 'Eggs'];
      } else {
        ingredients = ['Flour', 'Butter', 'Sugar', 'Eggs', 'Yeast'];
      }
    } else if (item.category === 'Sandwiches & Salads') {
      if (nameLower.includes('chicken')) {
        ingredients = ['Grilled Chicken Breast', 'Artisanal Bread', 'Lettuce', 'Tomato', 'Mayo'];
      } else if (nameLower.includes('turkey') || nameLower.includes('club')) {
        ingredients = ['Smoked Turkey Breast', 'Toasted White Bread', 'Crisp Bacon', 'Lettuce', 'Mayo'];
      } else if (nameLower.includes('tuna')) {
        ingredients = ['Tuna Flakes', 'Whole Wheat Bread', 'Celery', 'Mayo', 'Lettuce'];
      } else {
        ingredients = ['Artisanal Bread', 'Swiss / Cheddar Cheese', 'Lettuce', 'Tomato', 'Olive Oil'];
      }
    } else {
      ingredients = ['Fresh Local Ingredients'];
    }
  }

  return {
    ...item,
    calories,
    protein,
    isProteinRich: !!isProteinRich,
    isJunk: !!isJunk,
    ingredients
  };
};

export const getMenuItems = (): MenuItem[] => {
  const saved = localStorage.getItem('hotel_dynamic_menu');
  const items: MenuItem[] = saved ? JSON.parse(saved) : MENU_ITEMS;
  return items.map(enrichMenuItem);
};

export const saveMenuItems = (items: MenuItem[]) => {
  localStorage.setItem('hotel_dynamic_menu', JSON.stringify(items));
  const channel = new BroadcastChannel('hotel_ordering_system');
  channel.postMessage({ type: 'MENU_UPDATED' });
  channel.close();
  // Also dispatch local event for the same tab
  window.dispatchEvent(new Event('menu_updated'));

  // Sync to backend server
  fetch('/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'UPDATE_MENU', menuItems: items })
  }).catch(err => console.error('Failed to sync menu updates to server:', err));
};

export const addMenuItem = (item: MenuItem) => {
  const items = getMenuItems();
  saveMenuItems([...items, item]);
};

export const deleteMenuItem = (id: string) => {
  const items = getMenuItems();
  saveMenuItems(items.filter(i => i.id !== id));
};

export const updateMenuItem = (item: MenuItem) => {
  const items = getMenuItems();
  saveMenuItems(items.map(i => i.id === item.id ? item : i));
};

export const useMenu = () => {
  const [items, setItems] = useState<MenuItem[]>(getMenuItems());

  useEffect(() => {
    const handleUpdate = () => setItems(getMenuItems());
    
    // Listen to same-tab updates
    window.addEventListener('menu_updated', handleUpdate);
    
    // Listen to cross-tab updates
    const channel = new BroadcastChannel('hotel_ordering_system');
    channel.onmessage = (e) => {
      if (e.data.type === 'MENU_UPDATED') {
        handleUpdate();
      }
    };

    return () => {
      window.removeEventListener('menu_updated', handleUpdate);
      channel.close();
    };
  }, []);

  return items;
};
