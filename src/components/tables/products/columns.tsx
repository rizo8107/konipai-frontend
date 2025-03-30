import { Product } from '@/types/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const columns = (onView: (product: Product) => void, onEdit: (product: Product) => void) => [
  {
    header: 'Name',
    accessorKey: 'name',
    cell: (product: Product) => (
      <div className="flex flex-col">
        <span className="font-medium">{product.name}</span>
        {product.description && (
          <span className="text-sm text-muted-foreground">
            {product.description}
          </span>
        )}
      </div>
    ),
  },
  {
    header: 'Price',
    accessorKey: 'price',
    cell: (product: Product) => (
      <span className="font-medium">
        ₹{product.price ? product.price.toFixed(2) : '0.00'}
      </span>
    ),
  },
  {
    header: 'Stock',
    accessorKey: 'stock',
    cell: (product: Product) => (
      <span className={product.stock === 0 ? 'text-destructive' : ''}>
        {product.stock ?? 'N/A'}
      </span>
    ),
  },
  {
    header: 'Category',
    accessorKey: 'category',
    cell: (product: Product) => (
      <span className="text-muted-foreground">
        {product.category || 'Uncategorized'}
      </span>
    ),
  },
  {
    header: 'Status',
    accessorKey: 'status',
    cell: (product: Product) => {
      const variant = product.status === 'active' ? 'default' : 'secondary';
      return (
        <Badge variant={variant}>
          {product.status ? product.status.charAt(0).toUpperCase() + product.status.slice(1) : 'Unknown'}
        </Badge>
      );
    },
  },
  {
    header: 'Actions',
    accessorKey: 'actions',
    cell: (product: Product) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onView(product)}>
          View
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
          Edit
        </Button>
      </div>
    ),
  },
];
