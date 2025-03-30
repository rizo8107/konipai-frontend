import axios from 'axios';
import { Order, OrderItem } from '@/types/schema';

// Interface for Email message activity logging
export interface EmailActivity {
  id?: string;
  order_id: string;
  template_name: string;
  recipient: string;
  status: 'sent' | 'failed';
  message_content: string;
  timestamp: string;
  subject?: string;
}

// Interface for Email API responses
export interface EmailApiResponse {
  success: boolean;
  message: string;
  messageId?: string;
  status?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// Template names for email templates
export enum EmailTemplate {
  ABANDONED_CART = 'abandoned_cart',
  ORDER_CONFIRMATION = 'order_confirmation',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  ORDER_SHIPPED = 'order_shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  ORDER_DELIVERED = 'order_delivered',
  REQUEST_REVIEW = 'request_review',
  REFUND_CONFIRMATION = 'refund_confirmation',
  REORDER_REMINDER = 'reorder_reminder'
}

// Constants from environment variables
const EMAILENGINE_URL = import.meta.env.VITE_EMAILENGINE_URL || 'https://api.emailengine.app';
const EMAILENGINE_API_KEY = import.meta.env.VITE_EMAILENGINE_API_KEY || '';
const EMAIL_FROM = import.meta.env.VITE_EMAIL_FROM || 'support@konipai.in';
const EMAIL_FROM_NAME = import.meta.env.VITE_EMAIL_FROM_NAME || 'Konipai CRM';
const SMTP_ACCOUNT = import.meta.env.VITE_EMAILENGINE_ACCOUNT || 'default';

// Configure axios instance for EmailEngine
const emailEngineClient = axios.create({
  baseURL: EMAILENGINE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': EMAILENGINE_API_KEY
  }
});

/**
 * Send an email message directly using EmailEngine API
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param message - Email content (HTML)
 * @param variables - Optional variables for template messages
 */
export async function sendEmailMessage(
  to: string,
  subject: string,
  message: string,
  variables?: Record<string, string>
): Promise<EmailApiResponse> {
  try {
    // Validate email format
    if (!isValidEmail(to)) {
      throw new Error('Invalid email address format');
    }
    
    // Prepare EmailEngine submission data
    const emailData = {
      account: SMTP_ACCOUNT,
      from: {
        name: EMAIL_FROM_NAME,
        address: EMAIL_FROM
      },
      to: [
        {
          address: to
        }
      ],
      subject: subject,
      html: message,
      headers: {
        'X-Tracking-ID': variables?.orderId || `track-${Date.now()}`,
        'X-Template-Name': variables?.templateName || 'custom_email'
      }
    };
    
    console.log('Sending email to:', to);
    
    // Send email using EmailEngine API
    const response = await emailEngineClient.post('/v1/submit', emailData);
    
    console.log('Email sent successfully:', response.data);
    
    // Log activity if configured
    try {
      await logEmailActivity({
        order_id: variables?.orderId || 'N/A',
        template_name: variables?.templateName || 'custom_email',
        recipient: to,
        status: 'sent',
        message_content: message,
        timestamp: new Date().toISOString(),
        subject
      });
    } catch (logError) {
      console.warn('Failed to log email activity:', logError);
    }
    
    // Return success response
    return {
      success: true,
      message: 'Email sent',
      messageId: response.data.queueId || response.data.id,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Extract error message
    let errorMessage = 'Failed to send email';
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Try to log the failure
    try {
      await logEmailActivity({
        order_id: variables?.orderId || 'N/A',
        template_name: variables?.templateName || 'custom_email',
        recipient: to,
        status: 'failed',
        message_content: message,
        timestamp: new Date().toISOString(),
        subject
      });
    } catch (logError) {
      console.warn('Failed to log email activity:', logError);
    }
    
    return {
      success: false,
      message: errorMessage,
      status: 'failed',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Send an order confirmation email
 * @param order - The order to send a confirmation for
 * @param orderItems - The order items to include in the confirmation
 * @param to - The email address to send the message to
 * @returns Promise with the API response
 */
export async function sendOrderConfirmationEmail(
  order: Order,
  orderItems: Array<{ id: string; name: string; price: number; quantity: number; image?: string }>,
  to: string
): Promise<EmailApiResponse> {
  try {
    const subject = `Order Confirmation - #${order.id}`;
    
    // Format order items for display
    const formattedItems = orderItems
      .map((item) => `${item.quantity}x ${item.name} - ₹${item.price}`)
      .join('<br>');
    
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Create email content
    const message = `
      <h1>Order Confirmation</h1>
      <p>Dear ${order.customer_name},</p>
      <p>Thank you for your order! We're pleased to confirm that we've received your order.</p>
      <h2>Order Details:</h2>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Order Date:</strong> ${new Date(order.created || Date.now()).toLocaleDateString()}</p>
      <h3>Items:</h3>
      <p>${formattedItems}</p>
      <p><strong>Total: ₹${total}</strong></p>
      <p>We'll notify you when your order has been shipped.</p>
      <p>Thank you for shopping with us!</p>
    `;
    
    // Send the email with order ID in variables
    return await sendEmailMessage(to, subject, message, {
      orderId: order.id,
      templateName: EmailTemplate.ORDER_CONFIRMATION
    });
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send order confirmation email'
    };
  }
}

/**
 * Send payment success notification via email
 * @param order - The order object
 * @param customerEmail - Customer's email address
 */
export async function sendPaymentSuccessEmail(
  order: Order,
  customerEmail: string
): Promise<EmailApiResponse> {
  try {
    const subject = `Payment Successful - Order #${order.id}`;
    
    // Create email content
    const message = `
      <h1>Payment Successful</h1>
      <p>Dear ${order.customer_name},</p>
      <p>Great news! Your payment for order #${order.id} has been successfully processed.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total Amount:</strong> ₹${order.totalAmount || '0'}</p>
      <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p>We've started processing your order and will notify you when it ships.</p>
      <p>Thank you for your purchase!</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message, {
      orderId: order.id,
      templateName: EmailTemplate.PAYMENT_SUCCESS
    });
  } catch (error) {
    console.error('Error sending payment success email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send payment success email'
    };
  }
}

/**
 * Send email with attachment using EmailEngine
 * @param to Recipient email address
 * @param subject Email subject
 * @param message Email message HTML content
 * @param attachments Array of attachments
 * @param variables Optional template variables
 */
export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  message: string,
  attachments: Array<{filename: string, content: string, contentType: string}>,
  variables?: Record<string, string>
): Promise<EmailApiResponse> {
  try {
    // Validate email format
    if (!isValidEmail(to)) {
      throw new Error('Invalid email address format');
    }
    
    // Prepare EmailEngine submission data
    const emailData = {
      account: SMTP_ACCOUNT,
      from: {
        name: EMAIL_FROM_NAME,
        address: EMAIL_FROM
      },
      to: [
        {
          address: to
        }
      ],
      subject: subject,
      html: message,
      attachments: attachments.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType
      })),
      headers: {
        'X-Tracking-ID': variables?.orderId || `track-${Date.now()}`,
        'X-Template-Name': variables?.templateName || 'custom_email_with_attachment'
      }
    };
    
    console.log('Sending email with attachment to:', to);
    
    // Send email using EmailEngine API
    const response = await emailEngineClient.post('/v1/submit', emailData);
    
    console.log('Email with attachment sent successfully:', response.data);
    
    // Log activity
    try {
      await logEmailActivity({
        order_id: variables?.orderId || 'N/A',
        template_name: variables?.templateName || 'custom_email_with_attachment',
        recipient: to,
        status: 'sent',
        message_content: message,
        timestamp: new Date().toISOString(),
        subject
      });
    } catch (logError) {
      console.warn('Failed to log email activity:', logError);
    }
    
    // Return success response
    return {
      success: true,
      message: 'Email with attachment sent',
      messageId: response.data.queueId || response.data.id,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending email with attachment:', error);
    
    // Extract error message
    let errorMessage = 'Failed to send email with attachment';
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Log the failure
    try {
      await logEmailActivity({
        order_id: variables?.orderId || 'N/A',
        template_name: variables?.templateName || 'custom_email_with_attachment',
        recipient: to,
        status: 'failed',
        message_content: message,
        timestamp: new Date().toISOString(),
        subject
      });
    } catch (logError) {
      console.warn('Failed to log email activity:', logError);
    }
    
    return {
      success: false,
      message: errorMessage,
      status: 'failed',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Log email activity to PocketBase or local storage
 * @param activity Email activity to log
 */
export async function logEmailActivity(activity: EmailActivity): Promise<void> {
  try {
    // Try to log to PocketBase if available
    const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL;
    
    if (pocketbaseUrl) {
      // If PocketBase is available, log activity there
      await axios.post(`${pocketbaseUrl}/api/collections/email_activities/records`, activity);
      console.log('Email activity logged to PocketBase');
    } else {
      // Otherwise, log to localStorage for fallback
      const activities = JSON.parse(localStorage.getItem('emailActivities') || '[]');
      activities.push({...activity, id: `local-${Date.now()}`});
      localStorage.setItem('emailActivities', JSON.stringify(activities));
      console.log('Email activity logged to localStorage');
    }
  } catch (error) {
    console.error('Failed to log email activity:', error);
    
    // Fallback to localStorage if PocketBase fails
    try {
      const activities = JSON.parse(localStorage.getItem('emailActivities') || '[]');
      activities.push({...activity, id: `local-${Date.now()}`});
      localStorage.setItem('emailActivities', JSON.stringify(activities));
      console.log('Email activity logged to localStorage (fallback)');
    } catch (storageError) {
      console.error('Failed to log to localStorage:', storageError);
    }
  }
}

/**
 * Validate email format
 * @param email Email address to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Check if email service is configured and ready
 * @returns Object with connection status
 */
export async function checkEmailConnection(): Promise<{
  connected: boolean;
  status?: string;
  message?: string;
}> {
  try {
    // Verify EmailEngine configuration
    if (!EMAILENGINE_URL || !EMAILENGINE_API_KEY) {
      return {
        connected: false,
        status: 'unconfigured',
        message: 'EmailEngine configuration is incomplete. Please check your environment variables.'
      };
    }
    
    // Check connection by requesting account info
    const response = await emailEngineClient.get(`/v1/account/${SMTP_ACCOUNT}`);
    
    if (response.status === 200) {
      return {
        connected: true,
        status: 'configured',
        message: 'EmailEngine is configured and ready to use'
      };
    } else {
      return {
        connected: false,
        status: 'error',
        message: 'Failed to connect to EmailEngine'
      };
    }
  } catch (error) {
    console.error('Error checking email connection:', error);
    return {
      connected: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to check email connection'
    };
  }
} 