import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Order, OrderStatus } from '../types';
import { Clock } from 'lucide-react';
import { useMenu } from '../data/menu';

interface KitchenConfig {
  id: string;
  name: string;
  categories: string[];
}

interface KitchenViewProps {
  kitchenId: string;
  orders: Order[];
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onUpdateItemStatus?: (orderId: string, itemIndex: number, status: OrderStatus) => void;
}

export const KitchenView: React.FC<KitchenViewProps> = ({ kitchenId, orders, onUpdateStatus, onUpdateItemStatus }) => {
  const MENU_ITEMS = useMenu();
  const [soundEnabled] = useState<boolean>(true);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(0);
  const [focusedOrderIndex, setFocusedOrderIndex] = useState<number>(0);
  const [isNavigatingItems, setIsNavigatingItems] = useState<boolean>(false);
  const [openedViaNumber, setOpenedViaNumber] = useState<boolean>(false);
  const keyBufferRef = useRef<string>('');
  const bufferTimeoutRef = useRef<any>(null);

  const processPrintQueue = useCallback(() => { // Added useCallback
    if (isPrinting.current || printQueue.current.length === 0) return;

    isPrinting.current = true;
    const order = printQueue.current.shift()!; // Take the first order

    // Ensure ALL old print sections are completely removed so they don't pile up!
    const oldPrints = document.querySelectorAll('#print-section');
    oldPrints.forEach(p => p.remove());

    const printDiv = document.createElement('div');
    printDiv.id = 'print-section';
    printDiv.style.fontFamily = 'monospace';
    printDiv.style.color = '#000';
    printDiv.style.padding = '0';
    printDiv.style.background = '#fff';

    printDiv.innerHTML = `
      <div style="padding: 15px 0;">
        <h2 style="text-align: center; margin: 5px 0; color: #000;">KITCHEN ORDER TICKET</h2>
        <h3 style="text-align: center; margin: 5px 0; color: #000;">${order.tableId.startsWith('Room ') ? order.tableId : 'Table ' + order.tableId}</h3>
        <div style="text-align: center; font-size: 0.8em; margin-bottom: 10px; color: #000;">
          ${new Date(order.timestamp).toLocaleString()}
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; color: #000;">
          <span style="width: 30px;">Qty</span>
          <span style="flex: 1;">Item</span>
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        ${order.filteredItems.map(item => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #000;">
            <span style="width: 30px; font-weight: bold;">${item.quantity}x</span>
            <span style="flex: 1;">${item.name}</span>
          </div>
          ${item.notes ? `<div style="font-style: italic; font-size: 0.9em; margin-left: 30px; color: #000;">* ${item.notes}</div>` : ''}
        `).join('')}
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; margin-top: 20px; color: #000;">
          -- End of Ticket --
        </div>
      </div>
    `;

    document.body.appendChild(printDiv);
    
    // Slight delay to ensure DOM is updated before printing
    setTimeout(() => {
      window.print();
      // Remove it after the print dialog closes
      setTimeout(() => {
        const prints = document.querySelectorAll('#print-section');
        prints.forEach(p => p.remove());

        // Queue next print job after 3 second delay
        setTimeout(() => {
          isPrinting.current = false;
          processPrintQueue(); // Process any remaining or newly arrived items
        }, 3000);
      }, 1000);
    }, 100);
  }, []); // Added dependency array for useCallback

  const markAllComplete = useCallback((order: typeof stationOrders[0]) => {
    if (onUpdateStatus) {
      onUpdateStatus(order.id, 'Ready');
    }
  }, [onUpdateStatus]);

  const enqueuePrint = useCallback((ordersToPrint: typeof stationOrders) => {
    printQueue.current.push(...ordersToPrint);
    processPrintQueue();
  }, [processPrintQueue]); // Added processPrintQueue to dependency array

  const isInitialLoad = useRef(true);
  const printQueue = useRef<typeof stationOrders>([]);
  const isPrinting = useRef(false);

  // Load Kitchen Display settings from Reception Configs
  const savedConfigs = localStorage.getItem('hotel_kitchen_configs');
  const configs: KitchenConfig[] = savedConfigs ? JSON.parse(savedConfigs) : [
    { id: '1', name: 'Bakery & Food Station', categories: ['Breakfast & Bakery', 'Sandwiches & Salads'] },
    { id: '2', name: 'Barista & Drink Station', categories: ['Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages'] },
    { id: '3', name: 'General Kitchen Station', categories: ['Breakfast & Bakery', 'Sandwiches & Salads', 'Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages'] }
  ];

  const currentConfig = configs.find(c => c.id === kitchenId);

  // If kitchen display count is 1, all categories display by default
  const isSingleKitchenMode = configs.length === 1;

  const isItemForStation = (category: string) => {
    if (isSingleKitchenMode) return true; // Show all categories
    if (currentConfig) {
      return currentConfig.categories.includes(category);
    }
    if (kitchenId === '1') return true; // Default to all if not found
    if (kitchenId === '2') return category === 'Coffee & Espresso' || category === 'Teas & Infusions' || category === 'Cold Beverages';
    return true;
  };

  // Filter the orders list so that only orders containing items for this station are shown
  const stationOrders = orders
    .map(order => ({
      ...order,
      filteredItems: order.items
        .map((item, originalIndex) => ({ ...item, originalIndex }))
        .filter(item => {
          if (item.status === 'Ready' || item.status === 'Served' || item.status === 'Cancelled') return false;
          const menuItem = MENU_ITEMS.find(m => m.id === item.menuItemId);
          return menuItem ? isItemForStation(menuItem.category) : true;
        })
    }))
    .filter(order => order.filteredItems.length > 0);

  // Filter active orders (non-served and non-cancelled)
  const activeOrders = stationOrders
    .filter(o => o.status !== 'Served' && o.status !== 'Cancelled')
    .sort((a, b) => a.timestamp - b.timestamp);

  // Take the first 6 active orders
  const displayOrders = activeOrders.slice(0, 6);

  // Fill exactly 6 slots
  const slots = Array.from({ length: 6 }, (_, index) => displayOrders[index] || null);

  // Play synthetic chime when a new order arrives and auto-print if configured
  useEffect(() => {
    const pendingOrders = stationOrders.filter(o => o.status === 'Pending');
    
    // Get globally known printed IDs from localStorage to prevent multi-tab printing
    const savedIds = localStorage.getItem('hotel_printed_order_ids');
    const printedIds = savedIds ? JSON.parse(savedIds) : [];
    const printedSet = new Set<string>(printedIds);

    if (isInitialLoad.current) {
      pendingOrders.forEach(o => printedSet.add(o.id));
      localStorage.setItem('hotel_printed_order_ids', JSON.stringify(Array.from(printedSet)));
      isInitialLoad.current = false;
      return;
    }

    const newPendingOrders = pendingOrders.filter(o => !printedSet.has(o.id));

    if (newPendingOrders.length > 0) {
      newPendingOrders.forEach(o => printedSet.add(o.id));
      localStorage.setItem('hotel_printed_order_ids', JSON.stringify(Array.from(printedSet)));

      if (soundEnabled) {
        playChime();
      }
      
      const kitchenMode = localStorage.getItem('hotel_kitchen_mode');
      if (kitchenMode === 'printer') {
        const ordersToPrint = newPendingOrders.sort((a, b) => b.timestamp - a.timestamp);
        enqueuePrint(ordersToPrint);
      }
    }
  }, [orders, soundEnabled, stationOrders, enqueuePrint]);

  // Keyboard shortcut to select orders / navigate main display
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const key = e.key;
      const currentFocusedOrder = displayOrders[focusedOrderIndex];

      if (/^[0-9]$/.test(key)) {
        // Append to typed key buffer
        keyBufferRef.current += key;
        
        // Reset clear-timeout
        if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
        bufferTimeoutRef.current = setTimeout(() => {
          keyBufferRef.current = '';
        }, 1500);

        const currentBuffer = keyBufferRef.current;

        // Match room (e.g., tableId starts with 'Room ' and matches digits in room number)
        let orderIdx = displayOrders.findIndex(
          o => {
            const tableClean = o.tableId.replace(/\D/g, ''); // Extract room digits
            return tableClean === currentBuffer && o.tableId.startsWith('Room ') && (o.status === 'Pending' || o.status === 'Preparing');
          }
        );

        // Match table (exact match)
        if (orderIdx === -1) {
          orderIdx = displayOrders.findIndex(
            o => o.tableId === currentBuffer && !o.tableId.startsWith('Room ') && (o.status === 'Pending' || o.status === 'Preparing')
          );
        }

        if (orderIdx !== -1) {
          setFocusedOrderIndex(orderIdx);
          setIsNavigatingItems(false);
          setOpenedViaNumber(true);
        }
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        setOpenedViaNumber(false);
        if (isNavigatingItems && currentFocusedOrder) {
          setFocusedItemIndex(prev => Math.min(prev + 1, currentFocusedOrder.filteredItems.length - 1));
        } else {
          setFocusedOrderIndex(prev => Math.min(prev + 1, Math.max(0, displayOrders.length - 1)));
        }
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        setOpenedViaNumber(false);
        if (isNavigatingItems && currentFocusedOrder) {
          setFocusedItemIndex(prev => Math.max(prev - 1, 0));
        } else {
          setFocusedOrderIndex(prev => Math.max(prev - 1, 0));
        }
      } else if (key === 'Enter') {
        e.preventDefault();
        
        // If there's a number in the buffer, try to match it and complete it immediately!
        const currentBuffer = keyBufferRef.current;
        let matchedOrder = currentFocusedOrder;

        if (currentBuffer) {
          // Reset buffer and timeout
          keyBufferRef.current = '';
          if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);

          let orderIdx = displayOrders.findIndex(
            o => {
              const tableClean = o.tableId.replace(/\D/g, '');
              return tableClean === currentBuffer && o.tableId.startsWith('Room ') && (o.status === 'Pending' || o.status === 'Preparing');
            }
          );

          if (orderIdx === -1) {
            orderIdx = displayOrders.findIndex(
              o => o.tableId === currentBuffer && !o.tableId.startsWith('Room ') && (o.status === 'Pending' || o.status === 'Preparing')
            );
          }

          if (orderIdx !== -1) {
            matchedOrder = displayOrders[orderIdx];
            setFocusedOrderIndex(orderIdx);
            setIsNavigatingItems(false);
          }
        }

        if (matchedOrder) {
          const kitchenMode = localStorage.getItem('hotel_kitchen_mode') || 'monitor';
          const isRoomOrder = matchedOrder.tableId.startsWith('Room ');
          
          if (openedViaNumber || kitchenMode === 'printer' || isRoomOrder || currentBuffer) {
            // Ready all
            markAllComplete(matchedOrder);
            setOpenedViaNumber(false);
            setIsNavigatingItems(false);
          } else if (isNavigatingItems) {
            // Toggle focused item (only for tables)
            const item = matchedOrder.filteredItems[focusedItemIndex];
            if (item) {
              const newStatus = item.status === 'Ready' ? 'Preparing' : 'Ready';
              if (onUpdateItemStatus) onUpdateItemStatus(matchedOrder.id, item.originalIndex, newStatus);
            }
          } else {
            // Enter item navigation inside card (only for tables)
            setIsNavigatingItems(true);
            setFocusedItemIndex(0);
          }
        }
      } else if (key === 'Escape') {
        e.preventDefault();
        setIsNavigatingItems(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayOrders, focusedOrderIndex, focusedItemIndex, isNavigatingItems, openedViaNumber, onUpdateStatus, onUpdateItemStatus, markAllComplete]);

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      playTone(523.25, ctx.currentTime, 0.3); // C5
      playTone(659.25, ctx.currentTime + 0.12, 0.4); // E5
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const getElapsedTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000); // mins
    if (diff < 1) return 'Just now';
    return `${diff}m ago`;
  };

  // Keep timers fresh
  const [, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleItemComplete = (orderId: string, item: any) => {
    if (onUpdateItemStatus) {
      const newStatus = item.status === 'Ready' ? 'Preparing' : 'Ready';
      onUpdateItemStatus(orderId, item.originalIndex, newStatus);
    }
  };








  return (
    <div className="animate-fade-in kitchen-container">
      {/* Main 6 KDS Slots Grid */}
      <div className="kds-grid">
        {slots.map((order, idx) => {
          if (!order) {
            return (
              <div key={`empty-${idx}`} style={{
                border: '2px dashed rgba(255,255,255,0.05)',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '16px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                gap: '0.5rem',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '2.5rem', opacity: 0.2 }}>🍳</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Slot #{idx + 1}</span>
              </div>
            );
          }

          const itemCount = order.filteredItems.length;
          const isPacked = itemCount > 8; // 9 or 10 items
          const rowCount = Math.ceil(itemCount / (itemCount > 5 ? 2 : 1));
          const isCrowded = rowCount >= 4 && !isPacked; // 7 or 8 items

          const titleSize = isPacked ? '1.2rem' : isCrowded ? '1.4rem' : '1.8rem';
          const itemFontSize = isPacked ? '0.95rem' : isCrowded ? '1.15rem' : '1.4rem';
          const qtyFontSize = isPacked ? '1.05rem' : isCrowded ? '1.3rem' : '1.6rem';
          const gapSize = isPacked ? '0.3rem' : isCrowded ? '0.5rem' : '0.8rem';
          const notesSize = isPacked ? '0.75rem' : isCrowded ? '0.85rem' : '1rem';
          const headerBottomMargin = isPacked ? '0.4rem' : isCrowded ? '0.6rem' : '1rem';
          const slotPadding = isPacked ? '0.75rem' : '1rem';

          const isCardFocused = displayOrders[focusedOrderIndex]?.id === order.id;
          const isRoom = order.tableId.startsWith('Room ');

          return (
            <div 
              key={order.id} 
              onClick={() => {
                setFocusedOrderIndex(displayOrders.findIndex(o => o.id === order.id));
                setIsNavigatingItems(false);
              }} 
              style={{
                cursor: 'pointer',
                background: isRoom ? '#f3e8ff' : '#ffffff',
                border: isRoom ? '1px solid #d8b4fe' : '1px solid #cbd5e1',
                borderTop: isRoom ? '4px solid #a855f7' : '4px solid #0ea5e9',
                borderRadius: '12px',
                padding: slotPadding,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(5px)',
                borderColor: isRoom ? '#d8b4fe' : '#cbd5e1',
                outline: isCardFocused ? (isRoom ? '2.5px solid #a855f7' : '2.5px solid #0ea5e9') : 'none',
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              {/* Slot Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: headerBottomMargin, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ 
                    fontSize: '0.6rem', 
                    background: isRoom ? '#a855f7' : (order.status === 'Pending' ? 'var(--status-pending)' : 'var(--status-preparing)'), 
                    color: '#fff', 
                    padding: '0.15rem 0.4rem', 
                    borderRadius: '4px', 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    {order.status}
                  </span>
                  <h3 style={{ fontSize: titleSize, fontWeight: 850, color: '#000000', marginTop: '0.25rem' }}>
                    {isRoom ? order.tableId : `Table ${order.tableId}`}
                  </h3>
                </div>
                <span style={{ fontSize: '0.8rem', color: isRoom ? '#4c1d95' : '#475569', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} /> {getElapsedTime(order.timestamp)}
                </span>
              </div>

              {/* Items List - No Images */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: order.filteredItems.length > 5 ? '1fr 1fr' : '1fr', 
                columnGap: '1rem', 
                rowGap: gapSize, 
                flex: 1, 
                overflow: 'hidden' 
              }}>
                {order.filteredItems.slice(0, 10).map((item, index) => {
                  const isCompleted = item.status === 'Ready' || item.status === 'Served' || order.status === 'Ready' || order.status === 'Served';
                  const isItemFocused = isNavigatingItems && isCardFocused && focusedItemIndex === index;
                  return (
                    <div 
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isRoom) return; // Disable click completion for room food items
                        toggleItemComplete(order.id, item);
                      }}
                      style={{ 
                        display: 'flex', 
                        gap: '0.5rem', 
                        alignItems: 'start',
                        padding: '0.25rem',
                        borderRadius: '6px',
                        outline: isItemFocused ? (isRoom ? '1.5px solid #a855f7' : '1.5px solid #0ea5e9') : 'none',
                        background: isItemFocused ? (isRoom ? 'rgba(168, 85, 247, 0.1)' : 'rgba(14, 165, 233, 0.1)') : 'transparent',
                        cursor: isRoom ? 'default' : 'pointer'
                      }}
                    >
                      <div style={{ 
                        width: isPacked ? '1.8rem' : '2.2rem', 
                        flexShrink: 0, 
                        textAlign: 'right', 
                        paddingTop: '0.1rem' 
                      }}>
                        <strong style={{ color: isRoom ? '#7e22ce' : '#0369a1', fontSize: qtyFontSize, lineHeight: 1 }}>
                          {item.quantity}x
                        </strong>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ 
                          fontSize: itemFontSize, 
                          color: isCompleted ? '#10b981' : '#000000', 
                          fontWeight: 700, 
                          lineHeight: 1.2, 
                          display: 'block',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.6 : 1
                        }}>
                          {item.name}
                        </span>
                        {item.notes && (
                          <span style={{ display: 'block', fontSize: notesSize, color: isRoom ? '#b91c1c' : '#b45309', fontStyle: 'italic', marginTop: '0.1rem' }}>
                            * {item.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Card Footer action button */}
              <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    enqueuePrint([order]);
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Print KOT
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllComplete(order);
                  }}
                  style={{
                    background: 'var(--status-ready)',
                    border: 'none',
                    color: '#fff',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Ready All
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default KitchenView;
