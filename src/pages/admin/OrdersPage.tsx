import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { CreateOrderDialog } from '@/components/dialogs/CreateOrderDialog';
import { ViewOrderDialog } from '@/components/dialogs/ViewOrderDialog';
import { EditOrderDialog } from '@/components/dialogs/EditOrderDialog';
import { UpdateOrderData } from '@/types/schema';
import { Order } from '@/lib/types';
import { OrdersTable } from '@/components/orders/OrdersTable';

const OrdersPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { orders, isLoading, error, createOrder, updateOrder } = useOrders();

  const handleViewOrder = (order: Order) => {
    const schemaOrder = {
      id: order.id,
      user: [order.user_id],
      customer_name: order.user_name,
      customer_email: order.user_email,
      customer_phone: '',
      status: order.status,
      payment_status: order.payment_status,
      total: order.total,
      subtotal: order.subtotal,
      totalAmount: order.total,
      created: order.created,
      updated: order.updated,
      shipping_address_text: formatAddress(order.shipping_address),
      notes: order.notes || '',
      products: JSON.stringify(order.items)
    };
    
    setSelectedOrder(schemaOrder as any);
    setIsViewDialogOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    const schemaOrder = {
      id: order.id,
      user: [order.user_id],
      customer_name: order.user_name,
      customer_email: order.user_email,
      customer_phone: '',
      status: order.status,
      payment_status: order.payment_status,
      total: order.total,
      subtotal: order.subtotal,
      totalAmount: order.total,
      created: order.created,
      updated: order.updated,
      shipping_address_text: formatAddress(order.shipping_address),
      notes: order.notes || '',
      products: JSON.stringify(order.items)
    };
    
    setSelectedOrder(schemaOrder as any);
    setIsEditDialogOpen(true);
  };

  const formatAddress = (address: any) => {
    if (!address) return '';
    
    const { street, city, state, postal_code, country } = address;
    return [
      street,
      city,
      state,
      postal_code,
      country
    ].filter(Boolean).join(', ');
  };

  const handleUpdateOrder = async (id: string, data: UpdateOrderData) => {
    try {
      await updateOrder.mutateAsync({ id, data });
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const handleCreateOrder = async (data: any) => {
    try {
      await createOrder.mutateAsync(data);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="p-4 text-red-500">
          Error loading orders: {error.message}
        </div>
      </AdminLayout>
    );
  }

  const ordersForTable = orders.map(order => ({
    id: order.id,
    user_id: Array.isArray(order.user) && order.user.length > 0 ? order.user[0] : '',
    user_name: order.customer_name,
    user_email: order.customer_email,
    status: order.status as any,
    payment_status: order.payment_status as any,
    shipping_address: {
      id: '',
      user_id: '',
      name: '',
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: order.shipping_address_text || '',
      phone: '',
      is_default: false
    },
    items: [],
    subtotal: order.subtotal || 0,
    shipping_fee: 0,
    tax: 0,
    discount: 0,
    total: order.total || 0,
    notes: order.notes,
    created: order.created,
    updated: order.updated
  }));

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Orders</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Order
          </Button>
        </div>

        <OrdersTable
          orders={ordersForTable as any}
          isLoading={isLoading}
          onViewOrder={handleViewOrder}
          onEditOrder={handleEditOrder}
          onUpdateStatus={(orderId, status) => {
            handleUpdateOrder(orderId, { status });
          }}
        />

        <CreateOrderDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCreateOrder}
        />

        <ViewOrderDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          order={selectedOrder as any}
        />

        <EditOrderDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          order={selectedOrder as any}
          onSubmit={handleUpdateOrder}
        />
      </div>
    </AdminLayout>
  );
};

export default OrdersPage;
