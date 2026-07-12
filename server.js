import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 3000;
const STATE_FILE = path.join(process.cwd(), 'hotel_state.json');

let clients = [];
let state = {
  orders: [],
  requests: [],
  tablesOccupancy: {},
  settings: {}
};

// Load state from file if exists
try {
  if (fs.existsSync(STATE_FILE)) {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    if (raw) {
      state = JSON.parse(raw);
      console.log('Loaded state from hotel_state.json');
    }
  }
} catch (err) {
  console.error('Error loading state file:', err.message);
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

// Server-Sent Events Endpoint
app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial sync state to client (but strip secrets!)
  const { serverSecrets, ...safeState } = state;
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
    } else if (event.type === 'UPDATE_SETTINGS') {
      state.settings = { ...state.settings, ...event.settings };
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
    // We keep it in state.serverSecrets so it saves to disk but is never broadcasted to frontend!
    state.serverSecrets = {
      ...state.serverSecrets,
      razorpayKeyId: keyId,
      razorpayKeySecret: keySecret
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
    const { amount, receipt } = req.body;
    const keyId = state.serverSecrets?.razorpayKeyId;
    const keySecret = state.serverSecrets?.razorpayKeySecret;

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
      reminder_enable: false
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
            res.json({ link: parsed.short_url });
          } else {
            console.error('Razorpay Error:', parsed);
            res.status(400).json({ error: parsed.error?.description || 'Failed to generate link' });
          }
        } catch (e) {
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
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback for React Router (catch-all)
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hotel App running on port ${PORT}`);
  console.log(`Ready for deployment!`);
});
