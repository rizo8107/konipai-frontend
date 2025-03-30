import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/components/tables/payments/columns';
import { useRazorpayOrders } from '@/hooks/useRazorpayOrders';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { CreatePaymentDialog } from '@/components/dialogs/CreatePaymentDialog';

const PaymentsPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { razorpayOrders, isLoading, error, createRazorpayOrder } = useRazorpayOrders();

  // Debug the data
  console.log('Payments page - razorpayOrders:', razorpayOrders);

  if (error) {
    return <div className="p-4">Error loading payments: {error.message}</div>;
  }

  // Transform the data to match the expected format for the DataTable
  const tableData = razorpayOrders.map(order => ({
    id: order.id,
    razorpay_order_id: order.razorpay_order_id,
    amount: order.amount,
    status: order.status,
    payment_id: order.payment_id,
    created: order.created,
    updated: order.updated,
    // Include any other fields needed by the columns
  }));

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Payments</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={tableData}
          isLoading={isLoading}
          searchField="razorpay_order_id"
        />

        <CreatePaymentDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={createRazorpayOrder.mutateAsync}
        />
      </div>
    </AdminLayout>
  );
};

export default PaymentsPage;
