# Architectural State

This document outlines the architecture, database boundaries, API endpoints, and folder organization rules for the Hotel/Restaurant Management System.

---

## 1. Database Boundaries

The application uses a lightweight, local, file-based database structure instead of a traditional relational or NoSQL database server. 

### Data Store File
- **Path:** `hotel_state.json` (located at the workspace root)
- **Format:** JSON structure containing real-time application states.
- **Persistence Mechanism:** Synchronous writes via `fs.writeFileSync` on state change (`saveState()`).

### Security Boundary
- **Secrets vs. Public State:** The database holds a specific block called `serverSecrets` (containing Razorpay and Gmail API credentials).
- **Filtering:** The application specifically filters out `serverSecrets` when broadcasting updates or sending the initial sync state to client browsers via Server-Sent Events (SSE).

### Data Schema
- `orders`: Array of customer orders.
- `requests`: Array of active/resolved waiter or service requests.
- `tablesOccupancy`: Key-value map of table IDs to their active occupancy details (e.g., occupancy status, customer name, check-in time).
- `settings`: Client-visible system configuration (e.g., customized payment links).
- `reservations`: Table bookings mapping customer information to specific dates, times, and tables.
- `serverSecrets`: Sensitive, server-only API keys and credentials.

---

## 2. API Endpoints

The system exposes HTTP API endpoints and an SSE stream handled by `server.js`.

### Real-Time & State Events

#### `GET /events`
- **Description:** Server-Sent Events (SSE) stream for client synchronization.
- **Response:** `text/event-stream` stream broadcasting initial sync state (with `serverSecrets` removed) and subsequent realtime updates.

#### `POST /event`
- **Description:** Updates the local server state and broadcasts the event payload to all active SSE clients.
- **Payload Types:**
  - `NEW_ORDER`
  - `UPDATE_ORDER_STATUS`
  - `UPDATE_ORDER_ITEM_STATUS`
  - `NEW_SERVICE_REQUEST`
  - `RESOLVE_SERVICE_REQUEST`
  - `TABLE_CHECK_IN`
  - `TABLE_CHECK_OUT`
  - `UPDATE_SETTINGS`
  - `ADD_RESERVATION`
  - `REMOVE_RESERVATION`
  - `SYNC_STATE`

### Payment Operations (Razorpay)

#### `POST /api/save-razorpay-keys`
- **Description:** Saves Razorpay Key ID and Secret securely into `serverSecrets`.
- **Visibility:** Not broadcasted via SSE.

#### `POST /api/create-payment-link`
- **Description:** Communicates with Razorpay API to generate a payment link.
- **Payload:** Amount (converted to paise), receipt ID, callback URL.

#### `GET /api/check-payment-status`
- **Description:** Polls Razorpay API for the status of a specific payment link.

### Email Operations (Gmail SMTP)

#### `POST /api/save-gmail-config`
- **Description:** Saves Gmail SMTP credentials (user email and App Password) to `serverSecrets`.

#### `POST /api/send-reservation-email`
- **Description:** Sends a structured HTML confirmation email for table bookings using Nodemailer.

---

## 3. Folder Rules

To maintain codebase cleaniness and structural separation, the workspace adheres to the following organization rules:

- **Root Directory (`/`):** 
  - Backend operations (`server.js`)
  - Build/Config configurations (`tsconfig.json`, `vite.config.ts`, `vercel.json`, `package.json`)
  - Server database file (`hotel_state.json`)

- **Frontend Application Core (`/src/`):**
  - **`/src/types/`**: All application-wide TypeScript interfaces (`index.ts`) defining structure for orders, table occupancy, reservations, and event payloads. No logic should be stored here.
  - **`/src/data/`**: Static datasets or local configuration files (e.g., the restaurant menu data in `menu.ts`).
  - **`/src/components/`**: Reusable modular UI components (e.g., buttons, modals, cards).
  - **`/src/assets/`**: Static frontend assets such as images and icons.

- **Admin Dashboard (`/admin pannel/`):**
  - Reserved namespace for future isolated administrative scripts/controls.
