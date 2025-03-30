// Add Vite environment variable type declaration
interface ImportMetaEnv {
  MODE: string;
  VITE_API_URL: string;
  VITE_EMAIL_API_URL: string;
  VITE_WHATSAPP_API_URL: string;
  VITE_POCKETBASE_URL: string;
  VITE_SITE_TITLE: string;
  VITE_SITE_LOGO: string;
  VITE_RAZORPAY_KEY_ID: string;
  VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Frontend configuration file for Konipai CRM
 * This provides environment variables and configuration for the frontend application
 */

// Helper function to safely get environment variables
function getEnv(key: string, defaultValue: string = ''): string {
  // Browser environment (Vite)
  if (typeof window !== 'undefined' && 'env' in import.meta) {
    // @ts-ignore - Vite-specific, will work at runtime
    return import.meta.env[key] || defaultValue;
  } 
  // Node.js environment
  else if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  // Fallback
  return defaultValue;
}

// Default configuration values for frontend
export const frontendConfig = {
  // API endpoints
  api: {
    baseUrl: getEnv('VITE_API_URL', 'https://api.konipai.in/api'),
    emailUrl: getEnv('VITE_EMAIL_API_URL', 'https://api.konipai.in/email-api'),
    whatsappUrl: getEnv('VITE_WHATSAPP_API_URL', 'https://backend-whatsappapi.7za6uc.easypanel.host')
  },
  
  // PocketBase configuration
  pocketbase: {
    url: getEnv('VITE_POCKETBASE_URL', 'https://backend-pocketbase.7za6uc.easypanel.host/')
  },
  
  // Site configuration
  site: {
    title: getEnv('VITE_SITE_TITLE', 'Konipai'),
    logo: getEnv('VITE_SITE_LOGO', 'https://konipai.in/assets/logo.png')
  },
  
  // Payment gateway configuration
  payment: {
    razorpayKeyId: getEnv('VITE_RAZORPAY_KEY_ID', 'rzp_live_3rZx2njbNwMEE1')
  },
  
  // AI configuration
  ai: {
    geminiApiKey: getEnv('VITE_GEMINI_API_KEY', '')
  }
};

// Helper function to determine if we're in development mode
export function isDevelopment(): boolean {
  return getEnv('MODE', 'development') === 'development';
}

// Helper function to determine if we're in production mode
export function isProduction(): boolean {
  return getEnv('MODE', 'development') === 'production';
}

// Helper function to log frontend configuration during initialization
export function logFrontendConfig(): void {
  console.log('Frontend Configuration:');
  console.log('- API Base URL:', frontendConfig.api.baseUrl);
  console.log('- Email API URL:', frontendConfig.api.emailUrl);
  console.log('- WhatsApp API URL:', frontendConfig.api.whatsappUrl);
  console.log('- PocketBase URL:', frontendConfig.pocketbase.url);
  console.log('- Environment:', getEnv('MODE', 'development'));
} 