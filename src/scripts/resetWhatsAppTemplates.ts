import { pb } from '../lib/pocketbase';
import { WhatsAppTemplate } from '../lib/whatsapp';

/**
 * This script resets and repopulates the WhatsApp templates in PocketBase
 * Run with: npx ts-node src/scripts/resetWhatsAppTemplates.ts
 */
async function resetWhatsAppTemplates() {
  try {
    console.log('Starting WhatsApp templates reset...');
    
    // Check if collection exists
    const collections = await pb.collections.getFullList();
    const templateCollectionExists = collections.some(c => c.name === 'whatsapp_templates');
    
    // Create collection if it doesn't exist
    if (!templateCollectionExists) {
      console.log('Creating whatsapp_templates collection...');
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
      console.log('Collection created successfully');
    }

    // Delete all existing templates
    console.log('Deleting existing templates...');
    try {
      const existingTemplates = await pb.collection('whatsapp_templates').getFullList();
      for (const template of existingTemplates) {
        await pb.collection('whatsapp_templates').delete(template.id);
      }
      console.log(`Deleted ${existingTemplates.length} existing templates`);
    } catch (err) {
      console.log('No existing templates to delete or error:', err);
    }

    // Default templates based on the WhatsAppTemplate enum
    const defaultTemplates = [
      {
        name: WhatsAppTemplate.ORDER_CONFIRMATION,
        content: 'ud83cudf89 *Order Confirmed* ud83cudf89\n\nHi {{customerName}},\n\nYour order #{{orderId}} has been confirmed!\n\nThank you for shopping with us.\n\nWe\'ll update you when your order ships.',
        requiresAdditionalInfo: false,
        isActive: true,
        description: 'Sent when an order is confirmed',
      },
      {
        name: WhatsAppTemplate.PAYMENT_SUCCESS,
        content: 'u2705 *Payment Successful* u2705\n\nHi {{customerName}},\n\nYour payment of u20b9{{amount}} for order #{{orderId}} has been successfully received.\n\nThank you for your purchase!',
        requiresAdditionalInfo: false,
        isActive: true,
        description: 'Sent when payment is successful',
      },
      {
        name: WhatsAppTemplate.PAYMENT_FAILED,
        content: 'u274c *Payment Failed* u274c\n\nHi {{customerName}},\n\nWe couldn\'t process your payment of u20b9{{amount}} for order #{{orderId}}.\n\nPlease try again using this link: {{retryUrl}}\n\nIf you need assistance, reply to this message.',
        requiresAdditionalInfo: true,
        additionalInfoLabel: 'Retry Payment URL',
        additionalInfoPlaceholder: 'https://example.com/retry-payment',
        isActive: true,
        description: 'Sent when payment fails',
      },
      {
        name: WhatsAppTemplate.ORDER_SHIPPED,
        content: 'ud83dude9a *Order Shipped* ud83dude9a\n\nHi {{customerName}},\n\nGreat news! Your order #{{orderId}} has been shipped.\n\nCarrier: {{carrier}}\nTracking: {{trackingLink}}\n\nEstimated delivery: {{estimatedDelivery}}\n\nThank you for your patience!',
        requiresAdditionalInfo: true,
        additionalInfoLabel: 'Tracking Link & Carrier',
        additionalInfoPlaceholder: 'https://tracking.com/123456,FedEx',
        isActive: true,
        description: 'Sent when order is shipped',
      },
      {
        name: WhatsAppTemplate.OUT_FOR_DELIVERY,
        content: 'ud83dude9a *Out for Delivery* ud83dude9a\n\nHi {{customerName}},\n\nYour order #{{orderId}} is out for delivery today!\n\nPlease ensure someone is available to receive it.\n\nExcited for you to receive your items!',
        requiresAdditionalInfo: false,
        isActive: true,
        description: 'Sent when order is out for delivery',
      },
      {
        name: WhatsAppTemplate.ORDER_DELIVERED,
        content: 'ud83dudce6 *Order Delivered* ud83dudce6\n\nHi {{customerName}},\n\nYour order #{{orderId}} has been delivered!\n\nWe hope you love your purchase. Please share your feedback here: {{feedbackLink}}\n\nThank you for shopping with us!',
        requiresAdditionalInfo: true,
        additionalInfoLabel: 'Feedback Link',
        additionalInfoPlaceholder: 'https://example.com/feedback',
        isActive: true,
        description: 'Sent when order is delivered',
      },
      {
        name: WhatsAppTemplate.REQUEST_REVIEW,
        content: 'u2b50 *We Value Your Opinion* u2b50\n\nHi {{customerName}}, we\'d love to hear your thoughts on your recent order (#{{orderId}})! ud83dudcdd\n\nLeave a quick review here: {{reviewLink}}\n\nThanks for being part of our journey ud83dudc9a',
        requiresAdditionalInfo: true,
        additionalInfoLabel: 'Review Link',
        additionalInfoPlaceholder: 'https://example.com/review',
        isActive: true,
        description: 'Sent to request a review',
      },
      {
        name: WhatsAppTemplate.REFUND_CONFIRMATION,
        content: 'ud83dudcb0 *Refund Processed* ud83dudcb0\n\nHi {{customerName}},\n\nWe\'ve processed your refund of u20b9{{refundAmount}} for order #{{orderId}}.\n\nThe amount should appear in your account within 5-7 business days.\n\nThank you for your patience.',
        requiresAdditionalInfo: true,
        additionalInfoLabel: 'Refund Amount',
        additionalInfoPlaceholder: '500',
        isActive: true,
        description: 'Sent when refund is processed',
      },
      {
        name: WhatsAppTemplate.REORDER_REMINDER,
        content: 'ud83dudd04 *Time to Reorder?* ud83dudd04\n\nHi {{customerName}},\n\nIt\'s been {{daysSinceDelivery}} days since you received your order #{{orderId}}.\n\nRunning low on supplies? Reorder easily here: {{reorderLink}}\n\nThank you for your continued support!',
        requiresAdditionalInfo: true,
        additionalInfoLabel: 'Reorder Link & Days Since Delivery',
        additionalInfoPlaceholder: 'https://example.com/reorder,30',
        isActive: true,
        description: 'Sent as a reminder to reorder',
      },
      {
        name: WhatsAppTemplate.ABANDONED_CART,
        content: 'ud83duded2 *Your Cart is Waiting* ud83duded2\n\nHi {{customerName}},\n\nWe noticed you left some items in your cart.\n\nComplete your purchase here: {{cartUrl}}\n\nNeed help? Just reply to this message!',
        requiresAdditionalInfo: true,
        additionalInfoLabel: 'Cart URL',
        additionalInfoPlaceholder: 'https://example.com/cart/123',
        isActive: true,
        description: 'Sent for abandoned carts',
      },
    ];

    // Create default templates in PocketBase
    console.log('Creating new templates...');
    let createdCount = 0;
    for (const template of defaultTemplates) {
      try {
        await pb.collection('whatsapp_templates').create(template);
        createdCount++;
      } catch (err) {
        console.error(`Error creating template ${template.name}:`, err);
        // Continue with other templates
      }
    }

    console.log(`Successfully created ${createdCount} templates`);
    console.log('WhatsApp templates reset completed successfully!');
    
  } catch (err) {
    console.error('Error resetting WhatsApp templates:', err);
  }
}

// Execute the function
resetWhatsAppTemplates().then(() => {
  console.log('Script execution completed');
  process.exit(0);
}).catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});
