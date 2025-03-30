/**
 * Direct WhatsApp API client for frontend usage
 * Uses axios to make direct API calls to the WhatsApp service
 */
import axios from 'axios';
import { SERVER_ENV } from './env';

// Get the proper WhatsApp API URL
function getWhatsAppApiUrl(): string {
  // Use the environment variable if available
  const apiUrl = SERVER_ENV.VITE_WHATSAPP_API_URL;
  if (!apiUrl) {
    console.warn('VITE_WHATSAPP_API_URL not found in environment, using default URL');
    return 'https://backend-whatsappapi.7za6uc.easypanel.host';
  }
  return apiUrl;
}

// Create axios instance for WhatsApp API
const whatsappClient = axios.create({
  baseURL: getWhatsAppApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Access-Control-Allow-Origin': '*',
    'Origin': 'https://crm-frontend.7za6uc.easypanel.host'
  },
  withCredentials: false
});

// Add interceptor to handle CORS issues
whatsappClient.interceptors.request.use(function (config) {
  // Set mode explicitly for fetch requests
  if (!config.url?.startsWith('http')) {
    // If it's a relative URL, make it absolute
    config.url = `${getWhatsAppApiUrl()}${config.url?.startsWith('/') ? config.url : '/' + config.url}`;
  }
  
  // Get the origin from the browser if available
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://crm-frontend.7za6uc.easypanel.host';
  
  // Set Origin header to match the real site
  config.headers.Origin = origin;
  config.headers.Referer = origin;
  
  console.log('Making request to:', config.url);
  
  return config;
}, function (error) {
  return Promise.reject(error);
});

// Interfaces for API responses
export interface WhatsAppApiResponse {
  success: boolean;
  message: string;
  messageId?: string;
  status?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Check WhatsApp API status
 * @returns Promise with status response
 */
export async function checkWhatsAppStatus(): Promise<WhatsAppApiResponse> {
  try {
    console.log('Checking WhatsApp API status at:', getWhatsAppApiUrl());
    const response = await whatsappClient.get('/status');
    return response.data;
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check WhatsApp status',
    };
  }
}

/**
 * Send a WhatsApp message
 * @param number - Recipient's phone number
 * @param message - Message content
 * @param variables - Optional template variables
 * @returns Promise with API response
 */
export async function sendWhatsAppMessage(
  number: string,
  message: string,
  variables?: Record<string, string>
): Promise<WhatsAppApiResponse> {
  try {
    console.log(`Sending WhatsApp message to ${number}:`, message);
    
    // Format phone number (ensure it has country code)
    if (!number.startsWith('+') && !number.startsWith('91')) {
      number = '91' + number;
    }
    
    const response = await whatsappClient.post('/send-message', {
      number,
      message,
      variables,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
    };
  }
}

/**
 * Send a WhatsApp template
 * @param number - Recipient's phone number
 * @param templateName - Name of the template
 * @param components - Template components
 * @returns Promise with API response
 */
export async function sendWhatsAppTemplate(
  number: string,
  templateName: string,
  components: any[] = []
): Promise<WhatsAppApiResponse> {
  try {
    console.log(`Sending WhatsApp template ${templateName} to ${number}`);
    
    // Format phone number (ensure it has country code)
    if (!number.startsWith('+') && !number.startsWith('91')) {
      number = '91' + number;
    }
    
    const response = await whatsappClient.post('/send-template', {
      number,
      template_name: templateName,
      components,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp template:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send WhatsApp template',
    };
  }
}

/**
 * Send a WhatsApp template using direct fetch API with custom headers
 * This is an alternative implementation that uses fetch instead of axios
 * to handle CORS issues better in some environments
 */
export async function sendWhatsAppTemplateFetch(
  number: string,
  templateName: string,
  components: any[] = []
): Promise<WhatsAppApiResponse> {
  try {
    console.log(`Sending WhatsApp template ${templateName} to ${number} via fetch API`);
    
    // Format phone number (ensure it has country code)
    if (!number.startsWith('+') && !number.startsWith('91')) {
      number = '91' + number;
    }
    
    const apiUrl = `${getWhatsAppApiUrl()}/send-template`;
    console.log(`Making fetch request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://crm-frontend.7za6uc.easypanel.host'
      },
      mode: 'cors',
      body: JSON.stringify({
        number,
        template_name: templateName,
        components,
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending WhatsApp template via fetch:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send WhatsApp template',
    };
  }
}

export default {
  checkWhatsAppStatus,
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  sendWhatsAppTemplateFetch
}; 