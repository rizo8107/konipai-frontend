import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
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
  sendWhatsAppTextMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppVideoMessage,
  sendWhatsAppDocumentMessage,
  checkWhatsAppConnection,
  uploadFileToPocketBase,
} from '@/lib/whatsapp';
import { MessageSquare, Send, AlertCircle, Eye, Smartphone, Info, Wifi, WifiOff, Image, FileVideo, FileText, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pb } from '@/lib/pocketbase';

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
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState<boolean>(false);
  const [selectedMessageType, setSelectedMessageType] = useState<string>('text');
  const [orderItems, setOrderItems] = useState<ParsedOrderItem[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [mediaSource, setMediaSource] = useState<'custom' | 'product'>('custom');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [preview, setPreview] = useState<string>('');
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);

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
    expand: {
      product_id: {
        id: string;
        name: string;
        price: number;
        image?: string;
        description?: string;
      }
    };
    quantity: number;
    price: number;
  };

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

  // Extract template variables from template content
  const extractTemplateVariables = useCallback((templateContent: string) => {
    if (!templateContent) return [];
    
    // Regular expression to find all template variables like {{variableName}}
    const regex = /{{([^}]+)}}/g;
    const matches = templateContent.matchAll(regex);
    const variables = new Set<string>();
    
    // Extract all unique variable names
    for (const match of matches) {
      variables.add(match[1]);
    }
    
    // Filter out common variables that are automatically handled
    const commonVariables = ['customerName', 'orderId', 'amount', 'orderDate', 'productDetails'];
    return Array.from(variables).filter(variable => !commonVariables.includes(variable));
  }, []);

  // State to store template variables
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  
  // State to store variable values
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

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
            // Convert our ParsedOrderItem to the format expected by sendOrderConfirmation
            const orderItemsForApi = orderItems.map(item => ({
              id: item.id,
              name: item.expand.product_id.name,
              price: item.price,
              quantity: item.quantity,
              image: item.expand.product_id.image
            }));
            messageText = `🎉 *Order Confirmation* 🎉\n\nHi ${order.customer_name},\n\nYour order #${order.id} has been confirmed!\n\n*Order Details:*\n${orderItemsForApi.map(item => `${item.quantity}x ${item.name} - ₹${item.price}`).join('\n')}\n\n*Total: ₹${orderItemsForApi.reduce((sum, item) => sum + item.price * item.quantity, 0)}*\n\nThank you for your order! We'll notify you when it ships.`;
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
      } else {
        // Replace variables in the template content with actual values
        let processedContent = templateContent;
        
        // Replace common variables
        processedContent = processedContent
          .replace(/{{customerName}}/g, order.customer_name || '')
          .replace(/{{orderId}}/g, order.id || '')
          .replace(/{{amount}}/g, order.total?.toString() || '')
          .replace(/{{orderDate}}/g, new Date(order.created || Date.now()).toLocaleDateString());
          
        // Replace customer contact info if available
        if (order.customer_phone) {
          processedContent = processedContent.replace(/{{phone}}/g, order.customer_phone);
        }
        if (order.customer_email) {
          processedContent = processedContent.replace(/{{email}}/g, order.customer_email);
        }
        if (order.shipping_address_text) {
          processedContent = processedContent.replace(/{{address}}/g, order.shipping_address_text);
        }
        
        // Replace dynamic template variables with values from variableValues state
        Object.entries(variableValues).forEach(([variable, value]) => {
          // Format dates if the variable is a date type
          if (variable === 'estimatedDelivery' && value) {
            try {
              const formattedDate = new Date(value).toLocaleDateString();
              processedContent = processedContent.replace(new RegExp(`{{${variable}}}`, 'g'), formattedDate);
            } catch (e) {
              console.error(`Error formatting date for ${variable}:`, e);
              processedContent = processedContent.replace(new RegExp(`{{${variable}}}`, 'g'), value);
            }
          } else {
            processedContent = processedContent.replace(new RegExp(`{{${variable}}}`, 'g'), value);
          }
        });
        
        // Add product details if needed
        if (processedContent.includes('{{productDetails}}') && orderItems.length > 0) {
          const formattedItems = orderItems
            .map((item) => `${item.quantity}x ${item.expand.product_id.name} - ₹${item.price}`)
            .join('\n');
          
          const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const productDetails = `*Order Details:*\n${formattedItems}\n\n*Total: ₹${total}*`;
          
          processedContent = processedContent.replace(/{{productDetails}}/g, productDetails);
        }
        
        return processedContent;
      }
    } catch (error) {
      console.error('Error generating message from template:', error);
      return preview;
    }
  }, [templates, selectedTemplate, order, orderItems, preview, variableValues]);

  useEffect(() => {
    if (selectedTemplate) {
      switch (selectedTemplate) {
        case WhatsAppTemplate.ORDER_CONFIRMATION:
          setPreview(`🎉 Your order #${order.id} has been confirmed!\n\nThank you for shopping with us, ${order.customer_name}.\n\nWe'll update you when your order ships.`);
          break;
        case WhatsAppTemplate.PAYMENT_SUCCESS:
          setPreview(`✅ Payment received for Order #${order.id}, ${order.customer_name}! 💸\n\nWe're now preparing your order for shipping. You'll get updates soon.\n\nTrack it here: ${window.location.origin}/orders/${order.id}`);
          break;
        case WhatsAppTemplate.PAYMENT_FAILED:
          setPreview(`⚠️ Payment failed for Order #${order.id}\n\nPlease retry using this link: ${additionalInfo || '[payment link]'}`);
          break;
        case WhatsAppTemplate.ORDER_SHIPPED:
          setPreview(`📦 Your order #${order.id} has been shipped!\n\nCarrier: ${additionalInfo?.split(',')[1] || '[carrier]'}\nTracking: ${additionalInfo?.split(',')[0] || '[tracking link]'}`);
          break;
        case WhatsAppTemplate.OUT_FOR_DELIVERY:
          setPreview(`🚚 Your order #${order.id} is out for delivery today!\n\nSomeone may need to be present to receive the package.`);
          break;
        case WhatsAppTemplate.ORDER_DELIVERED:
          setPreview(`🎉 Your order #${order.id} has been delivered!\n\nWe hope you love your purchase. Please provide feedback: ${additionalInfo || '[feedback link]'}`);
          break;
        case WhatsAppTemplate.REQUEST_REVIEW:
          setPreview(`⭐ How was your experience with order #${order.id}?\n\nWe'd love to hear your feedback! Please leave a review: ${additionalInfo || '[review link]'}`);
          break;
        case WhatsAppTemplate.REFUND_CONFIRMATION:
          setPreview(`💰 Your refund of ${additionalInfo || '[amount]'} for order #${order.id} has been processed.\n\nThe amount should appear in your account within 5-7 business days.`);
          break;
        case WhatsAppTemplate.REORDER_REMINDER:
          setPreview(`🔔 It's been ${additionalInfo?.split(',')[1] || '30'} days since your last order #${order.id}.\n\nRunning low? Reorder easily: ${additionalInfo?.split(',')[0] || '[reorder link]'}`);
          break;
        default:
          setPreview('');
      }
    } else {
      setPreview('');
    }
  }, [selectedTemplate, additionalInfo, order.id, order.customer_name]);

  useEffect(() => {
    const checkConnection = async () => {
      const connectionStatus = await checkWhatsAppConnection();
      setIsWhatsAppConnected(connectionStatus.connected);
    };
    checkConnection();
  }, []);

  useEffect(() => {
    try {
      console.log('Raw products data:', order.products);
      console.log('Products data type:', typeof order.products);
      
      let parsedProducts: ProductItem[] = [];
      
      // Check if products is already an object/array or a string that needs parsing
      if (typeof order.products === 'string') {
        // Handle case where it might be a stringified JSON
        if (order.products === '[object Object]') {
          console.warn('Products data is "[object Object]" string, not valid JSON');
        } else if (order.products.trim() !== '') {
          // Only try to parse if it's not an empty string
          parsedProducts = JSON.parse(order.products);
          console.log('Parsed products:', parsedProducts);
        }
      } else if (Array.isArray(order.products)) {
        // If it's already an array, use it directly
        parsedProducts = order.products;
        console.log('Using array products directly:', parsedProducts);
      } else if (typeof order.products === 'object' && order.products !== null) {
        // If it's a single object, wrap it in an array
        parsedProducts = [order.products as unknown as ProductItem];
        console.log('Using object product wrapped in array:', parsedProducts);
      }
      
      // Format products to ensure they have the expected structure
      const formattedProducts = parsedProducts.map(item => {
        // Get the image URL and convert it to a PocketBase URL if needed
        let imageUrl = item.image || (item.product?.images && item.product.images[0]) || '';
        
        // If the image URL is a relative path or contains 'admin' (local URL), convert it to PocketBase URL
        if (imageUrl && (imageUrl.startsWith('/') || imageUrl.includes('/admin/'))) {
          // Extract the file name from the path
          const fileName = imageUrl.split('/').pop() || '';
          if (fileName) {
            // If we have a collection ID and record ID, use them, otherwise use placeholders
            const collectionId = item.collectionId || 'pbc_4092854851';
            const recordId = item.id || '2yqo7r8y2o2xs02';
            
            // Format as PocketBase URL with the full path
            imageUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/${collectionId}/${recordId}/${fileName}`;
            console.log('Converted local image to PocketBase URL:', imageUrl);
          }
        } 
        // If it's already a partial PocketBase path (recordId/filename.jpg), make it a full URL
        else if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
          const parts = imageUrl.split('/');
          if (parts.length >= 2) {
            // If the path doesn't include the collection ID, add the default one
            if (parts.length === 2) {
              // Assuming format: recordId/filename.jpg
              imageUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/pbc_4092854851/${imageUrl}`;
              console.log('Added collection ID to partial URL:', imageUrl);
            } else {
              // Assuming format already includes collection ID: collectionId/recordId/filename.jpg
              imageUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/${imageUrl}`;
              console.log('Added base URL to partial path:', imageUrl);
            }
          }
        }
        
        return {
          id: item.id || item.productId || `temp-${Math.random().toString(36).substring(2, 9)}`,
          name: item.name || item.product?.name || 'Unknown Product',
          price: item.price || item.product?.price || 0,
          quantity: item.quantity || 1,
          image: imageUrl,
          description: item.description || item.product?.description || ''
        };
      });
      
      setProducts(formattedProducts);
      
      // Convert to the format expected by our ParsedOrderItem type
      const orderItemsFormatted: ParsedOrderItem[] = formattedProducts.map(item => ({
        id: item.id,
        expand: {
          product_id: {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            description: item.description
          }
        },
        quantity: item.quantity,
        price: item.price
      }));
      
      setOrderItems(orderItemsFormatted);
      
    } catch (error) {
      console.error('Error parsing products data:', error);
      setProducts([]);
      setOrderItems([]);
    }
  }, [order.products]);

  useEffect(() => {
    if (mediaSource === 'product' && selectedProductId) {
      const selectedItem = products.find(item => item.id === selectedProductId);
      if (selectedItem?.image) {
        setMediaUrl(selectedItem.image);
      }
    }
  }, [mediaSource, selectedProductId, products]);

  // Load templates and set initial template
  useEffect(() => {
    // Set default template when templates are loaded
    if (templates.length > 0 && !selectedTemplate) {
      // Find the first active template or use the first template as fallback
      const activeTemplate = templates.find(t => t.isActive);
      if (activeTemplate) {
        setSelectedTemplate(activeTemplate.name as WhatsAppTemplate);
      } else if (templates[0]) {
        setSelectedTemplate(templates[0].name as WhatsAppTemplate);
      }
    }

    // Generate initial preview when templates and order are loaded
    if (templates.length > 0 && selectedTemplate && order) {
      generateMessageFromTemplate().then(message => {
        setPreview(message);
      });
    }
  }, [templates, selectedTemplate, order, orderItems, generateMessageFromTemplate]);

  useEffect(() => {
    if (selectedTemplate) {
      const templateContent = templates.find(t => t.name === selectedTemplate)?.content;
      if (templateContent) {
        const variables = extractTemplateVariables(templateContent);
        setTemplateVariables(variables);
        
        // Initialize variable values with empty strings or default values
        const initialValues: Record<string, string> = {};
        variables.forEach(variable => {
          // Set default values for certain variables
          if (variable === 'estimatedDelivery') {
            initialValues[variable] = new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0];
          } else {
            initialValues[variable] = '';
          }
        });
        setVariableValues(initialValues);
      }
    }
  }, [selectedTemplate, templates, extractTemplateVariables]);

  // Handle message sent event
  const handleMessageSent = () => {
    onMessageSent();
  };

  // Generate formatted product details for the message
  const generateProductDetails = () => {
    if (!orderItems || orderItems.length === 0) return '';

    const formattedItems = orderItems.map(
      (item) => `${item.quantity}x ${item.expand.product_id.name} - ₹${item.price}`
    ).join('\n');

    const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return `*Order Details:*\n${formattedItems}\n\n*Total: ₹${total}*`;
  };

  const handleSendMessage = async () => {
    if (!selectedTemplate && selectedMessageType === 'text') {
      setError('Please select a template or enter a custom message');
      return;
    }

    if (selectedMessageType !== 'text' && !mediaUrl && !file) {
      setError('Please enter a media URL or upload a file');
      return;
    }

    if (selectedMessageType === 'document' && !filename) {
      setError('Please enter a filename');
      return;
    }

    if (selectedOption?.requiresAdditionalInfo && !additionalInfo) {
      setError(`Please provide ${selectedOption.additionalInfoLabel}`);
      return;
    }

    setError('');
    setIsSending(true);

    try {
      const customerPhone = order.customer_phone;
      let response;

      // Include product details in the message if available
      const productDetails = generateProductDetails();
      
      // Handle different message types
      if (selectedMessageType !== 'text') {
        // For non-text messages (image, video, document)
        let messageCaption = caption;
        if (!messageCaption && selectedTemplate) {
          // Use the template message as caption if no custom caption is provided
          messageCaption = await generateMessageFromTemplate();
        }

        // Upload file if provided
        let mediaUrlToUse = mediaUrl;
        if (file) {
          try {
            const uploadedFile = await uploadFileToPocketBase(file);
            mediaUrlToUse = uploadedFile.url;
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError);
            toast.error('Failed to upload file');
            setIsSending(false);
            return;
          }
        }

        switch (selectedMessageType) {
          case 'image':
            response = await sendWhatsAppImageMessage(customerPhone, mediaUrlToUse, messageCaption);
            break;
          case 'video':
            response = await sendWhatsAppVideoMessage(customerPhone, mediaUrlToUse, messageCaption);
            break;
          case 'document':
            response = await sendWhatsAppDocumentMessage(customerPhone, mediaUrlToUse, filename, messageCaption);
            break;
          default:
            throw new Error('Invalid message type');
        }
      } else {
        // For text messages, use the template or custom message
        switch (selectedTemplate) {
          case WhatsAppTemplate.ORDER_CONFIRMATION: {
            // Convert our ParsedOrderItem to the format expected by sendOrderConfirmation
            const orderItemsForApi = orderItems.map(item => ({
              id: item.id,
              name: item.expand.product_id.name,
              price: item.price,
              quantity: item.quantity,
              image: item.expand.product_id.image
            }));
            response = await sendOrderConfirmation(order, orderItemsForApi, customerPhone);
            break;
          }
          case WhatsAppTemplate.PAYMENT_SUCCESS: {
            response = await sendPaymentSuccess(order, customerPhone, additionalInfo);
            break;
          }
          case WhatsAppTemplate.PAYMENT_FAILED: {
            response = await sendPaymentFailed(order, customerPhone);
            break;
          }
          case WhatsAppTemplate.ORDER_SHIPPED: {
            response = await sendOrderShipped(order, customerPhone, additionalInfo);
            break;
          }
          case WhatsAppTemplate.OUT_FOR_DELIVERY: {
            response = await sendOutForDelivery(order, customerPhone);
            break;
          }
          case WhatsAppTemplate.ORDER_DELIVERED: {
            response = await sendOrderDelivered(order, customerPhone);
            break;
          }
          case WhatsAppTemplate.REQUEST_REVIEW: {
            response = await sendRequestReview(order, customerPhone, additionalInfo);
            break;
          }
          case WhatsAppTemplate.REFUND_CONFIRMATION: {
            response = await sendRefundConfirmation(order, customerPhone, additionalInfo);
            break;
          }
          case WhatsAppTemplate.REORDER_REMINDER: {
            response = await sendReorderReminder(order, customerPhone, additionalInfo);
            break;
          }
          default: {
            let message = preview;
            if (productDetails) {
              message += '\n\n' + productDetails;
            }
            response = await sendWhatsAppTextMessage(customerPhone, message);
            break;
          }
        }
      }

      if (response.success) {
        toast.success('WhatsApp message sent successfully');
        handleMessageSent();
      } else {
        toast.error(`Failed to send WhatsApp message: ${response.message}`);
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast.error('Failed to send WhatsApp message');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setMediaUrl(URL.createObjectURL(event.target.files[0]));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Send WhatsApp Message</h3>
        {isWhatsAppConnected ? (
          <div className="flex items-center text-green-500">
            <Wifi className="h-4 w-4" />
            <span className="ml-2">WhatsApp connected</span>
          </div>
        ) : (
          <div className="flex items-center text-red-500">
            <WifiOff className="h-4 w-4" />
            <span className="ml-2">WhatsApp not connected</span>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="template">Message Template</Label>
          <Select
            value={selectedTemplate}
            onValueChange={(value) => {
              setSelectedTemplate(value as WhatsAppTemplate);
              // Reset additional info when template changes
              setAdditionalInfo('');
              // Generate new preview with the new template
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
                  .filter(template => template.isActive) // Only show active templates
                  .map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                    </SelectItem>
                  ))
              ) : (
                // Fallback to hardcoded templates if no templates are available from PocketBase
                Object.values(WhatsAppTemplate).map((template) => (
                  <SelectItem key={template} value={template}>
                    {template.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedTemplate && (
          <div className="space-y-4">
            {/* Dynamic variable fields based on template content */}
            {templateVariables.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Template Variables</h3>
                {templateVariables.map((variable) => {
                  // Determine input type based on variable name
                  const isDateType = variable.toLowerCase().includes('date') || 
                                     variable.toLowerCase().includes('delivery');
                  const isNumberType = variable.toLowerCase().includes('amount') || 
                                       variable.toLowerCase().includes('price') || 
                                       variable.toLowerCase().includes('days');
                  const isUrlType = variable.toLowerCase().includes('link') || 
                                    variable.toLowerCase().includes('url');
                  
                  return (
                    <div key={variable} className="space-y-2">
                      <Label htmlFor={variable}>
                        {/* Format variable name for display */}
                        {variable.replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())}
                      </Label>
                      <Input
                        id={variable}
                        type={isDateType ? 'date' : (isNumberType ? 'number' : 'text')}
                        placeholder={isUrlType ? 'https://example.com' : `Enter ${variable}`}
                        value={variableValues[variable] || ''}
                        onChange={(e) => {
                          // Update the variable value
                          setVariableValues(prev => ({
                            ...prev,
                            [variable]: e.target.value
                          }));
                          
                          // Update preview when variable value changes
                          generateMessageFromTemplate().then(message => {
                            setPreview(message);
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Fallback for templates with no variables */}
            {templateVariables.length === 0 && (
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      This template doesn't require any additional variables.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="customMessage">Additional Notes (Optional)</Label>
          <Textarea
            id="customMessage"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add any additional notes to include with the message"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="messageType">Message Type</Label>
          <Select
            value={selectedMessageType}
            onValueChange={setSelectedMessageType}
          >
            <SelectTrigger id="messageType">
              <SelectValue placeholder="Select a message type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedMessageType !== 'text' && (
          <div>
            <Label htmlFor="mediaSource">Media Source</Label>
            <Select
              value={mediaSource}
              onValueChange={(value: 'custom' | 'product') => setMediaSource(value)}
            >
              <SelectTrigger id="mediaSource">
                <SelectValue placeholder="Select a media source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="product">Ordered Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedMessageType !== 'text' && mediaSource === 'custom' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mediaUrl">Media URL</Label>
              <Input
                id="mediaUrl"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Enter the media URL"
              />
            </div>
            
            <div className="border rounded-md p-4">
              <Label htmlFor="file" className="block mb-2">Upload File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => document.getElementById('file')?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>
              {file && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Selected file: {file.name}</p>
                  {selectedMessageType === 'image' && mediaUrl && (
                    <div className="mt-2 border rounded-md overflow-hidden">
                      <img src={mediaUrl} alt="Preview" className="max-w-full h-auto max-h-[200px] object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedMessageType !== 'text' && mediaSource === 'product' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="selectedProductId">Select Product</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger id="selectedProductId">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedProductId && (
              <div className="border rounded-md p-4">
                {products.find(item => item.id === selectedProductId)?.image && (
                  <div className="mb-4">
                    <img 
                      src={products.find(item => item.id === selectedProductId)?.image} 
                      alt="Product" 
                      className="max-w-full h-auto max-h-[200px] object-contain rounded-md"
                    />
                  </div>
                )}
                <div className="text-sm">
                  <p className="font-medium">{products.find(item => item.id === selectedProductId)?.name}</p>
                  <p className="text-muted-foreground mt-1">
                    Quantity: {products.find(item => item.id === selectedProductId)?.quantity} | 
                    Price: ₹{products.find(item => item.id === selectedProductId)?.price}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedMessageType !== 'text' && (
          <div>
            <Label htmlFor="caption">Caption (Optional)</Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter a caption for the media"
            />
          </div>
        )}

        {selectedMessageType === 'document' && (
          <div>
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter the filename"
            />
          </div>
        )}

        <div>
          <Button 
            onClick={() => setOpenPreviewDialog(true)} 
            className="w-full"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Message
          </Button>
          <Dialog open={openPreviewDialog} onOpenChange={setOpenPreviewDialog}>
            <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>WhatsApp Message Preview</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col space-y-2">
                <div className="bg-[#202c33] p-3 flex items-center space-x-3 rounded-t-lg">
                  <Smartphone className="h-5 w-5 text-white" />
                  <div>
                    <p className="text-white font-medium text-sm">WhatsApp Preview</p>
                    <p className="text-gray-400 text-xs">Customer: {order.customer_name}</p>
                  </div>
                </div>
                <div className="bg-[#0b141a] p-4 min-h-[200px] rounded-b-lg">
                  {selectedMessageType !== 'text' && (mediaUrl || (selectedProductId && products.find(item => item.id === selectedProductId)?.image)) && (
                    <div className="bg-[#0b141a] mb-2 rounded-lg overflow-hidden">
                      <img 
                        src={mediaUrl || (selectedProductId && products.find(item => item.id === selectedProductId)?.image)}
                        alt="Media Preview"
                        className="max-w-full h-auto max-h-[200px] object-contain rounded-md"
                        onError={(e) => {
                          console.log('Preview image failed to load');
                          (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/e2e8f0/64748b?text=Image+Preview';
                        }}
                      />
                    </div>
                  )}
                  <div className="bg-[#005c4b] text-white p-3 rounded-lg max-w-[80%] ml-auto whitespace-pre-wrap text-sm">
                    {preview}
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-gray-400 text-xs">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setOpenPreviewDialog(false)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Button 
          onClick={handleSendMessage} 
          disabled={isSending || !isWhatsAppConnected} 
          className="w-full"
        >
          {isSending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send WhatsApp Message
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
