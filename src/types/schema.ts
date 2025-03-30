// PocketBase Schema Types

import { RecordModel } from 'pocketbase';

export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
}

export interface User extends BaseRecord {
  email: string;
  name: string;
  avatar?: string;
  emailVisibility: boolean;
  verified: boolean;
}

export interface Product extends BaseRecord {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image?: string;
  images?: string[];
  category?: string;
  status: 'active' | 'inactive';
  // Extended product fields from the sample JSON
  colors?: string;
  features?: string;
  dimensions?: string;
  material?: string;
  care?: string;
  tags?: string;
  bestseller?: boolean;
  new?: boolean;
  inStock?: boolean;
  review?: number;
  specifications?: string;
  care_instructions?: string;
  usage_guidelines?: string;
}

export interface Coupon extends BaseRecord {
  code: string;
  discount_percent?: number;
  discount_amount?: number;
  valid_until: string;
  max_uses?: number;
  used_count: number;
}

export interface Order extends BaseRecord {
  id: string;
  user: string[];
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  products: string;
  totalAmount: number;
  subtotal: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'failed';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  coupon_code?: string;
  coupon_id?: string;
  discount_amount?: number;
  shipping_address_text?: string;
  tracking_link?: string;
  shipping_carrier?: string;
  refund_amount?: number;
  expand?: {
    user?: User[];
    coupon_id?: Coupon;
  };
}

export interface OrderItem extends BaseRecord {
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  expand?: {
    product_id?: Product;
  };
}

export interface Address extends BaseRecord {
  user_id: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  expand?: {
    user_id?: User;
  };
}

export interface RazorpayOrder extends BaseRecord {
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed';
  payment_id?: string;
  signature?: string;
  expand?: {
    order_id?: Order;
  };
}

// Create data types
export type CreateProductData = {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image?: string;
  images?: string[];
  category?: string;
  status: 'active' | 'inactive';
  collectionId?: string;
  collectionName?: string;
  colors?: string;
  features?: string;
  dimensions?: string;
  material?: string;
  care?: string;
  tags?: string;
  bestseller?: boolean;
  new?: boolean;
  inStock?: boolean;
  review?: number;
  specifications?: string;
  care_instructions?: string;
  usage_guidelines?: string;
};

export type CreateOrderData = {
  user: string[];
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  products: string;
  totalAmount: number;
  subtotal: number;
  total: number;
  payment_status: 'pending' | 'paid' | 'failed';
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  coupon_code?: string;
  coupon_id?: string;
  discount_amount?: number;
  shipping_address_text?: string;
};

export type CreateRazorpayOrderData = {
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed';
  payment_id?: string;
  signature?: string;
};

// Update data types
export type UpdateProductData = Partial<Omit<Product, keyof BaseRecord>>;

export type UpdateOrderData = Partial<CreateOrderData> & {
  status?: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'failed';
  tracking_link?: string;
  shipping_carrier?: string;
  refund_amount?: number;
  whatsapp_status?: 'pending' | 'sent' | 'failed';
  whatsapp_message_id?: string;
  whatsapp_error_message?: string;
};

export type UpdateRazorpayOrderData = Partial<Omit<RazorpayOrder, keyof BaseRecord>>;
