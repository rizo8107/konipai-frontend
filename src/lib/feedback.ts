/**
 * Feedback and review utilities for sending feedback requests and handling reviews
 */
import { frontendConfig } from '../frontend.config';
import { sendWhatsAppMessage } from './whatsapp';

// Simple base64 encoding/decoding using browser APIs
const encodeBase64 = (str: string): string => {
  if (typeof window !== 'undefined') {
    return window.btoa(encodeURIComponent(str));
  }
  return Buffer.from(str).toString('base64');
};

interface FeedbackLinkParams {
  orderId: string;
  productId: string;
  userId: string;
  timestamp: number;
}

/**
 * Generate a feedback link for a specific order and product
 * @param orderId The order ID
 * @param productId The product ID being reviewed
 * @param userId The user ID of the customer
 * @returns A feedback URL that can be sent to the customer
 */
export function generateFeedbackLink(orderId: string, productId: string, userId: string): string {
  // Create a payload with the necessary information
  const payload: FeedbackLinkParams = {
    orderId,
    productId,
    userId,
    timestamp: Date.now()
  };
  
  // Encode the payload as base64 to create a simple token
  const token = encodeBase64(JSON.stringify(payload));
  
  // Generate the full URL to the feedback form
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : frontendConfig.site.baseUrl;
    
  return `${baseUrl}/feedback?token=${token}`;
}

/**
 * Send a feedback request message via WhatsApp
 * @param orderInfo Order information including ID and product details
 * @param customerInfo Customer information including ID, name and phone
 * @returns Promise with the result of the WhatsApp message delivery
 */
export async function sendFeedbackRequestViaWhatsApp(
  orderInfo: { id: string; productId: string; productName: string },
  customerInfo: { id: string; name: string; phone: string }
): Promise<boolean> {
  try {
    // Generate the feedback link
    const feedbackLink = generateFeedbackLink(
      orderInfo.id, 
      orderInfo.productId, 
      customerInfo.id
    );
    
    // Create the WhatsApp message with the feedback link
    const message = `Hi ${customerInfo.name},\n\nThank you for your purchase! Your order has been delivered. We'd love to hear your feedback on "${orderInfo.productName}".\n\nPlease click the link below to share your review:\n${feedbackLink}\n\nYour feedback helps us improve our products and services.\n\nThank you,\nKonipai Team`;
    
    // Send the WhatsApp message
    const result = await sendWhatsAppMessage(customerInfo.phone, message);
    
    console.log('Feedback request sent via WhatsApp:', result);
    return result.success;
  } catch (error) {
    console.error('Error sending feedback request via WhatsApp:', error);
    return false;
  }
}

/**
 * Send a feedback request message via WhatsApp using a template (preferred for business accounts)
 * @param order The order that has been delivered
 * @param product The product to request feedback for
 * @param user The user who placed the order
 * @returns Promise with the result of the WhatsApp template message delivery
 */
export async function sendFeedbackRequestViaWhatsAppTemplate(
  order: Order,
  product: Product,
  user: User
): Promise<boolean> {
  try {
    // Generate the feedback link
    const feedbackLink = generateFeedbackLink(order.id, product.id, user.id);
    
    // Define the template parameters
    const templateParams = {
      1: user.name,
      2: product.name,
      3: feedbackLink
    };
    
    // Send the WhatsApp template message (assuming you have a 'feedback_request' template)
    const result = await sendWhatsAppTemplate(
      user.phone,
      'feedback_request',
      templateParams
    );
    
    console.log('Feedback request template sent via WhatsApp:', result);
    return result.success;
  } catch (error) {
    console.error('Error sending feedback request template via WhatsApp:', error);
    return false;
  }
} 