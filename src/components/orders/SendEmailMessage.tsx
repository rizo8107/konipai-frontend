import React, { useState, useEffect, ChangeEvent } from 'react';
import { Order, OrderItem, Product } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmailTemplate } from '@/lib/email';
import { useEmailTemplates, EmailTemplateType } from '@/hooks/useEmailTemplates';
import {
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendOrderShippedEmail,
  sendOutForDeliveryEmail,
  sendOrderDeliveredEmail,
  sendRequestReviewEmail,
  sendRefundConfirmationEmail,
  sendReorderReminderEmail,
  sendEmailMessage,
  sendEmailWithAttachment,
  checkEmailConnection,
} from '@/lib/email';
import { Mail, Send, AlertCircle, Eye, Info, Wifi, WifiOff, Paperclip } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';

interface SendEmailMessageProps {
  order: Order;
  onMessageSent?: () => void;
  onEmailSent?: () => void;
}

interface TemplateOption {
  value: string;
  label: string;
  subject: string;
  requiresAdditionalInfo: boolean;
  additionalInfoLabel?: string;
  additionalInfoPlaceholder?: string;
}

interface EmailResponse {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
}

export function SendEmailMessage({ order, onMessageSent, onEmailSent }: SendEmailMessageProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isEmailConnected, setIsEmailConnected] = useState<boolean>(false);
  const [selectedMessageType, setSelectedMessageType] = useState<string>('text');
  const [orderItems, setOrderItems] = useState<ParsedOrderItem[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState<string>(order.customer_email || '');

  // Define a product item type that matches the format in ViewOrderDialog
  type ProductItem = {
    id?: string;
    productId?: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    description?: string;
    collectionId?: string; // Add collectionId for PocketBase references
    product?: {
      id: string;
      name: string;
      price: number;
      images?: string[];
      description?: string;
    };
  };

  // Define a simplified product item type for the parsed products
  type ParsedOrderItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  };

  const { templates, isLoading: isLoadingTemplates } = useEmailTemplates();

  // Check email connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkEmailConnection();
        setIsEmailConnected(status.connected);
        if (!status.connected) {
          setError(status.message || 'Email service is not connected');
        }
      } catch (err) {
        console.error('Error checking email connection:', err);
        setIsEmailConnected(false);
        setError('Failed to check email connection status');
      }
    };

    checkConnection();
  }, []);

  // Fetch order items when the component mounts
  useEffect(() => {
    const fetchOrderItems = async () => {
      if (!order.id) return;

      try {
        // Try to fetch directly from the order object if available
        if (order.products && typeof order.products === 'string') {
          try {
            // Try to parse the products JSON string
            const parsedProducts = JSON.parse(order.products);
            if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
              const parsedItems: ParsedOrderItem[] = parsedProducts.map(item => ({
                id: item.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
                name: item.name || 'Product',
                price: item.price || 0,
                quantity: item.quantity || 1,
                image: item.image,
              }));
              
              setOrderItems(parsedItems);
              return;
            }
          } catch (parseError) {
            console.warn('Error parsing products JSON:', parseError);
            // Continue to other methods if parsing fails
          }
        }
        
        // If not available in the order object, try to fetch from PocketBase
        try {
          // Ensure we're authenticated before making the request
          await ensureAdminAuth();
          
          // Fetch order details from the orders collection
          const orderResponse = await pb.collection('orders').getOne(order.id);
          
          // Extract products from the order
          let orderProducts = [];
          if (orderResponse.products) {
            try {
              // Try to parse products if it's a string
              if (typeof orderResponse.products === 'string') {
                orderProducts = JSON.parse(orderResponse.products);
              } else if (Array.isArray(orderResponse.products)) {
                orderProducts = orderResponse.products;
              } else if (typeof orderResponse.products === 'object') {
                orderProducts = [orderResponse.products];
              }
            } catch (parseError) {
              console.warn('Error parsing products from order:', parseError);
            }
          }
          
          // Convert to parsed order items
          const parsedItems: ParsedOrderItem[] = orderProducts.map(item => ({
            id: item.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
            name: item.name || item.product?.name || 'Product',
            price: item.price || item.product?.price || 0,
            quantity: item.quantity || 1,
            image: item.image || (item.product?.images && item.product.images.length > 0 ? item.product.images[0] : undefined),
          }));
          
          if (parsedItems.length > 0) {
            setOrderItems(parsedItems);
            return;
          }
        } catch (pbError) {
          console.warn('Error fetching from PocketBase:', pbError);
          
          // Fallback: Create a simple item from the order information
          const fallbackItem: ParsedOrderItem = {
            id: `fallback-${Math.random().toString(36).substring(2, 9)}`,
            name: `Order #${order.id.substring(0, 8)}`,
            price: order.totalAmount || 0,
            quantity: 1,
            image: undefined,
          };
          
          setOrderItems([fallbackItem]);
        }
      } catch (err) {
        console.error('Error fetching order items:', err);
        toast.error('Failed to load order items');
        
        // Set a fallback empty array so the component doesn't break
        setOrderItems([]);
      }
    };

    fetchOrderItems();
  }, [order.id, order.products, order.totalAmount]);

  // Convert templates to options for the dropdown
  const templateOptions: TemplateOption[] = templates
    .filter((template) => template.isActive)
    .map((template) => ({
      value: template.name,
      label: template.description || template.name,
      subject: template.subject,
      requiresAdditionalInfo: template.requiresAdditionalInfo,
      additionalInfoLabel: template.additionalInfoLabel,
      additionalInfoPlaceholder: template.additionalInfoPlaceholder,
    }));

  // Handle template selection
  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    setAdditionalInfo('');
    
    // Find the selected template
    const template = templates.find((t) => t.name === value);
    if (template) {
      // Update preview with template content
      updatePreview(template.content, template.subject);
    }
  };

  // Handle message type selection
  const handleMessageTypeChange = (value: string) => {
    setSelectedMessageType(value);
    // Reset attachment fields when changing message type
    setAttachmentUrl('');
    setFile(null);
  };

  // Handle additional info change
  const handleAdditionalInfoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAdditionalInfo(e.target.value);
    
    // Update preview when additional info changes
    const template = templates.find((t) => t.name === selectedTemplate);
    if (template) {
      updatePreview(template.content, template.subject);
    }
  };

  // Handle custom message change
  const handleCustomMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCustomMessage(e.target.value);
    updatePreview(e.target.value, customSubject);
  };

  // Handle custom subject change
  const handleCustomSubjectChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCustomSubject(e.target.value);
    updatePreview(customMessage, e.target.value);
  };

  // Handle recipient email change
  const handleRecipientEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRecipientEmail(e.target.value);
  };

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Update preview based on template and variables
  const updatePreview = (content: string, subject: string) => {
    let updatedContent = content;
    let updatedSubject = subject;
    
    // Replace variables in the content
    updatedContent = updatedContent
      .replace(/{{customerName}}/g, order.customer_name || 'Customer')
      .replace(/{{orderId}}/g, order.id || 'Order ID')
      .replace(/{{orderDate}}/g, new Date(order.created || Date.now()).toLocaleDateString())
      .replace(/{{amount}}/g, order.totalAmount?.toString() || '0');
      
    // Replace variables in the subject
    updatedSubject = updatedSubject
      .replace(/{{customerName}}/g, order.customer_name || 'Customer')
      .replace(/{{orderId}}/g, order.id || 'Order ID')
      .replace(/{{orderDate}}/g, new Date(order.created || Date.now()).toLocaleDateString())
      .replace(/{{amount}}/g, order.totalAmount?.toString() || '0');
    
    // Add product details if available
    if (updatedContent.includes('{{productDetails}}') && orderItems.length > 0) {
      const productDetailsHtml = orderItems
        .map((item) => `${item.quantity}x ${item.name} - ₹${item.price}`)
        .join('<br>');
      
      updatedContent = updatedContent.replace(/{{productDetails}}/g, productDetailsHtml);
    }
    
    // Replace additional info variables if provided
    if (additionalInfo) {
      // Handle different types of additional info based on template
      const template = templates.find((t) => t.name === selectedTemplate);
      
      if (template) {
        if (template.name === EmailTemplate.PAYMENT_FAILED) {
          updatedContent = updatedContent.replace(/{{retryUrl}}/g, additionalInfo);
        } else if (template.name === EmailTemplate.ORDER_SHIPPED) {
          // Parse comma-separated values: tracking link, carrier, estimated delivery
          const [trackingLink, carrier, estimatedDelivery] = additionalInfo.split(',');
          updatedContent = updatedContent
            .replace(/{{trackingLink}}/g, trackingLink || '#')
            .replace(/{{carrier}}/g, carrier || 'Shipping Partner')
            .replace(/{{estimatedDelivery}}/g, estimatedDelivery || 'within 7-10 days');
        } else if (template.name === EmailTemplate.ORDER_DELIVERED) {
          updatedContent = updatedContent.replace(/{{feedbackLink}}/g, additionalInfo);
        } else if (template.name === EmailTemplate.REQUEST_REVIEW) {
          updatedContent = updatedContent.replace(/{{reviewLink}}/g, additionalInfo);
        } else if (template.name === EmailTemplate.REFUND_CONFIRMATION) {
          updatedContent = updatedContent.replace(/{{refundAmount}}/g, additionalInfo);
        } else if (template.name === EmailTemplate.REORDER_REMINDER) {
          // Parse comma-separated values: reorder link, days since delivery
          const [reorderLink, daysSinceDelivery] = additionalInfo.split(',');
          updatedContent = updatedContent
            .replace(/{{reorderLink}}/g, reorderLink || '#')
            .replace(/{{daysSinceDelivery}}/g, daysSinceDelivery || '30');
        } else if (template.name === EmailTemplate.ABANDONED_CART) {
          updatedContent = updatedContent.replace(/{{cartUrl}}/g, additionalInfo);
        }
      }
    }
    
    setPreview(updatedContent);
    setPreviewSubject(updatedSubject);
  };

  // Send email message
  const sendEmail = async () => {
    if (!recipientEmail) {
      toast.error('Recipient email is required');
      return;
    }

    setIsSending(true);
    setError('');
    
    try {
      let response: EmailResponse;
      
      if (selectedTemplate) {
        // Send template-based email
        const template = templates.find((t) => t.name === selectedTemplate);
        if (!template) {
          throw new Error('Selected template not found');
        }
        
        // Get the template content and subject with variables replaced
        const emailContent = preview;
        const emailSubject = previewSubject;
        
        // Send email based on template type
        switch (template.name) {
          case EmailTemplate.ORDER_CONFIRMATION:
            response = await sendOrderConfirmationEmail(order, orderItems, recipientEmail);
            break;
          case EmailTemplate.PAYMENT_SUCCESS:
            response = await sendPaymentSuccessEmail(order, recipientEmail);
            break;
          case EmailTemplate.PAYMENT_FAILED:
            if (!additionalInfo) {
              throw new Error('Payment retry URL is required');
            }
            response = await sendPaymentFailedEmail(order, recipientEmail, additionalInfo);
            break;
          case EmailTemplate.ORDER_SHIPPED: {
            if (!additionalInfo) {
              throw new Error('Tracking information is required');
            }
            const trackingInfo = additionalInfo.split(',');
            const trackingLink = trackingInfo[0];
            const carrier = trackingInfo[1];
            const estimatedDelivery = trackingInfo[2] || '';
            response = await sendOrderShippedEmail(order, recipientEmail, trackingLink, carrier);
            break;
          }
          case EmailTemplate.OUT_FOR_DELIVERY:
            response = await sendOutForDeliveryEmail(order, recipientEmail);
            break;
          case EmailTemplate.ORDER_DELIVERED:
            if (!additionalInfo) {
              throw new Error('Feedback link is required');
            }
            response = await sendOrderDeliveredEmail(order, recipientEmail, additionalInfo);
            break;
          case EmailTemplate.REQUEST_REVIEW:
            if (!additionalInfo) {
              throw new Error('Review link is required');
            }
            response = await sendRequestReviewEmail(order, recipientEmail, additionalInfo);
            break;
          case EmailTemplate.REFUND_CONFIRMATION:
            if (!additionalInfo) {
              throw new Error('Refund amount is required');
            }
            response = await sendRefundConfirmationEmail(order, recipientEmail, parseFloat(additionalInfo));
            break;
          case EmailTemplate.REORDER_REMINDER: {
            if (!additionalInfo) {
              throw new Error('Reorder information is required');
            }
            const reorderInfo = additionalInfo.split(',');
            const reorderLink = reorderInfo[0];
            const daysSinceDelivery = parseInt(reorderInfo[1] || '30');
            response = await sendReorderReminderEmail(order, recipientEmail, daysSinceDelivery, reorderLink);
            break;
          }
          default:
            // For other templates, send a generic email
            response = await sendEmailMessage(
              recipientEmail, 
              emailSubject, 
              emailContent, 
              {
                orderId: order.id,
                templateName: selectedTemplate
              }
            );
            break;
        }
      } else {
        // Send custom email
        if (!customMessage || !customSubject) {
          throw new Error('Subject and message are required for custom emails');
        }
        
        if (selectedMessageType === 'text') {
          // Send plain text email
          response = await sendEmailMessage(
            recipientEmail, 
            customSubject, 
            customMessage, 
            {
              orderId: order.id,
              templateName: 'custom_email'
            }
          );
        } else if (selectedMessageType === 'attachment' && file) {
          // Send email with attachment
          const reader = new FileReader();
          
          // Convert file to base64
          const filePromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]); // Remove data URL prefix
              } else {
                reject(new Error('Failed to read file'));
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
          
          const fileContent = await filePromise;
          
          // Send email with attachment
          response = await sendEmailWithAttachment(
            recipientEmail,
            customSubject,
            customMessage,
            [{ filename: file.name, content: fileContent, contentType: file.type }],
            {
              orderId: order.id,
              templateName: 'custom_email_with_attachment'
            }
          );
        } else {
          throw new Error('Invalid message type or missing attachment');
        }
      }
      
      if (response.success) {
        toast.success('Email sent successfully');
        onMessageSent?.();
        onEmailSent?.();
        
        // Reset form
        setSelectedTemplate('');
        setAdditionalInfo('');
        setCustomMessage('');
        setCustomSubject('');
        setAttachmentUrl('');
        setFile(null);
      } else {
        throw new Error(response.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  // Render the component
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!isEmailConnected && (
          <Alert className="mb-4">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Email Service Disconnected</AlertTitle>
            <AlertDescription>
              The email service is currently disconnected. Please check your SMTP configuration.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium">Send Email</h3>
            {isEmailConnected && <Wifi className="h-4 w-4 text-green-500" />}
          </div>
          
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                value={recipientEmail}
                onChange={handleRecipientEmailChange}
                placeholder="customer@example.com"
              />
            </div>
            
            <Tabs defaultValue="template" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="template">Email Template</TabsTrigger>
                <TabsTrigger value="custom">Custom Email</TabsTrigger>
              </TabsList>
              
              <TabsContent value="template" className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="template">Select Template</Label>
                  <Select
                    value={selectedTemplate}
                    onValueChange={handleTemplateChange}
                  >
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedTemplate && (
                  <div className="grid grid-cols-1 gap-2">
                    {templates.find((t) => t.name === selectedTemplate)?.requiresAdditionalInfo && (
                      <>
                        <Label htmlFor="additionalInfo">
                          {templates.find((t) => t.name === selectedTemplate)?.additionalInfoLabel || 'Additional Information'}
                        </Label>
                        <Input
                          id="additionalInfo"
                          value={additionalInfo}
                          onChange={handleAdditionalInfoChange}
                          placeholder={templates.find((t) => t.name === selectedTemplate)?.additionalInfoPlaceholder || ''}
                        />
                      </>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="custom" className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="messageType">Message Type</Label>
                  <Select
                    value={selectedMessageType}
                    onValueChange={handleMessageTypeChange}
                  >
                    <SelectTrigger id="messageType">
                      <SelectValue placeholder="Select message type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="attachment">With Attachment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={customSubject}
                    onChange={handleCustomSubjectChange}
                    placeholder="Email subject"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={customMessage}
                    onChange={handleCustomMessageChange}
                    placeholder="Type your message here..."
                    rows={5}
                  />
                </div>
                
                {selectedMessageType === 'attachment' && (
                  <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="attachment">Attachment</Label>
                    <Input
                      id="attachment"
                      type="file"
                      onChange={handleFileChange}
                    />
                    {file && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        {file.name} ({Math.round(file.size / 1024)} KB)
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between items-center pt-2">
              <Dialog open={openPreviewDialog} onOpenChange={setOpenPreviewDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" type="button" disabled={!preview}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{previewSubject || 'Email Preview'}</DialogTitle>
                  </DialogHeader>
                  <div className="bg-white rounded-md p-4 border">
                    <div className="text-sm">
                      <strong>To:</strong> {recipientEmail}
                    </div>
                    <div className="text-sm">
                      <strong>Subject:</strong> {previewSubject}
                    </div>
                    <div className="border-t mt-2 pt-2">
                      <div dangerouslySetInnerHTML={{ __html: preview }} />
                    </div>
                    {file && (
                      <div className="border-t mt-2 pt-2 text-sm flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        Attachment: {file.name}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={sendEmail}
                disabled={isSending || !isEmailConnected || (!selectedTemplate && (!customMessage || !customSubject))}
              >
                {isSending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
