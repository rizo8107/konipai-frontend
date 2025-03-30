/**
 * CORS Proxy utility for making direct API calls to services that don't support CORS
 * This creates properly formatted URLs that can work around CORS issues in production
 */
import { SERVER_ENV } from './env';

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