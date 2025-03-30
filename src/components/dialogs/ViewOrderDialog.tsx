import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Order } from '@/types/schema';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useWhatsAppActivities } from '@/hooks/useWhatsAppActivities';
import { WhatsAppActivities } from '@/components/orders/WhatsAppActivities';
import { SendWhatsAppMessage } from '@/components/orders/SendWhatsAppMessage';
import { MessageSquare, Mail } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEmailActivities } from '@/hooks/useEmailActivities';
import { EmailActivities } from '@/components/orders/EmailActivities';
import { SendEmailMessage } from '@/components/orders/SendEmailMessage';

type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning';

interface ViewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

interface ProductItem {
  productId: string;
  quantity: number;
  color?: string;
  product: {
    id: string;
    name: string;
    price: number;
    images?: string[];
    description?: string;
    category?: string;
  };
}

export function ViewOrderDialog({ open, onOpenChange, order }: ViewOrderDialogProps) {
  const queryClient = useQueryClient();

  const orderStatusVariant: Record<string, BadgeVariant> = {
    pending: 'warning',
    processing: 'secondary',
    shipped: 'secondary',
    out_for_delivery: 'secondary',
    delivered: 'success',
    cancelled: 'destructive'
  };

  if (!order) return null;

  // Handle products data - could be a string, object, or array
  let products: ProductItem[] = [];
  try {
    console.log('Raw products data:', order.products);
    console.log('Products data type:', typeof order.products);
    
    // Check if products is already an object/array or a string that needs parsing
    if (typeof order.products === 'string') {
      // Handle case where it might be a stringified JSON
      if (order.products === '[object Object]') {
        // This is a special case where the string is literally "[object Object]"
        console.warn('Products data is "[object Object]" string, not valid JSON');
      } else if (order.products.trim() !== '') {
        // Only try to parse if it's not an empty string
        products = JSON.parse(order.products);
        console.log('Parsed products:', products);
      }
    } else if (Array.isArray(order.products)) {
      // If it's already an array, use it directly
      products = order.products;
      console.log('Using array products directly:', products);
    } else if (typeof order.products === 'object' && order.products !== null) {
      // If it's a single object, wrap it in an array
      products = [order.products as unknown as ProductItem];
      console.log('Using object product wrapped in array:', products);
    }
  } catch (e) {
    console.error('Failed to parse products data:', e);
  }

  // Status badge variants
  const paymentStatusVariant: Record<string, BadgeVariant> = {
    pending: 'secondary',
    paid: 'success',
    failed: 'destructive',
  };

  // Safely format date
  const safeFormatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      return formatDate(dateString);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Format image URL for PocketBase
  const getImageUrl = (imagePath: string) => {
    console.log('Image path received:', imagePath);
    
    if (!imagePath) {
      console.log('No image path provided, using placeholder');
      return 'https://placehold.co/200x200/e2e8f0/64748b?text=No+Image';
    }
    
    // Check if the image path is already a full URL
    if (imagePath.startsWith('http')) {
      console.log('Image path is already a full URL');
      return imagePath;
    }
    
    // For the format in the screenshot: "2yqo7r8y2o2xs02/koni_dh5t663hoc.9552_73228474847.jpg"
    try {
      // Use the exact URL format from the example
      const fullUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/pbc_4092854851/${imagePath}`;
      console.log('Generated image URL:', fullUrl);
      return fullUrl;
    } catch (e) {
      console.error('Error formatting image URL:', e);
      return 'https://placehold.co/200x200/e2e8f0/64748b?text=No+Image';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                Order #{order.id}
                <Badge variant={orderStatusVariant[order.status] || 'outline'}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Created on {safeFormatDate(order.created)}
              </DialogDescription>
            </div>
            <Badge variant={paymentStatusVariant[order.payment_status] || 'outline'} className="px-3 py-1">
              Payment: {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="payment">Payment Info</TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[70vh] pr-4">
            <TabsContent value="details" className="space-y-4 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="font-semibold">Name</Label>
                      <p>{order.customer_name}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Email</Label>
                      <p>{order.customer_email}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Phone</Label>
                      <p>{order.customer_phone || 'Not provided'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line">{order.shipping_address_text || 'No address provided'}</p>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line">{order.notes || 'No notes provided'}</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-4 p-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {products.length > 0 ? (
                    <div className="space-y-6">
                      {products.map((product, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
                          <div className="md:col-span-1">
                            {product.product?.images && Array.isArray(product.product.images) && product.product.images.length > 0 ? (
                              <div className="w-full max-w-[150px] mx-auto">
                                {(() => { 
                                  const imagePath = product.product.images[0];
                                  console.log('Product image data:', imagePath); 
                                  return null; 
                                })()}
                                <AspectRatio ratio={1 / 1} className="bg-muted rounded-md overflow-hidden">
                                  <img 
                                    src={getImageUrl(product.product.images[0])}
                                    alt={product.product.name}
                                    className="object-cover w-full h-full"
                                    onError={(e) => {
                                      console.log('Image failed to load, using placeholder');
                                      (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/e2e8f0/64748b?text=No+Image';
                                    }}
                                  />
                                </AspectRatio>
                              </div>
                            ) : (
                              <div className="w-full max-w-[150px] mx-auto">
                                <AspectRatio ratio={1 / 1} className="bg-muted rounded-md flex items-center justify-center">
                                  <span className="text-muted-foreground text-sm">No Image</span>
                                </AspectRatio>
                              </div>
                            )}
                          </div>
                          
                          <div className="md:col-span-3 flex flex-col justify-between">
                            <div>
                              <h4 className="font-medium text-base">{product.product?.name || 'Unknown Product'}</h4>
                              {product.color && <span className="text-sm text-muted-foreground">Color: {product.color}</span>}
                              {product.product?.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.product.description}</p>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 mt-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Quantity:</span>
                                <p className="font-medium">{product.quantity}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Price:</span>
                                <p className="font-medium">&#8377;{product.product?.price?.toFixed(2) || '0.00'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Subtotal:</span>
                                <p className="font-medium">&#8377;{((product.product?.price || 0) * product.quantity).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Subtotal:</span>
                          <span>&#8377;{order.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        
                        {order.discount_amount && order.discount_amount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span className="font-medium">Discount:</span>
                            <span>-&#8377;{order.discount_amount.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total:</span>
                          <span>&#8377;{order.total?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p>No product information available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4 p-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="font-semibold">Payment Status</Label>
                      <div>
                        <Badge variant={paymentStatusVariant[order.payment_status] || 'outline'}>
                          {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    {order.coupon_code && (
                      <div>
                        <Label className="font-semibold">Coupon Applied</Label>
                        <p>{order.coupon_code}</p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="font-semibold">Razorpay Order ID</Label>
                      <p>{order.razorpay_order_id || 'Not available'}</p>
                    </div>
                    
                    <div>
                      <Label className="font-semibold">Razorpay Payment ID</Label>
                      <p>{order.razorpay_payment_id || 'Not available'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>&#8377;{order.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    
                    {order.discount_amount && order.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-&#8377;{order.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between font-bold">
                      <span>Total Amount:</span>
                      <span>&#8377;{order.total?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 p-1 overflow-y-auto">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Send WhatsApp Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SendWhatsAppMessage 
                      order={order} 
                      onMessageSent={() => {
                        // This will trigger a refetch of the activities
                        queryClient.invalidateQueries({ queryKey: ['whatsapp_activities', order.id] });
                      }} 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Message History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WhatsAppActivitiesTab orderId={order.id} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4 p-1 overflow-y-auto">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Send Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SendEmailMessage 
                      order={order} 
                      onEmailSent={() => {
                        // This will trigger a refetch of the email activities
                        queryClient.invalidateQueries({ queryKey: ['email_activities', order.id] });
                      }} 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Email History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmailActivitiesTab orderId={order.id} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button>Print Invoice</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// WhatsApp Activities Tab Component
function WhatsAppActivitiesTab({ orderId }: { orderId: string }) {
  const { activities, isLoading, refetch } = useWhatsAppActivities(orderId);
  
  return (
    <WhatsAppActivities 
      activities={activities} 
      isLoading={isLoading} 
      orderId={orderId} 
    />
  );
}

// Email Activities Tab Component
function EmailActivitiesTab({ orderId }: { orderId: string }) {
  const { activities, isLoading, refetch } = useEmailActivities(orderId);
  
  return (
    <EmailActivities 
      activities={activities} 
      isLoading={isLoading} 
      orderId={orderId} 
    />
  );
}
