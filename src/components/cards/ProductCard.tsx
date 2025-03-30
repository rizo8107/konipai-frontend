import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types/schema';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { formatDate } from '@/lib/utils';
import { Eye, Pencil } from 'lucide-react';
import { getImageUrl } from '@/lib/pocketbase';

interface ProductCardProps {
  product: Product;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
}

export function ProductCard({ product, onView, onEdit }: ProductCardProps) {
  // Defensive check at the component level
  if (!product) {
    console.error('ProductCard received null or undefined product');
    return null;
  }

  // Get the image or placeholder
  const getProductImageUrl = (product: Product) => {
    try {
      // Safety check for product properties
      if (!product || !product.collectionId || !product.id) {
        return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
      }
      
      if (Array.isArray(product.images) && product.images.length > 0) {
        return getImageUrl(product.collectionId, product.id, product.images[0]);
      } else if (typeof product.images === 'string' && product.images) {
        return getImageUrl(product.collectionId, product.id, product.images);
      } else if (product.image) {
        return getImageUrl(product.collectionId, product.id, product.image);
      }
      return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
    } catch (error) {
      console.error('Error generating product image URL:', error);
      return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="relative">
        <AspectRatio ratio={1}>
          <img
            src={getProductImageUrl(product)}
            alt={product.name || 'Product'}
            className="object-cover w-full h-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
            }}
          />
        </AspectRatio>
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {product.status && (
            <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </Badge>
          )}
          {product.stock === 0 && (
            <Badge variant="destructive" className="text-xs">
              Out of Stock
            </Badge>
          )}
          {product.bestseller && (
            <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
              Bestseller
            </Badge>
          )}
          {product.new && (
            <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
              New
            </Badge>
          )}
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex flex-col space-y-1">
          <h3 className="font-semibold text-base leading-tight line-clamp-2">{product.name || 'Unnamed Product'}</h3>
          <p className="text-sm text-muted-foreground">{product.category || 'Uncategorized'}</p>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2 flex-grow">
        <div className="flex flex-col space-y-2">
          <p className="text-lg font-semibold">₹{product.price ? product.price.toFixed(2) : '0.00'}</p>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
          )}
          <div className="text-xs text-muted-foreground mt-auto">
            <span>Added: {product.created ? formatDate(product.created) : 'Unknown'}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onView(product)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onEdit(product)}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </CardFooter>
    </Card>
  );
}
