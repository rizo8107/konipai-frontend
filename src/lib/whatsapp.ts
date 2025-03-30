import axios, { AxiosResponse } from 'axios';
import { Order, OrderItem, Product, User } from '@/types/schema';
import { 
  checkWhatsAppStatus as checkWhatsAppStatusDirect, 
  sendWhatsAppMessage as sendWhatsAppMessageDirect, 
  sendWhatsAppTemplate as sendWhatsAppTemplateDirect,
  sendWhatsAppTemplateFetch
} from './whatsapp-client';
import { createCorsProxyUrl, isProduction } from './cors-proxy';
import { prepareTemplateComponents } from './whatsapp-template-manager.js';

/**
 * Gets the WhatsApp API URL from environment or direct API URL
 * @returns The URL to use for WhatsApp API calls
 */
export function getWhatsAppApiUrl(): string {
  // Get the API URL from the environment variables
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WHATSAPP_API_URL;
  
  // Default WhatsApp API URL if environment variable is not set
  const defaultApiUrl = 'https://backend-whatsappapi.7za6uc.easypanel.host';
  
  const baseUrl = envUrl || defaultApiUrl;
  
  // Always return the base URL as we'll use createCorsProxyUrl when making requests
  return baseUrl;
}

/**
 * Creates a CORS-friendly URL for a WhatsApp API endpoint
 * @param endpoint The API endpoint (e.g., /status)
 * @returns The full URL with CORS handling
 */
export function getWhatsAppApiEndpoint(endpoint: string): string {
  return createCorsProxyUrl(getWhatsAppApiUrl(), endpoint);
}

// Interface for WhatsApp message activity logging
export interface WhatsAppActivity {
  order_id: string;
  template_name: string;
  recipient: string;
  status: 'sent' | 'failed';
  message_content: string;
  timestamp: string;
}

// Interface for WhatsApp API responses
export interface WhatsAppApiResponse {
  success: boolean;
  message: string;
  messageId?: string;
  status?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// Template names based on the WhatsApp setup document
export enum WhatsAppTemplate {
  ABANDONED_CART = 'abandoned_cart_reminder',
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
 * Check WhatsApp API status - using direct client
 */
export const checkStatus = checkWhatsAppStatusDirect;

/**
 * Send a WhatsApp text message - using direct client
 * @param to - Recipient phone number
 * @param message - Message content
 * @param variables - Optional variables for template messages
 */
export async function sendWhatsAppTextMessage(
  to: string,
  message: string,
  variables?: Record<string, string>
): Promise<WhatsAppApiResponse> {
  try {
    console.log(`Sending WhatsApp text message to ${to}`);
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(to);
    
    // Use CORS proxy URL to avoid CORS issues
    const endpoint = getWhatsAppApiEndpoint('/send-message');
    console.log(`Sending WhatsApp text message to ${formattedPhone} via endpoint: ${endpoint}`);
    
    // Use fetch directly with explicit CORS settings
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': typeof window !== 'undefined' ? window.location.origin : 'https://crm-frontend.7za6uc.easypanel.host'
        },
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        body: JSON.stringify({
          number: formattedPhone,
          message,
          ...(variables && { variables })
        })
      });
      
      if (!response.ok) {
        throw new Error(`WhatsApp API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('WhatsApp text message response:', data);
      return data;
    } catch (fetchError) {
      console.log('Fetch implementation failed, falling back to direct client:', fetchError);
      // Fall back to the direct client if fetch fails
      return await sendWhatsAppMessageDirect(to, message, variables);
    }
  } catch (error) {
    console.error('All methods failed when sending WhatsApp text message:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send WhatsApp text message'
    };
  }
}

/**
 * Format a phone number to ensure it has country code
 * @param phone - Phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Ensure it starts with the country code (91 for India)
  if (!cleaned.startsWith('91')) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Convert local image to base64 data URL
 * @param url - Local image URL
 * @returns Promise with the base64 data URL
 */
export async function convertLocalImageToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.height = img.height;
      canvas.width = img.width;
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Send a WhatsApp image message
 * @param to - Recipient phone number
 * @param imageUrl - URL of the image to send
 * @param caption - Optional caption for the image
 * @param variables - Optional variables for template messages
 * @returns Promise with the API response
 */
export async function sendWhatsAppImageMessage(
  to: string,
  imageUrl: string,
  caption?: string,
  variables?: Record<string, string>
): Promise<WhatsAppApiResponse> {
  try {
    // Format the phone number
    const formattedPhone = formatPhoneNumber(to);
    
    // Validate the image URL
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }
    
    // Check if the URL is valid and handle local URLs
    let validatedImageUrl = imageUrl;
    
    // Handle local URLs (localhost or relative paths)
    if (imageUrl.includes('localhost') || imageUrl.startsWith('/')) {
      try {
        // Convert local image to base64 data URL
        validatedImageUrl = await convertLocalImageToBase64(imageUrl);
        console.log('Converted local image to base64 data URL');
      } catch (conversionError) {
        console.error('Failed to convert local image to base64:', conversionError);
        // Continue with the original URL, but log a warning
        console.warn('Using original URL, but WhatsApp API may not be able to access it');
      }
    } 
    // If it's a PocketBase URL, ensure it's properly formatted
    else if (imageUrl.includes('pocketbase') && !imageUrl.startsWith('http')) {
      validatedImageUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/${imageUrl}`;
    }
    // If it's just a partial path (like 'collectionId/recordId/filename.jpg' or 'recordId/filename.jpg')
    else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      // Check if it has the pattern of a PocketBase file path
      const parts = imageUrl.split('/');
      if (parts.length >= 2) {
        // If the path doesn't include the collection ID, add the default one
        if (parts.length === 2) {
          // Assuming format: recordId/filename.jpg
          validatedImageUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/pbc_4092854851/${imageUrl}`;
          console.log('Added collection ID to partial URL:', validatedImageUrl);
        } else {
          // Assuming format already includes collection ID: collectionId/recordId/filename.jpg
          validatedImageUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/${imageUrl}`;
          console.log('Added base URL to partial path:', validatedImageUrl);
        }
      } else {
        console.warn('Image URL appears to be incomplete:', imageUrl);
      }
    }
    
    // Final check to ensure the URL is valid
    if (!validatedImageUrl.startsWith('data:') && !validatedImageUrl.startsWith('http')) {
      console.error('Image URL is not valid, must be a data URL or start with http/https:', validatedImageUrl);
      throw new Error('Invalid image URL format. URL must be a complete URL starting with http:// or https://');
    }
    
    // Log the image URL for debugging
    console.log('Original image URL:', imageUrl);
    console.log('Validated image URL type:', validatedImageUrl.startsWith('data:') ? 'data:URL (base64)' : validatedImageUrl);
    
    // Prepare the request data with proper typing
    const data: {
      number: string;
      imageUrl: string;
      caption?: string;
      variables?: Record<string, string>;
    } = {
      number: formattedPhone,
      imageUrl: validatedImageUrl
    };
    
    // Add caption if provided
    if (caption) {
      data.caption = caption;
    }
    
    // Add variables if provided
    if (variables) {
      data.variables = variables;
    }
    
    // Make the API request through the proxy configured in vite.config.js
    console.log('Sending WhatsApp image message to:', formattedPhone);
    console.log('Request data:', JSON.stringify({
      ...data,
      imageUrl: data.imageUrl.startsWith('data:') ? '[BASE64_DATA_URL]' : data.imageUrl
    }, null, 2));
    
    try {
      // Use CORS proxy endpoint
      const endpoint = getWhatsAppApiEndpoint('/send-image-url');
      console.log('Sending to endpoint:', endpoint);
      
      const response = await axios.post(endpoint, data, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('WhatsApp API response:', response.data);
      
      // Return a standardized response
      return {
        success: true,
        message: 'Image message sent',
        messageId: response.data.messageId || response.data.id,
        status: response.data.status || 'sent',
        timestamp: response.data.timestamp || new Date().toISOString()
      };
    } catch (apiError) {
      console.error('WhatsApp API error response:', apiError.response?.data || apiError.message);
      throw apiError;
    }
  } catch (error) {
    console.error('Error sending WhatsApp image message:', error);
    
    // Extract error message from the response if available
    let errorMessage = 'Failed to send WhatsApp image message';
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 500) {
        errorMessage = 'WhatsApp API server error. The image URL may not be accessible to the API.';
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Return a standardized error response
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * Send a WhatsApp video message
 * @param to - Recipient phone number
 * @param videoUrl - URL of the video to send
 * @param caption - Optional caption for the video
 * @param variables - Optional variables for template messages
 */
export async function sendWhatsAppVideoMessage(
  to: string,
  videoUrl: string,
  caption?: string,
  variables?: Record<string, string>
): Promise<WhatsAppApiResponse> {
  try {
    // Format the phone number
    const formattedPhone = formatPhoneNumber(to);
    
    // Validate the video URL
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }
    
    // Check if the URL is valid
    let validatedVideoUrl = videoUrl;
    
    // If it's a relative URL or a PocketBase URL, convert it to an absolute URL
    if (videoUrl.startsWith('/') || videoUrl.includes('pocketbase')) {
      // For PocketBase URLs, ensure they're properly formatted
      if (videoUrl.includes('pocketbase') && !videoUrl.startsWith('http')) {
        validatedVideoUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/${videoUrl}`;
      } else if (videoUrl.startsWith('/')) {
        // For relative URLs, convert to absolute using the current origin
        validatedVideoUrl = `${window.location.origin}${videoUrl}`;
      }
    }
    
    // Log the video URL for debugging
    console.log('Original video URL:', videoUrl);
    console.log('Validated video URL:', validatedVideoUrl);
    
    // Prepare the request data with proper typing
    const data: {
      number: string;
      videoUrl: string;
      caption?: string;
      variables?: Record<string, string>;
    } = {
      number: formattedPhone,
      videoUrl: validatedVideoUrl
    };
    
    // Add caption if provided
    if (caption) {
      data.caption = caption;
    }
    
    // Add variables if provided
    if (variables) {
      data.variables = variables;
    }
    
    // Make the API request through the proxy configured in vite.config.js
    console.log('Sending WhatsApp video message to:', formattedPhone);
    const response = await axios.post(`${getWhatsAppApiUrl()}/send-video-url`, data);
    console.log('WhatsApp API response:', response.data);
    
    // Return a standardized response
    return {
      success: true,
      message: 'Video message sent',
      messageId: response.data.messageId || response.data.id,
      status: response.data.status || 'sent',
      timestamp: response.data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending WhatsApp video message:', error);
    
    // Extract error message from the response if available
    let errorMessage = 'Failed to send WhatsApp video message';
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Return a standardized error response
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * Send a WhatsApp document message
 * @param to - Recipient phone number
 * @param documentUrl - URL of the document to send
 * @param filename - Filename for the document
 * @param caption - Optional caption for the document
 * @param variables - Optional variables for template messages
 */
export async function sendWhatsAppDocumentMessage(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string,
  variables?: Record<string, string>
): Promise<WhatsAppApiResponse> {
  try {
    // Format the phone number
    const formattedPhone = formatPhoneNumber(to);
    
    // Validate inputs
    if (!documentUrl) {
      throw new Error('Document URL is required');
    }
    
    if (!filename) {
      throw new Error('Filename is required');
    }
    
    // Check if the URL is valid
    let validatedDocumentUrl = documentUrl;
    
    // If it's a relative URL or a PocketBase URL, convert it to an absolute URL
    if (documentUrl.startsWith('/') || documentUrl.includes('pocketbase')) {
      // For PocketBase URLs, ensure they're properly formatted
      if (documentUrl.includes('pocketbase') && !documentUrl.startsWith('http')) {
        validatedDocumentUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/${documentUrl}`;
      } else if (documentUrl.startsWith('/')) {
        // For relative URLs, convert to absolute using the current origin
        validatedDocumentUrl = `${window.location.origin}${documentUrl}`;
      }
    }
    
    // Log the document URL for debugging
    console.log('Original document URL:', documentUrl);
    console.log('Validated document URL:', validatedDocumentUrl);
    
    // Prepare the request data with proper typing
    const data: {
      number: string;
      documentUrl: string;
      filename: string;
      caption?: string;
      variables?: Record<string, string>;
    } = {
      number: formattedPhone,
      documentUrl: validatedDocumentUrl,
      filename: filename
    };
    
    // Add caption if provided
    if (caption) {
      data.caption = caption;
    }
    
    // Add variables if provided
    if (variables) {
      data.variables = variables;
    }
    
    // Make the API request through the proxy configured in vite.config.js
    console.log('Sending WhatsApp document message to:', formattedPhone);
    const response = await axios.post(`${getWhatsAppApiUrl()}/send-document-url`, data);
    console.log('WhatsApp API response:', response.data);
    
    // Return a standardized response
    return {
      success: true,
      message: 'Document message sent',
      messageId: response.data.messageId || response.data.id,
      status: response.data.status || 'sent',
      timestamp: response.data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending WhatsApp document message:', error);
    
    // Extract error message from the response if available
    let errorMessage = 'Failed to send WhatsApp document message';
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Return a standardized error response
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * Send a WhatsApp message
 * @param to - Recipient phone number
 * @param message - Message content
 * @param variables - Optional variables for template messages
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  variables?: Record<string, string>
): Promise<WhatsAppApiResponse> {
  try {
    // Format phone number (ensure it has country code and no special chars)
    const formattedPhone = formatPhoneNumber(to);
    
    // Prepare the request data
    const data: {
      number: string;
      message: string;
      variables?: Record<string, string>;
    } = {
      number: formattedPhone,
      message
    };
    
    // Add variables if provided
    if (variables) {
      data.variables = variables;
    }
    
    // Use CORS proxy URL
    const endpoint = getWhatsAppApiEndpoint('/send-message');
    console.log('Sending WhatsApp message to:', formattedPhone, 'via:', endpoint);
    
    // Make the API request through our CORS proxy
    const response = await axios.post(endpoint, data, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('WhatsApp API response:', response.data);
    
    // Return a standardized response
    return {
      success: true,
      message: 'Message sent',
      messageId: response.data.messageId || response.data.id,
      status: response.data.status || 'sent',
      timestamp: response.data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    
    // Extract error message from the response if available
    let errorMessage = 'Failed to send WhatsApp message';
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Return a standardized error response
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * Send an image from URL via WhatsApp
 * @param phoneNumber - Recipient's phone number with country code
 * @param imageUrl - URL of the image to send
 * @param caption - Optional caption for the image
 * @param variables - Optional variables to replace in the caption
 */
export async function sendWhatsAppImage(
  phoneNumber: string,
  imageUrl: string,
  caption?: string,
  variables?: Record<string, string | number>
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Use CORS proxy endpoint
    const endpoint = getWhatsAppApiEndpoint('/send-image-url');
    console.log('Sending WhatsApp image via:', endpoint);
    
    const response = await axios.post<WhatsAppApiResponse>(endpoint, {
      number: formattedPhone,
      imageUrl,
      caption,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('WhatsApp image sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp image:', error);
    throw error;
  }
}

/**
 * Send an order confirmation message via WhatsApp
 * @param order - The order to send a confirmation for
 * @param orderItems - The order items to include in the confirmation
 * @param to - The phone number to send the message to
 * @returns Promise with the API response
 */
export async function sendOrderConfirmation(
  order: Order,
  orderItems: Array<{ id: string; name: string; price: number; quantity: number; image?: string }>,
  to: string
): Promise<WhatsAppApiResponse> {
  try {
    // Format the order items for the message
    const formattedItems = orderItems
      .map((item) => `${item.quantity}x ${item.name} - ₹${item.price}`)
      .join('\n');

    // Calculate the total
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create the message
    const message = `🎉 *Order Confirmation* 🎉\n\nHi ${order.customer_name},\n\nYour order #${order.id} has been confirmed!\n\n*Order Details:*\n${formattedItems}\n\n*Total: ₹${total}*\n\nThank you for your order! We'll notify you when it ships.`;

    // Send the message
    return await sendWhatsAppTextMessage(to, message);
  } catch (error) {
    console.error('Error sending order confirmation:', error);
    return {
      success: false,
      message: 'Failed to send order confirmation',
    };
  }
}

/**
 * Send payment success notification via WhatsApp
 * @param order - The order object
 * @param customerPhone - Customer's phone number
 */
export async function sendPaymentSuccess(
  order: Order,
  customerPhone: string
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(customerPhone);
    const orderUrl = `${window.location.origin}/orders/${order.id}`;
    
    // Create a message with the actual order data instead of template variables
    const message = `✅ Payment received for Order #${order.id}, ${order.customer_name}! 💸\n\nWe're now preparing your order for shipping. You'll get updates soon.\n\nTrack it here: ${orderUrl}`;
    
    // Send the message without variables
    const response = await sendWhatsAppMessage(formattedPhone, message);
    
    // Log the activity with the actual message sent
    await logWhatsAppActivity({
      order_id: order.id,
      template_name: WhatsAppTemplate.PAYMENT_SUCCESS,
      recipient: formattedPhone,
      status: response.success ? 'sent' : 'failed',
      message_content: JSON.stringify({
        message: message,
        response: {
          success: response.success,
          message: response.message || '',
          status: response.success ? 'success' : 'failed',
          timestamp: new Date().toISOString()
        }
      }),
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Error sending payment success notification:', error);
    
    // Log the failed activity
    try {
      await logWhatsAppActivity({
        order_id: order.id,
        template_name: WhatsAppTemplate.PAYMENT_SUCCESS,
        recipient: formatPhoneNumber(customerPhone),
        status: 'failed',
        message_content: JSON.stringify({ 
          errorMessage: error instanceof Error ? error.message : 'Unknown error' 
        }),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging WhatsApp activity:', logError);
    }
    
    // Return a standardized error response instead of throwing
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Send payment failed notification via WhatsApp
 * @param order - The order object
 * @param customerPhone - Customer's phone number
 * @param retryUrl - URL for retrying the payment
 */
export async function sendPaymentFailed(
  order: Order,
  customerPhone: string,
  retryUrl: string
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(customerPhone);
    
    const message = `⚠️ Hi {{1}}, your payment for Order #{{2}} was unsuccessful.\n\nYou can retry your payment here: {{3}}\n\nLet us know if you need help.`;
    
    const variables = {
      '1': order.customer_name,
      '2': order.id,
      '3': retryUrl
    };
    
    const response = await sendWhatsAppMessage(formattedPhone, message, variables);
    
    // Log the activity
    await logWhatsAppActivity({
      order_id: order.id,
      template_name: WhatsAppTemplate.PAYMENT_FAILED,
      recipient: formattedPhone,
      status: 'sent',
      message_content: JSON.stringify({ message, variables }),
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Error sending payment failed notification:', error);
    
    // Log the failed activity
    try {
      await logWhatsAppActivity({
        order_id: order.id,
        template_name: WhatsAppTemplate.PAYMENT_FAILED,
        recipient: formatPhoneNumber(customerPhone),
        status: 'failed',
        message_content: JSON.stringify({ error: (error as Error).message }),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging WhatsApp activity:', logError);
    }
    
    throw error;
  }
}

/**
 * Send order shipped notification via WhatsApp
 * @param order - The order object
 * @param customerPhone - Customer's phone number
 * @param trackingLink - Tracking link for the shipment
 * @param carrier - Shipping carrier name
 */
export async function sendOrderShipped(
  order: Order,
  customerPhone: string,
  trackingLink: string,
  carrier: string
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(customerPhone);
    
    const message = `🚚 Great news, {{1}}! Your Konipai order (#{{2}}) is on its way. 🎁\n\n📦 Tracking: {{3}}\nCarrier: {{4}}\n\nThanks again for shopping with us! 💫`;
    
    const variables = {
      '1': order.customer_name,
      '2': order.id,
      '3': trackingLink,
      '4': carrier
    };
    
    const response = await sendWhatsAppMessage(formattedPhone, message, variables);
    
    // Log the activity
    await logWhatsAppActivity({
      order_id: order.id,
      template_name: WhatsAppTemplate.ORDER_SHIPPED,
      recipient: formattedPhone,
      status: 'sent',
      message_content: JSON.stringify({ message, variables }),
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Error sending order shipped notification:', error);
    
    // Log the failed activity
    try {
      await logWhatsAppActivity({
        order_id: order.id,
        template_name: WhatsAppTemplate.ORDER_SHIPPED,
        recipient: formatPhoneNumber(customerPhone),
        status: 'failed',
        message_content: JSON.stringify({ error: (error as Error).message }),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging WhatsApp activity:', logError);
    }
    
    throw error;
  }
}

/**
 * Send out for delivery notification via WhatsApp
 * @param order - The order object
 * @param customerPhone - Customer's phone number
 */
export async function sendOutForDelivery(
  order: Order,
  customerPhone: string
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(customerPhone);
    
    const message = `📬 Your Konipai order (#{{1}}) is out for delivery today, {{2}}! 🛵\n\nPlease keep your phone nearby. You'll receive a confirmation once it's delivered.`;
    
    const variables = {
      '1': order.id,
      '2': order.customer_name
    };
    
    const response = await sendWhatsAppMessage(formattedPhone, message, variables);
    
    // Log the activity
    await logWhatsAppActivity({
      order_id: order.id,
      template_name: WhatsAppTemplate.OUT_FOR_DELIVERY,
      recipient: formattedPhone,
      status: 'sent',
      message_content: JSON.stringify({ message, variables }),
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Error sending out for delivery notification:', error);
    
    // Log the failed activity
    try {
      await logWhatsAppActivity({
        order_id: order.id,
        template_name: WhatsAppTemplate.OUT_FOR_DELIVERY,
        recipient: formatPhoneNumber(customerPhone),
        status: 'failed',
        message_content: JSON.stringify({ error: (error as Error).message }),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging WhatsApp activity:', logError);
    }
    
    throw error;
  }
}

/**
 * Send an order delivered notification
 * @param order - The order data
 * @param customerPhone - Customer's phone number
 * @param feedbackLink - Link for order feedback
 * @returns Promise with the API response
 */
export async function sendOrderDelivered(
  order: Order,
  customerPhone: string,
  feedbackLink: string = ''
): Promise<WhatsAppApiResponse> {
  try {
    // Validate required parameters
    if (!order) {
      throw new Error('Order is required');
    }
    
    if (!customerPhone) {
      throw new Error('Customer phone number is required');
    }
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(customerPhone);
    
    // Set default feedback link if not provided
    const finalFeedbackLink = feedbackLink || 'https://crm-server.7za6uc.easypanel.host/feedback';
    
    // Use sendWhatsAppTemplate with correct components for the feedback link
    const components = [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: order.customer_name || 'Customer'
          },
          {
            type: 'text',
            text: order.id
          },
          {
            type: 'text',
            text: finalFeedbackLink
          }
        ]
      }
    ];
    
    console.log('Sending order delivered notification...');
    console.log('Customer:', order.customer_name);
    console.log('Order ID:', order.id);
    console.log('Feedback link:', finalFeedbackLink);
    
    // Use direct client to send template message
    const response = await sendWhatsAppTemplateDirect(
      formattedPhone,
      WhatsAppTemplate.ORDER_DELIVERED,
      components
    );
    
    // Return standardized response
    return {
      success: response.success,
      message: response.message || 'Order delivered notification sent',
      messageId: response.messageId || `order-delivered-${Date.now()}`,
      status: response.status || 'sent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending order delivered notification:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send order delivered notification',
      status: 'failed',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Send request for review via WhatsApp
 * @param order - The order object
 * @param customerPhone - Customer's phone number
 * @param reviewLink - Link for leaving a review
 */
export async function sendRequestReview(
  order: Order,
  customerPhone: string,
  reviewLink: string
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(customerPhone);
    
    const message = `Hi {{1}}, we'd love to hear your thoughts on your recent Konipai order (#{{2}})! 📝\n\nLeave a quick review here: {{3}}\n\nThanks for being part of our journey ❤️`;
    
    const variables = {
      '1': order.customer_name,
      '2': order.id,
      '3': reviewLink
    };
    
    const response = await sendWhatsAppMessage(formattedPhone, message, variables);
    
    // Log the activity
    await logWhatsAppActivity({
      order_id: order.id,
      template_name: WhatsAppTemplate.REQUEST_REVIEW,
      recipient: formattedPhone,
      status: 'sent',
      message_content: JSON.stringify({ message, variables }),
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Error sending review request:', error);
    
    // Log the failed activity
    try {
      await logWhatsAppActivity({
        order_id: order.id,
        template_name: WhatsAppTemplate.REQUEST_REVIEW,
        recipient: formatPhoneNumber(customerPhone),
        status: 'failed',
        message_content: JSON.stringify({ error: (error as Error).message }),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging WhatsApp activity:', logError);
    }
    
    throw error;
  }
}

/**
 * Send refund confirmation via WhatsApp
 * @param order - The order object
 * @param customerPhone - Customer's phone number
 * @param refundAmount - Amount refunded
 */
export async function sendRefundConfirmation(
  order: Order,
  customerPhone: string,
  refundAmount: number
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(customerPhone);
    
    const message = `💸 Refund alert, {{1}}!\n\nYour refund for Order #{{2}} has been processed. Amount: ₹{{3}}\nExpected in your account within 5–7 business days.\n\nHave questions? Just reply here.`;
    
    const variables = {
      '1': order.customer_name,
      '2': order.id,
      '3': refundAmount.toString()
    };
    
    const response = await sendWhatsAppMessage(formattedPhone, message, variables);
    
    // Log the activity
    await logWhatsAppActivity({
      order_id: order.id,
      template_name: WhatsAppTemplate.REFUND_CONFIRMATION,
      recipient: formattedPhone,
      status: 'sent',
      message_content: JSON.stringify({ message, variables }),
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Error sending refund confirmation:', error);
    
    // Log the failed activity
    try {
      await logWhatsAppActivity({
        order_id: order.id,
        template_name: WhatsAppTemplate.REFUND_CONFIRMATION,
        recipient: formatPhoneNumber(customerPhone),
        status: 'failed',
        message_content: JSON.stringify({ error: (error as Error).message }),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging WhatsApp activity:', logError);
    }
    
    throw error;
  }
}

/**
 * Send reorder reminder via WhatsApp
 * @param order - The order object
 * @param customerPhone - Customer's phone number
 * @param daysSinceDelivery - Days since the order was delivered
 * @param reorderLink - Link for reordering
 */
export async function sendReorderReminder(
  order: Order,
  customerPhone: string,
  daysSinceDelivery: number,
  reorderLink: string
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(customerPhone);
    
    const message = `Hey {{1}}, ready to restock your favorite items from Konipai? 🛍️\n\nYour last order (#{{2}}) was delivered {{3}} days ago. Here's a quick reorder link: {{4}}\n\nWe're here when you're ready! ❤️`;
    
    const variables = {
      '1': order.customer_name,
      '2': order.id,
      '3': daysSinceDelivery.toString(),
      '4': reorderLink
    };
    
    const response = await sendWhatsAppMessage(formattedPhone, message, variables);
    
    // Log the activity
    await logWhatsAppActivity({
      order_id: order.id,
      template_name: WhatsAppTemplate.REORDER_REMINDER,
      recipient: formattedPhone,
      status: 'sent',
      message_content: JSON.stringify({ message, variables }),
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Error sending reorder reminder:', error);
    
    // Log the failed activity
    try {
      await logWhatsAppActivity({
        order_id: order.id,
        template_name: WhatsAppTemplate.REORDER_REMINDER,
        recipient: formatPhoneNumber(customerPhone),
        status: 'failed',
        message_content: JSON.stringify({ error: (error as Error).message }),
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Error logging WhatsApp activity:', logError);
    }
    
    throw error;
  }
}

/**
 * Log WhatsApp message activity
 * @param activity - WhatsApp activity details
 */
async function logWhatsAppActivity(activity: WhatsAppActivity): Promise<void> {
  try {
    // Import PocketBase here to avoid circular dependency
    const { pb, ensureAdminAuth } = await import('@/lib/pocketbase');
    
    // Ensure admin authentication
    await ensureAdminAuth();
    
    // Create activity record in PocketBase
    await pb.collection('whatsapp_activities').create({
      order_id: activity.order_id,
      template_name: activity.template_name,
      recipient: activity.recipient,
      status: activity.status,
      message_content: activity.message_content,
      timestamp: activity.timestamp
    });
    
    console.log('WhatsApp activity logged successfully');
  } catch (error) {
    console.error('Error logging WhatsApp activity:', error);
    // Don't throw the error to prevent disrupting the main flow
  }
}

/**
 * Upload a file to PocketBase and return the URL
 * @param file - File to upload
 * @returns Promise with the uploaded file URL
 */
export async function uploadFileToPocketBase(file: File): Promise<{ url: string }> {
  try {
    // Import PocketBase here to avoid circular dependency
    const { pb } = await import('@/lib/pocketbase');
    
    // Create a FormData object
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload the file to PocketBase
    const response = await pb.collection('media').create(formData);
    
    // Get the file URL from PocketBase
    let fileUrl = pb.getFileUrl(response, response.file);
    
    // Ensure the URL is a fully qualified URL that can be accessed externally
    if (fileUrl.startsWith('/')) {
      // If it's a relative URL, convert to absolute using the PocketBase URL
      fileUrl = `https://backend-pocketbase.7za6uc.easypanel.host/api/files/${response.collectionId}/${response.id}/${response.file}`;
    } else if (!fileUrl.startsWith('http')) {
      // If it doesn't start with http, assume it's a partial URL and add the protocol
      fileUrl = `https://${fileUrl}`;
    }
    
    console.log('Uploaded file URL:', fileUrl);
    
    return { url: fileUrl };
  } catch (error) {
    console.error('Error uploading file to PocketBase:', error);
    throw error;
  }
}

/**
 * Get estimated delivery date (7-10 days from now)
 */
function getEstimatedDeliveryDate(): string {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7);
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 10);
  
  const startMonth = startDate.toLocaleString('default', { month: 'long' });
  const endMonth = endDate.toLocaleString('default', { month: 'long' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
  } else {
    return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${startDate.getFullYear()}`;
  }
}

/**
 * Check the WhatsApp API connection status
 * @returns Promise with connection status
 */
export async function checkWhatsAppConnection(): Promise<{
  connected: boolean;
  status?: string;
  message?: string;
}> {
  try {
    // Make a request to the status endpoint using the CORS proxy
    const statusUrl = getWhatsAppApiEndpoint('/status');
    console.log('Checking WhatsApp connection at:', statusUrl);
    
    // Add more detailed request options
    const response = await axios.get(statusUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      // Increase timeout for slower connections
      timeout: 10000
    });
    
    console.log('WhatsApp connection response:', response.data);
    
    // Return the connection status
    return {
      connected: true,
      status: response.data.status || 'connected',
      message: response.data.message || 'WhatsApp API is connected'
    };
  } catch (error) {
    console.error('Primary WhatsApp connection check failed, trying fallback...');
    
    try {
      // Try using our fallback direct endpoint
      const fallbackUrl = '/whatsapp-status';
      console.log('Using fallback endpoint:', fallbackUrl);
      
      const fallbackResponse = await axios.get(fallbackUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('Fallback endpoint response:', fallbackResponse.data);
      
      if (fallbackResponse.data.success) {
        return {
          connected: true,
          status: fallbackResponse.data.status || 'connected',
          message: fallbackResponse.data.message || 'WhatsApp API is connected via fallback'
        };
      }
      
      throw new Error(fallbackResponse.data.message || 'Fallback also failed');
    } catch (fallbackError) {
      console.error('Fallback WhatsApp check also failed:', fallbackError);
      
      // More detailed error logging for the original error
      if (axios.isAxiosError(error)) {
        console.error('Original WhatsApp API connection error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        });
      } else {
        console.error('Unknown WhatsApp connection error:', error);
      }
      
      // Return disconnected status with more informative message
      return {
        connected: false,
        status: 'disconnected',
        message: axios.isAxiosError(error) 
          ? `WhatsApp API connection failed: ${error.message}` 
          : 'Unable to connect to WhatsApp API'
      };
    }
  }
}

/**
 * Send a WhatsApp template
 * @param to - Recipient phone number 
 * @param templateName - Template name to use
 * @param order - Order data for variables
 * @param additionalInfo - Additional information for template 
 * @returns Promise with the API response
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  order: any,
  additionalInfo?: string
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(to);
    
    // Generate feedback link if needed
    let feedbackLink = '';
    if (templateName === WhatsAppTemplate.ORDER_DELIVERED) {
      const orderId = order.id || '';
      feedbackLink = `https://crm-neyform.7za6uc.easypanel.host/form/FRpQ0g11?id=${orderId}`;
    }
    
    // Create additional variables object
    const additionalVariables: Record<string, string> = {};
    if (additionalInfo) {
      additionalVariables.additionalInfo = additionalInfo;
    }
    
    // Prepare components with variables
    const components = prepareTemplateComponents(order, feedbackLink, additionalVariables);
    
    console.log(`Sending WhatsApp template to ${formattedPhone} using template: ${templateName}`);
    
    // Try using the fetch-based implementation first for better CORS handling
    try {
      const response = await sendWhatsAppTemplateFetch(formattedPhone, templateName, components);
      return response;
    } catch (fetchError) {
      console.log('Fetch implementation failed, falling back to axios:', fetchError);
      // Fall back to the regular axios implementation
      return await sendWhatsAppTemplateDirect(formattedPhone, templateName, components);
    }
  } catch (error) {
    console.error('Error sending WhatsApp template:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send WhatsApp template'
    };
  }
}

/**
 * Send a custom WhatsApp message
 * Used for templates or direct messages that aren't predefined in the app
 * @param to - Recipient phone number
 * @param message - Custom message content 
 * @returns Promise with the API response
 */
export async function sendCustomWhatsAppMessage(
  to: string,
  message: string
): Promise<WhatsAppApiResponse> {
  try {
    const formattedPhone = formatPhoneNumber(to);
    
    console.log(`Sending custom WhatsApp message to ${formattedPhone}`);
    
    // Use direct messaging for custom content
    const response = await sendWhatsAppMessageDirect(formattedPhone, message);
    
    console.log('WhatsApp custom message response:', response);
    
    return response;
  } catch (error) {
    console.error('Error sending custom WhatsApp message:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send custom WhatsApp message'
    };
  }
}
