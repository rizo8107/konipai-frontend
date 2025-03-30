import React, { useState, useEffect, useCallback } from 'react';
import { Order } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WhatsAppTemplate } from '@/lib/whatsapp';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import {
  sendOrderConfirmation,
  sendPaymentSuccess,
  sendPaymentFailed,
  sendOrderShipped,
  sendOutForDelivery,
  sendOrderDelivered,
  sendRequestReview,
  sendRefundConfirmation,
  sendReorderReminder,
  sendWhatsAppTemplate
} from '@/lib/whatsapp';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Send, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SendWhatsAppMessageProps {
  order: Order;
  onMessageSent: () => void;
}

interface TemplateOption {
  value: string;
  label: string;
  requiresAdditionalInfo: boolean;
  additionalInfoLabel?: string;
  additionalInfoPlaceholder?: string;
}

interface WhatsAppResponse {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
}

export function SendWhatsAppMessage({ order, onMessageSent }: SendWhatsAppMessageProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string>('');

  // Get templates from PocketBase
  const { templates, isLoading: isLoadingTemplates } = useWhatsAppTemplates();

  // Define template options based on PocketBase templates
  const templateOptions: TemplateOption[] = templates
    .filter(template => template.isActive) // Only show active templates
    .map(template => ({
      value: template.name,
      label: template.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      requiresAdditionalInfo: template.requiresAdditionalInfo,
      additionalInfoLabel: template.additionalInfoLabel,
      additionalInfoPlaceholder: template.additionalInfoPlaceholder
    }));

  const selectedOption = templateOptions.find(option => option.value === selectedTemplate);

  // Generate message from template
  const generateMessageFromTemplate = useCallback(async () => {
    try {
      // Find the template content from PocketBase templates
      const templateContent = templates.find(t => t.name === selectedTemplate)?.content;
      
      if (!templateContent) {
        console.warn(`Template content not found for ${selectedTemplate}, using fallback`);
        // Fallback to hardcoded templates if not found in PocketBase
        let messageText = '';
        switch (selectedTemplate) {
          case WhatsAppTemplate.ORDER_CONFIRMATION: {
            messageText = `🎉 *Order Confirmation* 🎉\n\nHi ${order.customer_name},\n\nYour order #${order.id} has been confirmed!\n\n*Order Details:*\n${order.products?.map(item => `${item.quantity}x ${item.name} - ₹${item.price}`).join('\n')}\n\n*Total: ₹${order.total}*\n\nThank you for your order! We'll notify you when it ships.`;
            break;
          }
          case WhatsAppTemplate.PAYMENT_SUCCESS: {
            messageText = `✅ *Payment Successful* ✅\n\nHi ${order.customer_name},\n\nYour payment of ₹${order.total} for order #${order.id} has been successfully received.\n\nThank you for your purchase!`;
            if (additionalInfo) {
              messageText += `\n\n${additionalInfo}`;
            }
            break;
          }
          case WhatsAppTemplate.PAYMENT_FAILED: {
            messageText = `⚠️ *Payment Failed* ⚠️\n\nHi ${order.customer_name},\n\nWe were unable to process your payment of ₹${order.total} for order #${order.id}.\n\nPlease check your payment details and try again, or contact our support team for assistance.`;
            break;
          }
          case WhatsAppTemplate.ORDER_SHIPPED: {
            messageText = `📦 *Order Shipped* 📦\n\nHi ${order.customer_name},\n\nYour order #${order.id} has been shipped!`;
            if (additionalInfo) {
              messageText += `\n\nTracking information: ${additionalInfo}`;
            }
            messageText += `\n\nYou will receive your package soon. Thank you for your patience!`;
            break;
          }
          case WhatsAppTemplate.OUT_FOR_DELIVERY: {
            messageText = `🚚 *Out for Delivery* 🚚\n\nHi ${order.customer_name},\n\nYour order #${order.id} is out for delivery and will arrive today!\n\nPlease ensure someone is available to receive the package.\n\nThank you for your business!`;
            break;
          }
          case WhatsAppTemplate.ORDER_DELIVERED: {
            messageText = `🎉 *Order Delivered* 🎉\n\nHi ${order.customer_name},\n\nYour order #${order.id} has been delivered!\n\nWe hope you enjoy your purchase. If you have any questions or concerns, please don't hesitate to contact us.\n\nThank you for shopping with us!`;
            break;
          }
          case WhatsAppTemplate.REQUEST_REVIEW: {
            messageText = `⭐ *How Was Your Experience?* ⭐\n\nHi ${order.customer_name},\n\nWe hope you're enjoying your recent purchase (Order #${order.id}).\n\nWe'd love to hear your feedback! Please take a moment to share your experience with us.`;
            if (additionalInfo) {
              messageText += `\n\n${additionalInfo}`;
            }
            messageText += `\n\nYour feedback helps us improve and serve you better. Thank you!`;
            break;
          }
          case WhatsAppTemplate.REFUND_CONFIRMATION: {
            messageText = `💰 *Refund Confirmation* 💰\n\nHi ${order.customer_name},\n\nWe've processed a refund of ₹${order.total} for your order #${order.id}.`;
            if (additionalInfo) {
              messageText += `\n\nRefund details: ${additionalInfo}`;
            }
            messageText += `\n\nThe refund should appear in your account within 5-7 business days, depending on your bank's processing time.\n\nThank you for your understanding.`;
            break;
          }
          case WhatsAppTemplate.REORDER_REMINDER: {
            messageText = `🔔 *Time to Reorder?* 🔔\n\nHi ${order.customer_name},\n\nIt's been a while since your last purchase (Order #${order.id}).\n\nRunning low on supplies? We're here to help you restock!`;
            if (additionalInfo) {
              messageText += `\n\n${additionalInfo}`;
            }
            messageText += `\n\nSimply reply to this message or visit our website to place a new order.\n\nThank you for your continued support!`;
            break;
          }
          default: {
            messageText = preview;
            break;
          }
        }
        return messageText;
      }
      
      // Replace variables in the template
      let processedContent = templateContent;
      processedContent = processedContent
        .replace(/{{customerName}}/g, order.customer_name || '')
        .replace(/{{orderId}}/g, order.id || '')
        .replace(/{{amount}}/g, order.total?.toString() || '')
        .replace(/{{orderDate}}/g, new Date(order.created || Date.now()).toLocaleDateString());

      // Add product details if needed
      if (processedContent.includes('{{productDetails}}') && order.products?.length > 0) {
        const formattedItems = order.products
          .map((item) => `${item.quantity}x ${item.name} - ₹${item.price}`)
          .join('\n');
        
        const total = order.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const productDetails = `*Order Details:*\n${formattedItems}\n\n*Total: ₹${total}*`;
        
        processedContent = processedContent.replace(/{{productDetails}}/g, productDetails);
      }

      return processedContent;
    } catch (error) {
      console.error('Error generating message from template:', error);
      return preview;
    }
  }, [templates, selectedTemplate, order, preview, additionalInfo]);

  // Update preview when template or additional info changes
  useEffect(() => {
    if (selectedTemplate) {
      generateMessageFromTemplate().then(message => {
        setPreview(message);
      });
    }
  }, [selectedTemplate, additionalInfo, generateMessageFromTemplate]);

  // Handle message sent event
  const handleSendMessage = async () => {
    setError('');
    setIsSending(true);

    try {
      // Check if a template is selected
      if (!selectedTemplate) {
        setError('Please select a template');
        setIsSending(false);
        return;
      }

      // Get customer phone number
      const customerPhone = order.customer_phone || '';
      if (!customerPhone) {
        setError('Customer phone number is missing');
        setIsSending(false);
        return;
      }

      // Format phone number if needed
      const formattedPhone = customerPhone.startsWith('+') ? customerPhone.slice(1) : customerPhone;

      // Send message using appropriate template function
      let response: WhatsAppResponse;

      switch (selectedTemplate) {
        case WhatsAppTemplate.ORDER_CONFIRMATION: {
          response = await sendOrderConfirmation(order, order.products || [], formattedPhone);
          break;
        }
        case WhatsAppTemplate.PAYMENT_SUCCESS: {
          response = await sendPaymentSuccess(order, formattedPhone);
          break;
        }
        case WhatsAppTemplate.PAYMENT_FAILED: {
          response = await sendPaymentFailed(order, formattedPhone, additionalInfo);
          break;
        }
        case WhatsAppTemplate.ORDER_SHIPPED: {
          response = await sendOrderShipped(order, formattedPhone, additionalInfo, 'Shipping Carrier');
          break;
        }
        case WhatsAppTemplate.OUT_FOR_DELIVERY: {
          response = await sendOutForDelivery(order, formattedPhone);
          break;
        }
        case WhatsAppTemplate.ORDER_DELIVERED: {
          response = await sendOrderDelivered(order, formattedPhone, "");
          break;
        }
        case WhatsAppTemplate.REQUEST_REVIEW: {
          response = await sendRequestReview(order, formattedPhone, "");
          break;
        }
        case WhatsAppTemplate.REFUND_CONFIRMATION: {
          const refundAmount = additionalInfo ? parseFloat(additionalInfo) : order.total;
          response = await sendRefundConfirmation(order, formattedPhone, refundAmount);
          break;
        }
        case WhatsAppTemplate.REORDER_REMINDER: {
          response = await sendReorderReminder(order, formattedPhone, 30, "");
          break;
        }
        default: {
          // Use generic template sender for other templates
          response = await sendWhatsAppTemplate(formattedPhone, selectedTemplate, order, additionalInfo);
          break;
        }
      }

      if (response && response.success) {
        toast.success('WhatsApp message sent successfully');
        setSelectedTemplate('');
        setAdditionalInfo('');
        onMessageSent();
      } else {
        const errorMsg = response?.message || 'Failed to send WhatsApp message';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Error sending WhatsApp message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="template">Message Template</Label>
          <Select
            value={selectedTemplate}
            onValueChange={(value) => {
              setSelectedTemplate(value);
              setAdditionalInfo('');
              generateMessageFromTemplate().then(message => {
                setPreview(message);
              });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.length > 0 ? (
                templates
                  .filter(template => template.isActive)
                  .map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                    </SelectItem>
                  ))
              ) : (
                Object.values(WhatsAppTemplate).map((template) => (
                  <SelectItem key={template} value={template}>
                    {template.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedOption?.requiresAdditionalInfo && (
          <div>
            <Label htmlFor="additionalInfo">
              {selectedOption.additionalInfoLabel || 'Additional Information'}
            </Label>
            <Input
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => {
                setAdditionalInfo(e.target.value);
                generateMessageFromTemplate().then(message => {
                  setPreview(message);
                });
              }}
              placeholder={selectedOption.additionalInfoPlaceholder || ''}
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {preview && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Message Preview
            </Label>
            <div className="p-4 bg-muted rounded-md whitespace-pre-wrap font-mono text-sm">
              {preview}
            </div>
          </div>
        )}

        <Button
          onClick={handleSendMessage}
          disabled={isSending || !selectedTemplate}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSending ? 'Sending...' : 'Send Template Message'}
        </Button>
      </div>
    </Card>
  );
}
