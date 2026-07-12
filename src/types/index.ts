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
  type: 'Call Waiter' | 'Request Bill' | 'Cash Payment Collection' | 'UPI Payment Completed';
  status: 'Pending' | 'Resolved';
  timestamp: number;
  resolvedBy?: string;
}

export interface TableOccupancy {
  occupied: boolean;
  customerName?: string;
  guestsCount?: number;
  checkInTime?: number;
  openedBy?: 'Customer' | 'Waiter';
}

// BroadcastChannel event message definitions
export type BroadcastEvent =
  | { type: 'NEW_ORDER'; order: Order; customerName?: string }
  | { type: 'UPDATE_ORDER_STATUS'; orderId: string; status: OrderStatus; servedBy?: string }
  | { type: 'UPDATE_ORDER_ITEM_STATUS'; orderId: string; itemIndex: number; status: OrderStatus }
  | { type: 'NEW_SERVICE_REQUEST'; request: ServiceRequest }
  | { type: 'RESOLVE_SERVICE_REQUEST'; requestId: string; resolvedBy?: string }
  | { type: 'TABLE_CHECK_IN'; tableId: string; customerName: string; guestsCount: number; openedBy?: 'Customer' | 'Waiter' }
  | { type: 'TABLE_CHECK_OUT'; tableId: string; paymentMethod?: 'Cash' | 'UPI' }
  | { type: 'SYNC_STATE'; orders: Order[]; requests: ServiceRequest[]; tablesOccupancy: { [tableId: string]: TableOccupancy } }
  | { type: 'REQUEST_SYNC' };
