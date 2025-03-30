import emailjs from '@emailjs/browser';
import { EmailTemplate, EmailApiResponse } from './email';

// You need to configure EmailJS with your service ID, template IDs, and user ID (public key)
// Get these values from your EmailJS dashboard: https://dashboard.emailjs.com/admin

// Initialize EmailJS with your User ID (public key)
const initEmailJS = () => {
  const userId = import.meta.env.VITE_EMAILJS_USER_ID;
  if (!userId) {
    console.error('EmailJS User ID is missing. Please check your environment variables.');
    return false;
  }
  
  emailjs.init(userId);
  return true;
};

// Map of template IDs for different email types
const templateIds: Record<string, string> = {
  [EmailTemplate.ORDER_CONFIRMATION]: import.meta.env.VITE_EMAILJS_ORDER_CONFIRMATION_TEMPLATE || 'template_order_confirmation',
  [EmailTemplate.PAYMENT_SUCCESS]: import.meta.env.VITE_EMAILJS_PAYMENT_SUCCESS_TEMPLATE || 'template_payment_success',
  [EmailTemplate.PAYMENT_FAILED]: import.meta.env.VITE_EMAILJS_PAYMENT_FAILED_TEMPLATE || 'template_payment_failed',
  [EmailTemplate.ORDER_SHIPPED]: import.meta.env.VITE_EMAILJS_ORDER_SHIPPED_TEMPLATE || 'template_order_shipped',
  [EmailTemplate.OUT_FOR_DELIVERY]: import.meta.env.VITE_EMAILJS_OUT_FOR_DELIVERY_TEMPLATE || 'template_out_for_delivery',
  [EmailTemplate.ORDER_DELIVERED]: import.meta.env.VITE_EMAILJS_ORDER_DELIVERED_TEMPLATE || 'template_order_delivered',
  [EmailTemplate.REQUEST_REVIEW]: import.meta.env.VITE_EMAILJS_REQUEST_REVIEW_TEMPLATE || 'template_request_review',
  [EmailTemplate.REFUND_CONFIRMATION]: import.meta.env.VITE_EMAILJS_REFUND_CONFIRMATION_TEMPLATE || 'template_refund_confirmation',
  [EmailTemplate.REORDER_REMINDER]: import.meta.env.VITE_EMAILJS_REORDER_REMINDER_TEMPLATE || 'template_reorder_reminder',
  [EmailTemplate.ABANDONED_CART]: import.meta.env.VITE_EMAILJS_ABANDONED_CART_TEMPLATE || 'template_abandoned_cart',
};

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send an email using EmailJS
 * @param to Recipient email address
 * @param subject Email subject
 * @param templateName The template to use (from EmailTemplate enum)
 * @param templateParams Template parameters
 */
export async function sendClientEmail(
  to: string,
  subject: string,
  templateName: string,
  templateParams: Record<string, any>
): Promise<EmailApiResponse> {
  try {
    // Validate email format
    if (!isValidEmail(to)) {
      throw new Error('Invalid email address format');
    }
    
    // Initialize EmailJS if not already done
    if (!initEmailJS()) {
      throw new Error('EmailJS initialization failed');
    }
    
    // Get the template ID for the specified template name
    const templateId = templateIds[templateName];
    if (!templateId) {
      throw new Error(`Template ${templateName} is not configured`);
    }
    
    // Get the service ID
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    if (!serviceId) {
      throw new Error('EmailJS Service ID is missing. Please check your environment variables.');
    }
    
    // Prepare parameters for the email template
    const params = {
      to_email: to,
      subject: subject,
      ...templateParams
    };
    
    // Send the email using EmailJS
    console.log(`Sending ${templateName} email to: ${to}`);
    const response = await emailjs.send(serviceId, templateId, params);
    
    console.log('Email sent successfully:', response);
    return {
      success: true,
      message: 'Email sent successfully',
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
      status: 'failed',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Send an order confirmation email using EmailJS
 */
export async function sendOrderConfirmationClientEmail(
  orderId: string,
  customerName: string,
  customerEmail: string,
  orderItems: Array<{ name: string; price: number; quantity: number }>,
  orderDate: string,
  totalAmount: number
): Promise<EmailApiResponse> {
  try {
    // Format order items for display in the email
    const itemsList = orderItems.map(item => 
      `${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`
    ).join(', ');
    
    // Prepare template parameters
    const templateParams = {
      customer_name: customerName,
      order_id: orderId,
      order_date: new Date(orderDate).toLocaleDateString(),
      items: itemsList,
      total: `₹${totalAmount}`,
    };
    
    // Send the email
    return await sendClientEmail(
      customerEmail,
      `Order Confirmation - #${orderId}`,
      EmailTemplate.ORDER_CONFIRMATION,
      templateParams
    );
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send order confirmation email',
      status: 'failed',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Send a payment success email using EmailJS
 */
export async function sendPaymentSuccessClientEmail(
  orderId: string,
  customerName: string,
  customerEmail: string,
  amount: number,
  paymentDate: string
): Promise<EmailApiResponse> {
  try {
    // Prepare template parameters
    const templateParams = {
      customer_name: customerName,
      order_id: orderId,
      payment_amount: `₹${amount}`,
      payment_date: new Date(paymentDate).toLocaleDateString(),
    };
    
    // Send the email
    return await sendClientEmail(
      customerEmail,
      `Payment Successful - Order #${orderId}`,
      EmailTemplate.PAYMENT_SUCCESS,
      templateParams
    );
  } catch (error) {
    console.error('Error sending payment success email:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send payment success email',
      status: 'failed',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check if EmailJS is properly configured
 */
export async function checkEmailJSConfig(): Promise<{
  configured: boolean;
  message: string;
  details?: Record<string, boolean>;
}> {
  const userId = import.meta.env.VITE_EMAILJS_USER_ID;
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  
  const details = {
    userId: !!userId,
    serviceId: !!serviceId,
  };
  
  if (!userId || !serviceId) {
    return {
      configured: false,
      message: 'EmailJS is not fully configured. Check environment variables.',
      details
    };
  }
  
  return {
    configured: true,
    message: 'EmailJS is properly configured',
    details
  };
}

// Export other email sending functions as needed based on your requirements 