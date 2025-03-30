import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Default backend URLs
const DEFAULT_API_URL = 'https://backend-server.7za6uc.easypanel.host/api';
const DEFAULT_EMAIL_API_URL = 'https://backend-server.7za6uc.easypanel.host/email-api';
const DEFAULT_WHATSAPP_API_URL = 'https://backend-whatsappapi.7za6uc.easypanel.host';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine if we're in production mode
  const isProduction = mode === 'production';
  
  // Set appropriate targets based on environment
  const apiTarget = isProduction ? DEFAULT_API_URL : 'http://localhost:3000/api';
  const emailApiTarget = isProduction ? DEFAULT_EMAIL_API_URL : 'http://localhost:3000/email-api';
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          secure: isProduction,
        },
        '/email-api': {
          target: emailApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/email-api/, ''),
          secure: isProduction,
        },
        '/whatsapp-api': {
          target: DEFAULT_WHATSAPP_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/whatsapp-api/, ''),
          secure: false,
        },
      },
    },
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        "@": "/src"
      },
    },
  };
});
