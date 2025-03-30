import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { WhatsAppTemplate } from '@/lib/whatsapp';
import { toast } from 'sonner';

export interface Template {
  id: string;
  name: string;
  content: string;
  requiresAdditionalInfo: boolean;
  additionalInfoLabel?: string;
  additionalInfoPlaceholder?: string;
  isActive: boolean;
  description: string;
  created?: string;
  updated?: string;
}

export function useWhatsAppTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      // Check if collection exists
      const collections = await pb.collections.getFullList();
      const templateCollectionExists = collections.some(c => c.name === 'whatsapp_templates');
      
      // If collection doesn't exist, create default templates from enum
      if (!templateCollectionExists) {
        await createDefaultTemplates();
        return;
      }
      
      const records = await pb.collection('whatsapp_templates').getFullList({
        sort: 'name',
      });
      
      setTemplates(records as unknown as Template[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching WhatsApp templates:', err);
      setError(err as Error);
      
      // If collection doesn't exist, create default templates
      if ((err as Error).message.includes('404') || (err as Error).message.includes('not found')) {
        await createDefaultTemplates();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    try {
      // Check if we need to create the collection first
      try {
        await pb.collections.create({
          name: 'whatsapp_templates',
          schema: [
            {
              name: 'name',
              type: 'text',
              required: true,
              unique: true,
            },
            {
              name: 'content',
              type: 'text',
              required: true,
            },
            {
              name: 'requiresAdditionalInfo',
              type: 'bool',
              required: true,
              default: false,
            },
            {
              name: 'additionalInfoLabel',
              type: 'text',
            },
            {
              name: 'additionalInfoPlaceholder',
              type: 'text',
            },
            {
              name: 'isActive',
              type: 'bool',
              required: true,
              default: true,
            },
            {
              name: 'description',
              type: 'text',
            },
          ],
        });
        console.log('Created whatsapp_templates collection');
      } catch (err) {
        console.error('Error creating collection:', err);
        // Continue if collection already exists
      }

      // Default templates based on the WhatsAppTemplate enum
      const defaultTemplates = [
        {
          name: WhatsAppTemplate.ORDER_CONFIRMATION,
          content: '🎉 *Order Confirmed* 🎉\n\nHi {{customerName}},\n\nYour order #{{orderId}} has been confirmed!\n\nThank you for shopping with us.\n\nWe\'ll update you when your order ships.',
          requiresAdditionalInfo: false,
          isActive: true,
          description: 'Sent when an order is confirmed',
        },
        {
          name: WhatsAppTemplate.PAYMENT_SUCCESS,
          content: '✅ *Payment Successful* ✅\n\nHi {{customerName}},\n\nYour payment of ₹{{amount}} for order #{{orderId}} has been successfully received.\n\nThank you for your purchase!',
          requiresAdditionalInfo: false,
          isActive: true,
          description: 'Sent when payment is successful',
        },
        {
          name: WhatsAppTemplate.PAYMENT_FAILED,
          content: '❌ *Payment Failed* ❌\n\nHi {{customerName}},\n\nWe couldn\'t process your payment of ₹{{amount}} for order #{{orderId}}.\n\nPlease try again using this link: {{retryUrl}}\n\nIf you need assistance, reply to this message.',
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Retry Payment URL',
          additionalInfoPlaceholder: 'https://example.com/retry-payment',
          isActive: true,
          description: 'Sent when payment fails',
        },
        {
          name: WhatsAppTemplate.ORDER_SHIPPED,
          content: '🚚 *Order Shipped* 🚚\n\nHi {{customerName}},\n\nGreat news! Your order #{{orderId}} has been shipped.\n\nCarrier: {{carrier}}\nTracking: {{trackingLink}}\n\nEstimated delivery: {{estimatedDelivery}}\n\nThank you for your patience!',
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Tracking Link & Carrier',
          additionalInfoPlaceholder: 'https://tracking.com/123456,FedEx',
          isActive: true,
          description: 'Sent when order is shipped',
        },
        {
          name: WhatsAppTemplate.OUT_FOR_DELIVERY,
          content: '🚚 *Out for Delivery* 🚚\n\nHi {{customerName}},\n\nYour order #{{orderId}} is out for delivery today!\n\nPlease ensure someone is available to receive it.\n\nExcited for you to receive your items!',
          requiresAdditionalInfo: false,
          isActive: true,
          description: 'Sent when order is out for delivery',
        },
        {
          name: WhatsAppTemplate.ORDER_DELIVERED,
          content: '📦 *Order Delivered* 📦\n\nHi {{customerName}},\n\nYour order #{{orderId}} has been delivered!\n\nWe hope you love your purchase. Please share your feedback here: {{feedbackLink}}\n\nThank you for shopping with us!',
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Feedback Link',
          additionalInfoPlaceholder: 'https://example.com/feedback',
          isActive: true,
          description: 'Sent when order is delivered',
        },
        {
          name: WhatsAppTemplate.REQUEST_REVIEW,
          content: '⭐ *We Value Your Opinion* ⭐\n\nHi {{customerName}}, we\'d love to hear your thoughts on your recent order (#{{orderId}})! 📝\n\nLeave a quick review here: {{reviewLink}}\n\nThanks for being part of our journey 💚',
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Review Link',
          additionalInfoPlaceholder: 'https://example.com/review',
          isActive: true,
          description: 'Sent to request a review',
        },
        {
          name: WhatsAppTemplate.REFUND_CONFIRMATION,
          content: '💰 *Refund Processed* 💰\n\nHi {{customerName}},\n\nWe\'ve processed your refund of ₹{{refundAmount}} for order #{{orderId}}.\n\nThe amount should appear in your account within 5-7 business days.\n\nThank you for your patience.',
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Refund Amount',
          additionalInfoPlaceholder: '500',
          isActive: true,
          description: 'Sent when refund is processed',
        },
        {
          name: WhatsAppTemplate.REORDER_REMINDER,
          content: '🔄 *Time to Reorder?* 🔄\n\nHi {{customerName}},\n\nIt\'s been {{daysSinceDelivery}} days since you received your order #{{orderId}}.\n\nRunning low on supplies? Reorder easily here: {{reorderLink}}\n\nThank you for your continued support!',
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Reorder Link & Days Since Delivery',
          additionalInfoPlaceholder: 'https://example.com/reorder,30',
          isActive: true,
          description: 'Sent as a reminder to reorder',
        },
        {
          name: WhatsAppTemplate.ABANDONED_CART,
          content: '🛒 *Your Cart is Waiting* 🛒\n\nHi {{customerName}},\n\nWe noticed you left some items in your cart.\n\nComplete your purchase here: {{cartUrl}}\n\nNeed help? Just reply to this message!',
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Cart URL',
          additionalInfoPlaceholder: 'https://example.com/cart/123',
          isActive: true,
          description: 'Sent for abandoned carts',
        },
      ];

      // Create default templates in PocketBase
      for (const template of defaultTemplates) {
        try {
          await pb.collection('whatsapp_templates').create(template);
        } catch (err) {
          console.error(`Error creating template ${template.name}:`, err);
          // Continue with other templates
        }
      }

      // Fetch the created templates
      const records = await pb.collection('whatsapp_templates').getFullList({
        sort: 'name',
      });
      
      setTemplates(records as unknown as Template[]);
      toast.success('Default WhatsApp templates created');
    } catch (err) {
      console.error('Error creating default templates:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplate = async (id: string, templateData: Partial<Template>) => {
    try {
      const updated = await pb.collection('whatsapp_templates').update(id, templateData);
      setTemplates(prev => prev.map(t => t.id === id ? {...t, ...updated} as Template : t));
      return updated;
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    }
  };

  const createTemplate = async (templateData: Omit<Template, 'id' | 'created' | 'updated'>) => {
    try {
      const created = await pb.collection('whatsapp_templates').create(templateData);
      setTemplates(prev => [...prev, created as unknown as Template]);
      return created;
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await pb.collection('whatsapp_templates').delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    templates,
    isLoading,
    error,
    refreshTemplates: fetchTemplates,
    updateTemplate,
    createTemplate,
    deleteTemplate,
  };
}
