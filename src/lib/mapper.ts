
import { Order, OrderStatus, PaymentStatus, Address, OrderItem } from '@/lib/types';

// Map PocketBase order record to our Order type
export const mapPocketBaseOrderToOrder = (record: any): Order => {
  // Extract shipping address from expanded record or use default structure
  const shippingAddress = record.expand?.shipping_address || record.shipping_address;
  
  // Map shipping address to our Address type
  const mappedAddress: Address = {
    id: shippingAddress.id || '',
    user_id: shippingAddress.user_id || '',
    name: shippingAddress.name || '',
    street: shippingAddress.street || '',
    city: shippingAddress.city || '',
    state: shippingAddress.state || '',
    postal_code: shippingAddress.postal_code || '',
    country: shippingAddress.country || 'India',
    phone: shippingAddress.phone || '',
    is_default: shippingAddress.is_default || false
  };

  // Extract user from expanded record or use default values
  const user = record.expand?.user_id || {};

  // Extract and map order items
  const items: OrderItem[] = record.items?.map((item: any) => ({
    id: item.id || '',
    order_id: record.id,
    product_id: item.product_id || '',
    product_name: item.product_name || '',
    product_price: item.product_price || 0,
    quantity: item.quantity || 0,
    total: item.total || 0,
    product_image: item.product_image || undefined
  })) || [];

  // Map to our Order type
  return {
    id: record.id || '',
    user_id: record.user_id || '',
    user_name: user.name || record.user_name || '',
    user_email: user.email || record.user_email || '',
    status: (record.status as OrderStatus) || 'pending',
    payment_status: (record.payment_status as PaymentStatus) || 'pending',
    payment_id: record.payment_id,
    payment_method: record.payment_method,
    shipping_address: mappedAddress,
    items: items,
    subtotal: record.subtotal || 0,
    shipping_fee: record.shipping_fee || 0,
    tax: record.tax || 0,
    discount: record.discount || 0,
    total: record.total || 0,
    notes: record.notes,
    created: record.created || new Date().toISOString(),
    updated: record.updated || new Date().toISOString()
  };
};
