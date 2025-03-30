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

// Get fallback WhatsApp API URL
function getFallbackWhatsAppApiUrl(): string {
  const mainUrl = getWhatsAppApiUrl();
  if (mainUrl.includes('7za6uc.easypanel.host')) {
    return mainUrl.replace('7za6uc.easypanel.host', '7za6uc.easypanel.host:8080');
  }
  return mainUrl + ':8080';
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

// Track if we're using fallback URL
let usingFallbackUrl = false;

// Add interceptor to handle CORS issues and connection failures
whatsappClient.interceptors.request.use(function (config) {
  // If we're already using fallback and the URL doesn't have the fallback port, add it
  if (usingFallbackUrl && !config.url?.includes(':8080')) {
    config.baseURL = getFallbackWhatsAppApiUrl();
  }
  
  // Set mode explicitly for fetch requests
  if (!config.url?.startsWith('http')) {
    // If it's a relative URL, make it absolute
    config.url = `${config.baseURL}${config.url?.startsWith('/') ? config.url : '/' + config.url}`;
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

// Add response interceptor to handle connection failures
whatsappClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If we haven't tried the fallback URL yet and we got a connection error
    if (!usingFallbackUrl && (
      error.code === 'ECONNREFUSED' || 
      error.response?.status === 500 ||
      error.response?.status === 404
    )) {
      console.log('Primary WhatsApp connection failed, trying fallback...');
      console.log('Using fallback endpoint:', getFallbackWhatsAppApiUrl());
      
      // Switch to fallback URL
      usingFallbackUrl = true;
      originalRequest.baseURL = getFallbackWhatsAppApiUrl();
      originalRequest.url = originalRequest.url?.replace(getWhatsAppApiUrl(), getFallbackWhatsAppApiUrl());
      
      // Retry the request with the fallback URL
      try {
        return await whatsappClient(originalRequest);
      } catch (fallbackError) {
        console.error('Fallback WhatsApp check also failed:', fallbackError);
        return Promise.reject(fallbackError);
      }
    }
    
    return Promise.reject(error);
  }
);

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

/**
 * Send a WhatsApp message using direct fetch API with custom headers
 * This is an alternative implementation that uses fetch instead of axios
 * to handle CORS issues better in some environments
 */
export async function sendWhatsAppMessageFetch(
  number: string,
  message: string,
  variables?: Record<string, string>
): Promise<WhatsAppApiResponse> {
  try {
    console.log(`Sending WhatsApp message to ${number} via fetch API`);
    
    // Format phone number (ensure it has country code)
    if (!number.startsWith('+') && !number.startsWith('91')) {
      number = '91' + number;
    }
    
    const apiUrl = `${getWhatsAppApiUrl()}/send-message`;
    console.log(`Making fetch request to: ${apiUrl}`);
    
    // Get the origin from the browser if available
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://crm-frontend.7za6uc.easypanel.host';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': origin,
        'Referer': origin
      },
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'omit',
      body: JSON.stringify({
        number,
        message,
        ...(variables && { variables })
      })
    });
    
    if (!response.ok) {
      throw new Error(`WhatsApp API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('WhatsApp message API response:', data);
    return data;
  } catch (error) {
    console.error('Error sending WhatsApp message via fetch:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
    };
  }
}

export default {
  checkWhatsAppStatus,
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  sendWhatsAppTemplateFetch,
  sendWhatsAppMessageFetch
}; 