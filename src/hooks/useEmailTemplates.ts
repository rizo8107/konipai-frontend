import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { EmailTemplate } from '@/lib/email';
import { toast } from 'sonner';

export interface EmailTemplateType {
  id: string;
  name: string;
  subject: string;
  content: string;
  requiresAdditionalInfo: boolean;
  additionalInfoLabel?: string;
  additionalInfoPlaceholder?: string;
  isActive: boolean;
  description: string;
  created?: string;
  updated?: string;
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplateType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      // Check if collection exists
      const collections = await pb.collections.getFullList();
      const templateCollectionExists = collections.some(c => c.name === 'email_templates');
      
      // If collection doesn't exist, create default templates from enum
      if (!templateCollectionExists) {
        await createDefaultTemplates();
        return;
      }
      
      const records = await pb.collection('email_templates').getFullList({
        sort: 'name',
      });
      
      setTemplates(records as unknown as EmailTemplateType[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching email templates:', err);
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
          name: 'email_templates',
          schema: [
            {
              name: 'name',
              type: 'text',
              required: true,
              unique: true,
            },
            {
              name: 'subject',
              type: 'text',
              required: true,
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
        console.log('Created email_templates collection');
      } catch (err) {
        console.error('Error creating email_templates collection:', err);
      }

      // Create default templates based on the EmailTemplate enum
      const defaultTemplates = [
        {
          name: EmailTemplate.ORDER_CONFIRMATION,
          subject: 'Your Order Confirmation - {{orderId}}',
          content: `Dear {{customerName}},

Thank you for your order! We're pleased to confirm that we've received your order.

Order Details:
Order ID: {{orderId}}
Order Date: {{orderDate}}

{{productDetails}}

We'll notify you when your order has been shipped.

Thank you for shopping with us!`,
          requiresAdditionalInfo: false,
          isActive: true,
          description: 'Sent to customers after they place an order',
        },
        {
          name: EmailTemplate.PAYMENT_SUCCESS,
          subject: 'Payment Successful - Order #{{orderId}}',
          content: `Dear {{customerName}},

Great news! Your payment for order #{{orderId}} has been successfully processed.

Order ID: {{orderId}}
Amount: ₹{{amount}}
Date: {{orderDate}}

We're now preparing your order for shipment. You'll receive another email once your order has been shipped.

Thank you for shopping with us!`,
          requiresAdditionalInfo: false,
          isActive: true,
          description: 'Sent to customers after successful payment',
        },
        {
          name: EmailTemplate.PAYMENT_FAILED,
          subject: 'Payment Failed - Order #{{orderId}}',
          content: `Dear {{customerName}},

We're sorry, but your payment for order #{{orderId}} could not be processed.

Order ID: {{orderId}}
Amount: ₹{{amount}}

Please click the link below to retry your payment:
{{retryUrl}}

If you continue to experience issues, please contact our customer support team for assistance.

Thank you for your patience.`,
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Payment Retry URL',
          additionalInfoPlaceholder: 'https://payment.example.com/retry/123',
          isActive: true,
          description: 'Sent to customers when payment fails',
        },
        {
          name: EmailTemplate.ORDER_SHIPPED,
          subject: 'Your Order Has Been Shipped - Order #{{orderId}}',
          content: `Dear {{customerName}},

Good news! Your order #{{orderId}} has been shipped and is on its way to you.

Shipping Details:
Carrier: {{carrier}}
Estimated Delivery Date: {{estimatedDelivery}}
Tracking Link: {{trackingLink}}

You can use the tracking link above to monitor the progress of your delivery.

Thank you for shopping with us!`,
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Tracking Link, Carrier Name, Estimated Delivery Date',
          additionalInfoPlaceholder: 'https://tracking.example.com/123,FedEx,2023-12-31',
          isActive: true,
          description: 'Sent to customers when their order is shipped',
        },
        {
          name: EmailTemplate.OUT_FOR_DELIVERY,
          subject: 'Your Order Is Out For Delivery - Order #{{orderId}}',
          content: `Dear {{customerName}},

Exciting news! Your order #{{orderId}} is out for delivery and should arrive today.

Please ensure someone is available to receive the package.

If you have any special delivery instructions, please contact the carrier directly.

Thank you for shopping with us!`,
          requiresAdditionalInfo: false,
          isActive: true,
          description: 'Sent to customers when their order is out for delivery',
        },
        {
          name: EmailTemplate.ORDER_DELIVERED,
          subject: 'Your Order Has Been Delivered - Order #{{orderId}}',
          content: `Dear {{customerName}},

We're happy to inform you that your order #{{orderId}} has been delivered.

We hope you're satisfied with your purchase. If you have a moment, we'd appreciate your feedback:
{{feedbackLink}}

If you have any questions or concerns about your order, please don't hesitate to contact our customer support team.

Thank you for shopping with us!`,
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Feedback Link',
          additionalInfoPlaceholder: 'https://feedback.example.com/123',
          isActive: true,
          description: 'Sent to customers when their order is delivered',
        },
        {
          name: EmailTemplate.REQUEST_REVIEW,
          subject: 'Please Review Your Recent Purchase - Order #{{orderId}}',
          content: `Dear {{customerName}},

Thank you for your recent purchase (Order #{{orderId}}). We hope you're enjoying your new items!

We'd love to hear your thoughts on your purchase. Your feedback helps us improve and assists other customers in making informed decisions.

Leave a review here: {{reviewLink}}

It only takes a minute, and your input is valuable to us.

Thank you for your support!`,
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Review Link',
          additionalInfoPlaceholder: 'https://review.example.com/123',
          isActive: true,
          description: 'Sent to customers requesting a product review',
        },
        {
          name: EmailTemplate.REFUND_CONFIRMATION,
          subject: 'Refund Confirmation - Order #{{orderId}}',
          content: `Dear {{customerName}},

We're writing to confirm that we've processed a refund for your order #{{orderId}}.

Refund Details:
Amount: ₹{{refundAmount}}
Date: {{orderDate}}

The refunded amount should appear in your account within 5-7 business days, depending on your payment provider.

If you have any questions about your refund, please contact our customer support team.

Thank you for your understanding.`,
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Refund Amount',
          additionalInfoPlaceholder: '1000',
          isActive: true,
          description: 'Sent to customers when a refund is processed',
        },
        {
          name: EmailTemplate.REORDER_REMINDER,
          subject: 'Time to Restock? - Order #{{orderId}}',
          content: `Dear {{customerName}},

It's been {{daysSinceDelivery}} days since your last order (#{{orderId}}). We thought you might be running low on your items.

Ready to reorder? It's easy! Just click the link below:
{{reorderLink}}

Thank you for being a valued customer!`,
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Reorder Link, Days Since Delivery',
          additionalInfoPlaceholder: 'https://shop.example.com/reorder/123,30',
          isActive: true,
          description: 'Sent to customers as a reminder to reorder',
        },
        {
          name: EmailTemplate.ABANDONED_CART,
          subject: 'Don\'t Miss Out - Your Cart is Waiting',
          content: `Dear {{customerName}},

We noticed you left some items in your shopping cart.

Your cart is still saved, and you can complete your purchase anytime. Just click the link below to return to your cart:
{{cartUrl}}

If you have any questions or need assistance, our customer support team is here to help.

Happy shopping!`,
          requiresAdditionalInfo: true,
          additionalInfoLabel: 'Cart URL',
          additionalInfoPlaceholder: 'https://shop.example.com/cart/123',
          isActive: true,
          description: 'Sent to customers who abandoned their shopping cart',
        },
      ];

      // Create each template in PocketBase
      for (const template of defaultTemplates) {
        try {
          await pb.collection('email_templates').create(template);
          console.log(`Created email template: ${template.name}`);
        } catch (err) {
          console.error(`Error creating email template ${template.name}:`, err);
        }
      }

      // Fetch the newly created templates
      await fetchTemplates();
    } catch (err) {
      console.error('Error creating default email templates:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTemplate = async (template: Omit<EmailTemplateType, 'id' | 'created' | 'updated'>) => {
    try {
      const record = await pb.collection('email_templates').create(template);
      await fetchTemplates();
      return record;
    } catch (err) {
      console.error('Error creating email template:', err);
      throw err;
    }
  };

  const updateTemplate = async (id: string, template: Partial<Omit<EmailTemplateType, 'id' | 'created' | 'updated'>>) => {
    try {
      const record = await pb.collection('email_templates').update(id, template);
      await fetchTemplates();
      return record;
    } catch (err) {
      console.error('Error updating email template:', err);
      throw err;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await pb.collection('email_templates').delete(id);
      await fetchTemplates();
    } catch (err) {
      console.error('Error deleting email template:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    fetchTemplates,
  };
}
