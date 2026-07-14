import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Trash2, Calendar, ClipboardList, ChefHat, Settings, Menu, Plus } from 'lucide-react';
import { useMenu, addMenuItem, deleteMenuItem, type MenuItem } from '../data/menu';
import type { Order, Reservation } from '../types';

interface Waiter {
  id: string;
  name: string;
  phone: string;
  assignedTables: string[]; // e.g. ['1', '2']
}

interface KitchenConfig {
  id: string;
  name: string;
  categories: string[];
}

const ReservationsList: React.FC<{ reservations: Reservation[]; onRemove?: (id: string) => void }> = ({ reservations, onRemove }) => {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📅 Table Reservations List
      </h2>
      
      {reservations.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>No table reservations booked yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {reservations.map(res => {
            const timeStr = new Date(res.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
            return (
              <div key={res.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '12px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(6, 182, 212, 0.1)', color: '#38bdf8', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    Table {res.tableId}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {res.guestsCount} Guests
                  </span>
                </div>
                
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', fontWeight: 700 }}>{res.customerName}</h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>📞 {res.phone}</p>
                </div>
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>⏰ {timeStr}</span>
                  {onRemove && (
                    <button 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to cancel the reservation for ${res.customerName}?`)) {
                          onRemove(res.id);
                        }
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const MenuManagement: React.FC = () => {
  const menu = useMenu();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<MenuItem['category']>('Coffee & Espresso');
  const [isVeg, setIsVeg] = useState(false);
  const [isSpicy, setIsSpicy] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    const item: MenuItem = {
      id: 'custom_' + Date.now().toString(),
      name,
      price: parseFloat(price),
      costPrice: parseFloat(price) * 0.3, // default 30% food cost
      category,
      description: desc,
      vegetarian: isVeg,
      spicy: isSpicy,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
    };
    addMenuItem(item);
    setName('');
    setPrice('');
    setDesc('');
    setIsVeg(false);
    setIsSpicy(false);
  };

  return (
    <div className="reception-layout-grid">
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} color="var(--accent-secondary)" /> Add Food Item
        </h2>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase' }}>Item Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase' }}>Price (₹)</label>
            <input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase' }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as any)} style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff' }}>
              <option value="Coffee & Espresso">Coffee & Espresso</option>
              <option value="Teas & Infusions">Teas & Infusions</option>
              <option value="Cold Beverages">Cold Beverages</option>
              <option value="Breakfast & Bakery">Breakfast & Bakery</option>
              <option value="Sandwiches & Salads">Sandwiches & Salads</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase' }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} style={{ width: '100%', padding: '0.65rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', minHeight: '60px' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}><input type="checkbox" checked={isVeg} onChange={e => setIsVeg(e.target.checked)} /> Vegetarian 🥬</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}><input type="checkbox" checked={isSpicy} onChange={e => setIsSpicy(e.target.checked)} /> Spicy 🌶️</label>
          </div>
          <button type="submit" style={{ background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Add Item</button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Menu size={20} color="var(--status-ready)" /> Existing Menu Items ({menu.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {menu.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <div>
                <strong style={{ color: '#fff', display: 'block' }}>{item.name}</strong>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>₹{item.price.toFixed(2)} - {item.category}</span>
              </div>
              <button onClick={() => deleteMenuItem(item.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Gmail SMTP Notification Settings component (used in Reception System Config tab)
const GmailSettings: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailUser.trim()) {
      showToast('⚠️ Please enter your Gmail address.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/save-gmail-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmailUser: gmailUser.trim(), gmailAppPassword: gmailAppPassword.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✅ Gmail credentials saved! Reservation emails will now be sent.');
        setGmailAppPassword('');
      } else {
        showToast(`❌ Error: ${data.error}`);
      }
    } catch {
      showToast('❌ Network error saving Gmail credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginTop: '2.5rem', borderLeft: '4px solid #ea4335' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📧 Gmail Email Notifications
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Configure your Gmail credentials to automatically send reservation confirmation emails to customers.
        Use a <strong style={{ color: '#38bdf8' }}>Gmail App Password</strong> (not your regular password).{' '}
        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8' }}>
          Generate one here ↗
        </a>
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sender Gmail Address
          </label>
          <input
            type="email"
            placeholder="yourrestaurant@gmail.com"
            value={gmailUser}
            onChange={e => setGmailUser(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Gmail App Password (16-character token)
          </label>
          <input
            type="password"
            placeholder="xxxx xxxx xxxx xxxx"
            value={gmailAppPassword}
            onChange={e => setGmailAppPassword(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem', letterSpacing: '0.15em' }}
          />
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
            ⚠️ Enable 2-Step Verification on your Google Account first, then generate an App Password.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          style={{
            alignSelf: 'flex-start',
            background: isSaving ? '#475569' : 'linear-gradient(135deg, #ea4335 0%, #dc2626 100%)',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.75rem',
            borderRadius: '10px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: isSaving ? 'none' : '0 4px 15px rgba(234, 67, 53, 0.3)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isSaving ? '⏳ Saving...' : '💾 Save Gmail Credentials'}
        </button>
      </form>
    </div>
  );
};

interface ReceptionViewProps {
  onUpdateSettings?: (settings: any) => void;
  orders?: Order[];
  onResetAllData?: () => void;
  reservations?: Reservation[];
  onRemoveReservation?: (reservationId: string) => void;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({ onUpdateSettings, orders = [], onResetAllData, reservations = [], onRemoveReservation }) => {
  const [activeTab, setActiveTab] = useState<'waiters' | 'menu' | 'reservations'>('waiters');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [kitchenMode, setKitchenMode] = useState<'monitor' | 'printer'>(
    (localStorage.getItem('hotel_kitchen_mode') as 'monitor' | 'printer') || 'monitor'
  );

  // Printing Queue system for bills
  const printQueue = useRef<{ tableId: string; paymentMethod: string; orders: Order[] }[]>([]);
  const isPrinting = useRef(false);

  const enqueueBillPrint = (tableId: string, paymentMethod: string, tableOrders: Order[]) => {
    printQueue.current.push({ tableId, paymentMethod, orders: tableOrders });
    processPrintQueue();
  };

  const processPrintQueue = () => {
    if (isPrinting.current || printQueue.current.length === 0) return;

    isPrinting.current = true;
    const job = printQueue.current.shift()!;
    const { tableId, paymentMethod, orders: tableOrders } = job;

    // Combine all items across all orders for this table
    const itemMap = new Map<string, { name: string; quantity: number; price: number }>();
    tableOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = itemMap.get(item.menuItemId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          itemMap.set(item.menuItemId, {
            name: item.name,
            quantity: item.quantity,
            price: item.price
          });
        }
      });
    });

    const items = Array.from(itemMap.values());
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Remove any existing print section
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
        <h2 style="text-align: center; margin: 5px 0; color: #000;">GUEST BILL</h2>
        <h3 style="text-align: center; margin: 5px 0; color: #000;">Table ${tableId}</h3>
        <div style="text-align: center; font-size: 0.8em; margin-bottom: 10px; color: #000;">
          Date: ${new Date().toLocaleString()}
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; color: #000;">
          <span style="flex: 2;">Item</span>
          <span style="flex: 1; text-align: center;">Qty</span>
          <span style="flex: 1; text-align: right;">Price</span>
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        ${items.map(item => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #000;">
            <span style="flex: 2;">${item.name}</span>
            <span style="flex: 1; text-align: center;">${item.quantity}</span>
            <span style="flex: 1; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; margin-top: 10px; color: #000;">
          <span>GRAND TOTAL:</span>
          <span>₹${totalAmount.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-top: 5px; color: #000;">
          <span>Payment Method:</span>
          <span style="font-weight: bold;">${paymentMethod}</span>
        </div>
        <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>
        <div style="text-align: center; margin-top: 15px; font-weight: bold; color: #000;">
          Thank you for dining with us!
        </div>
        <div style="text-align: center; font-size: 0.8em; margin-top: 5px; color: #000;">
          Powered by Volcano
        </div>
      </div>
    `;

    document.body.appendChild(printDiv);

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        const prints = document.querySelectorAll('#print-section');
        prints.forEach(p => p.remove());

        setTimeout(() => {
          isPrinting.current = false;
          processPrintQueue();
        }, 3000);
      }, 1000);
    }, 100);
  };

  // Track printed sessions to prevent duplicate prints
  const printedCheckouts = useRef(new Set<string>());

  useEffect(() => {
    const handleSettled = (event: Event) => {
      const { tableId, paymentMethod } = (event as CustomEvent).detail;
      if (!tableId) return;

      // Find orders for this table session
      let tableOrders = orders.filter(o => o.tableId === tableId);
      if (tableOrders.length === 0) {
        const now = Date.now();
        tableOrders = orders.filter(o => 
          o.tableId.startsWith(`${tableId}_archived_`) && 
          now - parseInt(o.tableId.split('_archived_')[1], 10) < 15000
        );
      }

      if (tableOrders.length > 0) {
        // Create a unique print ID using order IDs to prevent duplicate printing of the same bill
        const printId = `${tableId}_${tableOrders.map(o => o.id).sort().join('_')}`;
        if (printedCheckouts.current.has(printId)) {
          return; // Already printed this session's bill!
        }
        printedCheckouts.current.add(printId);

        enqueueBillPrint(tableId, paymentMethod || 'Unspecified', tableOrders);
      }
    };

    window.addEventListener('TABLE_SETTLED', handleSettled);
    return () => {
      window.removeEventListener('TABLE_SETTLED', handleSettled);
    };
  }, [orders]);

  const [kitchenConfigs, setKitchenConfigs] = useState<KitchenConfig[]>(() => {
    const saved = localStorage.getItem('hotel_kitchen_configs');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Bakery & Food Station', categories: ['Breakfast & Bakery', 'Sandwiches & Salads'] },
      { id: '2', name: 'Barista & Drink Station', categories: ['Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages'] },
      { id: '3', name: 'General Kitchen Station', categories: ['Breakfast & Bakery', 'Sandwiches & Salads', 'Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages'] }
    ];
  });

  const handleKitchenCountChange = (count: number) => {
    if (count < 1) return;
    const updated = [...kitchenConfigs];
    if (count > updated.length) {
      for (let i = updated.length + 1; i <= count; i++) {
        updated.push({
          id: i.toString(),
          name: `General Kitchen Station #${i}`,
          categories: ['Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages', 'Breakfast & Bakery', 'Sandwiches & Salads']
        });
      }
    } else if (count < updated.length) {
      updated.splice(count);
    }
    setKitchenConfigs(updated);
  };

  const handleCategoryToggle = (stationIndex: number, category: string) => {
    const updated = [...kitchenConfigs];
    const station = updated[stationIndex];
    if (station.categories.includes(category)) {
      station.categories = station.categories.filter(c => c !== category);
    } else {
      station.categories = [...station.categories, category];
    }
    setKitchenConfigs(updated);
  };

  const handleKitchenNameChange = (stationIndex: number, newName: string) => {
    const updated = [...kitchenConfigs];
    updated[stationIndex].name = newName;
    setKitchenConfigs(updated);
  };

  const handleSaveKitchenConfigs = () => {
    localStorage.setItem('hotel_kitchen_configs', JSON.stringify(kitchenConfigs));
    localStorage.setItem('hotel_kitchen_mode', kitchenMode);
    showToast('🎉 Kitchen station settings updated and saved!');
    
    if (onUpdateSettings) {
      onUpdateSettings({ kitchenMode, kitchenConfigs });
    }
  };

  useEffect(() => {
    const syncWaiters = () => {
      const saved = localStorage.getItem('hotel_registered_waiters');
      if (saved) {
        setWaiters(JSON.parse(saved));
      } else {
        setWaiters([]);
      }
    };
    syncWaiters();

    window.addEventListener('storage', syncWaiters);
    return () => {
      window.removeEventListener('storage', syncWaiters);
    };
  }, []);

  const saveWaiters = (updated: Waiter[]) => {
    setWaiters(updated);
    localStorage.setItem('hotel_registered_waiters', JSON.stringify(updated));
    
    // Broadcast updates to sync other open tabs
    const bc = new BroadcastChannel('hotel_ordering_system');
    bc.postMessage({ type: 'REQUEST_SYNC' });
    bc.close();
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const redistributeTables = (currentWaiters: Waiter[]) => {
    if (currentWaiters.length === 0) return [];
    
    // Retrieve total number of tables configured in Owner settings (default 4)
    const tablesCount = parseInt(localStorage.getItem('owner_tables_count') || '4', 10);
    const tables = Array.from({ length: tablesCount }, (_, i) => (i + 1).toString());
    
    // Initialize empty assignments
    const updated = currentWaiters.map(w => ({ ...w, assignedTables: [] as string[] }));
    
    // Distribute all tables as evenly as possible
    tables.forEach((tableId, index) => {
      const waiterIndex = index % currentWaiters.length;
      updated[waiterIndex].assignedTables.push(tableId);
    });
    
    return updated;
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    // Check if phone or name is already registered
    const exists = waiters.some(w => w.phone === phone.trim() || w.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      showToast('⚠️ Waiter name or phone number is already registered.');
      return;
    }

    const newWaiter: Waiter = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      assignedTables: []
    };

    const baseWaiters = [...waiters, newWaiter];
    const updated = redistributeTables(baseWaiters);
    saveWaiters(updated);
    
    // Reset Form
    setName('');
    setPhone('');
    showToast('🎉 Waiter registered & tables auto-assigned!');
  };

  const handleDelete = (id: string) => {
    const baseWaiters = waiters.filter(w => w.id !== id);
    const updated = redistributeTables(baseWaiters);
    saveWaiters(updated);
    showToast('🗑️ Waiter deleted & tables redistributed.');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--accent-secondary)',
          color: '#fff',
          padding: '1rem 2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.5rem 2rem',
        marginBottom: '2.5rem',
        borderLeft: '4px solid var(--accent-secondary)',
        borderColor: 'rgba(255,255,255,0.05)'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em', color: 'var(--accent-secondary)', fontFamily: "'Outfit', sans-serif" }}>
            Reception Desk
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#555', fontSize: '0.9rem', fontWeight: 500 }}>
            Register employees and manage restaurant table assignments
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('waiters')} 
            style={{ 
              background: activeTab === 'waiters' ? 'var(--bg-secondary)' : 'transparent', 
              border: activeTab === 'waiters' ? '1px solid #cbd5e1' : '1px solid transparent', 
              color: activeTab === 'waiters' ? 'var(--accent-secondary)' : '#64748b', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.75rem'
            }}
          >
            System Config
          </button>
          
          <button 
            onClick={() => setActiveTab('reservations')} 
            style={{ 
              background: activeTab === 'reservations' ? 'var(--bg-secondary)' : 'transparent', 
              border: activeTab === 'reservations' ? '1px solid #cbd5e1' : '1px solid transparent', 
              color: activeTab === 'reservations' ? 'var(--accent-secondary)' : '#64748b', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.75rem'
            }}
          >
            Reservations ({reservations.length})
          </button>
          
          <button 
            onClick={() => setActiveTab('menu')} 
            style={{ 
              background: activeTab === 'menu' ? 'var(--bg-secondary)' : 'transparent', 
              border: activeTab === 'menu' ? '1px solid #cbd5e1' : '1px solid transparent', 
              color: activeTab === 'menu' ? 'var(--accent-secondary)' : '#64748b', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.75rem'
            }}
          >
            Menu Management
          </button>
          
          {onResetAllData && (
            <button 
              onClick={() => {
                if (window.confirm('⚠️ WARNING: This will completely reset the entire system, log out all waiters, and clear all tables. Are you sure?')) {
                  onResetAllData();
                }
              }}
              className="btn-constructivist-primary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.75rem',
                marginLeft: '0.5rem',
                boxShadow: '2px 2px 0px #1a1a1a'
              }}
            >
              RESET SYSTEM
            </button>
          )}
        </div>
      </header>

      {activeTab === 'menu' ? (
        <MenuManagement />
      ) : activeTab === 'reservations' ? (
        <ReservationsList reservations={reservations} onRemove={onRemoveReservation} />
      ) : (
      <>
        <div className="reception-layout-grid">
        
        {/* Registration Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={20} color="var(--accent-secondary)" /> Waiter Registration
          </h2>
          
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Waiter Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Michael Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Phone Number
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Table Assignments
              </label>
              <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                ℹ️ Registered tables are divided and assigned automatically among all registered waiters.
              </p>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)',
                color: '#0f172a',
                border: 'none',
                padding: '0.75rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                marginTop: '0.5rem',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              Register Waiter
            </button>
          </form>
        </div>

        {/* Registered Staff List */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} color="var(--accent-secondary)" /> Registered Waiters
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
            {waiters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <Calendar size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No waiters registered yet.</p>
              </div>
            ) : (
              waiters.map(waiter => (
                <div key={waiter.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '1rem',
                  borderRadius: '12px'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{waiter.name}</h3>
                    <p style={{ margin: '0.15rem 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b' }}>📞 {waiter.phone}</p>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {waiter.assignedTables.length === 0 ? (
                        <span style={{ fontSize: '0.7rem', color: '#f43f5e', background: 'rgba(244,63,94,0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>Unassigned</span>
                      ) : (
                        waiter.assignedTables.map(t => (
                          <span key={t} style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', background: 'rgba(6,182,212,0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            Table {t}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => window.open(`/waiter/${waiter.id}`, '_blank')}
                      style={{
                        background: 'rgba(14, 165, 233, 0.1)',
                        border: '1px solid rgba(14, 165, 233, 0.2)',
                        color: 'var(--accent-secondary)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      Launch
                    </button>
                    <button
                      onClick={() => handleDelete(waiter.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Gmail Email Notification Settings */}
      <GmailSettings showToast={showToast} />

      {/* Kitchen Station Configuration Panel */}
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={22} color="var(--accent-secondary)" /> Kitchen Display & Category Configuration
        </h2>
        
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
              Kitchen Display Mode:
            </label>
            <select
              value={kitchenMode}
              onChange={(e) => setKitchenMode(e.target.value as 'monitor' | 'printer')}
              style={{
                padding: '0.5rem',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            >
              <option value="monitor">Screen Monitor (Default)</option>
              <option value="printer">Printer (Auto-print Orders)</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
              Number of Kitchen Displays:
            </label>
          <input
            type="number"
            min="1"
            max="10"
            value={kitchenConfigs.length}
            onChange={(e) => handleKitchenCountChange(parseInt(e.target.value, 10) || 1)}
            style={{
              width: '80px',
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px',
              color: '#fff',
              outline: 'none',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}
          />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {kitchenConfigs.map((config, index) => (
            <div key={config.id} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '1.25rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', background: 'var(--accent-secondary-glow)', color: 'var(--accent-secondary)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                  Station #{config.id}
                </span>
                <input
                  type="text"
                  required
                  placeholder="Station Name"
                  value={config.name}
                  onChange={(e) => handleKitchenNameChange(index, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.4rem 0.65rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Categories to Display
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {['Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages', 'Breakfast & Bakery', 'Sandwiches & Salads'].map(cat => {
                    const isChecked = config.categories.includes(cat);
                    return (
                      <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCategoryToggle(index, cat)}
                          style={{ accentColor: 'var(--accent-secondary)' }}
                        />
                        {cat}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveKitchenConfigs}
          style={{
            background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)',
            color: '#0f172a',
            border: 'none',
            padding: '0.75rem 2rem',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.25)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: 'auto'
          }}
        >
          <ChefHat size={16} /> Save Kitchen Configurations
        </button>
      </div>
      </>
      )}
    </div>
  );
};
export default ReceptionView;
