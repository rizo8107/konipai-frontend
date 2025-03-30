
import React from 'react';
import { 
  ShoppingBag, 
  Clock, 
  Check, 
  DollarSign, 
  TrendingUp, 
  Calendar 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardMetrics } from '@/lib/types';

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; positive: boolean };
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend 
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-konipai-100 flex items-center justify-center text-konipai-700">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-gray-500 mt-1 flex items-center">
            {trend && (
              <span className={`mr-1 flex items-center ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
                <TrendingUp size={12} className={!trend.positive ? 'transform rotate-180' : ''} />
                {trend.value}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

interface MetricsGridProps {
  metrics: DashboardMetrics;
  isLoading?: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 rounded-full bg-gray-200"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-gray-200 rounded mt-2"></div>
              <div className="h-3 w-32 bg-gray-200 rounded mt-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="Total Orders"
        value={metrics.total_orders}
        icon={<ShoppingBag size={16} />}
        description="All time orders"
      />
      
      <MetricCard
        title="Pending Orders"
        value={metrics.pending_orders}
        icon={<Clock size={16} />}
        description="Need attention"
      />
      
      <MetricCard
        title="Completed Orders"
        value={metrics.completed_orders}
        icon={<Check size={16} />}
        description="Successfully delivered"
      />
      
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(metrics.total_revenue)}
        icon={<DollarSign size={16} />}
        trend={{ value: 12.5, positive: true }}
        description="vs last month"
      />
      
      <MetricCard
        title="Average Order Value"
        value={formatCurrency(metrics.average_order_value)}
        icon={<TrendingUp size={16} />}
        trend={{ value: 3.2, positive: true }}
        description="vs last month"
      />
      
      <MetricCard
        title="Revenue Today"
        value={formatCurrency(metrics.revenue_today)}
        icon={<Calendar size={16} />}
        description="From today's orders"
      />
    </div>
  );
};
