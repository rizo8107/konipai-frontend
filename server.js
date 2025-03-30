// Simple Express server to handle API proxy requests in production
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';

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

// Configure API proxy middleware
const apiProxy = createProxyMiddleware({
  target: DEFAULT_API_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  secure: true,
});

const emailApiProxy = createProxyMiddleware({
  target: DEFAULT_EMAIL_API_URL,
  changeOrigin: true,
  pathRewrite: { '^/email-api': '' },
  secure: false,
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Origin', DEFAULT_EMAIL_API_URL);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  },
});

const whatsappApiProxy = createProxyMiddleware({
  target: DEFAULT_WHATSAPP_API_URL,
  changeOrigin: true,
  pathRewrite: { '^/whatsapp-api': '' },
  secure: false,
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Origin', DEFAULT_WHATSAPP_API_URL);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET,HEAD,PUT,PATCH,POST,DELETE';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  },
});

// Use the proxy middleware for API routes
app.use('/api', apiProxy);
app.use('/email-api', emailApiProxy);
app.use('/whatsapp-api', whatsappApiProxy);

// Add a direct API proxy endpoint to handle urls passed as query parameters
app.get('/direct-api', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).send({ error: 'Missing url parameter' });
  }
  
  try {
    console.log(`Proxying direct request to: ${targetUrl}`);
    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Return the response data
    return res.status(200).json(response.data);
  } catch (error) {
    console.error(`Error proxying to ${targetUrl}:`, error.message);
    return res.status(500).json({ 
      error: 'Failed to proxy request',
      message: error.message,
      url: targetUrl
    });
  }
});

// CORS middleware to ensure all routes have proper headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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