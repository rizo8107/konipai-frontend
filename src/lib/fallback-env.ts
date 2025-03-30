/**
 * Utility to fetch and manage environment values from the fallback server
 */
import axios from 'axios';

// Define the structure of the fallback environment response
export interface FallbackEnvironment {
  message: string;
  environment: string;
  port: string;
  apiUrl: string;
  emailApiUrl: string;
  whatsappApiUrl: string;
  timestamp: string;
}

// Default fallback server URL
const FALLBACK_SERVER_URL = 'https://crm-server.7za6uc.easypanel.host/';

// Cache the fallback environment to avoid too many requests
let cachedFallbackEnv: FallbackEnvironment | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetch the environment values from the fallback server
 * @param forceRefresh Force a refresh of the environment values
 * @returns The environment values from the fallback server
 */
export async function fetchFallbackEnvironment(forceRefresh = false): Promise<FallbackEnvironment | null> {
  // Check if we have cached values and they're still fresh
  const now = Date.now();
  if (!forceRefresh && cachedFallbackEnv && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('Using cached fallback environment');
    return cachedFallbackEnv;
  }

  try {
    console.log('Fetching environment from fallback server...');
    const response = await axios.get<FallbackEnvironment>(FALLBACK_SERVER_URL);
    
    if (response.data && response.data.emailApiUrl) {
      console.log('Successfully loaded environment from fallback server');
      
      // Cache the response
      cachedFallbackEnv = response.data;
      lastFetchTime = now;
      
      return response.data;
    }
    
    console.warn('Fallback server response did not contain expected data:', response.data);
    return null;
  } catch (error) {
    console.error('Failed to fetch fallback environment:', error);
    return null;
  }
}

/**
 * Get the API URL from fallback environment or use the provided default
 * @param apiType The type of API ('api', 'email', 'whatsapp')
 * @param defaultUrl The default URL to use if fallback environment is not available
 * @returns The API URL
 */
export function getApiUrl(apiType: 'api' | 'email' | 'whatsapp', defaultUrl: string): string {
  if (!cachedFallbackEnv) {
    return defaultUrl;
  }
  
  switch (apiType) {
    case 'api':
      return cachedFallbackEnv.apiUrl || defaultUrl;
    case 'email':
      return cachedFallbackEnv.emailApiUrl || defaultUrl;
    case 'whatsapp':
      return cachedFallbackEnv.whatsappApiUrl || defaultUrl;
    default:
      return defaultUrl;
  }
}

/**
 * Initialize the API environment by fetching values from the fallback server
 * This should be called during application startup
 */
export async function initializeApiEnvironment(): Promise<void> {
  await fetchFallbackEnvironment(true);
  console.log('API environment initialized from fallback server');
} 