import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Calendar, ClipboardList, ChefHat, Settings, Menu, Plus } from 'lucide-react';
import { useMenu, addMenuItem, deleteMenuItem, type MenuItem } from '../data/menu';

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
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
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

export const ReceptionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'waiters' | 'menu'>('waiters');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [kitchenMode, setKitchenMode] = useState<'monitor' | 'printer'>(
    (localStorage.getItem('hotel_kitchen_mode') as 'monitor' | 'printer') || 'monitor'
  );

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
    
    // Broadcast changes
    const bc = new BroadcastChannel('hotel_ordering_system');
    bc.postMessage({ type: 'REQUEST_SYNC' });
    bc.close();
  };

  useEffect(() => {
    const saved = localStorage.getItem('hotel_registered_waiters');
    if (saved) {
      setWaiters(JSON.parse(saved));
    }
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 855, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
            Reception Desk
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            Register employees and manage restaurant table assignments
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setActiveTab('waiters')} style={{ background: activeTab === 'waiters' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: activeTab === 'waiters' ? '#fff' : '#64748b', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>System Configuration</button>
          <button onClick={() => setActiveTab('menu')} style={{ background: activeTab === 'menu' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: activeTab === 'menu' ? '#fff' : '#64748b', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Menu Management</button>
        </div>
      </header>

      {activeTab === 'menu' ? <MenuManagement /> : (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', flexWrap: 'wrap' }}>
        
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
