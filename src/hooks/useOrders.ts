import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { Order, Product, UpdateOrderData as SchemaUpdateOrderData } from '@/types/schema';
import { toast } from 'sonner';
import {
  sendOrderConfirmation,
  sendPaymentSuccess,
  sendPaymentFailed,
  sendOrderShipped,
  sendOutForDelivery,
  sendOrderDelivered,
  sendRefundConfirmation,
} from '@/lib/whatsapp';

export interface CreateOrderData {
  user_id: string;
  status: string;
  total_amount: number;
  shipping_address?: string;
  items?: string[];
}

// Extend the UpdateOrderData interface to include all properties used in this file
interface UpdateOrderData extends SchemaUpdateOrderData {
  refund_amount?: number;
  payment_status?: 'pending' | 'paid' | 'failed';
}

export function useOrders() {
  const queryClient = useQueryClient();

  // Fetch all orders
  const { data, isLoading, error } = useQuery<{ items: Order[], totalItems: number }>({    
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        await ensureAdminAuth();
        console.log('Fetching orders...');
        const records = await pb.collection('orders').getList(1, 100, {
          sort: '-created',
          expand: 'user_id,shipping_address,items',
        });
        console.log('Fetched orders:', records);

        return {
          items: records.items as Order[],
          totalItems: records.totalItems,
        };
      } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create order
  const createOrder = useMutation({
    mutationFn: async (data: CreateOrderData) => {
      try {
        await ensureAdminAuth();
        const record = await pb.collection('orders').create(data);
        return record;
      } catch (error) {
        console.error('Error creating order:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully');
      
      // Send WhatsApp order confirmation if customer phone is available
      try {
        const order = data as unknown as Order;
        if (order && order.customer_phone) {
          // Get order items to include in the confirmation
          pb.collection('order_items').getList(1, 100, {
            filter: `order_id="${order.id}"`,
            expand: 'product_id'
          }).then(itemsData => {
            // Create properly typed items array with product information
            const items = itemsData.items.map(item => {
              const product = item.expand?.product_id as unknown as Product;
              return {
                id: item.id,
                name: product ? product.name : 'Unknown Product',
                price: typeof item.price === 'number' ? item.price : parseFloat(item.price as string) || 0,
                quantity: typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity as string) || 1,
                image: product && product.images && product.images.length > 0 ? product.images[0] : undefined
              };
            });
            
            sendOrderConfirmation(order, items, order.customer_phone)
              .catch(err => console.error('Failed to send WhatsApp confirmation:', err));
          });
        }
      } catch (whatsappError) {
        console.error('Error sending WhatsApp notification:', whatsappError);
        // Don't throw error to prevent disrupting the main flow
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });

  // Update order
  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOrderData }) => {
      try {
        await ensureAdminAuth();
        
        // Get the current order to compare status changes
        const currentOrder = await pb.collection('orders').getOne(id);
        const newStatus = data.status;
        const currentStatus = currentOrder.status;
        const paymentStatus = currentOrder.payment_status;
        
        // Update the order
        const record = await pb.collection('orders').update(id, data);
        
        // Handle WhatsApp notifications based on status changes
        if (newStatus && newStatus !== currentStatus && record.customer_phone) {
          const orderRecord = record as unknown as Order;
          
          // Different notifications based on new status
          switch(newStatus) {
            case 'processing':
              // If payment is successful, send payment success notification
              if (paymentStatus === 'paid') {
                sendPaymentSuccess(orderRecord, orderRecord.customer_phone)
                  .catch(err => console.error('Failed to send payment success notification:', err));
              }
              break;
              
            case 'shipped': {
              // Get tracking info from order or use placeholder
              const trackingLink = orderRecord.tracking_link || `${window.location.origin}/track/${orderRecord.id}`;
              const carrier = orderRecord.shipping_carrier || 'Our Delivery Partner';
              
              sendOrderShipped(orderRecord, orderRecord.customer_phone, trackingLink, carrier)
                .catch(err => console.error('Failed to send order shipped notification:', err));
              break;
            }
              
            case 'out_for_delivery':
              sendOutForDelivery(orderRecord, orderRecord.customer_phone)
                .catch(err => console.error('Failed to send out for delivery notification:', err));
              break;
              
            case 'delivered': {
              const feedbackLink = `${window.location.origin}/feedback/${orderRecord.id}`;
              
              sendOrderDelivered(orderRecord, orderRecord.customer_phone, feedbackLink)
                .catch(err => console.error('Failed to send order delivered notification:', err));
              break;
            }
              
            case 'cancelled':
              // If refunded, send refund confirmation
              if (data.refund_amount || orderRecord.refund_amount) {
                const refundAmount = data.refund_amount || orderRecord.refund_amount || orderRecord.totalAmount;
                
                sendRefundConfirmation(orderRecord, orderRecord.customer_phone, refundAmount)
                  .catch(err => console.error('Failed to send refund confirmation:', err));
              }
              break;
          }
        }
        
        // Handle payment status changes
        if (data.payment_status && data.payment_status !== paymentStatus && record.customer_phone) {
          const orderRecord = record as unknown as Order;
          
          if (data.payment_status === 'paid') {
            sendPaymentSuccess(orderRecord, orderRecord.customer_phone)
              .catch(err => console.error('Failed to send payment success notification:', err));
          } else if (data.payment_status === 'failed') {
            const retryUrl = `${window.location.origin}/checkout/retry/${orderRecord.id}`;
            
            sendPaymentFailed(orderRecord, orderRecord.customer_phone, retryUrl)
              .catch(err => console.error('Failed to send payment failed notification:', err));
          }
        }
        
        return record;
      } catch (error) {
        console.error('Error updating order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update order: ' + error.message);
    },
  });

  // Delete order
  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      try {
        await ensureAdminAuth();
        await pb.collection('orders').delete(id);
      } catch (error) {
        console.error('Error deleting order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete order: ' + error.message);
    },
  });

  return {
    orders: data?.items || [],
    totalItems: data?.totalItems || 0,
    isLoading,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
  };
}
