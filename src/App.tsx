import React, { useEffect, useState } from 'react';
import type { Order, OrderItem, OrderStatus, ServiceRequest, TableOccupancy, Reservation } from './types';
import { Portal } from './components/Portal';
import { TableView } from './components/TableView';
import { KitchenView } from './components/KitchenView';
import { WaiterView } from './components/WaiterView';
import { OwnerDashboard } from './components/OwnerDashboard';
import { ReceptionView } from './components/ReceptionView';
import { ReservationPortal } from './components/ReservationPortal';

export const App: React.FC = () => {
  // Helper to get table capacity configuration
  const getTablesCount = () => parseInt(localStorage.getItem('owner_tables_count') || '4', 10);

  const getInitialOccupancy = () => {
    const total = getTablesCount();
    const occupancy: { [tableId: string]: TableOccupancy } = {};
    for (let i = 1; i <= total; i++) {
      occupancy[i.toString()] = { occupied: false };
    }
    return occupancy;
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>(() => {
    const saved = localStorage.getItem('hotel_reservations');
    return saved ? JSON.parse(saved) : [];
  });
  const [tablesOccupancy, setTablesOccupancy] = useState<{ [tableId: string]: TableOccupancy }>(() => {
    const saved = localStorage.getItem('hotel_tables_occupancy');
    if (saved) {
      return JSON.parse(saved);
    }
    return getInitialOccupancy();
  });
  const [inventory, setInventory] = useState<any[]>([]);


  // Parse path client-side
  const [path, setPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Sync state from localStorage initially (local cache)
  useEffect(() => {
    const savedOrders = localStorage.getItem('hotel_orders');
    const savedRequests = localStorage.getItem('hotel_requests');
    const savedOccupancy = localStorage.getItem('hotel_tables_occupancy');
    const savedReservations = localStorage.getItem('hotel_reservations');
    const savedInventory = localStorage.getItem('hotel_inventory');
    
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedRequests) setRequests(JSON.parse(savedRequests));
    if (savedReservations) setReservations(JSON.parse(savedReservations));
    if (savedInventory) setInventory(JSON.parse(savedInventory));
    if (savedOccupancy) {
      setTablesOccupancy(JSON.parse(savedOccupancy));
    }

    const handleIncoming = (msg: any) => {
      switch (msg.type) {
        case 'SYNC_STATE': {
          setOrders(msg.orders);
          setRequests(msg.requests);
          setReservations(msg.reservations || []);
          setTablesOccupancy(msg.tablesOccupancy || {});
          setInventory(msg.inventory || []);
          
          localStorage.setItem('hotel_orders', JSON.stringify(msg.orders));
          localStorage.setItem('hotel_requests', JSON.stringify(msg.requests));
          localStorage.setItem('hotel_tables_occupancy', JSON.stringify(msg.tablesOccupancy || {}));
          localStorage.setItem('hotel_reservations', JSON.stringify(msg.reservations || []));
          localStorage.setItem('hotel_inventory', JSON.stringify(msg.inventory || []));
          
          if (msg.menuItems && msg.menuItems.length > 0) {
            localStorage.setItem('hotel_dynamic_menu', JSON.stringify(msg.menuItems));
            window.dispatchEvent(new Event('menu_updated'));
          }
          
          if (msg.settings) {
            if (msg.settings.kitchenMode) localStorage.setItem('hotel_kitchen_mode', msg.settings.kitchenMode);
            if (msg.settings.kitchenConfigs) localStorage.setItem('hotel_kitchen_configs', JSON.stringify(msg.settings.kitchenConfigs));
            if (msg.settings.razorpayLink !== undefined) localStorage.setItem('owner_razorpay_link', msg.settings.razorpayLink || '');
            if (msg.settings.waiters !== undefined) {
              localStorage.setItem('hotel_registered_waiters', JSON.stringify(msg.settings.waiters));
              localStorage.removeItem('hotel_active_waiters');
              window.dispatchEvent(new StorageEvent('storage', { key: 'hotel_registered_waiters' }));
            }
          }
          break;
        }
        case 'UPDATE_MENU': {
          if (msg.menuItems && msg.menuItems.length > 0) {
            localStorage.setItem('hotel_dynamic_menu', JSON.stringify(msg.menuItems));
            window.dispatchEvent(new Event('menu_updated'));
          }
          break;
        }
        case 'NEW_ORDER': {
          setOrders(prev => {
            const nextOrders = [...prev.filter(o => o.id !== msg.order.id), { ...msg.order, customerName: msg.order.customerName }];
            localStorage.setItem('hotel_orders', JSON.stringify(nextOrders));
            return nextOrders;
          });
          break;
        }
        case 'UPDATE_ORDER_STATUS': {
          setOrders(prev => {
            const updated = prev.map(o => {
              if (o.id === msg.orderId) {
                let newItems = o.items;
                if (msg.status === 'Ready' || msg.status === 'Served') {
                  newItems = o.items.map(item => ({ ...item, status: msg.status }));
                }
                return { ...o, status: msg.status, servedBy: msg.servedBy || o.servedBy, items: newItems };
              }
              return o;
            });
            localStorage.setItem('hotel_orders', JSON.stringify(updated));
            return updated;
          });
          break;
        }
        case 'UPDATE_ORDER_ITEM_STATUS': {
          setOrders(prev => {
            const updated = prev.map(o => {
              if (o.id === msg.orderId) {
                const newItems = [...o.items];
                if (newItems[msg.itemIndex]) {
                  newItems[msg.itemIndex] = { ...newItems[msg.itemIndex], status: msg.status };
                }
                const allServed = newItems.every(item => item.status === 'Served');
                const allReadyOrServed = newItems.every(item => item.status === 'Ready' || item.status === 'Served');
                const newOrderStatus = allServed ? 'Served' : (allReadyOrServed ? 'Ready' : (o.status === 'Pending' ? 'Preparing' : o.status));

                return { ...o, items: newItems, status: newOrderStatus };
              }
              return o;
            });
            localStorage.setItem('hotel_orders', JSON.stringify(updated));
            return updated;
          });
          break;
        }
        case 'UPDATE_SETTINGS': {
          if (msg.settings.kitchenMode) {
            localStorage.setItem('hotel_kitchen_mode', msg.settings.kitchenMode);
            window.dispatchEvent(new CustomEvent('HOTEL_SETTINGS_UPDATED'));
          }
          if (msg.settings.kitchenConfigs) {
            localStorage.setItem('hotel_kitchen_configs', JSON.stringify(msg.settings.kitchenConfigs));
          }
          if (msg.settings.razorpayLink !== undefined) {
            localStorage.setItem('owner_razorpay_link', msg.settings.razorpayLink || '');
            window.dispatchEvent(new CustomEvent('HOTEL_SETTINGS_UPDATED'));
          }
          if (msg.settings.waiters !== undefined) {
            localStorage.setItem('hotel_registered_waiters', JSON.stringify(msg.settings.waiters));
            localStorage.removeItem('hotel_active_waiters');
            window.dispatchEvent(new StorageEvent('storage', { key: 'hotel_registered_waiters' }));
          }
          break;
        }
        case 'NEW_SERVICE_REQUEST': {
          setRequests(prev => {
            const updated = [...prev.filter(r => r.id !== msg.request.id), msg.request];
            localStorage.setItem('hotel_requests', JSON.stringify(updated));
            return updated;
          });
          break;
        }
        case 'RESOLVE_SERVICE_REQUEST': {
          setRequests(prev => {
            const updated = prev.map(r => r.id === msg.requestId ? { ...r, status: 'Resolved' as const, resolvedBy: msg.resolvedBy || r.resolvedBy } : r);
            localStorage.setItem('hotel_requests', JSON.stringify(updated));
            return updated;
          });
          break;
        }
        case 'TABLE_CHECK_IN': {
          setTablesOccupancy(prev => {
            const updated = {
              ...prev,
              [msg.tableId]: {
                occupied: true,
                customerName: msg.customerName,
                guestsCount: msg.guestsCount,
                checkInTime: Date.now(),
                openedBy: msg.openedBy || 'Customer',
                phone: msg.phone
              }
            };
            localStorage.setItem('hotel_tables_occupancy', JSON.stringify(updated));
            return updated;
          });
          break;
        }
        case 'TABLE_CHECK_OUT': {
          setTablesOccupancy(prev => {
            const updated = {
              ...prev,
              [msg.tableId]: { occupied: false }
            };
            localStorage.setItem('hotel_tables_occupancy', JSON.stringify(updated));
            return updated;
          });
          setOrders(prev => {
            const updated = prev.map(o => o.tableId === msg.tableId ? { ...o, tableId: `${msg.tableId}_archived_${Date.now()}`, status: 'Served' as const } : o);
            localStorage.setItem('hotel_orders', JSON.stringify(updated));
            return updated;
          });
          setRequests(prev => {
            const updated = prev.map(r => r.tableId === msg.tableId ? { ...r, status: 'Resolved' as const } : r);
            localStorage.setItem('hotel_requests', JSON.stringify(updated));
            return updated;
          });
          
          // Dispatch local custom event to trigger printing on Reception Desk
          window.dispatchEvent(new CustomEvent('TABLE_SETTLED', { 
            detail: { tableId: msg.tableId, paymentMethod: msg.paymentMethod } 
          }));
          break;
        }
        case 'ADD_RESERVATION': {
          setReservations(prev => {
            const updated = [...prev.filter(r => r.id !== msg.reservation.id), msg.reservation];
            localStorage.setItem('hotel_reservations', JSON.stringify(updated));
            return updated;
          });
          break;
        }
        case 'REMOVE_RESERVATION': {
          setReservations(prev => {
            const updated = prev.filter(r => r.id !== msg.reservationId);
            localStorage.setItem('hotel_reservations', JSON.stringify(updated));
            return updated;
          });
          break;
        }
        case 'UPDATE_INVENTORY': {
          setInventory(msg.inventory);
          localStorage.setItem('hotel_inventory', JSON.stringify(msg.inventory));
          break;
        }
        case 'ADD_TABLE': {
          setTablesOccupancy(prev => {
            const updated = { ...prev, [msg.tableId]: { occupied: false } };
            localStorage.setItem('hotel_tables_occupancy', JSON.stringify(updated));
            return updated;
          });
          break;
        }
        case 'REMOVE_TABLE': {
          setTablesOccupancy(prev => {
            const updated = { ...prev };
            delete updated[msg.tableId];
            localStorage.setItem('hotel_tables_occupancy', JSON.stringify(updated));
            return updated;
          });
          setRequests(prev => {
            const updated = prev.filter(r => r.tableId !== msg.tableId);
            localStorage.setItem('hotel_requests', JSON.stringify(updated));
            return updated;
          });
          break;
        }
      }
    };

    // Fetch initial fresh state from the REST API immediately on load
    const fetchFreshState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const freshState = await res.json();
          handleIncoming({ type: 'SYNC_STATE', ...freshState });
        }
      } catch (err) {
        console.error('Failed to fetch initial state:', err);
      }
    };
    fetchFreshState();

    // Connect to Node.js SSE Sync Server
    const eventSource = new EventSource(`/events`);

    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleIncoming(msg);
        
        // Sync locally with other tabs
        try {
          const channel = new BroadcastChannel('hotel_ordering_system');
          channel.postMessage(msg);
          channel.close();
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    // Listen to local BroadcastChannel from other tabs
    const localChannel = new BroadcastChannel('hotel_ordering_system');
    localChannel.onmessage = (event) => {
      if (event.data) {
        handleIncoming(event.data);
      }
    };

    // Polling fallback to keep tabs synchronized in case of browser concurrent connection limits
    const pollInterval = setInterval(fetchFreshState, 4000);

    return () => {
      eventSource.close();
      localChannel.close();
      clearInterval(pollInterval);
    };
  }, []);

  const postSyncEvent = async (event: any) => {
    console.log('App: postSyncEvent sending event:', event);
    // Broadcast locally immediately so other tabs of the same browser update in-place instantly
    try {
      const channel = new BroadcastChannel('hotel_ordering_system');
      channel.postMessage(event);
      channel.close();
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
      console.log('App: postSyncEvent response status:', res.status);
    } catch (err) {
      console.error('Failed to post event to sync server:', err);
    }
  };

  // Actions
  const handlePlaceOrder = (tableId: string, items: OrderItem[]) => {
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newOrder: Order = {
      id: `ord_${Math.random().toString(36).substr(2, 9)}`,
      tableId,
      items,
      status: 'Pending',
      timestamp: Date.now(),
      totalAmount,
      customerName: tablesOccupancy[tableId]?.customerName
    };

    setOrders(prev => {
      const nextOrders = [...prev, newOrder];
      localStorage.setItem('hotel_orders', JSON.stringify(nextOrders));
      return nextOrders;
    });
    postSyncEvent({ type: 'NEW_ORDER', order: newOrder });
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, servedBy?: string) => {
    setOrders(prev => {
      const nextOrders = prev.map(o => {
        if (o.id === orderId) {
          // If marking order as Ready or Served, also update all items
          let newItems = o.items;
          if (status === 'Ready' || status === 'Served') {
            newItems = o.items.map(item => ({ ...item, status }));
          }
          return { ...o, status, servedBy: servedBy || o.servedBy, items: newItems };
        }
        return o;
      });
      localStorage.setItem('hotel_orders', JSON.stringify(nextOrders));
      return nextOrders;
    });
    postSyncEvent({ type: 'UPDATE_ORDER_STATUS', orderId, status, servedBy });
  };

  const handleUpdateOrderItemStatus = (orderId: string, itemIndex: number, status: OrderStatus) => {
    setOrders(prev => {
      const nextOrders = prev.map(o => {
        if (o.id === orderId) {
          const newItems = [...o.items];
          if (newItems[itemIndex]) {
            newItems[itemIndex] = { ...newItems[itemIndex], status };
          }
          
          const allServed = newItems.every(item => item.status === 'Served');
          const allReadyOrServed = newItems.every(item => item.status === 'Ready' || item.status === 'Served');
          const newOrderStatus = allServed ? 'Served' : (allReadyOrServed ? 'Ready' : (o.status === 'Pending' ? 'Preparing' : o.status));

          return { ...o, items: newItems, status: newOrderStatus };
        }
        return o;
      });
      localStorage.setItem('hotel_orders', JSON.stringify(nextOrders));
      return nextOrders;
    });
    postSyncEvent({ type: 'UPDATE_ORDER_ITEM_STATUS', orderId, itemIndex, status });
  };

  const handleCallWaiter = (tableId: string, type: 'Call Waiter' | 'Request Bill' | 'Cash Payment Collection' | 'UPI Payment Completed') => {
    const newRequest: ServiceRequest = {
      id: `req_${Math.random().toString(36).substr(2, 9)}`,
      tableId,
      type,
      status: 'Pending',
      timestamp: Date.now()
    };

    // Remove existing pending request of same type for the table to avoid spam
    setRequests(prev => {
      const nextRequests = [
        ...prev.filter(r => !(r.tableId === tableId && r.type === type && r.status === 'Pending')),
        newRequest
      ];
      localStorage.setItem('hotel_requests', JSON.stringify(nextRequests));
      return nextRequests;
    });
    postSyncEvent({ type: 'NEW_SERVICE_REQUEST', request: newRequest });
  };

  const handleResolveRequest = (requestId: string, resolvedBy?: string) => {
    setRequests(prev => {
      const nextRequests = prev.map(r => r.id === requestId ? { ...r, status: 'Resolved' as const, resolvedBy } : r);
      localStorage.setItem('hotel_requests', JSON.stringify(nextRequests));
      return nextRequests;
    });
    postSyncEvent({ type: 'RESOLVE_SERVICE_REQUEST', requestId, resolvedBy });
  };

  const handleServeOrder = (orderId: string, servedBy: string) => {
    handleUpdateOrderStatus(orderId, 'Served', servedBy);
  };

  const handleTableCheckIn = (tableId: string, customerName: string, guestsCount: number, openedBy: 'Customer' | 'Waiter' = 'Customer', phone?: string) => {
    setTablesOccupancy(prev => {
      const updated = {
        ...prev,
        [tableId]: {
          occupied: true,
          customerName,
          guestsCount,
          checkInTime: Date.now(),
          openedBy,
          phone
        }
      };
      localStorage.setItem('hotel_tables_occupancy', JSON.stringify(updated));
      return updated;
    });
    postSyncEvent({ type: 'TABLE_CHECK_IN', tableId, customerName, guestsCount, openedBy, phone });
  };

  const handleTableCheckOut = (tableId: string, paymentMethod?: 'Cash' | 'UPI') => {
    console.log('App: handleTableCheckOut called for tableId:', tableId, 'paymentMethod:', paymentMethod);
    setTablesOccupancy(prev => {
      const updated = {
        ...prev,
        [tableId]: { occupied: false }
      };
      localStorage.setItem('hotel_tables_occupancy', JSON.stringify(updated));
      return updated;
    });
    
    setOrders(prev => {
      const updated = prev.map(o => o.tableId === tableId ? { ...o, tableId: `${tableId}_archived_${Date.now()}`, status: 'Served' as const } : o);
      localStorage.setItem('hotel_orders', JSON.stringify(updated));
      return updated;
    });
    
    setRequests(prev => {
      const nextRequests = prev.filter(r => r.tableId !== tableId);
      localStorage.setItem('hotel_requests', JSON.stringify(nextRequests));
      return nextRequests;
    });

    postSyncEvent({ type: 'TABLE_CHECK_OUT', tableId, paymentMethod });
    
    if (paymentMethod) {
      window.dispatchEvent(new CustomEvent('TABLE_SETTLED', { detail: { tableId, paymentMethod } }));
    }
  };

  const handleResetAllData = () => {
    localStorage.removeItem('hotel_orders');
    localStorage.removeItem('hotel_requests');
    localStorage.removeItem('hotel_tables_occupancy');
    localStorage.removeItem('hotel_registered_waiters');
    localStorage.removeItem('hotel_active_waiters');
    localStorage.removeItem('owner_razorpay_link');
    localStorage.removeItem('owner_razorpay_key_id');
    
    localStorage.removeItem('hotel_reservations');
    
    // Clear all waiter sessions from local storage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('waiter_session_')) {
        localStorage.removeItem(key);
      }
    }

    setOrders([]);
    setRequests([]);
    setReservations([]);
    setTablesOccupancy(getInitialOccupancy());
    
    postSyncEvent({ 
      type: 'SYNC_STATE', 
      orders: [], 
      requests: [], 
      reservations: [],
      tablesOccupancy: getInitialOccupancy(),
      settings: { waiters: [], razorpayLink: '', resetAllSettings: true }
    });
  };

  const kitchenMatchForNavbar = path.match(/^\/kitchen\/(\d+)$/);
  let navbarKitchenInfo = '';
  if (kitchenMatchForNavbar) {
    const kid = kitchenMatchForNavbar[1];
    const savedConfigs = localStorage.getItem('hotel_kitchen_configs');
    const configs = savedConfigs ? JSON.parse(savedConfigs) : [
      { id: '1', name: 'Bakery & Food Station', categories: ['Breakfast & Bakery', 'Sandwiches & Salads'] },
      { id: '2', name: 'Barista & Drink Station', categories: ['Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages'] },
      { id: '3', name: 'General Kitchen Station', categories: ['Breakfast & Bakery', 'Sandwiches & Salads', 'Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages'] }
    ];
    const config = configs.find((c: any) => c.id === kid);
    const isSingle = configs.length === 1;
    if (config) {
      navbarKitchenInfo = `${config.name} - ${isSingle ? 'Processes All Orders (Single Display Mode)' : `Processes: ${config.categories.join(', ')}`}`;
    }
  }

  // Simple Router Matching
  const renderView = () => {
    // Match /table/:id (Matches all configured numeric table IDs)
    const tableMatch = path.match(/^\/table\/(\d+)$/);
    if (tableMatch) {
      const tableId = tableMatch[1];
      const maxTables = getTablesCount();
      if (parseInt(tableId, 10) <= maxTables) {
        return (
          <TableView
            tableId={tableId}
            occupancy={tablesOccupancy[tableId] || { occupied: false }}
            orders={orders}
            requests={requests}
            reservations={reservations}
            onRemoveReservation={(reservationId) => postSyncEvent({ type: 'REMOVE_RESERVATION', reservationId })}
            onCheckIn={(name, guests, openedBy, phone) => handleTableCheckIn(tableId, name, guests, openedBy, phone)}
            onCheckOut={(paymentMethod) => handleTableCheckOut(tableId, paymentMethod)}
            onPlaceOrder={(items) => handlePlaceOrder(tableId, items)}
            onCallWaiter={(type) => handleCallWaiter(tableId, type)}
          />
        );
      }
    }

    // Match /kitchen/:id (N number)
    const kitchenMatch = path.match(/^\/kitchen\/(\d+)$/);
    if (kitchenMatch) {
      const kitchenId = kitchenMatch[1];
      return (
        <KitchenView
          kitchenId={kitchenId}
          orders={orders}
          onUpdateStatus={handleUpdateOrderStatus}
          onUpdateItemStatus={handleUpdateOrderItemStatus}
        />
      );
    }

    // Match /waiter (optionally with /:id)
    const waiterMatch = path.match(/^\/waiter(?:\/(\d+))?$/);
    if (waiterMatch) {
      const waiterId = waiterMatch[1] || '';
      return (
        <WaiterView
          waiterId={waiterId}
          orders={orders}
          requests={requests}
          tablesOccupancy={tablesOccupancy}
          reservations={reservations}
          onResolveRequest={handleResolveRequest}
          onServeOrder={handleServeOrder}
          onCheckOutTable={handleTableCheckOut}
          onPlaceOrder={handlePlaceOrder}
          onCallWaiter={handleCallWaiter}
          onTableCheckIn={handleTableCheckIn}
          onUpdateItemStatus={handleUpdateOrderItemStatus}
        />
      );
    }

    if (path === '/owner') {
      return (
        <OwnerDashboard
          orders={orders}
          tablesOccupancy={tablesOccupancy}
          onCheckOutTable={handleTableCheckOut}
          onResetAllData={handleResetAllData}
        />
      );
    }

    if (path === '/reception') {
      return (
        <ReceptionView 
          orders={orders}
          reservations={reservations}
          tablesOccupancy={tablesOccupancy}
          inventory={inventory}
          onUpdateInventory={(inv) => postSyncEvent({ type: 'UPDATE_INVENTORY', inventory: inv })}
          onAddTable={(tableId) => postSyncEvent({ type: 'ADD_TABLE', tableId })}
          onRemoveTable={(tableId) => postSyncEvent({ type: 'REMOVE_TABLE', tableId })}
          onRemoveReservation={(reservationId) => postSyncEvent({ type: 'REMOVE_RESERVATION', reservationId })}
          onUpdateSettings={(settings) => postSyncEvent({ type: 'UPDATE_SETTINGS', settings })}
          onResetAllData={handleResetAllData}
        />
      );
    }

    if (path === '/reserve') {
      return (
        <ReservationPortal 
          onAddReservation={(reservation) => postSyncEvent({ type: 'ADD_RESERVATION', reservation })}
          reservations={reservations}
        />
      );
    }

    // Default or portal view
    return <Portal />;
  };

  const isPortal = path === '/';

  return (
    <div>
      {/* Top Navbar */}
      <nav className="glass-panel main-navbar">
        <div 
          onClick={() => {
            window.history.pushState({}, '', '/');
            setPath('/');
          }}
          className="navbar-brand"
        >
          {/* Logo SCAN with Gold brackets */}
          <div style={{
            borderLeft: '2px solid #d4af37',
            borderRight: '2px solid #d4af37',
            padding: '0.1rem 0.6rem',
            position: 'relative',
            display: 'inline-block'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', background: 'linear-gradient(90deg, #d4af37 15%, transparent 15%, transparent 85%, #d4af37 85%)' }}></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1.5px', background: 'linear-gradient(90deg, #d4af37 15%, transparent 15%, transparent 85%, #d4af37 85%)' }}></div>
            <span style={{ fontWeight: 800, letterSpacing: '0.1em', color: 'var(--accent-secondary)', fontSize: '1.15rem', fontFamily: "'Outfit', sans-serif" }}>
              SCAN
            </span>
          </div>

          {navbarKitchenInfo && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              borderLeft: '2px solid var(--border-glass)', 
              paddingLeft: '1.5rem',
              cursor: 'default'
            }} onClick={(e) => e.stopPropagation()}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-secondary)', fontFamily: "'Outfit', sans-serif" }}>
                {navbarKitchenInfo.split(' - ')[0].toUpperCase()}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', fontWeight: 600 }}>
                {navbarKitchenInfo.split(' - ')[1]}
              </span>
            </div>
          )}
        </div>

        <div className="navbar-actions">
          {!isPortal && (
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                setPath('/');
              }}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                color: 'var(--accent-secondary)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease-in-out',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              ← Back to Portal
            </button>
          )}
          <span style={{
            fontSize: '0.75rem',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontFamily: "'Outfit', sans-serif"
          }}>
            <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
            System Live
          </span>
        </div>
      </nav>

      {/* Main Screen Content */}
      <main>
        {renderView()}
      </main>

      {/* Global Footer with Volcano Branding */}
      {/* Global Footer with Volcano Branding */}
      {!path.match(/^\/kitchen\/(\d+)$/) && (
        <footer style={{
          marginTop: '6rem',
          padding: '3rem 1rem 4rem 1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem'
        }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>Powered By</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.6rem', letterSpacing: '0.18em', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', fontFamily: "'Outfit', sans-serif" }}>
              VOLC
              <span style={{ display: 'inline-flex', alignSelf: 'center', margin: '0 0.15rem' }}>
                <svg viewBox="0 0 100 100" width="24" height="24" style={{ overflow: 'visible' }}>
                  <path d="M 10 90 L 47 10 L 53 10 L 90 90 L 70 90 L 50 48 L 30 90 Z" fill="#f97316" />
                </svg>
              </span>
              NO
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.5rem' }}>&copy; {new Date().getFullYear()} Scan. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
};
export default App;
