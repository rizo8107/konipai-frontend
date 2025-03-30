/**
 * API initialization utility
 * This module handles initializing the API environment and other startup tasks
 */

import { initializeApiEnvironment, fetchFallbackEnvironment } from './fallback-env';

// Track initialization state
let initialized = false;
let initializing = false;

/**
 * Initialize the API environment
 * This function should be called during application startup
 * It will fetch environment values from the fallback server and set up API configurations
 */
export async function initializeApi(): Promise<void> {
  // Prevent multiple initializations
  if (initialized || initializing) {
    return;
  }
  
  initializing = true;
  
  try {
    console.log('Initializing API environment...');
    await initializeApiEnvironment();
    
    // Add any other initialization tasks here
    
    console.log('API environment initialized successfully');
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize API environment:', error);
    // Continue without the fallback environment, using defaults
  } finally {
    initializing = false;
  }
}

/**
 * Check if the API environment has been initialized
 */
export function isApiInitialized(): boolean {
  return initialized;
}

/**
 * Force refresh of the API environment
 * This can be used to manually refresh the environment values
 */
export async function refreshApiEnvironment(): Promise<void> {
  try {
    await fetchFallbackEnvironment(true);
    console.log('API environment refreshed from fallback server');
  } catch (error) {
    console.error('Failed to refresh API environment:', error);
  }
} 