import { RazorpayOrder } from '@/types/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning';

export const columns = [
  {
    header: 'Order ID',
    accessorKey: 'razorpay_order_id',
    cell: (item: any) => (
      <span className="font-medium">{item.razorpay_order_id}</span>
    ),
  },
  {
    header: 'Amount',
    accessorKey: 'amount',
    cell: (item: any) => (
      <span>₹{item.amount ? (item.amount / 100).toFixed(2) : '0.00'}</span>
    ),
  },
  {
    header: 'Status',
    accessorKey: 'status',
    cell: (item: any) => {
      const statusMap: Record<string, BadgeVariant> = {
        created: 'secondary',
        paid: 'default',
        failed: 'destructive',
      };
      const variant: BadgeVariant = statusMap[item.status] || 'outline';

      return (
        <Badge variant={variant}>
          {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
        </Badge>
      );
    },
  },
  {
    header: 'Payment ID',
    accessorKey: 'payment_id',
    cell: (item: any) => (
      <span className="text-muted-foreground">
        {item.payment_id || 'Not paid'}
      </span>
    ),
  },
  {
    header: 'Created',
    accessorKey: 'created',
    cell: (item: any) => (
      <span className="text-muted-foreground">
        {item.created ? formatDate(item.created) : 'Unknown'}
      </span>
    ),
  },
  {
    header: 'Actions',
    accessorKey: 'actions',
    cell: (item: any) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          View
        </Button>
      </div>
    ),
  },
];
