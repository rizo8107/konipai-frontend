import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product } from '@/types/schema';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface ViewProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

type ColorData = {
  available?: string[];
  primary?: string;
};

type CareInstructions = {
  cleaning?: string[];
  storage?: string[];
};

type UsageGuidelines = {
  recommended_use?: string[];
  pro_tips?: string[];
};

type Specifications = {
  material?: string;
  dimensions?: string;
  weight?: string;
  capacity?: string;
  style?: string;
  pattern?: string;
  closure?: string;
  waterResistant?: boolean;
  [key: string]: any;
};

export function ViewProductDialog({ open, onOpenChange, product }: ViewProductDialogProps) {
  // If no product is selected, don't render the dialog content
  if (!product) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>No product selected</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Format image URL for PocketBase
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
    
    // Check if the image path is already a full URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Use the format from the backend
    return `https://backend-pocketbase.7za6uc.easypanel.host/api/files/${product.collectionId}/${product.id}/${imagePath}`;
  };

  // Safe access to product fields with fallbacks
  const safeProduct = {
    name: product?.name || 'Unnamed Product',
    description: product?.description || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    category: product?.category || 'Uncategorized',
    status: product?.status || 'inactive',
    created: product?.created || new Date().toISOString(),
    updated: product?.updated || new Date().toISOString(),
    inStock: product?.inStock || false,
    bestseller: product?.bestseller || false,
    new: product?.new || false,
    material: product?.material || '',
    dimensions: product?.dimensions || '',
    review: product?.review || 0,
    // Other fields with safe defaults
    colors: { available: [], primary: '' } as ColorData,
    specifications: {} as Specifications,
    care_instructions: { cleaning: [], storage: [] } as CareInstructions,
    usage_guidelines: { recommended_use: [], pro_tips: [] } as UsageGuidelines,
    features: [] as string[],
    tags: [] as string[],
    images: [] as string[]
  };

  // Parse JSON fields safely
  const parseJsonField = <T,>(field: string | null | undefined | object, defaultValue: T): T => {
    if (!field) return defaultValue;
    
    // If field is already an object, return it
    if (typeof field === 'object') return field as unknown as T;
    
    try {
      if (field === 'JSON' || field === '[object Object]') {
        return defaultValue;
      }
      return JSON.parse(field as string);
    } catch (e) {
      console.error(`Failed to parse JSON field: ${field}`, e);
      return defaultValue;
    }
  };

  // Try to parse product fields, but use defaults if they fail
  try {
    // Parse product fields with safe defaults
    const colors = parseJsonField<ColorData>(product.colors, { available: [], primary: '' });
    const specifications = parseJsonField<Specifications>(product.specifications, {});
    const careInstructions = parseJsonField<CareInstructions>(product.care_instructions, { cleaning: [], storage: [] });
    const usageGuidelines = parseJsonField<UsageGuidelines>(product.usage_guidelines, { recommended_use: [], pro_tips: [] });
    const features = parseJsonField<string[]>(product.features, []);
    const tags = parseJsonField<string[]>(product.tags, []);
    const care = parseJsonField<string[]>(product.care, []);

    // Get product images (ensure it's an array)
    const images = product.images ? 
      (Array.isArray(product.images) ? product.images : [product.images]) : 
      [];

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {safeProduct.name}
                  {product.new && <Badge variant="secondary">New</Badge>}
                  {product.bestseller && <Badge variant="default">Bestseller</Badge>}
                </DialogTitle>
                <DialogDescription>
                  Added on {formatDate(safeProduct.created)}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={product.inStock ? 'success' : 'destructive'}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                </Badge>
                <span className="text-xl font-bold">&#8377;{safeProduct.price.toFixed(2)}</span>
                {product.review && (
                  <span className="text-sm text-muted-foreground">
                    Rating: {product.review}/5
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="care">Care & Usage</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="details" className="space-y-4 p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="font-semibold">Name</Label>
                        <p>{safeProduct.name}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Category</Label>
                        <p>{safeProduct.category || 'Uncategorized'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Price</Label>
                        <p>&#8377;{safeProduct.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Status</Label>
                        <div className="flex gap-2 mt-1">
                          {product.inStock && <Badge variant="outline">In Stock</Badge>}
                          {product.new && <Badge variant="secondary">New</Badge>}
                          {product.bestseller && <Badge variant="default">Bestseller</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Product Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="font-semibold">Material</Label>
                        <p>{product.material || 'Not specified'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Dimensions</Label>
                        <p>{product.dimensions || 'Not specified'}</p>
                      </div>
                      {colors && colors.available && colors.available.length > 0 && (
                        <div>
                          <Label className="font-semibold">Colors</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {colors.primary && (
                              <Badge variant="outline" className="font-semibold">
                                {colors.primary} (Primary)
                              </Badge>
                            )}
                            {colors.available.map((color, i) => (
                              <Badge key={i} variant="outline">
                                {color}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line">{safeProduct.description || 'No description provided'}</p>
                    </CardContent>
                  </Card>

                  {tags && tags.length > 0 && (
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg">Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag, i) => (
                            <Badge key={i} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4 p-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {images && images.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {images.map((image: string, index: number) => (
                          <div key={index} className="overflow-hidden rounded-md border">
                            <AspectRatio ratio={1 / 1}>
                              <img 
                                src={getImageUrl(image)}
                                alt={`${safeProduct.name} - Image ${index + 1}`}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
                                }}
                              />
                            </AspectRatio>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <p className="text-muted-foreground">No images available for this product</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="specifications" className="space-y-4 p-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product Specifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {specifications && Object.keys(specifications).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(specifications).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 py-2 border-b border-muted">
                            <div className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</div>
                            <div>
                              {typeof value === 'boolean' 
                                ? (value ? 'Yes' : 'No')
                                : String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8">
                        <p className="text-muted-foreground">No specifications available for this product</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features" className="space-y-4 p-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {features && features.length > 0 ? (
                      <ul className="list-disc pl-6 space-y-1">
                        {features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No features listed for this product</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="care" className="space-y-4 p-1">
                {/* Simple care instructions if available */}
                {care && care.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Care Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-6 space-y-1">
                        {care.map((instruction, index) => (
                          <li key={index}>{instruction}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Detailed care instructions if available */}
                {careInstructions && (careInstructions.cleaning?.length > 0 || careInstructions.storage?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {careInstructions.cleaning && careInstructions.cleaning.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Cleaning Instructions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-6 space-y-1">
                            {careInstructions.cleaning.map((instruction, index) => (
                              <li key={index}>{instruction}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {careInstructions.storage && careInstructions.storage.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Storage Instructions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-6 space-y-1">
                            {careInstructions.storage.map((instruction, index) => (
                              <li key={index}>{instruction}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Usage guidelines if available */}
                {usageGuidelines && (usageGuidelines.recommended_use?.length > 0 || usageGuidelines.pro_tips?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {usageGuidelines.recommended_use && usageGuidelines.recommended_use.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Recommended Use</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-6 space-y-1">
                            {usageGuidelines.recommended_use.map((guideline, index) => (
                              <li key={index}>{guideline}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {usageGuidelines.pro_tips && usageGuidelines.pro_tips.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Pro Tips</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-6 space-y-1">
                            {usageGuidelines.pro_tips.map((tip, index) => (
                              <li key={index}>{tip}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Fallback message if no care or usage info available */}
                {(!care || care.length === 0) && 
                 (!careInstructions || (!careInstructions.cleaning?.length && !careInstructions.storage?.length)) &&
                 (!usageGuidelines || (!usageGuidelines.recommended_use?.length && !usageGuidelines.pro_tips?.length)) && (
                  <Card>
                    <CardContent className="text-center p-8">
                      <p className="text-muted-foreground">No care or usage information available for this product</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  } catch (error) {
    // Fallback UI in case of any rendering errors
    console.error('Error rendering product details:', error);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>Error loading product details</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <p className="text-destructive">There was an error displaying this product's details.</p>
            <p className="text-muted-foreground mt-2">Basic Information:</p>
            <ul className="mt-2 space-y-1">
              <li><strong>Name:</strong> {safeProduct.name}</li>
              <li><strong>Price:</strong> ₹{safeProduct.price.toFixed(2)}</li>
              <li><strong>Category:</strong> {safeProduct.category}</li>
              <li><strong>Material:</strong> {safeProduct.material}</li>
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
