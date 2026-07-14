import React, { useEffect, useState } from 'react';
import type { Order, ServiceRequest, TableOccupancy, OrderItem, OrderStatus, Reservation } from '../types';
import { ConciergeBell, Check, Award, Layers, Users, Volume2, VolumeX, LogOut, Info, User } from 'lucide-react';
import { TableView } from './TableView';

interface Waiter {
  id: string;
  name: string;
  phone: string;
  assignedTables: string[];
}

interface WaiterViewProps {
  waiterId: string;
  orders: Order[];
  requests: ServiceRequest[];
  tablesOccupancy: { [tableId: string]: TableOccupancy };
  reservations?: Reservation[];
  onRemoveReservation?: (reservationId: string) => void;
  onResolveRequest: (requestId: string, resolvedBy: string) => void;
  onServeOrder: (orderId: string, servedBy: string) => void;
  onCheckOutTable: (tableId: string, paymentMethod?: 'Cash' | 'UPI') => void;
  onPlaceOrder: (tableId: string, items: OrderItem[]) => void;
  onCallWaiter: (tableId: string, type: 'Call Waiter' | 'Request Bill' | 'Cash Payment Collection' | 'UPI Payment Completed') => void;
  onTableCheckIn: (tableId: string, customerName: string, guestsCount: number, openedBy?: 'Customer' | 'Waiter', phone?: string) => void;
  onUpdateItemStatus?: (orderId: string, itemIndex: number, status: OrderStatus) => void;
}

export const WaiterView: React.FC<WaiterViewProps> = ({
  waiterId,
  orders,
  requests,
  tablesOccupancy,
  onResolveRequest,
  onServeOrder,
  onCheckOutTable,
  onPlaceOrder,
  onCallWaiter,
  onTableCheckIn,
  onUpdateItemStatus,
}) => {
  const [orderingForTable, setOrderingForTable] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [prevOccupancy, setPrevOccupancy] = useState<{ [tableId: string]: boolean }>({});
  const [toastAlert, setToastAlert] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<{ [tableId: string]: 'SELECT' | 'CASH_CONFIRM' | 'UPI_CONFIRM' }>({});
  const [checkInPrompt, setCheckInPrompt] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('Walk-in Guest');
  const [lastReadyCount, setLastReadyCount] = useState<number>(0);

  // Waiter login session states
  const [loggedInWaiter, setLoggedInWaiter] = useState<Waiter | null>(() => {
    if (waiterId) {
      const saved = localStorage.getItem(`waiter_session_${waiterId}`);
      return saved ? JSON.parse(saved) : null;
    }
    // Search for any saved waiter session if URL is generic
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('waiter_session_')) {
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
      }
    }
    return null;
  });
  const [activeWaitersState, setActiveWaitersState] = useState<string[]>(() => {
    const raw = localStorage.getItem('hotel_active_waiters') || '[]';
    return JSON.parse(raw);
  });
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Auto-redirect to the specific waiter URL if logged in but visiting the generic /waiter
  useEffect(() => {
    if (loggedInWaiter && waiterId !== loggedInWaiter.id) {
      window.history.pushState({}, '', `/waiter/${loggedInWaiter.id}`);
      window.dispatchEvent(new Event('popstate'));
    }
  }, [loggedInWaiter, waiterId]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const registeredWaitersRaw = localStorage.getItem('hotel_registered_waiters');
    const registeredWaiters = registeredWaitersRaw ? JSON.parse(registeredWaitersRaw) : [];
    
    // Authenticate by matching Name and Phone Number across all registered waiters
    const found = registeredWaiters.find(
      (w: Waiter) =>
        w.name.toLowerCase() === loginName.trim().toLowerCase() &&
        w.phone.trim() === loginPhone.trim()
    );

    if (found) {
      // Check active list
      const raw = localStorage.getItem('hotel_active_waiters') || '[]';
      const activeList: string[] = JSON.parse(raw);

      setLoggedInWaiter(found);
      localStorage.setItem(`waiter_session_${found.id}`, JSON.stringify(found));
      
      // Mark as active
      if (!activeList.includes(found.id)) {
        const nextList = [...activeList, found.id];
        localStorage.setItem('hotel_active_waiters', JSON.stringify(nextList));
        setActiveWaitersState(nextList);
        
        // Notify other tabs
        const channel = new BroadcastChannel('hotel_ordering_system');
        channel.postMessage({ type: 'REQUEST_SYNC' });
        channel.close();
      }

      // Automatically redirect to the specific waiter ID URL path
      if (found.id !== waiterId) {
        window.history.pushState({}, '', `/waiter/${found.id}`);
        window.dispatchEvent(new Event('popstate'));
      }
    } else {
      setLoginError('❌ Incorrect Name or Phone Number. Please check registration at Reception.');
    }
  };

  const handleLogout = () => {
    if (loggedInWaiter) {
      const raw = localStorage.getItem('hotel_active_waiters') || '[]';
      const nextList = JSON.parse(raw).filter((id: string) => id !== loggedInWaiter.id);
      localStorage.setItem('hotel_active_waiters', JSON.stringify(nextList));
      setActiveWaitersState(nextList);
      
      const channel = new BroadcastChannel('hotel_ordering_system');
      channel.postMessage({ type: 'REQUEST_SYNC' });
      channel.close();
      
      localStorage.removeItem(`waiter_session_${loggedInWaiter.id}`);
    }
    setLoggedInWaiter(null);
    if (waiterId) {
      localStorage.removeItem(`waiter_session_${waiterId}`);
    }
  };

  // Keep active list updated when already logged in
  useEffect(() => {
    if (loggedInWaiter) {
      const raw = localStorage.getItem('hotel_active_waiters') || '[]';
      const activeList: string[] = JSON.parse(raw);
      if (!activeList.includes(loggedInWaiter.id)) {
        const nextList = [...activeList, loggedInWaiter.id];
        localStorage.setItem('hotel_active_waiters', JSON.stringify(nextList));
        setActiveWaitersState(nextList);
        
        const channel = new BroadcastChannel('hotel_ordering_system');
        channel.postMessage({ type: 'REQUEST_SYNC' });
        channel.close();
      }
    }
  }, [loggedInWaiter]);

  // Sync active list across tabs/storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hotel_active_waiters' || e.key === 'hotel_registered_waiters') {
        const raw = localStorage.getItem('hotel_active_waiters') || '[]';
        setActiveWaitersState(JSON.parse(raw));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync session changes from other tabs/reception updates
  useEffect(() => {
    const syncWaiters = () => {
      if (!loggedInWaiter) return;
      const registeredWaitersRaw = localStorage.getItem('hotel_registered_waiters');
      const registeredWaiters = registeredWaitersRaw ? JSON.parse(registeredWaitersRaw) : [];
      const updated = registeredWaiters.find((w: Waiter) => w.id === loggedInWaiter.id);
      if (updated) {
        setLoggedInWaiter(updated);
        localStorage.setItem(`waiter_session_${waiterId}`, JSON.stringify(updated));
      } else {
        // Log out if deleted from reception
        handleLogout();
      }
    };
    window.addEventListener('storage', syncWaiters);
    return () => window.removeEventListener('storage', syncWaiters);
  }, [loggedInWaiter, waiterId]);

  const waiterName = loggedInWaiter ? loggedInWaiter.name : '';

  // Detect check-in changes for sound/visual alert
  useEffect(() => {
    Object.entries(tablesOccupancy).forEach(([tableId, data]) => {
      const wasOccupied = prevOccupancy[tableId] || false;
      const isOccupied = data.occupied;

      if (isOccupied && !wasOccupied) {
        // Table just checked in!
        showNotification(`🚨 Table ${tableId} checked in! Occupied by ${data.customerName} (${data.guestsCount} guests).`);
        if (soundEnabled) {
          playDing();
        }
      }
    });

    // Update history tracker
    const currentStatus: { [id: string]: boolean } = {};
    Object.entries(tablesOccupancy).forEach(([id, data]) => {
      currentStatus[id] = data.occupied;
    });
    setPrevOccupancy(currentStatus);
  }, [tablesOccupancy, soundEnabled]);

  // Alert when Food is Ready
  useEffect(() => {
    // Collect tables assigned to current waiter or all if unassigned
    let myTables: string[] = [];
    if (loggedInWaiter) {
      myTables = loggedInWaiter.assignedTables || [];
    } else if (waiterId) {
      const saved = localStorage.getItem(`waiter_session_${waiterId}`);
      if (saved) myTables = JSON.parse(saved).assignedTables || [];
    }
    
    // Only alert for orders on my tables (if I have assigned tables, otherwise alert all)
    const myReadyOrders = orders.filter(o => 
      o.status === 'Ready' && (myTables.length === 0 || myTables.includes(o.tableId))
    );

    if (myReadyOrders.length > lastReadyCount && myReadyOrders.length > 0) {
      const latest = myReadyOrders[myReadyOrders.length - 1];
      showNotification(`🍽️ FOOD READY FOR TABLE ${latest.tableId}!`);
      if (soundEnabled) {
        playDing(); // Will reuse the double-bell chime
      }
    }
    
    setLastReadyCount(myReadyOrders.length);
  }, [orders, soundEnabled, loggedInWaiter, waiterId, lastReadyCount]);

  const showNotification = (msg: string) => {
    setToastAlert(msg);
    setTimeout(() => setToastAlert(null), 5000);
  };

  const playDing = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      // High pitch double-bell notification
      playTone(880, ctx.currentTime, 0.2); // A5
      playTone(1046.5, ctx.currentTime + 0.1, 0.35); // C6
    } catch (e) {
      console.log('Audio error:', e);
    }
  };
  if (!loggedInWaiter) {
    const registeredWaitersRaw = localStorage.getItem('hotel_registered_waiters');
    const registeredWaiters: Waiter[] = registeredWaitersRaw ? JSON.parse(registeredWaitersRaw) : [];
    const targetProfile = registeredWaiters.find(w => w.id === waiterId);

    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '1rem' }}>
        <form onSubmit={handleLoginSubmit} className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '420px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>🛎️</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-secondary)', marginTop: '1rem', fontFamily: "'Outfit', sans-serif" }}>
              Waiter Login
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
              Please sign in as <strong style={{ color: 'var(--accent-secondary)' }}>{targetProfile ? targetProfile.name : 'Registered Waiter'}</strong> to access this dashboard
            </p>
          </div>

          {loginError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              {loginError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Waiter Name
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <User size={16} color="var(--accent-secondary)" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Michael Smith"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Phone Number
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <Users size={16} color="var(--accent-secondary)" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)',
              color: '#0f172a',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            Access Dashboard
          </button>
        </form>
      </div>
    );
  }
  const totalTablesCount = parseInt(localStorage.getItem('owner_tables_count') || '4', 10);
  const registeredWaitersRaw = localStorage.getItem('hotel_registered_waiters');
  const registeredWaiters: Waiter[] = registeredWaitersRaw ? JSON.parse(registeredWaitersRaw) : [];

  // Instant Spot-Decision table assignment: distribute total tables equally round-robin among active/logged-in waiters on the fly
  const total = totalTablesCount;
  
  // Filter registered waiters to only those currently logged in
  const activeRegisteredWaiters = registeredWaiters.filter(w => activeWaitersState.includes(w.id));
  const targetWaiters = activeRegisteredWaiters.length > 0 ? activeRegisteredWaiters : registeredWaiters;
  
  const distributedWaiters = registeredWaiters.map(w => ({ ...w, assignedTables: [] as string[] }));
  if (targetWaiters.length > 0) {
    // Sort to ensure consistent round-robin distribution order
    const sortedTargetWaiters = [...targetWaiters].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 1; i <= total; i++) {
      const tableIdStr = i.toString();
      const waiterIndex = (i - 1) % sortedTargetWaiters.length;
      const assignedWaiter = sortedTargetWaiters[waiterIndex];
      // Assign the table to this waiter in the distributed list
      const match = distributedWaiters.find(w => w.id === assignedWaiter.id);
      if (match) {
        match.assignedTables.push(tableIdStr);
      }
    }
    // Update local storage if distribution changed to keep it in sync
    const currentSerialized = JSON.stringify(distributedWaiters);
    if (localStorage.getItem('hotel_registered_waiters') !== currentSerialized) {
      localStorage.setItem('hotel_registered_waiters', currentSerialized);
      // Synchronize in the background
      const channel = new BroadcastChannel('hotel_ordering_system');
      channel.postMessage({ type: 'REQUEST_SYNC' });
      channel.close();
    }
  }

  // Reload current logged in waiter state if assignments changed
  const currentAssignedWaiter = distributedWaiters.find(w => w.id === loggedInWaiter?.id);
  const currentWaiterAssignedTables = currentAssignedWaiter ? currentAssignedWaiter.assignedTables : (loggedInWaiter ? loggedInWaiter.assignedTables : []);

  // Filter requests (only show tables assigned to the logged-in waiter)
  const assignedTables = currentWaiterAssignedTables;

  const activeRequests = requests
    .filter(r => r.status === 'Pending' && assignedTables.includes(r.tableId))
    .sort((a, b) => b.timestamp - a.timestamp);
    
  const resolvedRequests = requests
    .filter(r => r.status === 'Resolved' && assignedTables.includes(r.tableId))
    .sort((a, b) => b.timestamp - a.timestamp);

  // Filter active orders (Pending, Preparing, Ready) to show on Waiter Dashboard
  const activeWaiterOrders = orders
    .filter(o => o.status !== 'Served' && o.status !== 'Cancelled' && assignedTables.includes(o.tableId))
    .sort((a, b) => a.timestamp - b.timestamp);
    
  const servedOrders = orders
    .filter(o => o.status === 'Served' && assignedTables.includes(o.tableId))
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', paddingBottom: '6rem' }}>
      
      {/* Toast Check-in Alert */}
      {toastAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(239, 68, 68, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fff',
          padding: '1.25rem 2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 700,
          fontSize: '0.95rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <Info size={20} />
          {toastAlert}
        </div>
      )}

      {/* Header */}
      <header className="glass-panel waiter-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--accent-secondary-glow)', padding: '0.5rem', borderRadius: '8px', color: 'var(--accent-secondary)' }}>
            <ConciergeBell size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Front of House / Waiter Board</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 650 }}>Active Profile: {waiterName}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn-constructivist-secondary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '2px 2px 0px #1a1a1a'
            }}
          >
            {soundEnabled ? <Volume2 size={16} color="var(--accent-primary)" /> : <VolumeX size={16} color="#64748b" />}
            ALERTS: {soundEnabled ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-constructivist-secondary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              boxShadow: '2px 2px 0px #1a1a1a'
            }}
          >
            {showHistory ? 'SHOW ACTIVE TASKS' : 'SHOW PAST LOG'}
          </button>

          <button
            onClick={handleLogout}
            className="btn-constructivist-primary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '2px 2px 0px #1a1a1a'
            }}
          >
            <LogOut size={16} /> LOGOUT
          </button>
        </div>
      </header>

      {/* Main Waiter View Layout split side-by-side */}
      {!showHistory ? (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          {/* LEFT SIDE: Active Customer Requests & Orders to Serve */}
          <div className="waiter-left-panel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Top Section: Active Orders to Serve */}
              <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '300px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-ready)' }}>
                  🍽️ Active Orders to Serve ({activeWaiterOrders.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeWaiterOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                      No active orders to be served.
                    </div>
                  ) : (
                    activeWaiterOrders.map(order => (
                      <div
                        key={order.id}
                        style={{
                          background: 'rgba(14, 165, 233, 0.03)',
                          border: '1px solid rgba(14, 165, 233, 0.15)',
                          padding: '1.25rem',
                          borderRadius: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: order.status === 'Preparing' ? 'var(--status-preparing)' : 'var(--status-ready)',
                                color: '#fff',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px'
                              }}>
                                {order.status === 'Ready' && order.items.some(i => i.status === 'Served')
                                  ? `Partially Served (${order.items.filter(i => i.status === 'Served').length}/${order.items.length})`
                                  : order.status}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Table {order.tableId}</h3>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {order.status === 'Ready' && (
                              <button
                                onClick={() => {
                                  onServeOrder(order.id, loggedInWaiter?.name || 'Waiter');
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, var(--status-ready) 0%, #059669 100%)',
                                  border: 'none',
                                  color: '#fff',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <Check size={14} /> Serve All
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                          <h4 style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items to Serve</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {order.items.map((item, index) => {
                              const isServed = item.status === 'Served' || order.status === 'Served';
                              const isReady = item.status === 'Ready' || order.status === 'Ready';
                              
                              return (
                                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.9rem', color: '#e2e8f0', textDecoration: isServed ? 'line-through' : 'none', opacity: isServed ? 0.5 : 1 }}>
                                    <strong style={{ color: 'var(--accent-secondary)' }}>{item.quantity}x</strong> {item.name}
                                  </span>
                                  {isReady && !isServed && (
                                    <button
                                      onClick={() => {
                                        if (onUpdateItemStatus) {
                                          onUpdateItemStatus(order.id, index, 'Served');
                                        }
                                      }}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.2)',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        color: '#10b981',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                      }}
                                    >
                                      <Check size={12} /> Serve
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Section: Customer Calls */}
              <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '300px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-pending)' }}>
                  🛎️ Active Table Requests ({activeRequests.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                      No customer requests right now.
                    </div>
                  ) : (
                    activeRequests.map(req => {
                      const isBill = req.type === 'Request Bill';
                      return (
                        <div
                          key={req.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isBill ? 'rgba(16, 185, 129, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                            border: `1px solid ${isBill ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
                            padding: '1.25rem',
                            borderRadius: '12px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: isBill ? 'var(--status-ready)' : 'var(--status-pending)',
                                color: '#fff',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px'
                              }}>
                                {req.type}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Table {req.tableId}</h3>
                          </div>
                          <button
                            onClick={() => {
                              onResolveRequest(req.id, waiterName);
                              if (req.type === 'Cash Payment Collection' || req.type === 'UPI Payment Completed') {
                                onCheckOutTable(req.tableId);
                              }
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: '#fff',
                              padding: '0.5rem 1rem',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--status-ready)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          >
                            <Check size={14} /> Mark Handled
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Table Occupancy Map (Always visible in 3 lines / 3 columns grid on the side) */}
          <div className="glass-panel waiter-right-panel">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--accent-secondary)" /> Table Map
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {assignedTables.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <Layers size={36} style={{ opacity: 0.15, marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>No tables available.</p>
                </div>
              ) : (
                assignedTables.map((tableId) => {
                  const occ = tablesOccupancy[tableId] || { occupied: false };
                  const assignedWaiter = distributedWaiters.find(w => w.assignedTables.includes(tableId));
                  const isAssignedToMe = currentWaiterAssignedTables.includes(tableId);
                  
                  return (
                    <div key={tableId} style={{
                      padding: '1.25rem',
                      background: '#ffffff',
                      border: isAssignedToMe ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                      borderRadius: '12px',
                      boxShadow: isAssignedToMe ? '0 4px 12px rgba(37, 99, 235, 0.05)' : '0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                      transition: 'all 0.2s ease-in-out'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                          Table {tableId}
                          {isAssignedToMe && <span style={{ fontSize: '0.65rem', color: 'var(--accent-secondary)', marginLeft: '0.4rem' }}>(Mine)</span>}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                            👤 <strong>{occ.customerName}</strong> ({occ.guestsCount}) {occ.openedBy !== 'Waiter' && <span style={{ color: '#fbbf24', fontSize: '0.65rem' }}>[Customer]</span>}
                          </span>
                          <div style={{ display: 'flex', gap: '0.35rem', width: '100%', flexWrap: 'wrap' }}>
                            {!paymentStep[tableId] && (
                              <>
                                <button
                                  onClick={() => setOrderingForTable(tableId)}
                                  disabled={occ.openedBy !== 'Waiter'}
                                  style={{
                                    background: occ.openedBy !== 'Waiter' ? 'rgba(255,255,255,0.02)' : 'rgba(14, 165, 233, 0.1)',
                                    border: `1px solid ${occ.openedBy !== 'Waiter' ? 'rgba(255,255,255,0.05)' : 'rgba(14, 165, 233, 0.2)'}`,
                                    borderRadius: '6px',
                                    color: occ.openedBy !== 'Waiter' ? '#475569' : 'var(--status-ready)',
                                    padding: '0.25rem 0.4rem',
                                    fontSize: '0.7rem',
                                    cursor: occ.openedBy !== 'Waiter' ? 'not-allowed' : 'pointer',
                                    fontWeight: 600,
                                    flex: '1 1 auto'
                                  }}
                                  title={occ.openedBy !== 'Waiter' ? "Ordering disabled for customer-owned tables" : "Add Order"}
                                >
                                  Order
                                </button>
                                
                                <button
                                  onClick={() => setPaymentStep(prev => ({ ...prev, [tableId]: 'SELECT' }))}
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    borderRadius: '6px',
                                    color: 'var(--status-ready)',
                                    padding: '0.25rem 0.4rem',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    flex: '1 1 auto'
                                  }}
                                  title="Record Payment & Settle"
                                >
                                  Settle
                                </button>
                                
                                <button
                                  onClick={() => {
                                    console.log('WaiterView: Clear button clicked for tableId:', tableId);
                                    if (window.confirm(`Are you sure you want to clear Table ${tableId}? This resets table occupancy and resolves requests.`)) {
                                      console.log('WaiterView: Clear confirmed. Calling onCheckOutTable for tableId:', tableId);
                                      onCheckOutTable(tableId);
                                    }
                                  }}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '6px',
                                    color: '#ef4444',
                                    padding: '0.25rem 0.4rem',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    flex: '1 1 auto'
                                  }}
                                  title="Force Clear/Checkout Table"
                                >
                                  Clear
                                </button>
                              </>
                            )}
                            
                            {paymentStep[tableId] === 'SELECT' && (
                              <div style={{ display: 'flex', gap: '0.25rem', flex: 1 }}>
                                <button
                                  onClick={() => setPaymentStep(prev => ({ ...prev, [tableId]: 'CASH_CONFIRM' }))}
                                  style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', color: 'var(--status-ready)', padding: '0.25rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, flex: 1 }}
                                >
                                  Cash
                                </button>
                                <button
                                  onClick={() => setPaymentStep(prev => ({ ...prev, [tableId]: 'UPI_CONFIRM' }))}
                                  style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px', color: '#38bdf8', padding: '0.25rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, flex: 1 }}
                                >
                                  UPI
                                </button>
                                <button
                                  onClick={() => setPaymentStep(prev => { const n = {...prev}; delete n[tableId]; return n; })}
                                  style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', color: '#94a3b8', padding: '0.25rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, width: '30px' }}
                                >
                                  ✕
                                </button>
                              </div>
                            )}

                            {paymentStep[tableId] === 'CASH_CONFIRM' && (
                              <button
                                onClick={() => {
                                  onCheckOutTable(tableId, 'Cash');
                                  setPaymentStep(prev => { const n = {...prev}; delete n[tableId]; return n; });
                                }}
                                style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--status-ready)', borderRadius: '6px', color: 'var(--status-ready)', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700, flex: 1 }}
                              >
                                Cash Paid ✅
                              </button>
                            )}

                            {paymentStep[tableId] === 'UPI_CONFIRM' && (
                              <button
                                onClick={() => {
                                  onCheckOutTable(tableId, 'UPI');
                                  setPaymentStep(prev => { const n = {...prev}; delete n[tableId]; return n; });
                                }}
                                style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', borderRadius: '6px', color: '#38bdf8', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700, flex: 1 }}
                              >
                                UPI Paid ✅
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0, fontWeight: 700 }}>Status: Settled</p>
                          </div>
                          
                          {checkInPrompt === tableId ? (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <input
                                autoFocus
                                type="text"
                                placeholder="Client Name"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && tempName.trim()) {
                                    onTableCheckIn(tableId, tempName.trim(), 1, 'Waiter');
                                    setOrderingForTable(tableId);
                                    setCheckInPrompt(null);
                                  }
                                }}
                                style={{ flex: 1, padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '0.75rem', outline: 'none' }}
                              />
                              <button
                                onClick={() => {
                                  if (tempName.trim()) {
                                    onTableCheckIn(tableId, tempName.trim(), 1, 'Waiter');
                                    setOrderingForTable(tableId);
                                    setCheckInPrompt(null);
                                  }
                                }}
                                style={{ background: 'rgba(14, 165, 233, 0.2)', border: '1px solid var(--accent-secondary)', borderRadius: '6px', color: 'var(--status-ready)', padding: '0.25rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                              >
                                Start
                              </button>
                              <button
                                onClick={() => setCheckInPrompt(null)}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94a3b8', padding: '0.25rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, width: '28px' }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setTempName('');
                                setCheckInPrompt(tableId);
                              }}
                              style={{
                                background: 'rgba(14, 165, 233, 0.1)',
                                border: '1px solid rgba(14, 165, 233, 0.2)',
                                borderRadius: '6px',
                                color: 'var(--status-ready)',
                                padding: '0.4rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 700,
                                width: '100%'
                              }}
                            >
                              New Order
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      ) : (
        /* History Logs View */
        <div className="waiter-history-grid">
          {/* Served Orders */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-served)' }}>
              <Award size={18} /> Recently Served Orders ({servedOrders.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {servedOrders.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>No orders served yet.</p>
              ) : (
                servedOrders.map(order => (
                  <div key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Table {order.tableId} - {order.items.length} items</span>
                      <span style={{ fontWeight: 600, color: 'var(--status-ready)' }}>₹{order.totalAmount.toFixed(2)}</span>
                    </div>
                    {order.servedBy && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--status-served)', fontStyle: 'italic' }}>
                        Served by: {order.servedBy}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resolved Calls */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
              <Check size={18} /> Resolved Service Calls ({resolvedRequests.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {resolvedRequests.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>No resolved service requests.</p>
              ) : (
                resolvedRequests.map(req => (
                  <div key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Table {req.tableId} - {req.type}</span>
                      <span>Done</span>
                    </div>
                    {req.resolvedBy && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--status-pending)', fontStyle: 'italic' }}>
                        Handled by: {req.resolvedBy}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Ordering Modal for Waiters */}
      {orderingForTable && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-primary)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1rem', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 800 }}>Table {orderingForTable} Order</h2>
            <button 
              onClick={() => setOrderingForTable(null)}
              style={{ background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(14, 165, 233, 0.3)', color: '#38bdf8', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>←</span> Back to Dashboard
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <TableView 
              tableId={orderingForTable}
              occupancy={tablesOccupancy[orderingForTable] || { occupied: false }}
              orders={orders}
              requests={requests}
              isWaiterMode={true}
              onCheckIn={(name, guests, openedBy) => onTableCheckIn(orderingForTable, name, guests, openedBy || 'Waiter')}
              onCheckOut={() => onCheckOutTable(orderingForTable)}
              onPlaceOrder={(items) => {
                onPlaceOrder(orderingForTable, items);
                setOrderingForTable(null); // Close modal after order is placed
              }}
              onCallWaiter={(type) => onCallWaiter(orderingForTable, type)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default WaiterView;
