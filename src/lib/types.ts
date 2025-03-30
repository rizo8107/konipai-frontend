
export interface User {
  id: string;
  email: string;
  name: string;
  created: string;
  role: 'admin' | 'customer';
}

export interface Address {
  id: string;
  user_id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  product_image?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export interface Order {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_id?: string;
  payment_method?: string;
  shipping_address: Address;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  created: string;
  updated: string;
}

export interface DashboardMetrics {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_revenue: number;
  average_order_value: number;
  revenue_today: number;
}
