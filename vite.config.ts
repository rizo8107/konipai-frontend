import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Default backend URLs
const DEFAULT_API_URL = 'https://backend-server.7za6uc.easypanel.host/api';
const DEFAULT_EMAIL_API_URL = 'https://backend-server.7za6uc.easypanel.host/email-api';
const DEFAULT_WHATSAPP_API_URL = 'https://backend-whatsappapi.7za6uc.easypanel.host';

// Proxy configuration factory to avoid duplication
const createProxyConfig = (isProduction: boolean) => ({
  '/api': {
    target: isProduction ? DEFAULT_API_URL : 'http://localhost:3000/api',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
    secure: isProduction,
  },
  '/email-api': {
    target: isProduction ? DEFAULT_EMAIL_API_URL : 'http://localhost:3000/email-api',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/email-api/, ''),
    secure: false,
    configure: (proxy: any, options: any) => {
      proxy.on('proxyReq', (proxyReq: any, req: any, res: any) => {
        proxyReq.setHeader('Origin', isProduction ? DEFAULT_EMAIL_API_URL : 'http://localhost:3000/email-api');
      });
      proxy.on('proxyRes', (proxyRes: any, req: any, res: any) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      });
    },
  },
  '^/whatsapp-api/(.*)': {
    target: isProduction ? DEFAULT_WHATSAPP_API_URL : 'http://localhost:3000/whatsapp-api',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/whatsapp-api/, ''),
    secure: false,
    configure: (proxy: any, options: any) => {
      proxy.on('proxyReq', (proxyReq: any, req: any, res: any) => {
        proxyReq.setHeader('Origin', isProduction ? DEFAULT_WHATSAPP_API_URL : 'http://localhost:3000/whatsapp-api');
      });
      proxy.on('proxyRes', (proxyRes: any, req: any, res: any) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      });
    },
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Determine if we're in production mode
  const isProduction = mode === 'production';
  
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: createProxyConfig(isProduction),
    },
    preview: {
      host: "::",
      port: 8080,
      proxy: createProxyConfig(isProduction),
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
