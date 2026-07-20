import React, { useState, useEffect } from 'react';
import type { Order, TableOccupancy } from '../types';
import { useMenu } from '../data/menu';
import { TrendingUp, DollarSign, Layers, FileText, Search, Filter, Percent, Clock, Activity, Award, Menu, X, Settings } from 'lucide-react';

interface OwnerDashboardProps {
  orders: Order[];
  tablesOccupancy: { [tableId: string]: TableOccupancy };
  onCheckOutTable: (tableId: string) => void;
  onResetAllData?: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ orders, tablesOccupancy, onCheckOutTable, onResetAllData }) => {
  const MENU_ITEMS = useMenu();
  const [autoUpdateInterval, setAutoUpdateIntervalState] = useState<number>(() => {
    const saved = localStorage.getItem('hotel_auto_update_interval');
    return saved !== null ? parseInt(saved, 10) : 5000;
  });

  const handleAutoUpdateChange = (newVal: number) => {
    localStorage.setItem('hotel_auto_update_interval', newVal.toString());
    setAutoUpdateIntervalState(newVal);
    window.dispatchEvent(new CustomEvent('HOTEL_AUTO_UPDATE_CHANGED'));
  };

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [ownerTablesCount, setOwnerTablesCount] = useState<number>(parseInt(localStorage.getItem('owner_tables_count') || '4', 10));
  const [chartMode, setChartMode] = useState<'cumulative' | 'hourly'>('cumulative');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState<'analytics' | 'tables' | 'menu_staff' | 'ledger' | 'settings'>('analytics');
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // New Briefing & KPI Calculations
  const averageOrderValue = servedOrders.length > 0 ? totalRevenue / servedOrders.length : 0;
  const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const hourlyRevenues: { [hour: number]: number } = {};
  servedOrders.forEach(o => {
    const hr = new Date(o.timestamp).getHours();
    hourlyRevenues[hr] = (hourlyRevenues[hr] || 0) + o.totalAmount;
  });
  let peakHourStr = 'N/A';
  let maxHrRev = 0;
  Object.entries(hourlyRevenues).forEach(([hr, rev]) => {
    if (rev > maxHrRev) {
      maxHrRev = rev;
      const hourNum = parseInt(hr, 10);
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const displayHour = hourNum % 12 || 12;
      peakHourStr = `${displayHour} ${ampm}`;
    }
  });

  const occupiedTables = Object.values(tablesOccupancy).filter(t => t.occupied).length;
  const occupancyRate = ownerTablesCount > 0 ? (occupiedTables / ownerTablesCount) * 100 : 0;

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

  // Generate chart data points based on mode
  const getChartPoints = () => {
    if (chartMode === 'cumulative') {
      const sorted = [...servedOrders].sort((a, b) => a.timestamp - b.timestamp);
      let currentRev = 0;
      let currentCost = 0;
      let currentProfit = 0;
      return sorted.map((order) => {
        const cost = order.items.reduce((sum, item) => {
          const menuItem = MENU_ITEMS.find(m => m.id === item.menuItemId);
          const unitCost = menuItem ? menuItem.costPrice : item.price * 0.4;
          return sum + (unitCost * item.quantity);
        }, 0);
        currentRev += order.totalAmount;
        currentCost += cost;
        currentProfit += (order.totalAmount - cost);

        return {
          label: `Order #${order.id.slice(-4).toUpperCase()}`,
          time: new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          revenue: currentRev,
          cost: currentCost,
          profit: currentProfit
        };
      });
    } else {
      // Hourly trend
      const sortedHours = Object.keys(hourlyRevenues).map(Number).sort((a, b) => a - b);
      return sortedHours.map(hr => {
        const hrOrders = servedOrders.filter(o => new Date(o.timestamp).getHours() === hr);
        const rev = hrOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const cost = hrOrders.reduce((sum, o) => {
          return sum + o.items.reduce((itemSum, item) => {
            const menuItem = MENU_ITEMS.find(m => m.id === item.menuItemId);
            const unitCost = menuItem ? menuItem.costPrice : item.price * 0.4;
            return itemSum + (unitCost * item.quantity);
          }, 0);
        }, 0);
        return {
          label: `${hr % 12 || 12} ${hr >= 12 ? 'PM' : 'AM'}`,
          time: `${hr}:00`,
          revenue: rev,
          cost: cost,
          profit: rev - cost
        };
      });
    }
  };

  const chartPoints = getChartPoints();

  // SVG Chart Config
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = chartPoints.length > 0 
    ? Math.max(...chartPoints.map(p => Math.max(p.revenue, p.cost, p.profit)), 100) * 1.15
    : 100;

  const getX = (idx: number) => {
    if (chartPoints.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (idx / (chartPoints.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - (val / maxVal) * chartHeight;
  };

  const getLinePath = (key: 'revenue' | 'cost' | 'profit') => {
    if (chartPoints.length === 0) return '';
    return chartPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p[key])}`).join(' ');
  };

  const getAreaPath = (key: 'revenue' | 'cost' | 'profit') => {
    if (chartPoints.length === 0) return '';
    const linePath = getLinePath(key);
    return `${linePath} L ${getX(chartPoints.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;
  };

  if (isMobile) {
    return (
      <div className="animate-fade-in" style={{ padding: '1rem', minHeight: '100vh', background: '#f8fafc', paddingBottom: '5rem', position: 'relative' }}>
        {/* Mobile Top Nav Header */}
        <header className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          position: 'sticky',
          top: '0',
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-glass)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={() => setMenuOpen(true)}
              style={{
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: '8px'
              }}
            >
              <Menu size={22} color="#1e293b" />
            </button>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'tables' && 'Table Map'}
              {activeTab === 'menu_staff' && 'Menu & Staff'}
              {activeTab === 'ledger' && 'Order Ledger'}
              {activeTab === 'settings' && 'System Settings'}
            </h1>
          </div>
          <style>{`
            @keyframes heartbeat {
              0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
              70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
              100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid var(--border-glass)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.65rem',
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif"
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                background: autoUpdateInterval > 0 ? '#10b981' : '#94a3b8',
                borderRadius: '50%',
                display: 'inline-block',
                animation: autoUpdateInterval > 0 ? 'heartbeat 2s infinite' : 'none',
              }}></span>
              <select
                value={autoUpdateInterval}
                onChange={(e) => handleAutoUpdateChange(parseInt(e.target.value, 10))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-secondary)',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  fontFamily: "'Outfit', sans-serif"
                }}
              >
                <option value={0}>Off</option>
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#fff', background: 'var(--accent-primary)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
              {orders.length} orders
            </span>
          </div>
        </header>

        {/* Mobile Side Drawer Navigation */}
        {menuOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              width: '280px',
              height: '100%',
              background: '#ffffff',
              padding: '1.5rem',
              boxShadow: '4px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                    Executive Menu
                  </span>
                  <button 
                    onClick={() => setMenuOpen(false)} 
                    style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', padding: '0.35rem', borderRadius: '50%' }}
                  >
                    <X size={18} color="#64748b" />
                  </button>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { id: 'analytics', label: 'Analytics & Revenue', icon: <TrendingUp size={18} /> },
                    { id: 'tables', label: 'Table Map', icon: <Layers size={18} /> },
                    { id: 'menu_staff', label: 'Menu & Staff', icon: <Award size={18} /> },
                    { id: 'ledger', label: 'Order Ledger', icon: <FileText size={18} /> },
                    { id: 'settings', label: 'System Settings', icon: <Settings size={18} /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as any); setMenuOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeTab === tab.id ? 'var(--accent-primary-glow)' : 'transparent',
                        color: activeTab === tab.id ? 'var(--accent-primary)' : '#475569',
                        fontWeight: activeTab === tab.id ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem' }}>
                <button
                  onClick={() => {
                    if (window.confirm('Are you absolutely sure you want to completely clear all data? This will erase all orders, requests, and revenue history. This action cannot be undone!')) {
                      onResetAllData?.();
                      setMenuOpen(false);
                    }
                  }}
                  className="btn-constructivist-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    background: '#ef4444',
                    borderColor: '#ef4444',
                    boxShadow: 'none'
                  }}
                >
                  RESET ALL DATA
                </button>
              </div>
            </div>
            {/* Clickable Backdrop to close */}
            <div style={{ flex: 1 }} onClick={() => setMenuOpen(false)} />
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Gross Revenue</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0.2rem 0 0 0' }}>₹{totalRevenue.toFixed(0)}</h3>
              </div>
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Net Profit</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--status-ready)', margin: '0.2rem 0 0 0' }}>₹{netProfit.toFixed(0)}</h3>
              </div>
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Cost of Sales</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444', margin: '0.2rem 0 0 0' }}>₹{totalCost.toFixed(0)}</h3>
              </div>
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Margin Ratio</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#06b6d4', margin: '0.2rem 0 0 0' }}>{profitMarginPercent.toFixed(1)}%</h3>
              </div>
            </div>

            {/* Performance Trend */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Sales Trend</h3>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: '0.2rem', borderRadius: '6px' }}>
                  <button 
                    onClick={() => setChartMode('cumulative')}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: 'none',
                      background: chartMode === 'cumulative' ? '#fff' : 'transparent',
                      color: chartMode === 'cumulative' ? '#0f172a' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      borderRadius: '4px'
                    }}
                  >
                    Cumul
                  </button>
                  <button 
                    onClick={() => setChartMode('hourly')}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: 'none',
                      background: chartMode === 'hourly' ? '#fff' : 'transparent',
                      color: chartMode === 'hourly' ? '#0f172a' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      borderRadius: '4px'
                    }}
                  >
                    Hourly
                  </button>
                </div>
              </div>

              {chartPoints.length === 0 ? (
                <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 650 }}>No served orders recorded yet.</p>
                </div>
              ) : (
                <div style={{ position: 'relative', width: '100%' }}>
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="160px">
                    <defs>
                      <linearGradient id="mGradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="mGradProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={getAreaPath('revenue')} fill="url(#mGradRev)" />
                    <path d={getAreaPath('profit')} fill="url(#mGradProfit)" />
                    <path d={getLinePath('revenue')} fill="none" stroke="#6366f1" strokeWidth="3" />
                    <path d={getLinePath('profit')} fill="none" stroke="#10b981" strokeWidth="3" />
                  </svg>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 600 }}>
                    <span style={{ color: '#6366f1' }}>● Revenue</span>
                    <span style={{ color: '#10b981' }}>● Profit</span>
                  </div>
                </div>
              )}
            </div>

            {/* Category Distribution */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Category Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {Object.entries(categorySales).map(([category, value]) => {
                  const percentage = maxCategorySales > 0 ? (value / maxCategorySales) * 100 : 0;
                  return (
                    <div key={category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 550 }}>{category}</span>
                        <span style={{ fontWeight: 700 }}>₹{value.toFixed(0)}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tables' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Dining Tables ({occupiedTables}/{ownerTablesCount})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                {allTables.map((tableId) => {
                  const occ = tablesOccupancy[tableId] || { occupied: false };
                  const assignedWaiter = distributedWaiters.find(w => w.assignedTables.includes(tableId));
                  return (
                    <div key={tableId} style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      background: occ.occupied ? 'rgba(239, 68, 68, 0.03)' : 'rgba(16, 185, 129, 0.03)',
                      border: `1px solid ${occ.occupied ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>T-{tableId}</span>
                        <span style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.3rem',
                          borderRadius: '4px',
                          color: occ.occupied ? '#ef4444' : '#10b981',
                          background: occ.occupied ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                        }}>{occ.occupied ? 'OCC' : 'VAC'}</span>
                      </div>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.65rem', color: '#64748b' }}>
                        {assignedWaiter ? assignedWaiter.name : 'Unassigned'}
                      </p>
                      {occ.occupied && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#1e293b', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            👤 {occ.customerName}
                          </span>
                          <button
                            onClick={() => onCheckOutTable(tableId)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: 'none',
                              color: '#ef4444',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 700
                            }}
                          >
                            Settle
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu_staff' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top dishes */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Top Dishes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sortedDishes.slice(0, 3).map(([name, stat]) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={stat.image} alt={name} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{stat.qty} units</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Rev: ₹{stat.revenue.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff leaderboard */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Staff Performance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(() => {
                  const waiterStats: { [name: string]: { ordersCount: number; revenue: number } } = {};
                  servedOrders.forEach(o => {
                    const waiterName = o.servedBy || 'Self / Checkout';
                    if (!waiterStats[waiterName]) waiterStats[waiterName] = { ordersCount: 0, revenue: 0 };
                    waiterStats[waiterName].ordersCount += 1;
                    waiterStats[waiterName].revenue += o.totalAmount;
                  });
                  return Object.entries(waiterStats).map(([name, stats]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <span style={{ fontWeight: 600 }}>{name}</span>
                      <span style={{ color: 'var(--status-ready)', fontWeight: 700 }}>₹{stats.revenue.toFixed(0)} ({stats.ordersCount} served)</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Menu pricing optimizer */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Margin Optimizer</h3>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.85rem' }}>Flagging dishes below 50% margin</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '180px', overflowY: 'auto' }}>
                {(() => {
                  const lowMarginItems = MENU_ITEMS.map(item => {
                    const marginPercent = item.price > 0 ? ((item.price - item.costPrice) / item.price) * 100 : 0;
                    const suggestedPrice = Math.ceil((item.costPrice / 0.4) / 5) * 5;
                    return { ...item, marginPercent, suggestedPrice };
                  }).filter(item => item.marginPercent < 50).slice(0, 4);

                  return lowMarginItems.map(item => (
                    <div key={item.id} style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.08)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <div style={{ fontSize: '0.65rem', color: '#ef4444' }}>Margin: {item.marginPercent.toFixed(0)}%</div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-ready)' }}>
                        ₹{item.suggestedPrice} <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>(was ₹{item.price})</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Order Ledger</h3>
                <input
                  type="text"
                  placeholder="Search table/ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                {filteredOrders.slice(0, 10).map(order => {
                  const profit = getOrderProfit(order);
                  return (
                    <div key={order.id} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>T-{order.tableId.split('_archived_')[0]} (#{order.id.slice(-4).toUpperCase()})</span>
                        <span>₹{order.totalAmount.toFixed(0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                        <span>{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span style={{ color: 'var(--status-ready)' }}>+₹{profit.toFixed(0)} Profit</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Loyal Guests</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(() => {
                  const customerMap: { [name: string]: { visits: number; spend: number } } = {};
                  orders.forEach(o => {
                    if (o.customerName && o.customerName.trim()) {
                      const name = o.customerName.trim();
                      if (!customerMap[name]) customerMap[name] = { visits: 1, spend: 0 };
                      customerMap[name].spend += o.totalAmount;
                    }
                  });
                  return Object.entries(customerMap).sort((a,b) => b[1].visits - a[1].visits).slice(0, 4).map(([name, stats]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', paddingBottom: '0.35rem', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <span style={{ fontWeight: 600 }}>{name}</span>
                      <span style={{ fontWeight: 700 }}>₹{stats.spend.toFixed(0)} ({stats.visits} visits)</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Capacity Settings</h3>
              <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '1rem' }}>Set total dining tables in service</p>
              
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 700 }}>TOTAL TABLES</label>
              <input
                type="number"
                min="1"
                max="50"
                value={ownerTablesCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 4;
                  localStorage.setItem('owner_tables_count', val.toString());
                  setOwnerTablesCount(val);
                  const bc = new BroadcastChannel('hotel_ordering_system');
                  bc.postMessage({ type: 'REQUEST_SYNC' });
                  bc.close();
                }}
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

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
          <div style={{ background: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '8px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-secondary)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              Executive Management Board
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#555', margin: '0.25rem 0 0 0', fontWeight: 600 }}>
              Real-time revenue analytics, cost analysis, and order ledger audit
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Automatic Update Option */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.8)',
            border: '1px solid var(--border-glass)',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            fontFamily: "'Outfit', sans-serif"
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              background: autoUpdateInterval > 0 ? '#10b981' : '#94a3b8',
              borderRadius: '50%',
              display: 'inline-block',
              animation: autoUpdateInterval > 0 ? 'heartbeat 2s infinite' : 'none',
              boxShadow: autoUpdateInterval > 0 ? '0 0 8px #10b981' : 'none'
            }}></span>
            <span style={{ color: '#475569' }}>Auto Update:</span>
            <select
              value={autoUpdateInterval}
              onChange={(e) => handleAutoUpdateChange(parseInt(e.target.value, 10))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-secondary)',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              <option value={0}>Off</option>
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </div>

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

      {/* Financial Overview & KPI Briefing Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Revenue */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.04, color: '#fff' }}>
            <DollarSign size={100} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Gross Revenue</span>
            <DollarSign size={20} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>₹{totalRevenue.toFixed(2)}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--status-ready)', marginTop: '0.25rem', fontWeight: 600 }}>
            From {servedOrders.length} served orders
          </p>
        </div>

        {/* Cost of Ingredients */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Cost of Sales</span>
            <Activity size={20} style={{ color: '#ef4444' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>₹{totalCost.toFixed(2)}</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Total ingredient expense
          </p>
        </div>

        {/* Net Profit */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '3px solid var(--status-ready)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Net Profit</span>
            <TrendingUp size={20} style={{ color: 'var(--status-ready)' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-ready)' }}>₹{netProfit.toFixed(2)}</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Earnings after ingredients
          </p>
        </div>

        {/* Average Order Value */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Avg Order Value</span>
            <Award size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>₹{averageOrderValue.toFixed(2)}</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            AOV across ticket sizes
          </p>
        </div>

        {/* Profit Margin */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Profit Margin</span>
            <Percent size={20} style={{ color: '#06b6d4' }} />
          </div>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#06b6d4' }}>{profitMarginPercent.toFixed(1)}%</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Net profit ratio
          </p>
        </div>

        {/* Peak Hour & Occupancy */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Peak Hour</span>
            <Clock size={20} style={{ color: '#f59e0b' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{peakHourStr}</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Occupancy Rate: {occupancyRate.toFixed(0)}%
          </p>
        </div>

      </div>

      {/* Business Performance SVG Graph */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Business Performance Trend
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
              Comparing development of gross income, ingredients cost, and net profit
            </p>
          </div>
          
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <button 
              onClick={() => setChartMode('cumulative')}
              style={{
                padding: '0.4rem 0.8rem',
                border: 'none',
                background: chartMode === 'cumulative' ? '#fff' : 'transparent',
                color: chartMode === 'cumulative' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: chartMode === 'cumulative' ? '0 1px 3px 0 rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Cumulative Growth
            </button>
            <button 
              onClick={() => setChartMode('hourly')}
              style={{
                padding: '0.4rem 0.8rem',
                border: 'none',
                background: chartMode === 'hourly' ? '#fff' : 'transparent',
                color: chartMode === 'hourly' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: chartMode === 'hourly' ? '0 1px 3px 0 rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Hourly Sales
            </button>
          </div>
        </div>

        {chartPoints.length === 0 ? (
          <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <TrendingUp size={48} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 650 }}>No served orders recorded to visualize trend.</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>Complete and serve customer orders to generate dashboard metrics.</p>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%' }}>
            {/* SVG Render */}
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="240px">
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const yVal = paddingTop + ratio * chartHeight;
                const priceVal = maxVal * (1 - ratio);
                return (
                  <g key={i}>
                    <line 
                      x1={paddingLeft} 
                      y1={yVal} 
                      x2={svgWidth - paddingRight} 
                      y2={yVal} 
                      stroke="rgba(0,0,0,0.06)" 
                      strokeDasharray="4 4"
                    />
                    <text 
                      x={paddingLeft - 8} 
                      y={yVal + 4} 
                      fill="#64748b" 
                      fontSize="9px" 
                      textAnchor="end"
                      fontWeight="600"
                    >
                      ₹{priceVal.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* X Axis labels */}
              {chartPoints.map((p, idx) => {
                // Show subset of labels if too many points
                const interval = Math.max(1, Math.floor(chartPoints.length / 8));
                if (idx % interval !== 0 && idx !== chartPoints.length - 1) return null;
                return (
                  <text
                    key={idx}
                    x={getX(idx)}
                    y={svgHeight - 10}
                    fill="#64748b"
                    fontSize="9px"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {p.label}
                  </text>
                );
              })}

              {/* Gradient Areas */}
              <path d={getAreaPath('revenue')} fill="url(#gradRevenue)" />
              <path d={getAreaPath('cost')} fill="url(#gradCost)" />
              <path d={getAreaPath('profit')} fill="url(#gradProfit)" />

              {/* Lines */}
              <path d={getLinePath('revenue')} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d={getLinePath('cost')} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={getLinePath('profit')} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Dots */}
              {chartPoints.map((p, idx) => (
                <g key={idx}>
                  <circle cx={getX(idx)} cy={getY(p.revenue)} r={hoveredIndex === idx ? 5 : 3} fill="#6366f1" stroke="#fff" strokeWidth={hoveredIndex === idx ? 2 : 1} />
                  <circle cx={getX(idx)} cy={getY(p.cost)} r={hoveredIndex === idx ? 4 : 2} fill="#ef4444" stroke="#fff" strokeWidth={1} />
                  <circle cx={getX(idx)} cy={getY(p.profit)} r={hoveredIndex === idx ? 5 : 3} fill="#10b981" stroke="#fff" strokeWidth={hoveredIndex === idx ? 2 : 1} />
                </g>
              ))}

              {/* Vertical Guide Line */}
              {hoveredIndex !== null && (
                <line 
                  x1={getX(hoveredIndex)} 
                  y1={paddingTop} 
                  x2={getX(hoveredIndex)} 
                  y2={paddingTop + chartHeight} 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  strokeWidth="1.5" 
                />
              )}

              {/* Interactive Columns for Tooltip trigger */}
              {chartPoints.map((_, idx) => {
                const x = getX(idx);
                const colWidth = chartPoints.length > 1 ? chartWidth / (chartPoints.length - 1) : chartWidth;
                return (
                  <rect
                    key={idx}
                    x={x - colWidth / 2}
                    y={paddingTop}
                    width={colWidth}
                    height={chartHeight}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredIndex !== null && chartPoints[hoveredIndex] && (
              <div style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#fff',
                fontSize: '0.8rem',
                pointerEvents: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                zIndex: 10
              }}>
                <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }}>
                  {chartPoints[hoveredIndex].label} ({chartPoints[hoveredIndex].time})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                    <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Revenue:</span>
                    <strong>₹{chartPoints[hoveredIndex].revenue.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                    <span style={{ color: '#fca5a5', fontWeight: 600 }}>Cost:</span>
                    <strong>₹{chartPoints[hoveredIndex].cost.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                    <span style={{ color: '#6ee7b7', fontWeight: 600 }}>Net Profit:</span>
                    <strong style={{ color: '#34d399' }}>₹{chartPoints[hoveredIndex].profit.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Chart Legend */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#6366f1' }} />
                <span style={{ color: '#475569' }}>Gross Revenue</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }} />
                <span style={{ color: '#475569' }}>Ingredients Cost</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
                <span style={{ color: '#475569' }}>Net Profit</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        
        {/* Category Sales Visual Chart */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>
            Revenue distribution by Food Category
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {Object.entries(categorySales).map(([category, value]) => {
              const percentage = maxCategorySales > 0 ? (value / maxCategorySales) * 100 : 0;
              return (
                <div key={category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 550 }}>{category}</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>₹{value.toFixed(2)}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent-primary) 0%, #06b6d4 100%)',
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
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>
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
                        <span style={{ fontWeight: 550, color: '#1e293b' }}>{name}</span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          <strong style={{ color: 'var(--accent-primary)' }}>{stat.qty} units</strong> (₹{stat.revenue.toFixed(2)})
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: 'var(--accent-primary)',
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
      <div className="glass-panel owner-card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--accent-primary)" /> Comprehensive Dish Sales Ledger
        </h2>
        {allSortedDishes.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>No orders served yet to compile list.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 285px), 1fr))', gap: '1rem' }}>
            {allSortedDishes.map(([name, stat]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <img 
                  src={stat.image} 
                  alt={name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                  }}
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>{name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    <strong style={{ color: 'var(--accent-primary)' }}>{stat.qty} units</strong> sold
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Revenue</div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                    ₹{stat.revenue.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Map */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={20} color="var(--accent-primary)" /> Table Map
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

      {/* Staff & Menu Insights Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        
        {/* Staff Performance Leaderboard */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💼 Staff Performance Leaderboard
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Tracking orders handled, total sales, and guests served per active waiter.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#64748b' }}>
                  <th style={{ padding: '0.5rem 0.25rem' }}>Staff Name</th>
                  <th style={{ padding: '0.5rem 0.25rem', textAlign: 'center' }}>Orders Served</th>
                  <th style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const waiterStats: { [name: string]: { ordersCount: number; revenue: number } } = {};
                  servedOrders.forEach(o => {
                    const waiterName = o.servedBy || 'Self / Checkout';
                    if (!waiterStats[waiterName]) {
                      waiterStats[waiterName] = { ordersCount: 0, revenue: 0 };
                    }
                    waiterStats[waiterName].ordersCount += 1;
                    waiterStats[waiterName].revenue += o.totalAmount;
                  });

                  const sortedWaiters = Object.entries(waiterStats).sort((a, b) => b[1].revenue - a[1].revenue);

                  if (sortedWaiters.length === 0) {
                    return (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                          No waiter data available yet.
                        </td>
                      </tr>
                    );
                  }

                  return sortedWaiters.map(([name, stats]) => (
                    <tr key={name} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '0.75rem 0.25rem', fontWeight: 600 }}>{name}</td>
                      <td style={{ padding: '0.75rem 0.25rem', textAlign: 'center' }}>{stats.ordersCount}</td>
                      <td style={{ padding: '0.75rem 0.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--status-ready)' }}>
                        ₹{stats.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Menu Pricing & Margin Optimizer Advisor */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚡ Menu Profit & Margin Optimizer
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Flagging low-margin dishes (below 50%) and suggesting price optimization.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
            {(() => {
              const lowMarginItems = MENU_ITEMS.map(item => {
                const marginAmount = item.price - item.costPrice;
                const marginPercent = item.price > 0 ? (marginAmount / item.price) * 100 : 0;
                // Suggest price aiming for a healthy 60% profit margin
                const suggestedPrice = Math.ceil((item.costPrice / 0.4) / 5) * 5;
                return { ...item, marginPercent, suggestedPrice };
              }).filter(item => item.marginPercent < 50).sort((a, b) => a.marginPercent - b.marginPercent);

              if (lowMarginItems.length === 0) {
                return (
                  <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '8px', color: 'var(--status-ready)', fontSize: '0.85rem', fontWeight: 600 }}>
                    🎉 Excellent! All active menu items satisfy healthy profit targets (≥50%).
                  </div>
                );
              }

              return lowMarginItems.map(item => (
                <div key={item.id} style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.02)',
                  border: '1px solid rgba(239,68,68,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                      Cost: ₹{item.costPrice} | Margin: <span style={{ color: '#ef4444', fontWeight: 700 }}>{item.marginPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Suggested Price</div>
                    <div style={{ fontWeight: 700, color: 'var(--status-ready)', fontSize: '0.95rem' }}>
                      ₹{item.suggestedPrice}
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginLeft: '0.2rem' }}>
                        (was ₹{item.price})
                      </span>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
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
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#64748b' }}>
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
                    <tr key={order.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#475569' }}>#{order.id.slice(-6).toUpperCase()}</td>
                      <td style={{ padding: '1rem', color: '#64748b' }}>
                        {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>
                        Table {order.tableId.split('_archived_')[0]}
                        {order.customerName && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{order.customerName}</span>}
                      </td>
                      <td style={{ padding: '1rem', color: '#475569' }}>
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
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                        ₹{order.totalAmount.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <span style={{ color: profit >= 0 ? 'var(--status-ready)' : 'var(--status-cancelled)', fontWeight: 650 }}>
                          +₹{profit.toFixed(2)}
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

      {/* Visitor Frequency Ledger */}
      <div className="glass-panel" style={{ padding: '2rem', marginTop: '2.5rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          👥 Guest Visit Frequency & Loyalty
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#64748b' }}>
                <th style={{ padding: '1rem' }}>Guest Name</th>
                <th style={{ padding: '1rem' }}>Total Visits</th>
                <th style={{ padding: '1rem' }}>Total Spend</th>
                <th style={{ padding: '1rem' }}>Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Group by customerName
                const customerMap: { [name: string]: { visits: number; spend: number; lastVisit: number } } = {};
                orders.forEach(o => {
                  if (o.customerName && o.customerName.trim()) {
                    const name = o.customerName.trim();
                    if (!customerMap[name]) {
                      customerMap[name] = { visits: 0, spend: 0, lastVisit: 0 };
                    }
                    customerMap[name].spend += o.totalAmount;
                    if (o.timestamp > customerMap[name].lastVisit) {
                      customerMap[name].lastVisit = o.timestamp;
                    }
                  }
                });
                
                const visitorVisits: { [name: string]: Set<string> } = {};
                orders.forEach(o => {
                  if (o.customerName && o.customerName.trim()) {
                    const name = o.customerName.trim();
                    if (!visitorVisits[name]) {
                      visitorVisits[name] = new Set();
                    }
                    const archiveMatch = o.tableId.split('_archived_')[1];
                    if (archiveMatch) {
                      visitorVisits[name].add(archiveMatch);
                    } else {
                      visitorVisits[name].add(new Date(o.timestamp).toDateString());
                    }
                  }
                });

                Object.keys(customerMap).forEach(name => {
                  customerMap[name].visits = visitorVisits[name] ? visitorVisits[name].size : 1;
                });

                const sortedGuests = Object.entries(customerMap).sort((a, b) => b[1].visits - a[1].visits);

                if (sortedGuests.length === 0) {
                  return (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No guest history found.
                      </td>
                    </tr>
                  );
                }

                return sortedGuests.map(([name, stats]) => (
                  <tr key={name} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#000' }}>{name}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        background: stats.visits > 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
                        color: stats.visits > 1 ? 'var(--status-ready)' : 'var(--accent-secondary)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        Visited {stats.visits} {stats.visits === 1 ? 'time' : 'times'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#000' }}>₹{stats.spend.toFixed(2)}</td>
                    <td style={{ padding: '1rem', color: '#64748b' }}>{new Date(stats.lastVisit).toLocaleDateString()}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
export default OwnerDashboard;
