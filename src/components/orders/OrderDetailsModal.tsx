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

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}

// WhatsApp Activities Tab Component
function WhatsAppActivitiesTab({ orderId, order }: { orderId: string, order: Order }) {
  const { activities, isLoading, createActivity } = useWhatsAppActivities(orderId);
  
  const handleMessageSent = () => {
    // This will trigger a refetch of the activities
    // through the invalidation in the createActivity mutation
  };
  
  return (
    <div className="space-y-6">
      {/* Send WhatsApp Message Section */}
      <div className="border rounded-md p-4">
        <SendWhatsAppMessage 
          order={order} 
          onMessageSent={handleMessageSent} 
        />
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
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center border rounded-md p-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 mr-4">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package size={24} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product_name}</h4>
                    <div className="text-sm text-gray-500">
                      {item.quantity} x ₹{item.product_price.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="text-right font-medium">
                    ₹{item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border rounded-md p-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>₹{order.shipping_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>₹{order.tax.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-green-600">-₹{order.discount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>₹{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Customer tab */}
          <TabsContent value="customer" className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <User size={16} className="mr-2 text-gray-500" />
                Customer Info
              </h3>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                  <Label className="text-xs text-gray-500">Name</Label>
                  <p>{order.user_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p>{order.user_email}</p>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <Clock size={16} className="mr-2 text-gray-500" />
                Order Timeline
              </h3>
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
            </div>
          </TabsContent>
          
          {/* Shipping tab */}
          <TabsContent value="shipping" className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <MapPin size={16} className="mr-2 text-gray-500" />
                Shipping Address
              </h3>
              <div className="mt-4">
                <p className="font-medium">{order.shipping_address.name}</p>
                <p>{order.shipping_address.street}</p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                </p>
                <p>{order.shipping_address.country}</p>
                <p className="mt-2">Phone: {order.shipping_address.phone}</p>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <Truck size={16} className="mr-2 text-gray-500" />
                Shipping Status
              </h3>
              
              <div className="mt-4">
                <div className="mb-4">
                  <Label className="text-xs text-gray-500">Current Status</Label>
                  <p className="font-medium capitalize">{order.status}</p>
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
            </div>
            
            {order.notes && (
              <div className="border rounded-md p-4">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <FileText size={16} className="mr-2 text-gray-500" />
                  Order Notes
                </h3>
                <p className="text-sm mt-2">{order.notes}</p>
              </div>
            )}
          </TabsContent>
          
          {/* Payment tab */}
          <TabsContent value="payment" className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <CreditCard size={16} className="mr-2 text-gray-500" />
                Payment Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs text-gray-500">Payment Method</Label>
                  <p className="capitalize">{order.payment_method || 'Razorpay'}</p>
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
                  <p>₹{order.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-medium mb-2">Transaction Timeline</h3>
              
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
            </div>
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
