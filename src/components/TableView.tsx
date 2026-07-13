import React, { useState, useEffect } from 'react';
import { useMenu } from '../data/menu';
import type { Order, OrderItem, ServiceRequest, TableOccupancy } from '../types';
import { ShoppingCart, Send, Bell, ClipboardList, Info, Flame, Leaf, User, Users, LogOut, Search } from 'lucide-react';

interface TableViewProps {
  tableId: string;
  occupancy: TableOccupancy;
  orders: Order[];
  requests: ServiceRequest[];
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
  onCheckIn,
  onCheckOut,
  onPlaceOrder,
  onCallWaiter,
  isWaiterMode = false,
}) => {
  const MENU_ITEMS = useMenu();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<{ [itemId: string]: { quantity: number; notes: string } }>({});
  const [activeTab, setActiveTab] = useState<'menu' | 'history'>('menu');
  const [notification, setNotification] = useState<string | null>(null);
  const [smsNotification, setSmsNotification] = useState<string | null>(null);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [billEmail, setBillEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | null>(null);
  const [razorpayLink, setRazorpayLink] = useState<string | null>(null);
  const [razorpayLinkId, setRazorpayLinkId] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [paymentLinkError, setPaymentLinkError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showCheckOutSuccess, setShowCheckOutSuccess] = useState(false);
  const [sessionActive, setSessionActive] = useState<boolean>(() => !!sessionStorage.getItem(`table_session_active_${tableId}`));

  // Auto-verify payment when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && razorpayLinkId && !paymentSuccess) {
        setIsGeneratingLink(true);
        try {
          const res = await fetch(`/api/check-payment-status?id=${razorpayLinkId}`);
          const data = await res.json();
          if (res.ok && data.status === 'paid') {
            setPaymentSuccess(true);
            setPaymentLinkError(null);
            onCallWaiter('UPI Payment Completed');
          } else if (res.ok) {
            setPaymentLinkError('Payment Failed or Not Completed.');
          }
        } catch (err) {
          // ignore
        } finally {
          setIsGeneratingLink(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        setRazorpayLink(null);
        setRazorpayLinkId(null);
        setPaymentSuccess(false);
        setShowCheckOutSuccess(false);
        setPaymentLinkError(null);
        
        sessionStorage.removeItem(`table_session_active_${tableId}`);
        setSessionActive(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentSuccess, onCheckOut, tableId]);

  // Reset local states when table occupancy changes to unoccupied
  useEffect(() => {
    if (!occupancy.occupied) {
      setCart({});
      setRazorpayLink(null);
      setRazorpayLinkId(null);
      setPaymentSuccess(false);
      setShowCheckOutSuccess(false);
      setPaymentLinkError(null);
      sessionStorage.removeItem(`table_session_active_${tableId}`);
      setSessionActive(false);
    }
  }, [occupancy.occupied, tableId]);

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

  // If the table is globally checked out, clear our local session
  useEffect(() => {
    if (!occupancy.occupied) {
      setSessionActive(false);
    }
  }, [occupancy.occupied]);

  // Clear local state when table is checked out to prevent data leaks for the next customer
  useEffect(() => {
    if (!occupancy.occupied) {
      if (paymentMethod) {
        setShowCheckOutSuccess(true);
        setTimeout(() => {
          setShowCheckOutSuccess(false);
          setCart({});
          setShowPaymentModal(false);
          setPaymentMethod(null);
          setPaymentSuccess(false);
          setActiveTab('menu');
          setMenuSearch('');
          setCustName('');
          setPhone('');
        }, 3500);
      } else {
        setCart({});
        setShowPaymentModal(false);
        setPaymentMethod(null);
        setPaymentSuccess(false);
        setActiveTab('menu');
        setMenuSearch('');
        setCustName('');
        setPhone('');
      }
    }
  }, [occupancy.occupied]);

  const handleCheckOut = () => {
    sessionStorage.removeItem(`table_session_active_${tableId}`);
    setSessionActive(false);
    onCheckOut();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    if (occupancy.occupied) {
      if (occupancy.openedBy === 'Waiter') {
        // Customer is claiming a table that was opened by a waiter
        onCheckIn(custName, occupancy.guestsCount || 1, 'Customer', phone.trim());
        sessionStorage.setItem(`table_session_active_${tableId}`, 'true');
        setSessionActive(true);
        showToast('👋 Welcome! Your table is ready.');
        return;
      }

      const isNameMatch = occupancy.customerName?.toLowerCase() === custName.trim().toLowerCase();
      const isPhoneMatch = (!occupancy.phone && !phone.trim()) || (occupancy.phone === phone.trim());

      if (isNameMatch && isPhoneMatch) {
        // Re-joining existing session
        sessionStorage.setItem(`table_session_active_${tableId}`, 'true');
        setSessionActive(true);
        showToast('👋 Welcome back to your table!');
      } else {
        showToast('⚠️ Table is already occupied. Please use the exact Name and Phone you registered with, or ask a waiter.');
      }
      return;
    }

    onCheckIn(custName, 1, 'Customer', phone.trim());
    
    // Track session in tab-specific storage
    sessionStorage.setItem(`table_session_active_${tableId}`, 'true');
    setSessionActive(true);
    
    const targetNumber = phone.trim();
    
    if (targetNumber) {
      const cleanPhone = targetNumber.replace(/[^0-9]/g, '');
      const hotelNum = localStorage.getItem('whatsapp_number') || '9686652201';
      const cleanHotelNum = hotelNum.replace(/[^0-9]/g, '');
      const messageBody = `👋 Welcome to Dash Hotel! Your digital dining session at Table ${tableId} is now active. Enjoy your meal!`;
      
      const instanceId = localStorage.getItem('whatsapp_instance') || 'instance_demo';
      const token = localStorage.getItem('whatsapp_token') || 'token_demo';

      // Dispatch WhatsApp message directly in the background (no window redirect)
      fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: token,
          to: cleanPhone,
          body: messageBody,
          priority: '10'
        })
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw new Error(errData.message || errData.error || `HTTP Status ${res.status}`);
          }).catch(() => {
            throw new Error(`HTTP Status ${res.status}`);
          });
        }
        return res.json();
      })
      .then(data => {
        if (data.sent === 'true' || data.success || data.id) {
          showToast('💬 WhatsApp greeting sent directly!');
          setSmsNotification(`✉️ [WhatsApp API Direct]: Welcome message sent successfully from Hotline (+${cleanHotelNum}) to ${targetNumber}.`);
        } else {
          throw new Error(data.error || 'Gateway accepted request but did not send');
        }
      })
      .catch(err => {
        console.warn('Background WhatsApp API dispatch encountered error:', err);
        setSmsNotification(`welcome to hotel`);
      });
    } else {
      // Simulate sending message to the entered phone number
      const mockNumber = phone.trim() || `+1 (555) 019-${1000 + Math.floor(Math.random() * 9000)}`;
      setSmsNotification(`✉️ [Simulated SMS to ${mockNumber}]: Hello ${custName}, welcome to Dash Hotel! Your dining session at Table ${tableId} is active.`);
    }

    setTimeout(() => setSmsNotification(null), 8500);
    showToast('👋 Welcome to Dash Hotel!');
  };

  const tableOrders = orders.filter(o => o.tableId === tableId).sort((a, b) => b.timestamp - a.timestamp);
  const activeTableRequest = requests.find(r => r.tableId === tableId && r.status === 'Pending');

  if (showCheckOutSuccess) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '1rem' }}>
        <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '420px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)' }}>
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
            color: 'var(--text)',
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
        <form onSubmit={handleLoginSubmit} className="glass-panel" style={{ padding: '2.5rem', width: '100%', maxWidth: '420px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>🛎️</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '1rem', background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome to Dash Hotel
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>Dining at Table {tableId} - Please check in to unlock the menu</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
            {/* Name Input */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Name
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <User size={16} color="var(--accent-secondary)" />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>

            {/* Phone Number Input */}
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Phone Number
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '10px' }}>
                <Users size={16} color="var(--accent-secondary)" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '0.4rem', fontStyle: 'italic', paddingLeft: '0.2rem' }}>
                * Must include country code prefix (e.g., +91 for India, +1 for US) to receive text.
              </span>
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%)',
              color: '#fff',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            Check In & Order
          </button>
        </form>
      </div>
      </>
    );
  }

  return (
    <>
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

      {smsNotification && (
        <div style={{
          position: 'fixed',
          top: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid var(--accent-secondary)',
          color: '#cbd5e1',
          padding: '1rem 2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 500,
          fontSize: '0.85rem',
          animation: 'fadeIn 0.2s ease-out',
          maxWidth: '90%'
        }}>
          <Info size={18} color="var(--accent-secondary)" />
          {smsNotification}
        </div>
      )}

      {/* Header Bar */}
      <header className="glass-panel customer-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Table {tableId}</h1>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>LuxeBite Digital Menu</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!isWaiterMode && (
            <>
              <button
                onClick={() => handleServiceClick('Call Waiter')}
                disabled={activeTableRequest?.type === 'Call Waiter'}
                style={{
                  background: activeTableRequest?.type === 'Call Waiter' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 158, 11, 0.1)',
                  color: activeTableRequest?.type === 'Call Waiter' ? '#64748b' : 'var(--status-pending)',
                  border: `1px solid ${activeTableRequest?.type === 'Call Waiter' ? 'rgba(255,255,255,0.05)' : 'rgba(245, 158, 11, 0.3)'}`,
                  padding: '0.6rem 1.2rem',
                  borderRadius: '10px',
                  cursor: activeTableRequest?.type === 'Call Waiter' ? 'default' : 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <Bell size={16} />
                {activeTableRequest?.type === 'Call Waiter' ? 'Waiter Called' : 'Call Waiter'}
              </button>
              
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
            </>
          )}
        </div>
      </header>

      {/* Occupancy Indicator Panel */}
      <div className="glass-panel occupancy-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0' }}>
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
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('menu')}
          style={{
            background: activeTab === 'menu' ? 'var(--accent-primary-glow)' : 'transparent',
            color: activeTab === 'menu' ? '#fff' : '#94a3b8',
            border: `1px solid ${activeTab === 'menu' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)'}`,
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          🍴 Browse Menu
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            background: activeTab === 'history' ? 'var(--accent-primary-glow)' : 'transparent',
            color: activeTab === 'history' ? '#fff' : '#94a3b8',
            border: `1px solid ${activeTab === 'history' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)'}`,
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          <ClipboardList size={18} />
          Your Orders ({tableOrders.length})
        </button>
      </div>

      {activeTab === 'menu' ? (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap-reverse', alignItems: 'flex-end' }}>
          {/* Menu area */}
          <div style={{ flex: '2 1 500px' }}>
            {/* Category Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              {['All', 'Coffee & Espresso', 'Teas & Infusions', 'Cold Beverages', 'Breakfast & Bakery', 'Sandwiches & Salads'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    background: selectedCategory === cat ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.05)',
                    color: selectedCategory === cat ? '#fff' : '#94a3b8',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 550,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Search Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.65rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', width: '100%', maxWidth: '350px', alignItems: 'center' }}>
              <Search size={18} color="#64748b" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search coffee, bakery..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', fontSize: '0.85rem', width: '100%' }}
              />
            </div>

            {/* Menu Items Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {filteredMenu.map((item) => {
                const cartItem = cart[item.id];
                return (
                  <div key={item.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <div style={{ position: 'relative', width: '100%', height: '150px', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} 
                          className="menu-item-image" 
                        />
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '0.25rem', zIndex: 2 }}>
                          {item.vegetarian && <span title="Vegetarian" style={{ color: 'var(--status-ready)', background: 'rgba(11, 15, 25, 0.85)', padding: '0.35rem', borderRadius: '6px', display: 'inline-flex', border: '1px solid rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(4px)' }}><Leaf size={14} /></span>}
                          {item.spicy && <span title="Spicy" style={{ color: 'var(--status-cancelled)', background: 'rgba(11, 15, 25, 0.85)', padding: '0.35rem', borderRadius: '6px', display: 'inline-flex', border: '1px solid rgba(239, 68, 68, 0.4)', backdropFilter: 'blur(4px)' }}><Flame size={14} /></span>}
                        </div>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 650, color: '#fff', marginBottom: '0.25rem' }}>{item.name}</h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem', minHeight: '40px' }}>{item.description}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>₹{item.price.toFixed(2)}</span>
                      
                      {cartItem ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <button
                            onClick={() => updateCartQuantity(item.id, -1)}
                            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >-</button>
                          <span style={{ minWidth: '16px', textAlign: 'center', fontWeight: 600 }}>{cartItem.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, 1)}
                            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          style={{
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Panel */}
          <div className="glass-panel" style={{ flex: '1 1 320px', padding: '1.5rem', height: 'fit-content', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                    <span>Total Amount:</span>
                    <span style={{ color: 'var(--accent-secondary)' }}>₹{getCartTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.9rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  Confirm & Place Order
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
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
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center', color: '#fff' }}>Generate Bill</h2>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total Amount Due</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
                ₹{tableOrders.reduce((sum, order) => sum + (order.status !== 'Cancelled' ? order.totalAmount : 0), 0).toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>Email for PDF Bill (Optional)</label>
              <input 
                type="email" 
                placeholder="Enter your email address"
                value={billEmail}
                onChange={e => setBillEmail(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', outline: 'none' }}
              />
            </div>

            {paymentSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ color: '#10b981', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Payment Successful!</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Please wait for the Waiter to confirm and check out your table.</p>
              </div>
            ) : paymentMethod === 'UPI' ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                {(() => {
                  const totalAmount = tableOrders.reduce((sum, order) => sum + (order.status !== 'Cancelled' ? order.totalAmount : 0), 0);
                  const formattedAmount = totalAmount % 1 === 0 ? totalAmount.toString() : totalAmount.toFixed(2);
                  
                  const errorDisplay = paymentLinkError ? (
                    <div style={{ marginTop: '1rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                      <p style={{ margin: 0 }}>{paymentLinkError}</p>
                    </div>
                  ) : null;

                  if (razorpayLink) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                        {errorDisplay}
                        <a 
                          href={razorpayLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                            color: '#fff',
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: 800,
                            fontSize: '1.2rem',
                            boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)',
                            display: 'inline-block',
                            textAlign: 'center'
                          }}
                        >
                          Click here to Pay ₹{formattedAmount} via Razorpay
                        </a>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto', textAlign: 'center' }}>
                          After you finish the payment, come back to this page. We will automatically verify it for you!
                        </p>
                        {isGeneratingLink && (
                          <p style={{ color: '#0ea5e9', fontSize: '0.9rem', margin: '0' }}>Verifying payment status...</p>
                        )}
                      </div>
                    );
                  }
                  
                  return (
                    <div style={{ marginTop: '1rem' }}>
                      {errorDisplay}
                      <button
                        onClick={async () => {
                          setIsGeneratingLink(true);
                          setPaymentLinkError(null);
                          try {
                            const res = await fetch('/api/create-payment-link', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ amount: totalAmount, receipt: `TBL-${tableId}-${Date.now()}` })
                            });
                            const data = await res.json();
                            if (res.ok && data.link) {
                              setRazorpayLink(data.link);
                              setRazorpayLinkId(data.id);
                            } else {
                              setPaymentLinkError(data.error || 'Failed to generate link');
                            }
                          } catch (err) {
                            setPaymentLinkError('Network error connecting to payment server');
                          } finally {
                            setIsGeneratingLink(false);
                          }
                        }}
                        disabled={isGeneratingLink}
                        style={{
                          background: isGeneratingLink ? '#475569' : '#0ea5e9',
                          color: '#fff',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: isGeneratingLink ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          margin: '1rem auto 0'
                        }}
                      >
                        {isGeneratingLink ? 'Securing Link...' : 'Generate Secure Link'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : paymentMethod === 'Cash' ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Waiter Notified</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Please wait for the Waiter to collect cash and settle your table.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button 
                  onClick={() => {
                    const razorpayLink = localStorage.getItem('owner_razorpay_link');
                    if (razorpayLink && razorpayLink.trim() !== '') {
                      setPaymentMethod('UPI');
                    } else {
                      handlePayment('UPI');
                    }
                  }}
                  style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span style={{ fontSize: '1.5rem' }}>📱</span>
                  Pay with UPI
                </button>
                <button 
                  onClick={() => handlePayment('Cash')}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span style={{ fontSize: '1.5rem' }}>💵</span>
                  Pay with Cash
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
