import React, { useState } from 'react';
import { Calendar, User, Phone, Users, Clock, ArrowLeft, CheckCircle } from 'lucide-react';
import type { Reservation } from '../types';

interface ReservationPortalProps {
  onAddReservation: (reservation: Reservation) => void;
  reservations: Reservation[];
}

export const ReservationPortal: React.FC<ReservationPortalProps> = ({ onAddReservation, reservations }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState<number>(2);
  const [dateTime, setDateTime] = useState('');
  const [tableId, setTableId] = useState('1');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getTablesCount = () => parseInt(localStorage.getItem('owner_tables_count') || '4', 10);
  const totalTables = getTablesCount();

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    if (!dateTime) {
      setErrorMsg('Please select a date and time for your reservation.');
      return;
    }

    const selectedTime = new Date(dateTime).getTime();
    const now = Date.now();

    if (selectedTime < now - 5 * 60 * 1000) {
      setErrorMsg('Cannot book reservations in the past.');
      return;
    }

    // 1.30 hours (90 minutes) reservation limit validation
    const LIMIT_MS = 90 * 60 * 1000; 

    // Check for conflicting reservations for this table within 90 minutes range
    const conflict = reservations.find(r => {
      if (r.tableId !== tableId) return false;
      const existingTime = new Date(r.dateTime).getTime();
      const difference = Math.abs(existingTime - selectedTime);
      return difference < LIMIT_MS;
    });

    if (conflict) {
      setErrorMsg(`⚠️ Table ${tableId} is already reserved around this time. Each reservation is booked for 1 hour 30 mins. Please select another time or table.`);
      return;
    }

    const newReservation: Reservation = {
      id: `res_${Math.random().toString(36).substr(2, 9)}`,
      customerName: name.trim(),
      phone: phone.trim(),
      guestsCount: guests,
      dateTime,
      tableId,
      timestamp: Date.now()
    };

    onAddReservation(newReservation);
    
    // Show success message
    const waTimeFormatted = new Date(dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    setSuccessMsg(`🎉 Reservation Confirmed! Table ${tableId} is reserved for ${name} on ${waTimeFormatted}. (Limit: 1 hour 30 minutes)`);
    
    // Clear inputs
    setName('');
    setPhone('');
    setDateTime('');
  };

  const handleBack = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  };

  // Find customer's active reservations
  const customerReservations = reservations.filter(r => r.phone === phone.trim() && phone.trim() !== '');

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '650px', margin: '0 auto' }}>
      
      {/* Back Button */}
      <button 
        onClick={handleBack}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#cbd5e1',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '2rem',
          fontSize: '0.85rem'
        }}
      >
        <ArrowLeft size={16} /> Back to Portal
      </button>

      {/* Main Reservation Card */}
      <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px', borderLeft: '4px solid var(--accent-secondary)' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 855, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📅 Book a Table
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            Choose your preferred time. Each booking is reserved for a duration of <strong>1 hour 30 minutes</strong>.
          </p>
        </header>

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            
            {/* Number of Guests */}
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guests</label>
              <div style={{ position: 'relative' }}>
                <Users size={16} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <select
                  value={guests}
                  onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n} style={{ background: '#0f172a' }}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Select Table */}
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preferred Table</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {Array.from({ length: totalTables }, (_, idx) => (idx + 1).toString()).map(tId => (
                    <option key={tId} value={tId} style={{ background: '#0f172a' }}>Table {tId}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* Date and Time */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & Arrival Time</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            style={{
              marginTop: '1rem',
              background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)',
              color: '#0f172a',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.2)',
              transition: 'all 0.2s'
            }}
          >
            Confirm Reservation (90 Min Limit)
          </button>
        </form>
      </div>

      {/* Show Customer's Active Bookings */}
      {customerReservations.length > 0 && (
        <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', borderRadius: '16px' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Your Bookings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {customerReservations.map(res => {
              const resTime = new Date(res.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
              return (
                <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <h4 style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>Table {res.tableId}</h4>
                    <p style={{ margin: '0.15rem 0 0 0', color: '#64748b', fontSize: '0.75rem' }}>{resTime} - {res.guestsCount} Guests</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>Confirmed</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default ReservationPortal;
