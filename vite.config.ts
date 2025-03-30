import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/whatsapp-api': {
        target: 'https://backend-whatsappapi.7za6uc.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/whatsapp-api/, ''),
        secure: false,
      },
      '/email-api': {
        target: mode === 'production' ? 'http://localhost:3000' : 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/email-api/, '/api/email'),
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
}));
