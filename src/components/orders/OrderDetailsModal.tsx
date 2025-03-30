import React from 'react';
import { Order } from '@/types/schema';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  CreditCard, 
  FileText, 
  MapPin, 
  User, 
  Clock,
  MessageSquare
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useWhatsAppActivities } from '@/hooks/useWhatsAppActivities';
import { WhatsAppActivities } from './WhatsAppActivities';
import { SendWhatsAppMessage } from './SendWhatsAppMessage';
import { CustomWhatsAppMessage } from './CustomWhatsAppMessage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}

// WhatsApp Activities Tab Component
function WhatsAppActivitiesTab({ orderId, order }: { orderId: string, order: Order }) {
  const { activities, isLoading, createActivity } = useWhatsAppActivities(orderId);
  
  const handleWhatsAppSent = () => {
    // This will trigger a refetch of the activities
    // through the invalidation in the createActivity mutation
  };
  
  return (
    <div className="space-y-6">
      {/* Send WhatsApp Message Section */}
      <div className="border rounded-md p-4">
        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Template Message</TabsTrigger>
            <TabsTrigger value="custom">Custom Message</TabsTrigger>
          </TabsList>
          
          <TabsContent value="template">
            <SendWhatsAppMessage order={order} onMessageSent={handleWhatsAppSent} />
          </TabsContent>
          
          <TabsContent value="custom">
            <CustomWhatsAppMessage order={order} onMessageSent={handleWhatsAppSent} />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* WhatsApp Activity History Section */}
      <div className="border rounded-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Message History</h3>
        </div>
        <WhatsAppActivities 
          activities={activities} 
          isLoading={isLoading} 
          orderId={orderId} 
        />
      </div>
    </div>
  );
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus
}) => {
  if (!order) return null;
  
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy, hh:mm a');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            Order Details 
            <span className="ml-2 text-sm font-normal text-gray-500">
              #{order.id.slice(0, 8)}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="items">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="items" className="flex items-center">
              <Package size={14} className="mr-2" />
              Items
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center">
              <User size={14} className="mr-2" />
              Customer
            </TabsTrigger>
            <TabsTrigger value="shipping" className="flex items-center">
              <Truck size={14} className="mr-2" />
              Shipping
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center">
              <CreditCard size={14} className="mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center">
              <MessageSquare size={14} className="mr-2" />
              WhatsApp
            </TabsTrigger>
          </TabsList>
          
          {/* Items tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="space-y-6">
              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.products?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">₹{item.price}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p>Shipping Fee</p>
                      <p>₹{order.shipping_fee}</p>
                    </div>
                    <div className="flex justify-between">
                      <p>Tax</p>
                      <p>₹{order.tax}</p>
                    </div>
                    <div className="flex justify-between">
                      <p>Discount</p>
                      <p>-₹{order.discount}</p>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <p>Total</p>
                      <p>₹{order.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Customer tab */}
          <TabsContent value="customer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="font-medium">Name</p>
                    <p>{order.customer_name}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="font-medium">Email</p>
                    <p>{order.customer_email}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="font-medium">Phone</p>
                    <p>{order.customer_phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                      <FileText size={12} />
                    </div>
                    <div>
                      <p className="font-medium">Order Created</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                      <CreditCard size={12} />
                    </div>
                    <div>
                      <p className="font-medium">Payment {order.payment_status === 'paid' ? 'Completed' : 'Pending'}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.updated)}</p>
                    </div>
                  </div>
                  
                  {order.status === 'shipped' && (
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                        <Truck size={12} />
                      </div>
                      <div>
                        <p className="font-medium">Order Shipped</p>
                        <p className="text-sm text-gray-500">{formatDate(order.updated)}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.status === 'delivered' && (
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                        <Package size={12} />
                      </div>
                      <div>
                        <p className="font-medium">Order Delivered</p>
                        <p className="text-sm text-gray-500">{formatDate(order.updated)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Shipping tab */}
          <TabsContent value="shipping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="font-medium">Street</p>
                    <p>{order.shipping_address.street}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="font-medium">City</p>
                    <p>{order.shipping_address.city}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="font-medium">State</p>
                    <p>{order.shipping_address.state}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="font-medium">ZIP</p>
                    <p>{order.shipping_address.zip}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="font-medium">Country</p>
                    <p>{order.shipping_address.country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="font-medium">Current Status</p>
                    <p className="capitalize">{order.status}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-2">Update Status</Label>
                    <div className="flex space-x-2 mt-2">
                      <Button 
                        variant={order.status === 'pending' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => onUpdateStatus(order.id, 'pending')}
                      >
                        Pending
                      </Button>
                      <Button 
                        variant={order.status === 'processing' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => onUpdateStatus(order.id, 'processing')}
                      >
                        Processing
                      </Button>
                      <Button 
                        variant={order.status === 'shipped' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => onUpdateStatus(order.id, 'shipped')}
                      >
                        Shipped
                      </Button>
                      <Button 
                        variant={order.status === 'delivered' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => onUpdateStatus(order.id, 'delivered')}
                      >
                        Delivered
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mt-2">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Payment tab */}
          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-xs text-gray-500">Payment Method</Label>
                    <p className="capitalize">{order.payment_method}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Payment Status</Label>
                    <p className="capitalize">{order.payment_status}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Payment ID</Label>
                    <p>{order.payment_id || 'Not available'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Amount</Label>
                    <p>₹{order.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                      <CreditCard size={12} />
                    </div>
                    <div>
                      <p className="font-medium">Payment Initiated</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created)}</p>
                    </div>
                  </div>
                  
                  {order.payment_status === 'paid' && (
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                        <CreditCard size={12} />
                      </div>
                      <div>
                        <p className="font-medium">Payment Successful</p>
                        <p className="text-sm text-gray-500">{formatDate(order.updated)}</p>
                      </div>
                    </div>
                  )}
                  
                  {order.payment_status === 'failed' && (
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                        <CreditCard size={12} />
                      </div>
                      <div>
                        <p className="font-medium">Payment Failed</p>
                        <p className="text-sm text-gray-500">{formatDate(order.updated)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* WhatsApp tab */}
          <TabsContent value="whatsapp" className="space-y-4">
            <WhatsAppActivitiesTab orderId={order.id} order={order} />
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
