import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/components/tables/orders/columns';
import { useOrders } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { CreateOrderDialog } from '@/components/dialogs/CreateOrderDialog';
import { ViewOrderDialog } from '@/components/dialogs/ViewOrderDialog';
import { Order } from '@/types/schema';

const OrdersPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { orders, isLoading, error, createOrder } = useOrders();

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
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

        <DataTable
          columns={columns(handleViewOrder)}
          data={orders}
          isLoading={isLoading}
          searchField="id"
        />

        <CreateOrderDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={createOrder.mutateAsync}
        />

        <ViewOrderDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          order={selectedOrder}
        />
      </div>
    </AdminLayout>
  );
};

export default OrdersPage;
