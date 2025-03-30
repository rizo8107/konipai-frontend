// Simple Express server to handle API proxy requests in production
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 80;

// Define backend API URLs
const DEFAULT_API_URL = process.env.VITE_API_URL || 'https://backend-server.7za6uc.easypanel.host/api';
const DEFAULT_EMAIL_API_URL = process.env.VITE_EMAIL_API_URL || 'https://backend-server.7za6uc.easypanel.host/email-api';
const DEFAULT_WHATSAPP_API_URL = process.env.VITE_WHATSAPP_API_URL || 'https://backend-whatsappapi.7za6uc.easypanel.host';

// Add CORS middleware - must be before proxy configuration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request for:', req.url);
    return res.status(200).end();
  }
  
  next();
});

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configure API proxy middleware
const apiProxy = createProxyMiddleware({
  target: DEFAULT_API_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  secure: true,
  logLevel: 'debug'
});

const emailApiProxy = createProxyMiddleware({
  target: DEFAULT_EMAIL_API_URL,
  changeOrigin: true,
  pathRewrite: { '^/email-api': '' },
  secure: true,
  logLevel: 'debug'
});

const whatsappApiProxy = createProxyMiddleware({
  target: DEFAULT_WHATSAPP_API_URL,
  changeOrigin: true,
  pathRewrite: { '^/whatsapp-api': '' },
  secure: false,
  logLevel: 'debug',
  // Add specialized handlers for WhatsApp API
  onProxyReq: (proxyReq, req, res) => {
    // Set origin to match the WhatsApp API expected origin
    proxyReq.setHeader('Origin', DEFAULT_WHATSAPP_API_URL);
    
    // Log proxy request
    console.log(`Proxying ${req.method} request to: ${DEFAULT_WHATSAPP_API_URL}${req.url.replace(/^\/whatsapp-api/, '')}`);
    console.log('Request headers:', req.headers);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers are present regardless of what the API returns
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control';
    proxyRes.headers['Access-Control-Max-Age'] = '86400'; // 24 hours
    
    // Log proxy response
    console.log(`WhatsApp API proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('WhatsApp API proxy error:', err);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ 
      message: 'Error connecting to WhatsApp API',
      error: err.message
    }));
  }
});

// Use the proxy middleware for API routes
app.use('/api', apiProxy);
app.use('/email-api', emailApiProxy);
app.use('/whatsapp-api', whatsappApiProxy);

// Serve static files from the 'dist' directory
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // For any other requests, serve the index.html file
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Proxy: ${DEFAULT_API_URL}`);
  console.log(`Email API Proxy: ${DEFAULT_EMAIL_API_URL}`);
  console.log(`WhatsApp API Proxy: ${DEFAULT_WHATSAPP_API_URL}`);
}); 