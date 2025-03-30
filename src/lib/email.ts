import axios, { AxiosResponse } from 'axios';
import { Order, OrderItem, Product, User } from '@/types/schema';

// Email API URL using the proxy configured in vite.config.js
const EMAIL_API_URL = '/email-api';

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
  created?: string;
  updated?: string;
  collectionId?: string;
  collectionName?: string;
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

/**
 * Send an email message
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
    
    // Prepare the request data
    const data: {
      to: string;
      subject: string;
      message: string;
      variables?: Record<string, string>;
    } = {
      to,
      subject,
      message
    };
    
    // Add variables if provided
    if (variables) {
      data.variables = variables;
    }
    
    // Make the API request through the proxy configured in vite.config.js
    console.log('Sending email to:', to);
    const response = await axios.post(`${EMAIL_API_URL}/send-email`, data);
    console.log('Email API response:', response.data);
    
    // Return a standardized response
    return {
      success: true,
      message: 'Email sent',
      messageId: response.data.messageId || response.data.id,
      status: response.data.status || 'sent',
      timestamp: response.data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Extract error message from the response if available
    let errorMessage = 'Failed to send email';
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
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
 * Send an email with attachment
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param message - Email content (HTML)
 * @param attachments - Array of attachment objects {filename, content, contentType}
 * @param variables - Optional variables for template messages
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
    
    // Prepare the request data
    const data: {
      to: string;
      subject: string;
      message: string;
      attachments: Array<{filename: string, content: string, contentType: string}>;
      variables?: Record<string, string>;
    } = {
      to,
      subject,
      message,
      attachments
    };
    
    // Add variables if provided
    if (variables) {
      data.variables = variables;
    }
    
    // Make the API request through the proxy configured in vite.config.js
    console.log('Sending email with attachment to:', to);
    const response = await axios.post(`${EMAIL_API_URL}/send-email-with-attachment`, data);
    console.log('Email API response:', response.data);
    
    // Return a standardized response
    return {
      success: true,
      message: 'Email with attachment sent',
      messageId: response.data.messageId || response.data.id,
      status: response.data.status || 'sent',
      timestamp: response.data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending email with attachment:', error);
    
    // Extract error message from the response if available
    let errorMessage = 'Failed to send email with attachment';
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
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
      <p><strong>Amount:</strong> ₹${order.total}</p>
      <p><strong>Date:</strong> ${new Date(order.created || Date.now()).toLocaleDateString()}</p>
      <p>We're now preparing your order for shipment. You'll receive another email once your order has been shipped.</p>
      <p>Thank you for shopping with us!</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message);
  } catch (error) {
    console.error('Error sending payment success email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send payment success email'
    };
  }
}

/**
 * Send payment failed notification via email
 * @param order - The order object
 * @param customerEmail - Customer's email address
 * @param retryUrl - URL for retrying the payment
 */
export async function sendPaymentFailedEmail(
  order: Order,
  customerEmail: string,
  retryUrl: string
): Promise<EmailApiResponse> {
  try {
    const subject = `Payment Failed - Order #${order.id}`;
    
    // Create email content
    const message = `
      <h1>Payment Failed</h1>
      <p>Dear ${order.customer_name},</p>
      <p>We're sorry, but your payment for order #${order.id} could not be processed.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Amount:</strong> ₹${order.total}</p>
      <p>Please click the link below to retry your payment:</p>
      <p><a href="${retryUrl}">Retry Payment</a></p>
      <p>If you continue to experience issues, please contact our customer support team for assistance.</p>
      <p>Thank you for your patience.</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message);
  } catch (error) {
    console.error('Error sending payment failed email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send payment failed email'
    };
  }
}

/**
 * Send order shipped notification via email
 * @param order - The order object
 * @param customerEmail - Customer's email address
 * @param trackingLink - Tracking link for the shipment
 * @param carrier - Shipping carrier name
 */
export async function sendOrderShippedEmail(
  order: Order,
  customerEmail: string,
  trackingLink: string,
  carrier: string
): Promise<EmailApiResponse> {
  try {
    const subject = `Your Order Has Been Shipped - Order #${order.id}`;
    
    // Calculate estimated delivery date (7-10 days from now)
    const today = new Date();
    const deliveryDate = new Date(today.setDate(today.getDate() + 7));
    const formattedDeliveryDate = deliveryDate.toLocaleDateString();
    
    // Create email content
    const message = `
      <h1>Your Order Has Been Shipped</h1>
      <p>Dear ${order.customer_name},</p>
      <p>Good news! Your order #${order.id} has been shipped and is on its way to you.</p>
      <p><strong>Shipping Details:</strong></p>
      <p><strong>Carrier:</strong> ${carrier}</p>
      <p><strong>Estimated Delivery Date:</strong> ${formattedDeliveryDate}</p>
      <p><strong>Tracking Link:</strong> <a href="${trackingLink}">Track Your Order</a></p>
      <p>You can use the tracking link above to monitor the progress of your delivery.</p>
      <p>Thank you for shopping with us!</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message);
  } catch (error) {
    console.error('Error sending order shipped email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send order shipped email'
    };
  }
}

/**
 * Send out for delivery notification via email
 * @param order - The order object
 * @param customerEmail - Customer's email address
 */
export async function sendOutForDeliveryEmail(
  order: Order,
  customerEmail: string
): Promise<EmailApiResponse> {
  try {
    const subject = `Your Order Is Out For Delivery - Order #${order.id}`;
    
    // Create email content
    const message = `
      <h1>Your Order Is Out For Delivery</h1>
      <p>Dear ${order.customer_name},</p>
      <p>Exciting news! Your order #${order.id} is out for delivery and should arrive today.</p>
      <p>Please ensure someone is available to receive the package.</p>
      <p>If you have any special delivery instructions, please contact the carrier directly.</p>
      <p>Thank you for shopping with us!</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message);
  } catch (error) {
    console.error('Error sending out for delivery email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send out for delivery email'
    };
  }
}

/**
 * Send order delivered notification via email
 * @param order - The order object
 * @param customerEmail - Customer's email address
 * @param feedbackLink - Link for customer feedback
 */
export async function sendOrderDeliveredEmail(
  order: Order,
  customerEmail: string,
  feedbackLink: string
): Promise<EmailApiResponse> {
  try {
    const subject = `Your Order Has Been Delivered - Order #${order.id}`;
    
    // Create email content
    const message = `
      <h1>Your Order Has Been Delivered</h1>
      <p>Dear ${order.customer_name},</p>
      <p>We're happy to inform you that your order #${order.id} has been delivered.</p>
      <p>We hope you're satisfied with your purchase. If you have a moment, we'd appreciate your feedback:</p>
      <p><a href="${feedbackLink}">Share Your Feedback</a></p>
      <p>If you have any questions or concerns about your order, please don't hesitate to contact our customer support team.</p>
      <p>Thank you for shopping with us!</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message);
  } catch (error) {
    console.error('Error sending order delivered email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send order delivered email'
    };
  }
}

/**
 * Send request for review via email
 * @param order - The order object
 * @param customerEmail - Customer's email address
 * @param reviewLink - Link for leaving a review
 */
export async function sendRequestReviewEmail(
  order: Order,
  customerEmail: string,
  reviewLink: string
): Promise<EmailApiResponse> {
  try {
    const subject = `Please Review Your Recent Purchase - Order #${order.id}`;
    
    // Create email content
    const message = `
      <h1>How Was Your Experience?</h1>
      <p>Dear ${order.customer_name},</p>
      <p>Thank you for your recent purchase (Order #${order.id}). We hope you're enjoying your new items!</p>
      <p>We'd love to hear your thoughts on your purchase. Your feedback helps us improve and assists other customers in making informed decisions.</p>
      <p><a href="${reviewLink}">Leave a Review</a></p>
      <p>It only takes a minute, and your input is valuable to us.</p>
      <p>Thank you for your support!</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message);
  } catch (error) {
    console.error('Error sending review request email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send review request email'
    };
  }
}

/**
 * Send refund confirmation via email
 * @param order - The order object
 * @param customerEmail - Customer's email address
 * @param refundAmount - Amount refunded
 */
export async function sendRefundConfirmationEmail(
  order: Order,
  customerEmail: string,
  refundAmount: number
): Promise<EmailApiResponse> {
  try {
    const subject = `Refund Confirmation - Order #${order.id}`;
    
    // Create email content
    const message = `
      <h1>Refund Confirmation</h1>
      <p>Dear ${order.customer_name},</p>
      <p>We're writing to confirm that we've processed a refund for your order #${order.id}.</p>
      <p><strong>Refund Details:</strong></p>
      <p><strong>Amount:</strong> ₹${refundAmount}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p>The refunded amount should appear in your account within 5-7 business days, depending on your payment provider.</p>
      <p>If you have any questions about your refund, please contact our customer support team.</p>
      <p>Thank you for your understanding.</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message);
  } catch (error) {
    console.error('Error sending refund confirmation email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send refund confirmation email'
    };
  }
}

/**
 * Send reorder reminder via email
 * @param order - The order object
 * @param customerEmail - Customer's email address
 * @param daysSinceDelivery - Days since the order was delivered
 * @param reorderLink - Link for reordering
 */
export async function sendReorderReminderEmail(
  order: Order,
  customerEmail: string,
  daysSinceDelivery: number,
  reorderLink: string
): Promise<EmailApiResponse> {
  try {
    const subject = `Time to Restock? - Order #${order.id}`;
    
    // Create email content
    const message = `
      <h1>Time to Restock?</h1>
      <p>Dear ${order.customer_name},</p>
      <p>It's been ${daysSinceDelivery} days since your last order (#${order.id}). We thought you might be running low on your items.</p>
      <p>Ready to reorder? It's easy! Just click the link below:</p>
      <p><a href="${reorderLink}">Reorder Now</a></p>
      <p>Thank you for being a valued customer!</p>
    `;
    
    // Send the email
    return await sendEmailMessage(customerEmail, subject, message);
  } catch (error) {
    console.error('Error sending reorder reminder email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send reorder reminder email'
    };
  }
}

/**
 * Log email message activity
 * @param activity - Email activity details
 */
export async function logEmailActivity(activity: EmailActivity): Promise<void> {
  try {
    await axios.post(`${EMAIL_API_URL}/log-activity`, activity);
    console.log('Email activity logged:', activity);
  } catch (error) {
    console.error('Error logging email activity:', error);
  }
}

/**
 * Check if an email address is valid
 * @param email - Email address to validate
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check the email service connection status
 * @returns Promise with connection status
 */
export async function checkEmailConnection(): Promise<{
  connected: boolean;
  status?: string;
  message?: string;
}> {
  try {
    const response = await axios.get(`${EMAIL_API_URL}/status`);
    return {
      connected: response.data.connected || false,
      status: response.data.status || 'unknown',
      message: response.data.message || 'Connection status checked'
    };
  } catch (error) {
    console.error('Error checking email connection:', error);
    return {
      connected: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to check email connection'
    };
  }
}
