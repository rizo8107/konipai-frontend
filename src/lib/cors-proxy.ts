/**
 * CORS Proxy utility for making direct API calls to services that don't support CORS
 * This creates properly formatted URLs that can work around CORS issues in production
 */
import { SERVER_ENV } from './env';
import axios from 'axios';

/**
 * Determines if the application is running in production
 * @returns true if in production environment
 */
export function isProduction(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.includes('easypanel.host');
}

/**
 * Creates a CORS-friendly URL for API requests
 * In development, it uses the proxy configured in vite.config.ts
 * In production, it uses a relative URL that works with the same origin
 * 
 * @param baseUrl The original API URL (e.g., https://backend-whatsappapi.7za6uc.easypanel.host)
 * @param endpoint The API endpoint path (e.g., /status)
 * @returns A CORS-friendly URL for the request
 */
export function createCorsProxyUrl(baseUrl: string, endpoint: string): string {
  // Remove any trailing slash from baseUrl
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Ensure endpoint starts with slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If in development with Vite, use the proxy
  if (!isProduction() && typeof import.meta !== 'undefined') {
    // For whatsapp API, use the whatsapp-api proxy
    if (cleanBaseUrl.includes('whatsapp')) {
      return `/whatsapp-api${cleanEndpoint}`;
    }
    
    // For the main API
    if (cleanBaseUrl.includes('api')) {
      return `/api${cleanEndpoint}`;
    }
    
    // For the email API
    if (cleanBaseUrl.includes('email')) {
      return `/email-api${cleanEndpoint}`;
    }
  }
  
  // For production, use relative URLs for all services to avoid CORS
  // This works because our frontend will be configured to proxy the requests
  if (isProduction()) {
    // Identify service type
    if (cleanBaseUrl.includes('whatsapp')) {
      return `/whatsapp-api${cleanEndpoint}`;
    } else if (cleanBaseUrl.includes('email')) {
      return `/email-api${cleanEndpoint}`;
    } else if (cleanBaseUrl.includes('api')) {
      return `/api${cleanEndpoint}`;
    }
  }
  
  // Fallback to direct URL if no proxy match is found
  return `${cleanBaseUrl}${cleanEndpoint}`;
}

/**
 * Makes a direct API call with proper CORS handling for internal status checks
 * This is specifically for status checks and API health monitoring
 * 
 * @param url The full URL to call directly
 * @returns Promise with the response data
 */
export async function makeDirectApiCall<T>(url: string): Promise<T> {
  try {
    // For direct API calls, we need to bypass CORS
    // In a production environment, we can use the server proxy
    if (isProduction()) {
      // In production, use the server proxy with a direct path
      // This assumes your server is properly proxying requests
      const proxyUrl = `/direct-api?url=${encodeURIComponent(url)}`;
      const response = await axios.get<T>(proxyUrl);
      return response.data;
    } else {
      // In development, just make the direct call
      // This may fail due to CORS, but it's just for development
      const response = await axios.get<T>(url);
      return response.data;
    }
  } catch (error) {
    console.error(`Error making direct API call to ${url}:`, error);
    throw error;
  }
} 