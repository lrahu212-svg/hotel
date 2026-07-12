import http from 'http';
import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'hotel_state.json');

let clients = [];
let state = {
  orders: [],
  requests: [],
  tablesOccupancy: {}
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

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/events' && req.method === 'GET') {
    // SSE Endpoint
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial sync state to client
    res.write(`data: ${JSON.stringify({ type: 'SYNC_STATE', ...state })}\n\n`);

    clients.push(res);

    req.on('close', () => {
      clients = clients.filter(c => c !== res);
    });
    return;
  }

  if (req.url === '/event' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        
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
        }

        saveState();

        // Broadcast event to all clients
        const message = `data: ${JSON.stringify(event)}\n\n`;
        clients.forEach(c => c.write(message));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sync Server running on http://localhost:${PORT}`);
});
