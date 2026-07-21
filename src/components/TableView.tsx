import React, { useState, useEffect } from 'react';
import { useMenu, type MenuItem } from '../data/menu';
import type { Order, OrderItem, ServiceRequest, TableOccupancy, Reservation } from '../types';
import { ShoppingCart, Send, Bell, ClipboardList, Info, Flame, Leaf, User, Users, LogOut, Search, Bot, MessageCircle, ChevronDown } from 'lucide-react';
import { Chatbot, type ChatMessage } from './Chatbot';

interface TableViewProps {
  tableId: string;
  occupancy: TableOccupancy;
  orders: Order[];
  requests: ServiceRequest[];
  reservations?: Reservation[];
  onRemoveReservation?: (reservationId: string) => void;
  onCheckIn: (name: string, guests: number, openedBy?: 'Customer' | 'Waiter', phone?: string) => void;
  onCheckOut: (paymentMethod?: 'Cash' | 'UPI') => void;
  onPlaceOrder: (items: OrderItem[]) => void;
  onCallWaiter: (type: 'Call Waiter' | 'Request Bill' | 'Cash Payment Collection' | 'UPI Payment Completed') => void;
  isWaiterMode?: boolean;
}

export const TableView: React.FC<TableViewProps> = ({
  tableId,
  occupancy,
  orders,
  requests,
  reservations = [],
  onRemoveReservation,
  onCheckIn,
  onCheckOut,
  onPlaceOrder,
  onCallWaiter,
  isWaiterMode = false,
}) => {
  const MENU_ITEMS = useMenu();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<{ [itemId: string]: { quantity: number; notes: string } }>({});
  const [activeTab, setActiveTab] = useState<'menu' | 'history' | 'checkout' | 'chatbot'>('menu');
  const [notification, setNotification] = useState<string | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: "Hello! I'm your food assistant. Ask me anything about our menu, or for a recommendation!"
    }
  ]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [billEmail, setBillEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | null>(null);
  const [razorpayLinkId, setRazorpayLinkId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showCheckOutSuccess, setShowCheckOutSuccess] = useState(false);
  const [showOrderLimitWarning, setShowOrderLimitWarning] = useState(false);
  const [sessionActive, setSessionActive] = useState<boolean>(() => !!sessionStorage.getItem(`table_session_active_${tableId}`));

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [showMobileCart, setShowMobileCart] = useState<boolean>(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState<MenuItem | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-verify payment by polling in the background
  useEffect(() => {
    if (!razorpayLinkId || paymentSuccess) return;

    const checkPayment = async () => {
      try {
        const res = await fetch(`/api/check-payment-status?id=${razorpayLinkId}`);
        const data = await res.json();
        if (res.ok && data.status === 'paid') {
          setPaymentSuccess(true);
          onCallWaiter('UPI Payment Completed');
        } else if (res.ok && data.status === 'failed') {
          // payment failed
        }
      } catch {
        // ignore
      }
    };

    // Run immediately
    checkPayment();

    // Poll every 3 seconds
    const interval = setInterval(checkPayment, 3000);
    return () => clearInterval(interval);
  }, [razorpayLinkId, paymentSuccess, onCallWaiter]);

  // Auto-checkout and logout after successful payment
  useEffect(() => {
    if (paymentSuccess) {
      setShowCheckOutSuccess(true);
      // Check out immediately with UPI to trigger the bill print on reception
      onCheckOut('UPI');

      const timer = setTimeout(() => {
        // Reset all local session states to ensure the next customer starts completely fresh
        setCart({});
        setRazorpayLinkId(null);
        setPaymentSuccess(false);
        setShowCheckOutSuccess(false);

        sessionStorage.removeItem(`table_session_active_${tableId}`);
        setSessionActive(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentSuccess, onCheckOut, tableId]);



  // Login inputs
  const [custName, setCustName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  // Search input
  const [menuSearch, setMenuSearch] = useState<string>('');

  // Filtered menu
  const filteredMenu = MENU_ITEMS.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(menuSearch.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || { quantity: 0, notes: '' };
      const newQty = current.quantity + delta;

      if (delta > 0 && newQty === 1 && Object.keys(prev).length >= 10) {
        alert("You can only order up to 10 different types of items per order.");
        return prev;
      }

      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...current, quantity: newQty }
      };
    });
  };

  const updateCartNotes = (itemId: string, notes: string) => {
    setCart(prev => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: { ...prev[itemId], notes }
      };
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [itemId, data]) => {
      const item = MENU_ITEMS.find(m => m.id === itemId);
      return total + (item ? item.price * data.quantity : 0);
    }, 0);
  };

  const getCartNutrition = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    Object.entries(cart).forEach(([itemId, data]) => {
      const item = MENU_ITEMS.find(m => m.id === itemId);
      if (item) {
        totalCalories += (item.calories || 0) * data.quantity;
        totalProtein += (item.protein || 0) * data.quantity;
      }
    });
    return { calories: totalCalories, protein: totalProtein };
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((total, data) => total + data.quantity, 0);
  };

  // Submit order
  const handleCheckout = () => {
    const orderItems: OrderItem[] = Object.entries(cart).map(([itemId, data]) => {
      const menuItem = MENU_ITEMS.find(m => m.id === itemId)!;
      return {
        menuItemId: itemId,
        quantity: data.quantity,
        notes: data.notes,
        name: menuItem.name,
        price: menuItem.price
      };
    });

    if (orderItems.length === 0) return;

    if (hasOrderedThisSession) {
      setShowOrderLimitWarning(true);
      setTimeout(() => {
        setShowOrderLimitWarning(false);
      }, 3000);
      return;
    }

    onPlaceOrder(orderItems);
    setCart({});
    showToast('🎉 Order placed successfully!');
    setActiveTab('history');
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleServiceClick = (type: 'Call Waiter' | 'Request Bill') => {
    if (type === 'Request Bill') {
      const tableOrders = orders.filter(o => o.tableId === tableId);
      if (tableOrders.length === 0) {
        showToast('⚠️ No orders placed yet.');
        return;
      }
      const hasUnserved = tableOrders.some(o => o.status !== 'Served' && o.status !== 'Cancelled');
      if (hasUnserved) {
        showToast('⚠️ Please wait until all your items are served before paying the bill.');
        return;
      }
      setShowPaymentModal(true);
      setPaymentMethod(null);
      setPaymentSuccess(false);
      return;
    }
    onCallWaiter(type);
    showToast('🔔 Waiter has been called');
  };

  const handlePayment = (method: 'UPI' | 'Cash') => {
    setPaymentMethod(method);
    if (method === 'Cash') {
      onCallWaiter('Cash Payment Collection');
      showToast('💵 Waiter notified to collect cash');
    } else {
      // Logic handled dynamically inside JSX below
    }
  };

  // Clear local state when table is checked out to prevent data leaks for the next customer
  useEffect(() => {
    if (!occupancy.occupied) {
      const resetAll = () => {
        setCart({});
        setShowPaymentModal(false);
        setPaymentMethod(null);
        setPaymentSuccess(false);
        setRazorpayLinkId(null);
        setActiveTab('menu');
        setMenuSearch('');
        setCustName('');
        setPhone('');
        sessionStorage.removeItem(`table_session_active_${tableId}`);
        setSessionActive(false);
        setChatMessages([
          {
            sender: 'bot',
            text: "Hello! I'm your food assistant. Ask me anything about our menu, or for a recommendation!"
          }
        ]);
      };
      resetAll();
    }
  }, [occupancy.occupied]);

  // Listen to live customer checked out events to show the checkout success screen
  useEffect(() => {
    const handleCheckedOutEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tableId === tableId) {
        if (sessionActive) {
          setShowCheckOutSuccess(true);
          const timer = setTimeout(() => {
            setShowCheckOutSuccess(false);
          }, 5000);
          return () => clearTimeout(timer);
        }
      }
    };

    window.addEventListener('CUSTOMER_CHECKED_OUT', handleCheckedOutEvent);
    return () => window.removeEventListener('CUSTOMER_CHECKED_OUT', handleCheckedOutEvent);
  }, [tableId, sessionActive]);

  const handleCheckOut = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      sessionStorage.removeItem(`table_session_active_${tableId}`);
      setSessionActive(false);
      onCheckOut();
    }
  };

  const activeRes = (reservations || []).find(res => {
    if (res.tableId !== tableId) return false;
    const resTime = new Date(res.dateTime).getTime();
    const now = Date.now();
    // 30 minutes before to 60 minutes after
    return now >= (resTime - 30 * 60 * 1000) && now <= (resTime + 60 * 60 * 1000);
  });

  const logCustomerLogin = (nameStr: string, phoneStr: string, success: boolean) => {
    fetch('/api/login/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: nameStr.trim(),
        phone: phoneStr.trim(),
        tableId: tableId,
        success
      })
    }).catch(err => console.error('Failed to log login:', err));
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    if (activeRes) {
      const isNameMatch = activeRes.customerName.toLowerCase() === custName.trim().toLowerCase();
      const isPhoneMatch = activeRes.phone.trim() === phone.trim();

      if (isNameMatch && isPhoneMatch) {
        onCheckIn(custName, activeRes.guestsCount, 'Customer', phone.trim());
        if (onRemoveReservation) {
          onRemoveReservation(activeRes.id);
        }
        sessionStorage.setItem(`table_session_active_${tableId}`, 'true');
        setSessionActive(true);
        showToast('👋 Welcome! Your reservation check-in is complete.');
        logCustomerLogin(custName, phone, true);
      } else {
        showToast('❌ This table is reserved. Only the registered customer can check in.');
        logCustomerLogin(custName, phone, false);
      }
      return;
    }

    if (occupancy.occupied) {
      if (occupancy.openedBy === 'Waiter') {
        // Customer is claiming a table that was opened by a waiter
        onCheckIn(custName, occupancy.guestsCount || 1, 'Customer', phone.trim());
        sessionStorage.setItem(`table_session_active_${tableId}`, 'true');
        setSessionActive(true);
        showToast('👋 Welcome! Your table is ready.');
        logCustomerLogin(custName, phone, true);
        return;
      }

      const isNameMatch = occupancy.customerName?.toLowerCase() === custName.trim().toLowerCase();
      const isPhoneMatch = (!occupancy.phone && !phone.trim()) || (occupancy.phone === phone.trim());

      if (isNameMatch && isPhoneMatch) {
        // Re-joining existing session
        sessionStorage.setItem(`table_session_active_${tableId}`, 'true');
        setSessionActive(true);
        showToast('👋 Welcome back to your table!');
        logCustomerLogin(custName, phone, true);
      } else {
        showToast('⚠️ Table is already occupied. Please use the exact Name and Phone you registered with, or ask a waiter.');
        logCustomerLogin(custName, phone, false);
      }
      return;
    }

    onCheckIn(custName, 1, 'Customer', phone.trim());

    // Track session in tab-specific storage
    sessionStorage.setItem(`table_session_active_${tableId}`, 'true');
    setSessionActive(true);
    showToast('👋 Welcome to Dash Hotel!');
    logCustomerLogin(custName, phone, true);
  };

  const tableOrders = orders.filter(o => o.tableId === tableId).sort((a, b) => b.timestamp - a.timestamp);
  const hasOrderedThisSession = tableId.startsWith('Room ') && tableOrders.some(
    o => o.customerName === occupancy.customerName && o.status !== 'Cancelled'
  );
  const activeTableRequest = requests.find(r => r.tableId === tableId && r.status === 'Pending');

  if (showCheckOutSuccess) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '1rem' }}>
        <div className="glass-panel glass-panel-login" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem', animation: 'pulse 2s infinite' }}>✅</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginBottom: '1rem' }}>Payment Done!</h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Your table has been successfully settled. Thank you for dining with Dash Hotel!</p>
        </div>
      </div>
    );
  }

  // Welcome check-in screen if not logged in (and not in waiter mode)
  if ((!occupancy.occupied || !sessionActive) && !isWaiterMode) {
    return (
      <>
        {notification && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--accent)',
            color: '#fff',
            padding: '1rem 2rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            animation: 'slideDown 0.3s ease-out'
          }}>
            {notification.includes('❌') ? <Info size={18} color="#ef4444" /> : <Info size={18} color="var(--accent)" />}
            {notification}
          </div>
        )}
        <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '1rem' }}>
          <form onSubmit={handleLoginSubmit} className="glass-panel glass-panel-login" style={{ border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span style={{ fontSize: '3rem' }}>🛎️</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-secondary)', marginTop: '1rem', fontFamily: "'Outfit', sans-serif" }}>
                Welcome to Dash Hotel
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>{tableId.startsWith('Room ') ? `Dining in ${tableId}` : `Dining at Table ${tableId}`} - Please check in to unlock the menu</p>
            </div>

            {activeRes && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                textAlign: 'center',
                marginBottom: '1.5rem',
                fontWeight: 600
              }}>
                ⚠️ This table is reserved. Only the customer with the registered reservation (Name & Phone) can check in.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              {/* Name Input */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Name
                </label>
                <div className="input-field-wrapper">
                  <User size={16} color="var(--accent-secondary)" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                  />
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Phone Number
                </label>
                <div className="input-field-wrapper">
                  <Users size={16} color="var(--accent-secondary)" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 (555) 019-2834"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem', fontStyle: 'italic', paddingLeft: '0.2rem' }}>
                  * Must include country code prefix (e.g., +91 for India, +1 for US) to receive text.
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="btn-constructivist-primary"
              style={{
                width: '100%',
                padding: '0.9rem',
                fontSize: '1rem'
              }}
            >
              CHECK IN & ORDER
            </button>
          </form>
        </div>
      </>
    );
  }
  return (
    <>
      {showOrderLimitWarning && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.96)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</span>
          <h2 style={{ color: '#0f172a', fontWeight: 800, marginBottom: '1rem' }}>Order Already Placed!</h2>
          <p style={{ color: '#475569', maxWidth: '400px', marginBottom: '2rem', lineHeight: '1.6' }}>
            In room service, you can only place one order per session. Your order has been sent to the kitchen. To place another order, please ask the front desk or wait for the waiter to settle the bill.
          </p>
        </div>
      )}
      <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem', paddingBottom: '5rem' }}>
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
            <Info size={18} color="var(--accent-secondary)" />
            {notification}
          </div>
        )}



        {/* Header Bar */}
        <header className="glass-panel customer-header">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tableId.startsWith('Room ') ? tableId : `Table ${tableId}`}</h1>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>LuxeBite Digital Menu</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!isWaiterMode && (
              <>
                <button
                  onClick={() => handleServiceClick('Call Waiter')}
                  disabled={activeTableRequest?.type === 'Call Waiter'}
                  style={{
                    background: activeTableRequest?.type === 'Call Waiter' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 158, 11, 0.1)',
                    color: activeTableRequest?.type === 'Call Waiter' ? '#64748b' : 'var(--status-pending)',
                    border: `1px solid ${activeTableRequest?.type === 'Call Waiter' ? 'rgba(255,255,255,0.05)' : 'rgba(245, 158, 11, 0.3)'}`,
                    padding: isMobile ? '0.4rem 0.8rem' : '0.6rem 1.2rem',
                    borderRadius: '10px',
                    cursor: activeTableRequest?.type === 'Call Waiter' ? 'default' : 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    fontSize: isMobile ? '0.75rem' : '0.85rem'
                  }}
                >
                  <Bell size={16} />
                  {activeTableRequest?.type === 'Call Waiter' ? 'Waiter Called' : 'Call Waiter'}
                </button>

                {!isMobile && !tableId.startsWith('Room ') && (
                  <button
                    onClick={() => handleServiceClick('Request Bill')}
                    disabled={activeTableRequest?.type === 'Request Bill'}
                    style={{
                      background: activeTableRequest?.type === 'Request Bill' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(16, 185, 129, 0.1)',
                      color: activeTableRequest?.type === 'Request Bill' ? '#64748b' : 'var(--status-ready)',
                      border: `1px solid ${activeTableRequest?.type === 'Request Bill' ? 'rgba(255,255,255,0.05)' : 'rgba(16, 185, 129, 0.3)'}`,
                      padding: '0.6rem 1.2rem',
                      borderRadius: '10px',
                      cursor: activeTableRequest?.type === 'Request Bill' ? 'default' : 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Send size={16} />
                    {activeTableRequest?.type === 'Request Bill' ? 'Bill Requested' : 'Get Bill'}
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {/* Occupancy Indicator Panel */}
        <div className="glass-panel occupancy-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--status-ready)', borderRadius: '50%', display: 'inline-block' }}></span>
            <span>Welcome to <strong>Dash Hotel</strong> | Checked In: <strong>{occupancy.customerName}</strong></span>
          </div>
          {!isWaiterMode && (
            <button
              onClick={handleCheckOut}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.8rem'
              }}
            >
              <LogOut size={14} /> Check Out
            </button>
          )}
        </div>

        {/* Nav Tabs */}
        {!isMobile && (
          <div className="nav-tabs-container">
            <button
              onClick={() => setActiveTab('menu')}
              style={{
                background: activeTab === 'menu' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'menu' ? '#ffffff' : '#64748b',
                border: `1px solid ${activeTab === 'menu' ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.15s ease-in-out'
              }}
            >
              🍴 Browse Menu
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                background: activeTab === 'history' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'history' ? '#ffffff' : '#64748b',
                border: `1px solid ${activeTab === 'history' ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              <ClipboardList size={18} />
              Your Orders ({tableOrders.length})
            </button>
            <button
              onClick={() => setIsChatbotOpen(prev => !prev)}
              style={{
                background: isChatbotOpen ? 'var(--accent-primary)' : 'transparent',
                color: isChatbotOpen ? '#ffffff' : '#64748b',
                border: `1px solid ${isChatbotOpen ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              <Bot size={18} /> AI Assistant
            </button>
          </div>
        )}

        {activeTab === 'menu' ? (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Cart Panel */}
            {!isMobile && (
              <div className="glass-panel" style={{ flex: '1 1 320px', padding: '1.5rem', height: 'fit-content', border: '1px solid var(--border-glass)' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)' }}>
                  <ShoppingCart size={20} color="var(--accent-primary)" /> Your Cart
                </h2>

                {getCartItemCount() === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
                    <ShoppingCart size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>Your cart is empty. Add some delicious dishes!</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1.5rem' }}>
                      {Object.entries(cart).map(([itemId, data]) => {
                        const item = MENU_ITEMS.find(m => m.id === itemId)!;
                        return (
                          <div key={itemId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <img
                              src={item.image}
                              alt={item.name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                              }}
                              style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name} <span style={{ color: 'var(--accent-primary)' }}>x{data.quantity}</span></span>
                                <span style={{ fontWeight: 600, color: '#f8fafc' }}>₹{(item.price * data.quantity).toFixed(2)}</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Add special instructions..."
                                value={data.notes}
                                onChange={(e) => updateCartNotes(itemId, e.target.value)}
                                style={{
                                  width: '100%',
                                  background: 'rgba(0,0,0,0.2)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.5rem',
                                  color: '#e2e8f0',
                                  fontSize: '0.75rem',
                                  marginTop: '0.15rem',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                        <span>Items Total:</span>
                        <span>{getCartItemCount()} items</span>
                      </div>
                      {(() => {
                        const nutr = getCartNutrition();
                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                              <span>Total Calories:</span>
                              <span style={{ color: '#e2e8f0', fontWeight: 550 }}>🔥 {nutr.calories} kcal</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                              <span>Total Protein:</span>
                              <span style={{ color: '#10b981', fontWeight: 650 }}>💪 {nutr.protein}g</span>
                            </div>
                          </>
                        );
                      })()}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                        <span>Total Amount:</span>
                        <span style={{ color: 'var(--accent-secondary)' }}>₹{getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="btn-constructivist-primary"
                      style={{
                        width: '100%',
                        padding: '0.9rem',
                        fontSize: '1rem'
                      }}
                    >
                      CONFIRM & PLACE ORDER
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Menu area */}
            <div style={{ flex: '1 1 auto', minWidth: '0px', width: '100%' }}>
              {/* Category Filters */}
              <div className="category-scroll-container" style={{ marginBottom: '1rem' }}>
                {['All', 'Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages', 'Breakfast & Bakery', 'Sandwiches & Salads'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="category-btn"
                    style={{
                      background: selectedCategory === cat ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      border: '1px solid',
                      borderColor: selectedCategory === cat ? 'var(--accent-secondary)' : 'rgba(0,0,0,0.1)',
                      color: selectedCategory === cat ? 'var(--accent-primary)' : '#334155',
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>



              {/* Menu Search Bar */}
              <div className="input-field-wrapper" style={{ marginBottom: '1.5rem', maxWidth: '350px' }}>
                <Search size={18} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search coffee, bakery..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                />
              </div>

              {/* Menu Items Grid */}
              <div className="menu-items-grid">
                {filteredMenu.map((item) => {
                  const cartItem = cart[item.id];
                  return (
                    <div key={item.id} className="glass-panel" style={{ padding: isMobile ? '0.4rem' : '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                      <div>
                        <div style={{ position: 'relative', width: '100%', height: isMobile ? '65px' : '150px', borderRadius: isMobile ? '6px' : '12px', overflow: 'hidden', marginBottom: isMobile ? '0.5rem' : '1rem' }}>
                          <img
                            src={item.image}
                            alt={item.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', cursor: 'pointer' }}
                            className="menu-item-image"
                            onClick={() => setSelectedItemDetails(item)}
                          />
                          {!isMobile && (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '0.25rem', zIndex: 2 }}>
                              {item.vegetarian && <span title="Vegetarian" style={{ color: 'var(--status-ready)', background: 'rgba(11, 15, 25, 0.85)', padding: '0.35rem', borderRadius: '6px', display: 'inline-flex', border: '1px solid rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(4px)' }}><Leaf size={14} /></span>}
                              {item.spicy && <span title="Spicy" style={{ color: 'var(--status-cancelled)', background: 'rgba(11, 15, 25, 0.85)', padding: '0.35rem', borderRadius: '6px', display: 'inline-flex', border: '1px solid rgba(239, 68, 68, 0.4)', backdropFilter: 'blur(4px)' }}><Flame size={14} /></span>}
                            </div>
                          )}
                        </div>
                        <h3 style={{ fontSize: isMobile ? '0.75rem' : '1.1rem', fontWeight: 650, color: '#fff', marginBottom: '0.25rem', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</h3>
                        
                        {!isMobile && (
                          <>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem', minHeight: '40px' }}>{item.description}</p>
                            {/* Calories & Protein badges */}
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '0.65rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                color: '#cbd5e1',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}>
                                🔥 {item.calories || 0} kcal
                              </span>
                              <span style={{
                                fontSize: '0.65rem',
                                background: item.isProteinRich ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${item.isProteinRich ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}`,
                                color: item.isProteinRich ? '#10b981' : '#cbd5e1',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontWeight: item.isProteinRich ? 700 : 500
                              }}>
                                💪 {item.protein || 0}g protein
                              </span>
                              {item.isJunk && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  background: 'rgba(245,158,11,0.06)',
                                  border: '1px solid rgba(245,158,11,0.15)',
                                  color: '#f59e0b',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  fontWeight: 600
                                }}>
                                  🍩 Cheat Meal
                                </span>
                              )}
                            </div>
                            {item.ingredients && item.ingredients.length > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', lineHeight: '1.3' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Ingredients:</span> {item.ingredients.join(', ')}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginTop: '0.5rem', gap: isMobile ? '0.3rem' : '0' }}>
                        <span style={{ fontSize: isMobile ? '0.75rem' : '1.15rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>₹{item.price.toFixed(0)}</span>

                        {cartItem ? (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: isMobile ? '0.25rem' : '0.75rem', 
                            background: 'rgba(255,255,255,0.05)', 
                            padding: isMobile ? '0.15rem 0.35rem' : '0.25rem 0.5rem', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(255,255,255,0.08)' 
                          }}>
                            <button
                              onClick={() => updateCartQuantity(item.id, -1)}
                              style={{ background: 'none', border: 'none', color: '#fff', fontSize: isMobile ? '0.9rem' : '1.2rem', cursor: 'pointer', width: isMobile ? '16px' : '24px', height: isMobile ? '16px' : '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >-</button>
                            <span style={{ minWidth: isMobile ? '12px' : '16px', textAlign: 'center', fontWeight: 600, fontSize: isMobile ? '0.75rem' : '1rem' }}>{cartItem.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, 1)}
                              style={{ background: 'none', border: 'none', color: '#fff', fontSize: isMobile ? '0.9rem' : '1.2rem', cursor: 'pointer', width: isMobile ? '16px' : '24px', height: isMobile ? '16px' : '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="btn-constructivist-primary"
                            style={{
                              padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem',
                              fontSize: isMobile ? '0.7rem' : '0.85rem',
                              width: isMobile ? '100%' : 'auto'
                            }}
                          >
                            {isMobile ? '+ Add' : 'ADD TO CART'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          /* Order History View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {tableOrders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <ClipboardList size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <p>No orders placed yet from this table in this session.</p>
              </div>
            ) : (
              tableOrders.map((order) => (
                <div key={order.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid var(--status-${order.status.toLowerCase()})` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#fff' }}>Order #{order.id.slice(-4).toUpperCase()}</span>
                      <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.75rem' }}>
                        {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span style={{
                      background: `var(--status-${order.status.toLowerCase()})`,
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      textTransform: 'uppercase'
                    }}>
                      {order.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>
                          <strong style={{ color: 'var(--accent-secondary)' }}>{item.quantity}x</strong> {item.name}
                          {item.notes && <span style={{ color: 'var(--status-pending)', fontSize: '0.75rem', display: 'block', fontStyle: 'italic' }}>Note: {item.notes}</span>}
                        </span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Total paid/to-pay:</span>
                    <span style={{ color: '#fff' }}>₹{order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* activeTab === 'checkout' view */
          <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: '#1e293b' }}>
              💳 {tableId.startsWith('Room ') ? 'Room' : 'Table'} Settlement & Bill Checkout
            </h2>

            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Amount Due</span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
                ₹{tableOrders.reduce((sum, order) => sum + (order.status !== 'Cancelled' ? order.totalAmount : 0), 0).toFixed(2)}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Includes all served and active orders for {tableId.startsWith('Room ') ? tableId : `Table ${tableId}`}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>EMAIL RECEIPT (OPTIONAL)</label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={billEmail}
                onChange={e => setBillEmail(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#1e293b', outline: 'none' }}
              />
            </div>

            {paymentSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <h3 style={{ color: '#10b981', fontSize: '1.1rem', marginTop: '0.5rem' }}>Payment Done!</h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>Please wait for the Waiter to check out your table.</p>
              </div>
            ) : paymentMethod === 'UPI' ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontSize: '2rem' }}>⚠️</span>
                <h3 style={{ color: '#ef4444', fontSize: '1.1rem', marginTop: '0.5rem' }}>UPI Payment Temporarily Offline</h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 1rem 0' }}>Please settle with Cash or call waiter.</p>
                <button onClick={() => setPaymentMethod(null)} className="btn-constructivist-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Change Method</button>
              </div>
            ) : paymentMethod === 'Cash' ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <h3 style={{ color: '#f59e0b', fontSize: '1.1rem', margin: 0 }}>💵 Cash Settle Requested</h3>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>A waiter has been dispatched to {tableId.startsWith('Room ') ? tableId : `Table ${tableId}`} to collect cash.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className="btn-constructivist-secondary"
                    style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <span>📱</span>
                    <span>Pay with UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayment('Cash')}
                    className="btn-constructivist-secondary"
                    style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <span>💵</span>
                    <span>Pay with Cash</span>
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    onCallWaiter('Call Waiter');
                    showToast('🔔 Waiter has been called to your table');
                  }}
                  className="btn-constructivist-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
                >
                  🛎️ CALL WAITER
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '450px', position: 'relative' }}>
            <button
              onClick={() => setShowPaymentModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center', color: '#0f172a' }}>Generate Bill</h2>

            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569' }}>Total Amount Due</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
                ₹{tableOrders.reduce((sum, order) => sum + (order.status !== 'Cancelled' ? order.totalAmount : 0), 0).toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Email for PDF Bill (Optional)</label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={billEmail}
                onChange={e => setBillEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', color: '#0f172a', outline: 'none' }}
              />
            </div>

            {paymentSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ color: '#10b981', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Payment Successful!</h3>
                <p style={{ color: '#475569', fontSize: '0.9rem' }}>Please wait for the Waiter to confirm and check out your table.</p>
              </div>
            ) : paymentMethod === 'UPI' ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <h3 style={{ color: '#ef4444', fontSize: '1.25rem', marginBottom: '0.5rem' }}>UPI Payment Not Available</h3>
                <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1rem' }}>Coming soon. Please use Cash or call waiter for assistance.</p>
                <button onClick={() => setPaymentMethod(null)} style={{ background: '#000', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Back</button>
              </div>
            ) : paymentMethod === 'Cash' ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                <h3 style={{ color: '#0f172a', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Waiter Notified</h3>
                <p style={{ color: '#475569', fontSize: '0.9rem' }}>Please wait for the Waiter to collect cash and settle your table.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  onClick={() => setPaymentMethod('UPI')}
                  style={{ background: '#000', color: '#fff', border: '1px solid #000', padding: '1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', fontFamily: "'Outfit', sans-serif" }}
                >
                  <span style={{ fontSize: '1.5rem' }}>📱</span>
                  PAY WITH UPI
                </button>
                <button
                  onClick={() => handlePayment('Cash')}
                  style={{ background: '#000', color: '#fff', border: '1px solid #000', padding: '1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', fontFamily: "'Outfit', sans-serif" }}
                >
                  <span style={{ fontSize: '1.5rem' }}>💵</span>
                  PAY WITH CASH
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Floating Cart Banner */}
      {isMobile && getCartItemCount() > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '72px',
          left: '16px',
          right: '16px',
          background: 'var(--accent-primary)',
          color: '#fff',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
          cursor: 'pointer',
          zIndex: 100
        }}
        onClick={() => setShowMobileCart(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
            <ShoppingCart size={20} color="#fff" />
            <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{getCartItemCount()} {getCartItemCount() === 1 ? 'item' : 'items'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
            <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>₹{getCartTotal().toFixed(2)}</span>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>View Cart →</span>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid var(--border-glass)',
          padding: '0.65rem 0.5rem',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 150,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.2rem',
              color: activeTab === 'menu' ? 'var(--accent-primary)' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'menu' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🍴</span>
            Menu
          </button>

          <button
            type="button"
            onClick={() => setShowMobileCart(true)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.2rem',
              color: getCartItemCount() > 0 ? 'var(--accent-primary)' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🛒</span>
            Cart
            {getCartItemCount() > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-6px',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                {getCartItemCount()}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.2rem',
              color: activeTab === 'history' ? 'var(--accent-primary)' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'history' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>📋</span>
            Orders
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checkout')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.2rem',
              color: activeTab === 'checkout' ? 'var(--accent-primary)' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: activeTab === 'checkout' ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>💳</span>
            Checkout
          </button>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet Modal */}
      {isMobile && showMobileCart && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}
        onClick={() => setShowMobileCart(false)}
        >
          <div style={{
            background: 'var(--bg-glass)',
            width: '100%',
            maxHeight: '85vh',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '1.5rem',
            overflowY: 'auto',
            borderTop: '1px solid var(--border-glass)',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', margin: '0 auto 1.25rem auto' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)' }}>
                <ShoppingCart size={20} color="var(--accent-primary)" /> Your Cart
              </h2>
              <button 
                onClick={() => setShowMobileCart(false)} 
                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>

            {getCartItemCount() === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                <ShoppingCart size={50} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>Your cart is empty.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {Object.entries(cart).map(([itemId, data]) => {
                    const item = MENU_ITEMS.find(m => m.id === itemId)!;
                    return (
                      <div key={itemId} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                          }}
                          style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name}</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>₹{(item.price * data.quantity).toFixed(2)}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                            {/* Quantity Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.04)', padding: '0.15rem 0.4rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.08)' }}>
                              <button
                                onClick={() => updateCartQuantity(itemId, -1)}
                                style={{ background: 'none', border: 'none', color: '#000', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{data.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(itemId, 1)}
                                style={{ background: 'none', border: 'none', color: '#000', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                +
                              </button>
                            </div>

                            <input
                              type="text"
                              placeholder="Instructions..."
                              value={data.notes}
                              onChange={(e) => updateCartNotes(itemId, e.target.value)}
                              style={{
                                width: '60%',
                                background: '#fff',
                                border: '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '6px',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Nutrition Summaries */}
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
                  {(() => {
                    const nutr = getCartNutrition();
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#475569' }}>
                          <span>Total Calories:</span>
                          <span style={{ color: '#1e293b', fontWeight: 600 }}>🔥 {nutr.calories} kcal</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                          <span>Total Protein:</span>
                          <span style={{ color: '#065f46', fontWeight: 700 }}>💪 {nutr.protein}g</span>
                        </div>
                      </>
                    );
                  })()}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                    <span>Total Amount:</span>
                    <span style={{ color: 'var(--accent-primary)' }}>₹{getCartTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    handleCheckout();
                    setShowMobileCart(false);
                  }}
                  className="btn-constructivist-primary"
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    fontSize: '1rem',
                    borderRadius: '12px'
                  }}
                >
                  CONFIRM & PLACE ORDER
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {selectedItemDetails && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? '0' : '1.5rem'
        }}
        onClick={() => setSelectedItemDetails(null)}
        >
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: isMobile ? '100%' : '500px',
            maxHeight: '90vh',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            borderBottomLeftRadius: isMobile ? '0' : '24px',
            borderBottomRightRadius: isMobile ? '0' : '24px',
            padding: '1.75rem',
            overflowY: 'auto',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            animation: isMobile ? 'slideUp 0.3s ease-out' : 'fadeIn 0.2s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {isMobile && <div style={{ width: '45px', height: '5px', background: 'rgba(0,0,0,0.1)', borderRadius: '2.5px', margin: '0 auto' }} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                  {selectedItemDetails.category}
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem', marginBottom: 0 }}>{selectedItemDetails.name}</h2>
              </div>
              <button 
                onClick={() => setSelectedItemDetails(null)}
                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: '#0f172a', fontSize: '1.25rem', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
            </div>

            <img 
              src={selectedItemDetails.image} 
              alt={selectedItemDetails.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
              }}
              style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)' }} 
            />

            {selectedItemDetails.description && (
              <div>
                <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>Description</h4>
                <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: 0, lineHeight: '1.4' }}>{selectedItemDetails.description}</p>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>🥣 Key Ingredients</h4>
              <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: 0, lineHeight: '1.4' }}>
                {selectedItemDetails.ingredients && selectedItemDetails.ingredients.length > 0 
                  ? selectedItemDetails.ingredients.join(', ') 
                  : 'Fresh local ingredients, hand-selected spices, and kitchen-fresh herbs.'}
              </p>
            </div>

            <div style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.12)', padding: '1rem', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.75rem', color: '#0891b2', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                🌱 Health & Nutritional Advantages
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#1e293b', margin: 0, lineHeight: '1.4' }}>
                {getFoodAdvantages(selectedItemDetails)}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {selectedItemDetails.calories && <span style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', color: '#475569', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>🔥 {selectedItemDetails.calories} kcal</span>}
              {selectedItemDetails.protein && <span style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#047857', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>💪 {selectedItemDetails.protein}g protein</span>}
              {selectedItemDetails.vegetarian && <span style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#047857', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>🥬 Vegetarian</span>}
              {selectedItemDetails.spicy && <span style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#b91c1c', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>🌶️ Spicy</span>}
            </div>
          </div>
        </div>
      )}

      {/* Floating Chatbot Widget and Toggle Button */}
      {!isWaiterMode && (
        <>
          {/* Chatbot Popover Panel */}
          {isChatbotOpen && (
            <div 
              style={{
                position: 'fixed',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.3s ease-in-out',
                ...(isMobile ? {
                  top: '12px', // Start near the top of viewport to eliminate upper gap
                  bottom: '72px', // Sitting just above the bottom nav bar
                  left: '12px',
                  right: '12px',
                  borderRadius: '16px',
                  overflow: 'hidden'
                } : {
                  bottom: '96px',
                  right: '24px',
                  width: '380px',
                  height: '600px',
                  borderRadius: '16px',
                  overflow: 'hidden'
                })
              }}
            >
              <Chatbot
                menuItems={MENU_ITEMS}
                orders={orders}
                isMobile={isMobile}
                messages={chatMessages}
                setMessages={setChatMessages}
                onPlaceOrder={(items) => {
                  onPlaceOrder(items);
                  showToast('🎉 Order placed successfully!');
                }}
              />
            </div>
          )}

          {/* Floating Circle Toggle Button */}
          <button
            onClick={() => setIsChatbotOpen(prev => !prev)}
            style={{
              position: 'fixed',
              background: '#f43f5e', // Pink/red matching screenshots
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(244, 63, 94, 0.4)',
              zIndex: 1000,
              transition: 'transform 0.2s ease, background-color 0.2s ease',
              ...(isMobile ? {
                bottom: '80px',
                right: '20px',
                width: '56px',
                height: '56px'
              } : {
                bottom: '24px',
                right: '24px',
                width: '60px',
                height: '60px'
              })
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = '#e11d48';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#f43f5e';
            }}
          >
            {isChatbotOpen ? (
              <ChevronDown size={28} color="#ffffff" />
            ) : (
              <MessageCircle size={28} color="#ffffff" />
            )}
          </button>
        </>
      )}
    </>
  );
};

const getFoodAdvantages = (item: MenuItem): string => {
  const name = item.name.toLowerCase();
  
  if (name.includes('avocado')) {
    return '🥑 Rich in heart-healthy monounsaturated fats, dietary fiber, and loaded with potassium and essential vitamins (C, E, K, B6). Boosts skin glow and supports overall heart function.';
  }
  if (name.includes('salad') || name.includes('greek') || name.includes('caesar')) {
    return '🥗 Exceptionally high in dietary fiber, raw vitamins, and antioxidants. Aids digestion, supports weight management, and strengthens natural immunity.';
  }
  if (name.includes('protein') || item.isProteinRich) {
    return '💪 High-quality lean protein source. Crucial for muscle repair, tissue growth, keeping you full longer, and stabilizing blood sugar levels.';
  }
  if (name.includes('croissant') || name.includes('muffin') || name.includes('roll')) {
    return '🥐 High energy density. Quick carbohydrates that supply instantaneous energy for brain function and muscle work, perfect for a morning boost.';
  }
  if (name.includes('matcha') || name.includes('green tea')) {
    return '🍵 Packed with L-theanine and powerful EGCG catechins. Enhances focus and calmness, speeds up metabolism, and guards against cellular damage.';
  }
  if (name.includes('espresso') || name.includes('coffee') || name.includes('latte') || name.includes('americano')) {
    return '⚡ High caffeine content. Boosts cognitive focus, improves reaction times, increases metabolic rate for fat-burning, and provides rich antioxidants.';
  }
  
  switch (item.category) {
    case 'Coffee & Espresso':
      return '⚡ Enhances focus, increases alertness, boosts physical activity endurance, and contains essential antioxidants that reduce oxidative stress.';
    case 'Teas & Infusions':
      return '🍃 Promotes relaxation, supports gut health, is naturally hydrating, and helps fight inflammation with rich polyphenols.';
    case 'Cold Beverages':
      return '💧 Instantly rehydrates, replenishes essential electrolytes, and provides a quick, cooling nutrient boost to keep you refreshed.';
    case 'Breakfast & Bakery':
      return '🌾 Provides fast-releasing carbohydrates to fuel early morning physical tasks and brain activity.';
    case 'Sandwiches & Salads':
      return '🥦 High nutritional yield. Delivers balanced macronutrients, dietary fiber, essential vitamins, and supports digestive health.';
    default:
      return '🥗 Provides balanced energy, clean nutrients, and satisfies appetite while maintaining steady cellular vitality.';
  }
};
