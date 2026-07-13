import React, { useEffect, useState } from 'react';
import { ChefHat, ConciergeBell, Layers, ShoppingBag, ArrowUpRight, AlertCircle, Plus, TrendingUp } from 'lucide-react';
import type { Order, ServiceRequest } from '../types';

export const Portal: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [kitchenConfigs, setKitchenConfigs] = useState<any[]>(() => {
    const saved = localStorage.getItem('hotel_kitchen_configs');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Bakery & Food Station', categories: ['Breakfast & Bakery', 'Sandwiches & Salads'] },
      { id: '2', name: 'Barista & Drink Station', categories: ['Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages'] },
      { id: '3', name: 'General Kitchen Station', categories: ['Breakfast & Bakery', 'Sandwiches & Salads', 'Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages'] }
    ];
  });
  
  // Custom N dashboard inputs
  const [kitchenIdInput, setKitchenIdInput] = useState<string>('4');

  const [tablesCount, setTablesCountState] = useState<number>(() => parseInt(localStorage.getItem('owner_tables_count') || '4', 10));

  useEffect(() => {
    // Load initial stats from localStorage
    const savedOrders = localStorage.getItem('hotel_orders');
    const savedRequests = localStorage.getItem('hotel_requests');
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedRequests) setRequests(JSON.parse(savedRequests));

    // Listen for real-time updates to keep stats fresh
    const channel = new BroadcastChannel('hotel_ordering_system');
    channel.onmessage = () => {
      const savedOrders = localStorage.getItem('hotel_orders');
      const savedRequests = localStorage.getItem('hotel_requests');
      const savedKitchen = localStorage.getItem('hotel_kitchen_configs');
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      if (savedRequests) setRequests(JSON.parse(savedRequests));
      if (savedKitchen) setKitchenConfigs(JSON.parse(savedKitchen));
      setTablesCountState(parseInt(localStorage.getItem('owner_tables_count') || '4', 10));
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hotel_kitchen_configs') {
        const savedKitchen = localStorage.getItem('hotel_kitchen_configs');
        if (savedKitchen) setKitchenConfigs(JSON.parse(savedKitchen));
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const activeOrdersCount = orders.filter(o => o.status !== 'Served' && o.status !== 'Cancelled').length;
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;
  const activeTablesCount = new Set(orders.filter(o => o.status !== 'Served' && o.status !== 'Cancelled').map(o => o.tableId)).size;

  const handleAddTable = () => {
    const nextCount = tablesCount + 1;
    localStorage.setItem('owner_tables_count', nextCount.toString());
    setTablesCountState(nextCount);

    // Sync other tabs
    const channel = new BroadcastChannel('hotel_ordering_system');
    channel.postMessage({ type: 'REQUEST_SYNC' });
    channel.close();
  };

  const openWindow = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{
            borderLeft: '3px solid #d4af37',
            borderRight: '3px solid #d4af37',
            padding: '0.2rem 1rem',
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #d4af37 15%, transparent 15%, transparent 85%, #d4af37 85%)' }}></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #d4af37 15%, transparent 15%, transparent 85%, #d4af37 85%)' }}></div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', letterSpacing: '0.15em', fontFamily: "'Outfit', sans-serif" }}>
              SCAN
            </h1>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '1rem' }}>Real-time synchronized hotel ordering & dispatch system</p>
      </header>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent-primary-glow)', padding: '0.75rem', borderRadius: '12px', color: 'var(--accent-primary)' }}>
            <ShoppingBag size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Orders</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{activeOrdersCount}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.75rem', borderRadius: '12px', color: 'var(--status-pending)' }}>
            <ConciergeBell size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waiter Requests</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{pendingRequestsCount}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--accent-secondary-glow)', padding: '0.75rem', borderRadius: '12px', color: 'var(--accent-secondary)' }}>
            <Layers size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Tables</p>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{activeTablesCount} / {tablesCount}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
        {/* Customer Tables */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} color="var(--accent-secondary)" /> Customer Tables ({tablesCount} Links)
            </h2>
            <button
              onClick={handleAddTable}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)',
                color: '#0f172a',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)',
                transition: 'all 0.2s'
              }}
            >
              Add Table <Plus size={16} />
            </button>
          </div>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Open each table menu link in a separate window or device to simulate custom table orders.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
            {Array.from({ length: tablesCount }, (_, i) => i + 1).map((id) => (
              <button
                key={id}
                onClick={() => openWindow(`/table/${id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-secondary-glow)';
                  e.currentTarget.style.borderColor = 'var(--accent-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <span>Table {id}</span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
          
          <button
            onClick={() => openWindow('/reserve')}
            style={{
              width: '100%',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              color: '#38bdf8',
              padding: '1rem',
              borderRadius: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '1rem',
              textAlign: 'center',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              marginTop: '1.5rem',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.05)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
            }}
          >
            📅 Open Customer Table Reservation Portal
          </button>
        </div>

        {/* Staff Dashboards */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ChefHat size={20} color="var(--accent-primary)" /> Staff Dashboard (N-Dashboards)
          </h2>
          
          {/* Kitchen Dashboards Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🍳 Kitchen Stations (N)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {kitchenConfigs.map(config => (
                <button 
                  key={config.id}
                  onClick={() => openWindow(`/kitchen/${config.id}`)} 
                  style={{ 
                    background: 'rgba(99, 102, 241, 0.08)', 
                    border: '1px solid rgba(99, 102, 241, 0.15)', 
                    color: '#fff', 
                    padding: '0.75rem', 
                    borderRadius: '10px', 
                    fontWeight: 650, 
                    cursor: 'pointer', 
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.15)';
                  }}
                >
                  {config.name} (#{config.id})
                </button>
              ))}
            </div>
            
            {/* Custom Kitchen ID Input */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '10px' }}>
              <input 
                type="number" 
                min="1" 
                value={kitchenIdInput} 
                onChange={(e) => setKitchenIdInput(e.target.value)} 
                placeholder="Station ID" 
                style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', paddingLeft: '0.5rem', width: '100%', fontSize: '0.85rem' }} 
              />
              <button onClick={() => kitchenIdInput && openWindow(`/kitchen/${kitchenIdInput}`)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                Open Station <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Waiter Dashboards Selection */}
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🛎️ Waiter Dashboard
            </h3>
            
            <button 
              onClick={() => openWindow('/waiter')} 
              style={{ 
                width: '100%',
                background: 'rgba(14, 165, 233, 0.08)', 
                border: '1px solid rgba(14, 165, 233, 0.15)', 
                color: '#fff', 
                padding: '0.9rem', 
                borderRadius: '10px', 
                fontWeight: 700, 
                cursor: 'pointer', 
                fontSize: '0.95rem',
                textAlign: 'center',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(14, 165, 233, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.15)';
              }}
            >
              Open Waiter Dashboard
            </button>
          </div>

        </div>
      </div>

      {/* Executive Administration Link */}
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={22} color="var(--accent-primary)" /> Executive Administration
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Access full business financial insights, profit margins, product leaderboards, and order auditing logs.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => openWindow('/reception')}
              style={{
                background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)',
                color: '#0f172a',
                border: 'none',
                padding: '0.75rem 1.75rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              Open Reception Desk <ArrowUpRight size={16} />
            </button>
            <button
              onClick={() => openWindow('/owner')}
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                padding: '0.75rem 1.75rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              Launch Owner Dashboard <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2.5rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderColor: 'rgba(255,255,255,0.05)' }}>
        <AlertCircle size={20} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
          <strong>Pro-Tip:</strong> Kitchen Stations specialize automatically: <strong>Station 1</strong> (Hot) only cooks Appetizers & Mains; <strong>Station 2</strong> (Cold) only displays Desserts & Beverages. <strong>Station 3+</strong> handles everything. Actions taken by waiters are logged with their Waiter Profile IDs!
        </p>
      </div>
    </div>
  );
};
export default Portal;
