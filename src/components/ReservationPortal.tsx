import React, { useState, useEffect } from 'react';
import { Calendar, User, Phone, Users, Clock, ArrowLeft, Mail, CreditCard } from 'lucide-react';
import type { Reservation } from '../types';

interface ReservationPortalProps {
  onAddReservation: (reservation: Reservation) => void;
  reservations: Reservation[];
}

export const ReservationPortal: React.FC<ReservationPortalProps> = ({ onAddReservation, reservations }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState<number>(2);
  const [dateTime, setDateTime] = useState('');
  const [tableId, setTableId] = useState('1');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment flow states
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [payLink, setPayLink] = useState<string | null>(null);
  const [payLinkId, setPayLinkId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  // Pending reservation data (built after form submit, confirmed after payment)
  const [pendingReservation, setPendingReservation] = useState<Reservation | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getTablesCount = () => parseInt(localStorage.getItem('owner_tables_count') || '4', 10);
  const totalTables = getTablesCount();
  const advanceAmount = parseInt(localStorage.getItem('owner_reservation_advance') || '0', 10);
  const requiresPayment = advanceAmount > 0;

  // Poll Razorpay payment status
  useEffect(() => {
    if (!payLinkId || step !== 'payment') return;

    const checkPayment = async () => {
      try {
        const res = await fetch(`/api/check-payment-status?id=${payLinkId}`);
        const data = await res.json();
        if (res.ok && data.status === 'paid') {
          confirmReservation();
        } else if (res.ok && data.status === 'failed') {
          setPayError('Payment failed. Please try again.');
        }
      } catch { /* ignore */ }
    };

    checkPayment();
    const interval = setInterval(checkPayment, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payLinkId, step]);

  const confirmReservation = () => {
    if (!pendingReservation) return;
    onAddReservation(pendingReservation);
    const waTimeFormatted = new Date(pendingReservation.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    setSuccessMsg(`🎉 Reservation Confirmed! Table ${pendingReservation.tableId} is reserved for ${pendingReservation.customerName} on ${waTimeFormatted}.`);
    setStep('success');

    // Send Gmail confirmation
    if (pendingEmail.trim()) {
      setEmailStatus('📧 Sending confirmation email...');
      fetch('/api/send-reservation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: pendingEmail.trim(),
          customerName: pendingReservation.customerName,
          tableId: pendingReservation.tableId,
          dateTime: pendingReservation.dateTime,
          guestsCount: pendingReservation.guestsCount
        })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setEmailStatus(`✅ Confirmation email sent to ${pendingEmail.trim()}`);
          } else {
            setEmailStatus(`⚠️ Email not sent: ${data.error}`);
          }
        })
        .catch(() => setEmailStatus('⚠️ Could not reach email server.'));
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) { setErrorMsg('Please enter your name.'); return; }
    if (!phone.trim()) { setErrorMsg('Please enter your phone number.'); return; }
    if (!dateTime) { setErrorMsg('Please select a date and time for your reservation.'); return; }

    const selectedTime = new Date(dateTime).getTime();
    const now = Date.now();

    if (selectedTime < now - 5 * 60 * 1000) {
      setErrorMsg('Cannot book reservations in the past.');
      return;
    }

    const LIMIT_MS = 90 * 60 * 1000;
    const conflict = reservations.find(r => {
      if (r.tableId !== tableId) return false;
      const existingTime = new Date(r.dateTime).getTime();
      return Math.abs(existingTime - selectedTime) < LIMIT_MS;
    });

    if (conflict) {
      setErrorMsg(`⚠️ Table ${tableId} is already reserved around this time. Please select another time or table.`);
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

    setPendingReservation(newReservation);
    setPendingEmail(email.trim());

    if (!requiresPayment) {
      // No advance needed — confirm immediately
      onAddReservation(newReservation);
      const waTimeFormatted = new Date(dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      setSuccessMsg(`🎉 Reservation Confirmed! Table ${tableId} is reserved for ${name} on ${waTimeFormatted}.`);
      setStep('success');

      if (email.trim()) {
        setEmailStatus('📧 Sending confirmation email...');
        fetch('/api/send-reservation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toEmail: email.trim(), customerName: name.trim(), tableId, dateTime, guestsCount: guests })
        })
          .then(r => r.json())
          .then(data => {
            setEmailStatus(data.success ? `✅ Confirmation email sent to ${email.trim()}` : `⚠️ Email not sent: ${data.error}`);
          })
          .catch(() => setEmailStatus('⚠️ Could not reach email server.'));
      }

      setName(''); setPhone(''); setEmail(''); setDateTime('');
      return;
    }

    // Advance payment required — generate Razorpay link
    setStep('payment');
    setPayError(null);
    setPayLink(null);
    setPayLinkId(null);
    setIsGenerating(true);

    // Check for static link first
    const staticLink = localStorage.getItem('owner_razorpay_link');
    if (staticLink && staticLink.trim() !== '') {
      setPayLink(staticLink.trim());
      setIsGenerating(false);
      return;
    }

    try {
      const res = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: advanceAmount,
          receipt: `RES-${newReservation.id}`,
          callbackUrl: window.location.href
        })
      });
      const data = await res.json();
      if (res.ok && data.link) {
        setPayLink(data.link);
        setPayLinkId(data.id);
      } else {
        setPayError(data.error || 'Failed to generate payment link.');
      }
    } catch {
      setPayError('Network error. Could not connect to payment server.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new Event('popstate'));
  };

  const handleStartOver = () => {
    setStep('form');
    setName(''); setPhone(''); setEmail(''); setDateTime('');
    setPayLink(null); setPayLinkId(null); setPayError(null);
    setSuccessMsg(null); setEmailStatus(null);
    setPendingReservation(null);
  };

  const customerReservations = reservations.filter(r => r.phone === phone.trim() && phone.trim() !== '');

  // ─── SUCCESS VIEW ──────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: '20px', textAlign: 'center', borderTop: '4px solid #10b981' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', margin: '0 0 0.5rem' }}>Reservation Confirmed!</h1>
          {successMsg && <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{successMsg}</p>}

          {requiresPayment && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#34d399' }}>
              ✅ Advance payment of ₹{advanceAmount} received via Razorpay
            </div>
          )}

          {emailStatus && (
            <div style={{ fontSize: '0.85rem', color: emailStatus.startsWith('✅') ? '#34d399' : '#fbbf24', marginBottom: '1.5rem' }}>
              {emailStatus}
            </div>
          )}

          {pendingReservation && (
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div><span style={{ color: '#64748b' }}>👤 Name</span><br/><strong>{pendingReservation.customerName}</strong></div>
                <div><span style={{ color: '#64748b' }}>🪑 Table</span><br/><strong style={{ color: '#38bdf8' }}>Table {pendingReservation.tableId}</strong></div>
                <div><span style={{ color: '#64748b' }}>📅 Time</span><br/><strong>{new Date(pendingReservation.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
                <div><span style={{ color: '#64748b' }}>👥 Guests</span><br/><strong>{pendingReservation.guestsCount}</strong></div>
              </div>
            </div>
          )}

          <button
            onClick={handleStartOver}
            style={{ background: 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)', color: '#0f172a', border: 'none', padding: '0.9rem 2rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}
          >
            Book Another Table
          </button>
        </div>
      </div>
    );
  }

  // ─── PAYMENT VIEW ──────────────────────────────────────────────────
  if (step === 'payment') {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '540px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '20px', borderTop: '4px solid #0ea5e9' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <CreditCard size={36} color="#38bdf8" style={{ marginBottom: '0.75rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>Pay Reservation Advance</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.4rem' }}>
              Table {pendingReservation?.tableId} · {pendingReservation?.customerName}
            </p>
          </div>

          {/* Amount badge */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Advance Amount</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', margin: '0.3rem 0' }}>₹{advanceAmount}</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Paid securely via Razorpay · Non-refundable advance</span>
          </div>

          {payError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {payError}
            </div>
          )}

          {isGenerating ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ margin: 0 }}>Generating secure payment link...</p>
            </div>
          ) : payLink ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
              {/* QR Code */}
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payLink)}`}
                  alt="Scan to pay"
                  width={200}
                  height={200}
                  style={{ display: 'block', borderRadius: '8px' }}
                />
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                📸 Scan QR to pay, or click the button below
              </p>
              <a
                href={payLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                  color: '#fff',
                  padding: '1rem 2rem',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 15px rgba(14,165,233,0.3)',
                  display: 'block',
                  textAlign: 'center',
                  width: '100%'
                }}
              >
                📱 Pay ₹{advanceAmount} via Razorpay
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                Auto-verifying payment every 3 seconds...
              </div>
            </div>
          ) : (
            <button
              onClick={async () => {
                setIsGenerating(true);
                setPayError(null);
                try {
                  const res = await fetch('/api/create-payment-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: advanceAmount, receipt: `RES-${pendingReservation?.id}`, callbackUrl: window.location.href })
                  });
                  const data = await res.json();
                  if (res.ok && data.link) { setPayLink(data.link); setPayLinkId(data.id); }
                  else setPayError(data.error || 'Failed to generate link.');
                } catch { setPayError('Network error.'); }
                finally { setIsGenerating(false); }
              }}
              style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '0.85rem 1.5rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
            >
              Generate Payment Link
            </button>
          )}

          <button
            onClick={() => { setStep('form'); setPayLink(null); setPayLinkId(null); setPayError(null); }}
            style={{ marginTop: '1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', width: '100%', fontSize: '0.85rem' }}
          >
            ← Go back to form
          </button>
        </div>
      </div>
    );
  }

  // ─── FORM VIEW ────────────────────────────────────────────────────
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
            Each booking is reserved for <strong>1 hour 30 minutes</strong>.
          </p>
          {requiresPayment && (
            <div style={{ marginTop: '0.75rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '8px', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#fbbf24' }}>
              🪙 <strong>₹{advanceAmount} advance</strong> will be charged via Razorpay to confirm your reservation.
            </div>
          )}
        </header>

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
                type="text" required placeholder="Enter your name" value={name}
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
                type="tel" required placeholder="e.g. 9876543210" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Email (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gmail Address <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — confirmation email)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email" placeholder="your@gmail.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                <select value={guests} onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
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
                <select value={tableId} onChange={(e) => setTableId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>
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
                type="datetime-local" required value={dateTime}
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
              background: requiresPayment
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, var(--accent-secondary) 0%, #06b6d4 100%)',
              color: '#0f172a',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: requiresPayment ? '0 4px 15px rgba(245,158,11,0.3)' : '0 4px 15px rgba(6, 182, 212, 0.2)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {requiresPayment ? (
              <><CreditCard size={18} /> Proceed to Pay ₹{advanceAmount} & Reserve</>
            ) : (
              <>✅ Confirm Reservation (90 Min Limit)</>
            )}
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
