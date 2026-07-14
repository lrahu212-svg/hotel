import React, { useState, useEffect } from 'react';
import type { Order, TableOccupancy } from '../types';
import { useMenu } from '../data/menu';
import { TrendingUp, DollarSign, Layers, FileText, Search, Filter } from 'lucide-react';

interface OwnerDashboardProps {
  orders: Order[];
  tablesOccupancy: { [tableId: string]: TableOccupancy };
  onCheckOutTable: (tableId: string) => void;
  onResetAllData?: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, tablesOccupancy, onCheckOutTable, onResetAllData }) => {
  const MENU_ITEMS = useMenu();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayLink, setRazorpayLink] = useState('');
  const [reservationAdvance, setReservationAdvance] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState('');

  // Load existing values
  useEffect(() => {
    const savedKeyId = localStorage.getItem('owner_razorpay_key_id');
    if (savedKeyId) setRazorpayKeyId(savedKeyId);
    const savedLink = localStorage.getItem('owner_razorpay_link');
    if (savedLink) setRazorpayLink(savedLink);
    const savedAdvance = localStorage.getItem('owner_reservation_advance');
    if (savedAdvance) setReservationAdvance(savedAdvance);
  }, []);

  const handleSaveKeys = async () => {
    try {
      setSaveStatus('Saving...');
      
      // Save secure keys on backend
      const response = await fetch('/api/save-razorpay-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: razorpayKeyId, keySecret: razorpayKeySecret })
      });

      // Save static payment link / UPI link in system settings and broadcast
      const linkResponse = await fetch('/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPDATE_SETTINGS',
          settings: { razorpayLink: razorpayLink }
        })
      });

      if (response.ok && linkResponse.ok) {
        localStorage.setItem('owner_razorpay_key_id', razorpayKeyId);
        localStorage.setItem('owner_razorpay_link', razorpayLink);
        // Save reservation advance amount
        if (reservationAdvance.trim() !== '') {
          localStorage.setItem('owner_reservation_advance', reservationAdvance.trim());
        } else {
          localStorage.removeItem('owner_reservation_advance');
        }
        setSaveStatus('✅ Settings saved securely!');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus('Failed to save settings.');
      }
    } catch (err) {
      setSaveStatus('Error saving settings.');
    }
  };

  // Legacy function removed


  
  // Table Configuration count
  const [ownerTablesCount, setOwnerTablesCount] = useState<number>(parseInt(localStorage.getItem('owner_tables_count') || '4', 10));

  // Active waiters state
  const [activeWaitersState, setActiveWaitersState] = useState<string[]>(() => {
    const raw = localStorage.getItem('hotel_active_waiters') || '[]';
    return JSON.parse(raw);
  });

  // Sync active list across tabs/storage events
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hotel_active_waiters' || e.key === 'hotel_registered_waiters') {
        const raw = localStorage.getItem('hotel_active_waiters') || '[]';
        setActiveWaitersState(JSON.parse(raw));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Compute round-robin table assignments for waiters to display in Table Map
  const registeredWaitersRaw = localStorage.getItem('hotel_registered_waiters');
  const registeredWaiters: any[] = registeredWaitersRaw ? JSON.parse(registeredWaitersRaw) : [];
  
  // Filter registered waiters to only those currently logged in
  const activeRegisteredWaiters = registeredWaiters.filter(w => activeWaitersState.includes(w.id));
  const targetWaiters = activeRegisteredWaiters.length > 0 ? activeRegisteredWaiters : registeredWaiters;
  
  const distributedWaiters = registeredWaiters.map(w => ({ ...w, assignedTables: [] as string[] }));
  if (targetWaiters.length > 0) {
    const sortedTargetWaiters = [...targetWaiters].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 1; i <= ownerTablesCount; i++) {
      const tableIdStr = i.toString();
      const waiterIndex = (i - 1) % sortedTargetWaiters.length;
      const assignedWaiter = sortedTargetWaiters[waiterIndex];
      const match = distributedWaiters.find(w => w.id === assignedWaiter.id);
      if (match) {
        match.assignedTables.push(tableIdStr);
      }
    }
  }
  const allTables = Array.from({ length: ownerTablesCount }, (_, i) => (i + 1).toString());

  // Filter only served orders for financial statistics
  const servedOrders = orders.filter(o => o.status === 'Served');
  
  // Calculate aggregate metrics
  const totalRevenue = servedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  
  const totalCost = servedOrders.reduce((sum, o) => {
    return sum + o.items.reduce((itemSum, item) => {
      const menuItem = MENU_ITEMS.find(m => m.id === item.menuItemId);
      const unitCost = menuItem ? menuItem.costPrice : item.price * 0.4; // fallback
      return itemSum + (unitCost * item.quantity);
    }, 0);
  }, 0);

  const netProfit = totalRevenue - totalCost;

  // Category sales distribution
  const categorySales: { [cat: string]: number } = { 
    'Coffee & Espresso': 0, 
    'Teas & Infusions': 0, 
    'Cold Beverages': 0, 
    'Breakfast & Bakery': 0, 
    'Sandwiches & Salads': 0 
  };
  servedOrders.forEach(o => {
    o.items.forEach(item => {
      const menuItem = MENU_ITEMS.find(m => m.id === item.menuItemId);
      if (menuItem) {
        categorySales[menuItem.category] += item.price * item.quantity;
      }
    });
  });

  const maxCategorySales = Math.max(...Object.values(categorySales), 1);

  // Top selling dishes leaderboard
  const dishSales: { [name: string]: { qty: number; revenue: number; image: string } } = {};
  servedOrders.forEach(o => {
    o.items.forEach(item => {
      const menuItem = MENU_ITEMS.find(m => m.id === item.menuItemId);
      const name = item.name;
      if (!dishSales[name]) {
        dishSales[name] = { qty: 0, revenue: 0, image: menuItem ? menuItem.image : '🍔' };
      }
      dishSales[name].qty += item.quantity;
      dishSales[name].revenue += item.price * item.quantity;
    });
  });

  const allSortedDishes = Object.entries(dishSales)
    .sort((a, b) => b[1].qty - a[1].qty);

  const sortedDishes = allSortedDishes.slice(0, 5);

  const maxDishQty = sortedDishes.length > 0 ? sortedDishes[0][1].qty : 1;

  // Filtered orders list for the ledger
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          `table ${o.tableId}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.timestamp - a.timestamp);

  // Calculate stats for ledger items
  const getOrderProfit = (order: Order) => {
    const cost = order.items.reduce((sum, item) => {
      const menuItem = MENU_ITEMS.find(m => m.id === item.menuItemId);
      const unitCost = menuItem ? menuItem.costPrice : item.price * 0.4;
      return sum + (unitCost * item.quantity);
    }, 0);
    return order.totalAmount - cost;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <header className="glass-panel owner-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.5rem 2rem',
        marginBottom: '2.5rem',
        borderLeft: '4px solid var(--accent-primary)',
        borderColor: 'rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--accent-primary)', padding: '0.5rem', border: '2px solid #1a1a1a', color: '#fff' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1a1a1a', margin: 0, fontFamily: "'Syne', sans-serif" }}>
              EXECUTIVE MANAGEMENT BOARD
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#555', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
              Real-time revenue analytics, cost analysis, and order ledger audit
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#1a1a1a', background: 'rgba(0,0,0,0.05)', padding: '0.5rem 1rem', border: '2px solid #1a1a1a', fontWeight: 700 }}>
            Session Audit: {orders.length} total orders recorded
          </span>
          <button
            onClick={() => {
              if (window.confirm('Are you absolutely sure you want to completely clear all data? This will erase all orders, requests, and revenue history. This action cannot be undone!')) {
                onResetAllData?.();
              }
            }}
            className="btn-constructivist-primary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              boxShadow: '2px 2px 0px #1a1a1a'
            }}
          >
            RESET ALL DATA
          </button>
        </div>
      </header>

      {/* System Settings */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#1a1a1a', margin: 0, fontWeight: 800, textTransform: 'uppercase', fontFamily: "'Syne', sans-serif" }}>Secure Razorpay Integration</h3>
        <p style={{ fontSize: '0.85rem', color: '#555', margin: 0, fontWeight: 600 }}>
          Configure dynamic or static Razorpay payments. For dynamic links (locked pricing per bill), enter the <b>Key ID</b> and <b>Key Secret</b>. Alternatively, enter a <b>Static Payment/UPI Link</b> (customers will click this and manually type/confirm their amount).
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '0.25rem', fontWeight: 700 }}>Key ID</label>
            <input 
              type="text" 
              placeholder="rzp_live_xxxxxxxxxxxxxx" 
              value={razorpayKeyId} 
              onChange={e => setRazorpayKeyId(e.target.value)} 
              style={{ width: '100%', padding: '0.75rem 1rem', outline: 'none' }} 
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '0.25rem', fontWeight: 700 }}>Key Secret (Hidden)</label>
            <input 
              type="password" 
              placeholder="Enter new Key Secret to update" 
              value={razorpayKeySecret} 
              onChange={e => setRazorpayKeySecret(e.target.value)} 
              style={{ width: '100%', padding: '0.75rem 1rem', outline: 'none' }} 
            />
          </div>
          <div style={{ flex: 1.5, minWidth: '250px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '0.25rem', fontWeight: 700 }}>Static UPI / Razorpay Link (Alternative)</label>
            <input 
              type="text" 
              placeholder="https://rzp.io/i/xxxxxx or upi://pay?..." 
              value={razorpayLink} 
              onChange={e => setRazorpayLink(e.target.value)} 
              style={{ width: '100%', padding: '0.75rem 1rem', outline: 'none' }} 
            />
          </div>
          <div style={{ flex: '0 0 180px', minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#d92626', marginBottom: '0.25rem', fontWeight: 800 }}>🪙 Reservation Advance (₹)</label>
            <input 
              type="number" 
              min="0"
              step="1"
              placeholder="e.g. 200  (0 = free)" 
              value={reservationAdvance} 
              onChange={e => setReservationAdvance(e.target.value)} 
              style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #1a1a1a', borderRadius: '0px', color: '#1a1a1a', outline: 'none', fontWeight: 800 }} 
            />
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: '#555', fontWeight: 600 }}>Charged via Razorpay before reservation is confirmed</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleSaveKeys}
              className="btn-constructivist-secondary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', boxShadow: '2px 2px 0px #1a1a1a' }}
            >
              Save Settings
            </button>
          </div>
        </div>
        {saveStatus && <p style={{ margin: 0, fontSize: '0.85rem', color: saveStatus.includes('Error') || saveStatus.includes('Failed') ? 'var(--status-cancelled)' : 'var(--status-ready)' }}>{saveStatus}</p>}
      </div>

      {/* Financial Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Revenue */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.04, color: '#fff' }}>
            <DollarSign size={100} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-ready)', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Gross Revenue</span>
            <DollarSign size={20} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>₹{totalRevenue.toFixed(2)}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--status-ready)', marginTop: '0.25rem' }}>
            From {servedOrders.length} completed transactions
          </p>
        </div>

        {/* Net Profit */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '3px solid var(--status-ready)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-ready)', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Net Profit</span>
            <TrendingUp size={20} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-ready)' }}>₹{netProfit.toFixed(2)}</h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Net earnings after ingredients
          </p>
        </div>



      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        
        {/* Category Sales Visual Chart */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>
            Revenue distribution by Food Category
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {Object.entries(categorySales).map(([category, value]) => {
              const percentage = maxCategorySales > 0 ? (value / maxCategorySales) * 100 : 0;
              return (
                <div key={category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 550 }}>{category}</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>₹{value.toFixed(2)}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Leaderboard */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff' }}>
            Top Selling Dishes (by Quantity)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sortedDishes.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>No orders served yet to compile list.</p>
            ) : (
              sortedDishes.map(([name, stat]) => {
                const percentage = (stat.qty / maxDishQty) * 100;
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img 
                      src={stat.image} 
                      alt={name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                      }}
                      style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 550, color: '#f8fafc' }}>{name}</span>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                          <strong style={{ color: 'var(--accent-secondary)' }}>{stat.qty} units</strong> (₹{stat.revenue.toFixed(2)})
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: 'var(--accent-secondary)',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease-out'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Dish Sales Report */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--accent-secondary)" /> Comprehensive Dish Sales Ledger
        </h2>
        {allSortedDishes.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>No orders served yet to compile list.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {allSortedDishes.map(([name, stat]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <img 
                  src={stat.image} 
                  alt={name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                  }}
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>{name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    <strong style={{ color: 'var(--accent-secondary)' }}>{stat.qty} units</strong> sold
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Revenue</div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                    ${stat.revenue.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Map */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={20} color="var(--accent-secondary)" /> Table Map
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {allTables.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
              <Layers size={36} style={{ opacity: 0.15, marginBottom: '0.75rem' }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>No tables available.</p>
            </div>
          ) : (
            allTables.map((tableId) => {
              const occ = tablesOccupancy[tableId] || { occupied: false };
              const assignedWaiter = distributedWaiters.find(w => w.assignedTables.includes(tableId));
              
              return (
                <div key={tableId} style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${occ.occupied ? 'var(--status-cancelled)' : 'var(--status-ready)'}`,
                  background: occ.occupied ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                      Table {tableId}
                    </h3>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 750,
                      color: occ.occupied ? 'var(--status-cancelled)' : 'var(--status-ready)',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      background: occ.occupied ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                    }}>
                      {occ.occupied ? 'Occupied' : 'Vacant'}
                    </span>
                  </div>

                  {assignedWaiter && (
                    <p style={{ margin: '0.15rem 0 0.4rem 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                      Waiter: <strong>{assignedWaiter.name}</strong>
                    </p>
                  )}

                  {occ.occupied ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                        👤 <strong>{occ.customerName}</strong> ({occ.guestsCount})
                      </span>
                      <button
                        onClick={() => onCheckOutTable(tableId)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                      >
                        Settle
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>Vacant</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>



      {/* System Configurations (N Tables settings) */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚙️ General System Settings
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Configure restaurant capacity parameters. Setting this changes the total number of dining tables (N) available in the system.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tables (N)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={ownerTablesCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 4;
                localStorage.setItem('owner_tables_count', val.toString());
                setOwnerTablesCount(val);
                
                // Broadcast changes to sync open tabs
                const bc = new BroadcastChannel('hotel_ordering_system');
                bc.postMessage({ type: 'REQUEST_SYNC' });
                bc.close();
              }}
              style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Complete Order Ledger */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--accent-primary)" /> Historical Order Ledger
          </h2>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search Table or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
              />
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              <Filter size={16} color="#64748b" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                <option value="ALL" style={{ background: '#0b0f19' }}>All Statuses</option>
                <option value="Pending" style={{ background: '#0b0f19' }}>Pending</option>
                <option value="Preparing" style={{ background: '#0b0f19' }}>Preparing</option>
                <option value="Ready" style={{ background: '#0b0f19' }}>Ready</option>
                <option value="Served" style={{ background: '#0b0f19' }}>Served</option>
                <option value="Cancelled" style={{ background: '#0b0f19' }}>Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                <th style={{ padding: '1rem' }}>Order ID</th>
                <th style={{ padding: '1rem' }}>Time</th>
                <th style={{ padding: '1rem' }}>Table</th>
                <th style={{ padding: '1rem' }}>Items Ordered</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Profit Margin</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const profit = getOrderProfit(order);
                  const margin = order.totalAmount > 0 ? (profit / order.totalAmount) * 100 : 0;
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#cbd5e1' }}>#{order.id.slice(-6).toUpperCase()}</td>
                      <td style={{ padding: '1rem', color: '#64748b' }}>
                        {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        Table {order.tableId.split('_archived_')[0]}
                        {order.customerName && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>{order.customerName}</span>}
                      </td>
                      <td style={{ padding: '1rem', color: '#e2e8f0' }}>
                        {order.items.map((item, idx) => (
                          <span key={idx} style={{ display: 'block', fontSize: '0.85rem' }}>
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          background: `var(--status-${order.status.toLowerCase()})`,
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '8px',
                          textTransform: 'uppercase',
                          display: 'inline-block'
                        }}>
                          {order.status}
                        </span>
                        {order.servedBy && (
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Served by {order.servedBy}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                        ${order.totalAmount.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{ color: profit >= 0 ? 'var(--status-ready)' : 'var(--status-cancelled)', fontWeight: 650 }}>
                          +${profit.toFixed(2)}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                          ({margin.toFixed(0)}% margin)
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};
export default OwnerDashboard;
