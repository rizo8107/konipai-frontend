import React from 'react';
import { Product } from '@/types/schema';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProductCardGridProps {
  products: Product[];
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  isLoading?: boolean;
}

export function ProductCardGrid({ products, onView, onEdit, isLoading = false }: ProductCardGridProps) {
  // Add error handling for products array
  const validProducts = React.useMemo(() => {
    if (!Array.isArray(products)) {
      console.error('Products is not an array:', products);
      return [];
    }
    
    // Filter out null or undefined products
    return products.filter(product => {
      if (!product) {
        console.warn('Encountered null or undefined product in array');
        return false;
      }
      return true;
    });
  }, [products]);
  
  // Display loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <div className="flex space-x-2 pt-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Handle error if products is not an array
  if (!Array.isArray(products)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load products. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  // Display empty state
  if (validProducts.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No products found. Try adjusting your search criteria.</p>
      </div>
    );
  }

  // Render product cards
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {validProducts.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          onView={onView} 
          onEdit={onEdit} 
        />
      ))}
    </div>
  );
}
