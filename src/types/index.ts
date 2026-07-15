export interface OrderItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
  name: string; // snapshots name in case menu changes
  price: number; // snapshots price
  status?: OrderStatus;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Cancelled';

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: OrderStatus;
  timestamp: number;
  totalAmount: number;
  customerName?: string;
  servedBy?: string;
}

export interface ServiceRequest {
  id: string;
  tableId: string;
  type: 'Call Waiter' | 'Request Bill' | 'Cash Payment Collection' | 'UPI Payment Completed' | 'Warning';
  status: 'Pending' | 'Resolved';
  timestamp: number;
  resolvedBy?: string;
  text?: string;
}

export interface TableOccupancy {
  occupied: boolean;
  customerName?: string;
  guestsCount?: number;
  checkInTime?: number;
  openedBy?: 'Customer' | 'Waiter';
  phone?: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  phone: string;
  guestsCount: number;
  dateTime: string; // e.g. "2026-07-13T18:00"
  tableId: string;
  timestamp: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  threshold: number;
}

// BroadcastChannel event message definitions
export type BroadcastEvent =
  | { type: 'NEW_ORDER'; order: Order; customerName?: string }
  | { type: 'UPDATE_ORDER_STATUS'; orderId: string; status: OrderStatus; servedBy?: string }
  | { type: 'UPDATE_ORDER_ITEM_STATUS'; orderId: string; itemIndex: number; status: OrderStatus }
  | { type: 'NEW_SERVICE_REQUEST'; request: ServiceRequest }
  | { type: 'RESOLVE_SERVICE_REQUEST'; requestId: string; resolvedBy?: string }
  | { type: 'TABLE_CHECK_IN'; tableId: string; customerName: string; guestsCount: number; openedBy?: 'Customer' | 'Waiter'; phone?: string }
  | { type: 'TABLE_CHECK_OUT'; tableId: string; paymentMethod?: 'Cash' | 'UPI' }
  | { type: 'ADD_RESERVATION'; reservation: Reservation }
  | { type: 'REMOVE_RESERVATION'; reservationId: string }
  | { type: 'UPDATE_INVENTORY'; inventory: InventoryItem[] }
  | { type: 'ADD_TABLE'; tableId: string }
  | { type: 'REMOVE_TABLE'; tableId: string }
  | { type: 'SYNC_STATE'; orders: Order[]; requests: ServiceRequest[]; tablesOccupancy: { [tableId: string]: TableOccupancy }; settings?: any; reservations?: Reservation[]; inventory?: InventoryItem[] }
  | { type: 'REQUEST_SYNC' };
