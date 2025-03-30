import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { MetricsGrid } from '@/components/dashboard/DashboardMetrics';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal';
import { DashboardMetrics, Order, OrderStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { getDashboardMetrics, getMonthlyRevenueData, getOrders, updateOrderStatus } from '@/lib/pocketbase';
import { mapPocketBaseOrderToOrder } from '@/lib/mapper';

const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch metrics
        const metricsData = await getDashboardMetrics();
        setMetrics(metricsData);

        // Fetch revenue data for chart
        const revenueDataResponse = await getMonthlyRevenueData();
        setRevenueData(revenueDataResponse);

        // Fetch recent orders
        const ordersResponse = await getOrders(10); // Limit to 10 recent orders
        const mappedOrders = ordersResponse.items.map(mapPocketBaseOrderToOrder);
        setOrders(mappedOrders);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data. Please try again.',
          variant: 'destructive'
        });
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      // Update order status in PocketBase
      await updateOrderStatus(orderId, status);

      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: status as OrderStatus, updated: new Date().toISOString() } 
            : order
        )
      );
      
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          status: status as OrderStatus,
          updated: new Date().toISOString()
        });
      }
      
      toast({
        title: 'Order Updated',
        description: `Order ${orderId.slice(0, 8)} status changed to ${status}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update order status. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your store performance</p>
        </div>
        
        {/* Metrics Cards */}
        <MetricsGrid metrics={metrics} isLoading={isLoading} />
        
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue for the current year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={revenueData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="#0c8ee8" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Orders */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          <OrdersTable 
            orders={orders} 
            isLoading={isLoading}
            onViewOrder={handleViewOrder}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        </div>
        
        {/* Order Details Modal */}
        <OrderDetailsModal 
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;
