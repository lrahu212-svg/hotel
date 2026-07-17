import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import https from 'https';
import nodemailer from 'nodemailer';


const app = express();
const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(process.cwd(), 'hotel_state.json');
const distPath = path.join(process.cwd(), 'dist');

let clients = [];
let state = {
  orders: [],
  requests: [],
  tablesOccupancy: {},
  settings: {},
  reservations: [],
  inventory: [],
  menuItems: []
};

// Load state from file if exists
try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    if (raw) {
      state = JSON.parse(raw);
      if (!state.inventory) state.inventory = [];
      if (!state.menuItems) state.menuItems = [];
      console.log('Loaded state from hotel_state.json');
    }
  }
} catch (err) {
  console.error('Error loading state file:', err.message);
}

// Seed default inventory values if empty
if (!state.inventory || state.inventory.length === 0) {
  state.inventory = [
    { id: 'inv_1', name: 'Coffee Beans', quantity: 2000, unit: 'g', threshold: 500 },
    { id: 'inv_2', name: 'Milk', quantity: 5000, unit: 'ml', threshold: 1000 },
    { id: 'inv_3', name: 'Flour', quantity: 3000, unit: 'g', threshold: 1000 },
    { id: 'inv_4', name: 'Sugar', quantity: 1500, unit: 'g', threshold: 300 },
    { id: 'inv_5', name: 'Water', quantity: 10000, unit: 'ml', threshold: 2000 }
  ];
}

const saveState = () => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving state file:', err.message);
  }
};

app.use(cors());
app.use(express.json());
app.use(express.static(distPath));

// Get current system state endpoint (fallback / initialization)
app.get('/api/state', (req, res) => {
  const { serverSecrets: _serverSecrets, ...safeState } = state;
  res.json(safeState);
});

// Server-Sent Events Endpoint
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial sync state to client (but strip secrets!)
  const { serverSecrets: _serverSecrets, ...safeState } = state;
  res.write(`data: ${JSON.stringify({ type: 'SYNC_STATE', ...safeState })}\n\n`);

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

// Event POST Endpoint
app.post('/event', (req, res) => {
  try {
    const event = req.body;
    
    // Update local server state
    if (event.type === 'NEW_ORDER') {
      state.orders = [...state.orders.filter(o => o.id !== event.order.id), event.order];
      
      // Deduct ingredients from inventory
      const INGREDIENT_MAPS = {
        'c1': { 'inv_1': 15, 'inv_5': 50 }, // Espresso
        'c2': { 'inv_1': 30, 'inv_5': 100 }, // Double Espresso
        'c3': { 'inv_1': 15, 'inv_5': 200 }, // Americano
        'c4': { 'inv_1': 15, 'inv_2': 50, 'inv_5': 50 }, // Macchiato
        'c5': { 'inv_1': 15, 'inv_2': 150, 'inv_5': 50 }, // Cappuccino
        'c6': { 'inv_1': 15, 'inv_2': 200, 'inv_5': 50 }, // Latte
        'm1': { 'inv_3': 100, 'inv_2': 50, 'inv_4': 20 }, // Pancake
        'm2': { 'inv_3': 50, 'inv_4': 30 } // Pastry
      };

      if (event.order.items) {
        event.order.items.forEach(item => {
          const recipe = INGREDIENT_MAPS[item.menuItemId];
          if (recipe) {
            Object.entries(recipe).forEach(([ingId, qtyNeeded]) => {
              const ing = state.inventory.find(i => i.id === ingId);
              if (ing) {
                ing.quantity = Math.max(0, ing.quantity - (qtyNeeded * item.quantity));
                // Add system alert warning if quantity falls below threshold
                if (ing.quantity < ing.threshold) {
                  const alertId = `alert_${ingId}_${Date.now()}`;
                  const alertMessage = `⚠️ Low stock warning: ${ing.name} is down to ${ing.quantity}${ing.unit} (Threshold: ${ing.threshold}${ing.unit})`;
                  const alreadyAlerted = state.requests.some(r => r.type === 'Warning' && r.text.includes(ing.name) && r.status !== 'Resolved');
                  if (!alreadyAlerted) {
                    state.requests.push({
                      id: alertId,
                      tableId: 'System',
                      type: 'Warning',
                      text: alertMessage,
                      status: 'Pending',
                      timestamp: Date.now()
                    });
                  }
                }
              }
            });
          }
        });
      }
    } else if (event.type === 'UPDATE_ORDER_STATUS') {
      state.orders = state.orders.map(o => {
        if (o.id === event.orderId) {
          // Also update items status
          let newItems = o.items;
          if (event.status === 'Ready' || event.status === 'Served') {
            newItems = o.items.map(item => ({ ...item, status: event.status }));
          }
          return { ...o, status: event.status, servedBy: event.servedBy || o.servedBy, items: newItems };
        }
        return o;
      });
    } else if (event.type === 'UPDATE_ORDER_ITEM_STATUS') {
      state.orders = state.orders.map(o => {
        if (o.id === event.orderId) {
          const newItems = [...o.items];
          if (newItems[event.itemIndex]) {
            newItems[event.itemIndex] = { ...newItems[event.itemIndex], status: event.status };
          }
          const allServed = newItems.every(item => item.status === 'Served');
          const allReadyOrServed = newItems.every(item => item.status === 'Ready' || item.status === 'Served');
          const newOrderStatus = allServed ? 'Served' : (allReadyOrServed ? 'Ready' : (o.status === 'Pending' ? 'Preparing' : o.status));

          return { ...o, items: newItems, status: newOrderStatus };
        }
        return o;
      });
    } else if (event.type === 'NEW_SERVICE_REQUEST') {
      state.requests = [...state.requests.filter(r => r.id !== event.request.id), event.request];
    } else if (event.type === 'RESOLVE_SERVICE_REQUEST') {
      state.requests = state.requests.map(r => r.id === event.requestId ? { ...r, status: 'Resolved', resolvedBy: event.resolvedBy } : r);
    } else if (event.type === 'TABLE_CHECK_IN') {
      state.tablesOccupancy[event.tableId] = {
        occupied: true,
        customerName: event.customerName,
        guestsCount: event.guestsCount,
        checkInTime: Date.now(),
        openedBy: event.openedBy || 'Customer'
      };
    } else if (event.type === 'TABLE_CHECK_OUT') {
      state.tablesOccupancy[event.tableId] = { occupied: false };
      state.orders = state.orders.map(o => o.tableId === event.tableId ? { ...o, tableId: `${event.tableId}_archived_${Date.now()}`, status: 'Served' } : o);
      state.requests = state.requests.filter(r => r.tableId !== event.tableId);
    } else if (event.type === 'UPDATE_SETTINGS') {
      state.settings = { ...state.settings, ...event.settings };
    } else if (event.type === 'ADD_RESERVATION') {
      state.reservations = [...(state.reservations || []).filter(r => r.id !== event.reservation.id), event.reservation];
    } else if (event.type === 'REMOVE_RESERVATION') {
      state.reservations = (state.reservations || []).filter(r => r.id !== event.reservationId);
    } else if (event.type === 'UPDATE_INVENTORY') {
      state.inventory = event.inventory || [];
    } else if (event.type === 'UPDATE_MENU') {
      state.menuItems = event.menuItems || [];
    } else if (event.type === 'ADD_TABLE') {
      state.tablesOccupancy[event.tableId] = { occupied: false };
    } else if (event.type === 'REMOVE_TABLE') {
      delete state.tablesOccupancy[event.tableId];
      // Clean up requests and orders for that table
      state.requests = state.requests.filter(r => r.tableId !== event.tableId);
    } else if (event.type === 'SYNC_STATE') {
      state.orders = event.orders || [];
      state.requests = event.requests || [];
      state.tablesOccupancy = event.tablesOccupancy || {};
      state.reservations = event.reservations || [];
      state.inventory = event.inventory || [];
      state.menuItems = event.menuItems || [];
      if (event.settings) {
        if (event.settings.resetAllSettings) {
          state.settings = {};
          delete state.serverSecrets;
          state.reservations = [];
        } else {
          state.settings = { ...state.settings, ...event.settings };
        }
      }
    }

    saveState();

    // Broadcast event to all clients
    const message = `data: ${JSON.stringify(event)}\n\n`;
    clients.forEach(c => c.write(message));

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Secure endpoint to save Razorpay keys in server memory (not broadcasted via SSE)
app.post('/api/save-razorpay-keys', (req, res) => {
  try {
    const { keyId, keySecret } = req.body;
    
    // Store securely in server settings only (not in broadcasted state.settings)
    // Keep existing secret if the user submitted an empty one
    state.serverSecrets = {
      ...state.serverSecrets,
      ...(keyId !== undefined && { razorpayKeyId: keyId }),
      ...(keySecret && keySecret.trim() !== '' && { razorpayKeySecret: keySecret })
    };
    saveState();
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Secure endpoint to create a dynamic locked Razorpay Payment Link
app.post('/api/create-payment-link', (req, res) => {
  try {
    const { amount, receipt, callbackUrl } = req.body;
    const keyId = process.env.RAZORPAY_KEY_ID || state.serverSecrets?.razorpayKeyId;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || state.serverSecrets?.razorpayKeySecret;

    if (!keyId || !keySecret) {
      return res.status(400).json({ error: 'Razorpay API keys are not configured by the owner.' });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    const requestData = JSON.stringify({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      accept_partial: false,
      reference_id: receipt,
      description: `Payment for Order ${receipt}`,
      customer: {
        name: 'Restaurant Customer',
        email: 'customer@restaurant.local'
      },
      reminder_enable: false,
      callback_url: callbackUrl,
      callback_method: 'get'
    });

    const options = {
      hostname: 'api.razorpay.com',
      port: 443,
      path: '/v1/payment_links',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Content-Length': requestData.length
      }
    };

    const razorpayReq = https.request(options, (razorpayRes) => {
      let data = '';
      razorpayRes.on('data', (chunk) => { data += chunk; });
      razorpayRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (razorpayRes.statusCode === 200 && parsed.short_url) {
            res.json({ link: parsed.short_url, id: parsed.id });
          } else {
            console.error('Razorpay Error:', parsed);
            res.status(400).json({ error: parsed.error?.description || 'Failed to generate link' });
          }
        } catch {
          res.status(500).json({ error: 'Invalid response from Razorpay' });
        }
      });
    });

    razorpayReq.on('error', (e) => {
      console.error('Razorpay Request Error:', e);
      res.status(500).json({ error: 'Network error communicating with Razorpay' });
    });

    razorpayReq.write(requestData);
    razorpayReq.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the static frontend files
app.use(express.static(distPath));

// Endpoint to check payment link status
app.get('/api/check-payment-status', (req, res) => {
  try {
    const { id } = req.query;
    const keyId = process.env.RAZORPAY_KEY_ID || state.serverSecrets?.razorpayKeyId;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || state.serverSecrets?.razorpayKeySecret;

    if (!id || !keyId || !keySecret) {
      return res.status(400).json({ error: 'Missing required parameters or API keys' });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    const options = {
      hostname: 'api.razorpay.com',
      port: 443,
      path: `/v1/payment_links/${id}`,
      method: 'GET',
      headers: { 'Authorization': `Basic ${auth}` }
    };

    const razorpayReq = https.request(options, (razorpayRes) => {
      let data = '';
      razorpayRes.on('data', (chunk) => { data += chunk; });
      razorpayRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (razorpayRes.statusCode === 200) {
            res.json({ status: parsed.status }); // status is usually 'created', 'paid', 'cancelled'
          } else {
            res.status(400).json({ error: parsed.error?.description || 'Failed to check status' });
          }
        } catch {
          res.status(500).json({ error: 'Invalid response from Razorpay' });
        }
      });
    });

    razorpayReq.on('error', (_e) => {
      res.status(500).json({ error: 'Network error checking payment status' });
    });

    razorpayReq.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Gmail SMTP credentials securely in server memory
app.post('/api/save-gmail-config', (req, res) => {
  try {
    const { gmailUser, gmailAppPassword } = req.body;
    state.serverSecrets = {
      ...state.serverSecrets,
      ...(gmailUser && gmailUser.trim() !== '' && { gmailUser: gmailUser.trim() }),
      ...(gmailAppPassword && gmailAppPassword.trim() !== '' && { gmailAppPassword: gmailAppPassword.trim() })
    };
    saveState();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send reservation confirmation email via Gmail SMTP
app.post('/api/send-reservation-email', async (req, res) => {
  try {
    const { toEmail, customerName, tableId, dateTime, guestsCount } = req.body;

    const gmailUser = process.env.GMAIL_USER || state.serverSecrets?.gmailUser;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD || state.serverSecrets?.gmailAppPassword;

    if (!gmailUser || !gmailAppPassword) {
      return res.status(400).json({ error: 'Gmail credentials are not configured. Please set them in Reception Settings.' });
    }
    if (!toEmail) {
      return res.status(400).json({ error: 'No recipient email provided.' });
    }

    const formattedTime = new Date(dateTime).toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    const mailOptions = {
      from: `"Restaurant Reservation" <${gmailUser}>`,
      to: toEmail,
      subject: `✅ Table ${tableId} Reserved – ${formattedTime}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #fff; padding: 2rem; border-radius: 12px; border: 1px solid #1e293b;">
          <h1 style="color: #38bdf8; font-size: 1.5rem; margin-bottom: 0.5rem;">🎉 Reservation Confirmed!</h1>
          <p style="color: #94a3b8; margin-bottom: 2rem;">Your table has been successfully reserved. Here are your booking details:</p>

          <div style="background: #1e293b; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 0.75rem 0; color: #64748b; font-size: 0.9rem;">👤 Name</td>
                <td style="padding: 0.75rem 0; color: #fff; font-weight: 700;">${customerName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 0.75rem 0; color: #64748b; font-size: 0.9rem;">🪑 Table Number</td>
                <td style="padding: 0.75rem 0; color: #38bdf8; font-weight: 700; font-size: 1.1rem;">Table ${tableId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #334155;">
                <td style="padding: 0.75rem 0; color: #64748b; font-size: 0.9rem;">📅 Date & Time</td>
                <td style="padding: 0.75rem 0; color: #fff; font-weight: 700;">${formattedTime}</td>
              </tr>
              <tr>
                <td style="padding: 0.75rem 0; color: #64748b; font-size: 0.9rem;">👥 Guests</td>
                <td style="padding: 0.75rem 0; color: #fff; font-weight: 700;">${guestsCount} ${guestsCount === 1 ? 'Guest' : 'Guests'}</td>
              </tr>
            </table>
          </div>

          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="color: #fbbf24; margin: 0; font-size: 0.9rem;">⏰ <strong>Reminder:</strong> Each reservation is held for <strong>1 hour 30 minutes</strong> from the booked time. Please arrive on time.</p>
          </div>

          <p style="color: #64748b; font-size: 0.85rem; text-align: center; margin-top: 2rem;">
            We look forward to seeing you! 🍽️<br/>
            <span style="color: #38bdf8; font-weight: 600;">Powered by Volcano Restaurant System</span>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `Confirmation email sent to ${toEmail}` });
  } catch (err) {
    console.error('Email sending error:', err.message);
    res.status(500).json({ error: `Failed to send email: ${err.message}` });
  }
});

// Fallback to index.html for React router

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hotel App running on port ${PORT}`);
  console.log(`Ready for deployment!`);
});
