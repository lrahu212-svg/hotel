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
  const [rooms, setRooms] = useState<string[]>(() => {
    const saved = localStorage.getItem('hotel_configured_rooms');
    return saved ? JSON.parse(saved) : [];
  });

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
      if (e.key === 'hotel_configured_rooms') {
        const saved = localStorage.getItem('hotel_configured_rooms');
        setRooms(saved ? JSON.parse(saved) : []);
      }
    };
    const syncRoomsSetting = () => {
      const saved = localStorage.getItem('hotel_configured_rooms');
      setRooms(saved ? JSON.parse(saved) : []);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('HOTEL_SETTINGS_UPDATED', syncRoomsSetting);

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('HOTEL_SETTINGS_UPDATED', syncRoomsSetting);
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
        <p style={{ color: '#555', fontSize: '1.1rem', marginTop: '1rem', fontWeight: 650 }}>
          Real-time synchronized hotel ordering & dispatch system
        </p>
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
              className="btn-constructivist-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem'
              }}
            >
              ADD TABLE <Plus size={16} />
            </button>
          </div>
          <p style={{ color: '#555', marginBottom: '2rem', fontSize: '0.95rem', fontWeight: 600 }}>
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
                  background: '#ffffff',
                  border: '1px solid var(--border-glass)',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  color: 'var(--accent-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textAlign: 'left',
                  transition: 'all 0.15s ease-in-out',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  fontFamily: "'Outfit', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                <span>Table {id}</span>
                <ArrowUpRight size={18} color="var(--accent-primary)" />
              </button>
            ))}
          </div>
          
          <button
            onClick={() => openWindow('/reserve')}
            className="btn-constructivist-secondary"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1rem',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '1.5rem',
              marginBottom: '2rem'
            }}
          >
            📅 OPEN CUSTOMER TABLE RESERVATION PORTAL
          </button>

          {/* Customer Rooms */}
          {rooms.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏨 Customer Rooms ({rooms.length} Links)
              </h2>
              <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem', fontWeight: 650 }}>
                Guests can scan or access their room menu link directly to check in and place room service orders.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                {rooms.map((roomName) => (
                  <button
                    key={roomName}
                    onClick={() => openWindow(`/room/${encodeURIComponent(roomName)}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      border: '1px solid var(--border-glass)',
                      padding: '1.25rem',
                      borderRadius: '12px',
                      color: '#000000',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '1rem',
                      textAlign: 'left',
                      transition: 'all 0.15s ease-in-out',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      fontFamily: "'Outfit', sans-serif"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#a855f7';
                      e.currentTarget.style.background = '#faf5ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <span>{roomName}</span>
                    <ArrowUpRight size={18} color="#a855f7" />
                  </button>
                ))}
              </div>
            </div>
          )}
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
                  className="btn-constructivist-primary"
                  style={{ 
                    padding: '0.75rem', 
                    fontSize: '0.85rem',
                    boxShadow: '2px 2px 0px #1a1a1a'
                  }}
                >
                  {config.name.toUpperCase()} (#{config.id})
                </button>
              ))}
            </div>
            
            {/* Custom Kitchen ID Input */}
            <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', border: '2px solid #1a1a1a', padding: '0.5rem', borderRadius: '0px' }}>
              <input 
                type="number" 
                min="1" 
                value={kitchenIdInput} 
                onChange={(e) => setKitchenIdInput(e.target.value)} 
                placeholder="Station ID" 
                style={{ background: 'none', border: 'none', color: '#1a1a1a', outline: 'none', paddingLeft: '0.5rem', width: '100%', fontSize: '0.85rem' }} 
              />
              <button 
                onClick={() => kitchenIdInput && openWindow(`/kitchen/${kitchenIdInput}`)} 
                className="btn-constructivist-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  padding: '0.4rem 0.8rem', 
                  fontSize: '0.8rem',
                  boxShadow: 'none'
                }}
              >
                OPEN STATION <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Waiter Dashboards Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🛎️ Table Waiter Dashboard
              </h3>
              
              <button 
                onClick={() => openWindow('/waiter')} 
                className="btn-constructivist-primary"
                style={{ 
                  width: '100%',
                  padding: '0.9rem', 
                  fontSize: '0.95rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                OPEN TABLE WAITER DASHBOARD
              </button>
            </div>

            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🏨 Room Waiter Dashboard
              </h3>
              
              <button 
                onClick={() => openWindow('/room-waiter')} 
                className="btn-constructivist-primary"
                style={{ 
                  width: '100%',
                  padding: '0.9rem', 
                  fontSize: '0.95rem',
                  background: '#a855f7',
                  borderColor: '#a855f7',
                  color: '#fff',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '2px 2px 0px #1a1a1a'
                }}
              >
                OPEN ROOM WAITER DASHBOARD
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Executive Administration Link */}
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Syne', sans-serif" }}>
              <TrendingUp size={22} color="var(--accent-primary)" /> EXECUTIVE ADMINISTRATION
            </h2>
            <p style={{ color: '#555', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 600 }}>
              Access full business financial insights, profit margins, product leaderboards, and order auditing logs.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => openWindow('/reception')}
              className="btn-constructivist-secondary"
              style={{
                padding: '0.75rem 1.75rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              OPEN RECEPTION DESK <ArrowUpRight size={16} />
            </button>
            <button
              onClick={() => openWindow('/owner')}
              className="btn-constructivist-primary"
              style={{
                padding: '0.75rem 1.75rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              LAUNCH OWNER DASHBOARD <ArrowUpRight size={16} />
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
