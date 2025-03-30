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
const DEBUG = process.env.VITE_PROXY_DEBUG === 'true';
const APP_DOMAIN = process.env.VITE_APP_DOMAIN || 'crm-frontend.7za6uc.easypanel.host';
const CORS_ORIGIN = process.env.VITE_CORS_ORIGIN || '*';

// Define backend API URLs
const DEFAULT_API_URL = process.env.VITE_API_URL || 'https://backend-server.7za6uc.easypanel.host/api';
const DEFAULT_EMAIL_API_URL = process.env.VITE_EMAIL_API_URL || 'https://backend-server.7za6uc.easypanel.host/email-api';
const DEFAULT_WHATSAPP_API_URL = process.env.VITE_WHATSAPP_API_URL || 'https://backend-whatsappapi.7za6uc.easypanel.host';
const DEFAULT_POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'https://backend-pocketbase.7za6uc.easypanel.host';

// Log environment settings if debugging is enabled
if (DEBUG) {
  console.log('Environment settings:');
  console.log('PORT:', PORT);
  console.log('APP_DOMAIN:', APP_DOMAIN);
  console.log('CORS_ORIGIN:', CORS_ORIGIN);
  console.log('DEFAULT_API_URL:', DEFAULT_API_URL);
  console.log('DEFAULT_EMAIL_API_URL:', DEFAULT_EMAIL_API_URL);
  console.log('DEFAULT_WHATSAPP_API_URL:', DEFAULT_WHATSAPP_API_URL);
  console.log('DEFAULT_POCKETBASE_URL:', DEFAULT_POCKETBASE_URL);
}

// Add CORS middleware - must be before proxy configuration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (DEBUG) console.log('Handling OPTIONS preflight request for:', req.url);
    return res.status(200).end();
  }
  
  next();
});

// Log all incoming requests if debugging is enabled
app.use((req, res, next) => {
  if (DEBUG) console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configure API proxy middleware with common options
const createProxyOptions = (target, pathPrefix) => ({
  target,
  changeOrigin: true,
  pathRewrite: { [`^${pathPrefix}`]: '' },
  secure: false, // Allow self-signed certificates
  logLevel: DEBUG ? 'debug' : 'error',
  onProxyReq: (proxyReq, req, res) => {
    // Set origin to match the target API expected origin
    proxyReq.setHeader('Origin', target);
    proxyReq.setHeader('Host', new URL(target).host);
    
    // Set the referer to the target API
    proxyReq.setHeader('Referer', target);
    
    // Log proxy request if debugging is enabled
    if (DEBUG) {
      console.log(`Proxying ${req.method} request to: ${target}${req.url.replace(pathPrefix, '')}`);
      console.log('Request headers:', req.headers);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers are present regardless of what the API returns
    proxyRes.headers['Access-Control-Allow-Origin'] = CORS_ORIGIN;
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control';
    proxyRes.headers['Access-Control-Max-Age'] = '86400'; // 24 hours
    
    // Log proxy response if debugging is enabled
    if (DEBUG) {
      console.log(`Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    }
  },
  onError: (err, req, res) => {
    console.error(`Proxy error for ${req.url}:`, err);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CORS_ORIGIN
    });
    res.end(JSON.stringify({ 
      message: `Error connecting to backend service at ${target}`,
      error: err.message,
      url: req.url
    }));
  }
});

// Use the proxy middleware for API routes
app.use('/api', createProxyMiddleware(createProxyOptions(DEFAULT_API_URL, '/api')));
app.use('/email-api', createProxyMiddleware(createProxyOptions(DEFAULT_EMAIL_API_URL, '/email-api')));
app.use('/whatsapp-api', createProxyMiddleware(createProxyOptions(DEFAULT_WHATSAPP_API_URL, '/whatsapp-api')));

// Add PocketBase proxy
app.use('/pocketbase', createProxyMiddleware({
  target: DEFAULT_POCKETBASE_URL,
  changeOrigin: true,
  pathRewrite: { '^/pocketbase': '' },
  secure: false,
  logLevel: DEBUG ? 'debug' : 'error',
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Origin', DEFAULT_POCKETBASE_URL);
    proxyReq.setHeader('Host', new URL(DEFAULT_POCKETBASE_URL).host);
    if (DEBUG) {
      console.log(`Proxying PocketBase request to: ${DEFAULT_POCKETBASE_URL}${req.url.replace('/pocketbase', '')}`);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = CORS_ORIGIN;
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, X-Requested-With, Cache-Control';
  },
  onError: (err, req, res) => {
    console.error(`PocketBase proxy error: ${req.url}`, err);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CORS_ORIGIN
    });
    res.end(JSON.stringify({
      message: `Error connecting to PocketBase at ${DEFAULT_POCKETBASE_URL}`,
      error: err.message
    }));
  }
}));

// Health check endpoint for PocketBase (direct access)
app.get('/pocketbase-status', async (req, res) => {
  try {
    console.log(`Checking PocketBase status at ${DEFAULT_POCKETBASE_URL}/api/health`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${DEFAULT_POCKETBASE_URL}/api/health`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': DEFAULT_POCKETBASE_URL
      },
      timeout: 5000
    });
    
    const data = await response.json();
    console.log('PocketBase health response:', data);
    
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.status(200).json({
      success: true,
      message: 'PocketBase is healthy',
      data
    });
  } catch (error) {
    console.error('Error checking PocketBase health:', error);
    
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to PocketBase',
      error: error.message
    });
  }
});

// Special health check endpoint for WhatsApp API (as a fallback)
app.get('/whatsapp-status', async (req, res) => {
  try {
    const apiUrl = `${DEFAULT_WHATSAPP_API_URL}/status`;
    console.log(`Direct health check for WhatsApp API at ${apiUrl}`);
    
    // Import fetch dynamically to avoid polyfill issues
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': DEFAULT_WHATSAPP_API_URL,
        'Referer': DEFAULT_WHATSAPP_API_URL
      },
      timeout: 5000
    });
    
    const data = await response.json();
    console.log('WhatsApp API status response:', data);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.status(200).json({
      success: true,
      message: 'WhatsApp API is connected',
      status: data.status || 'ok',
      data
    });
  } catch (error) {
    console.error('Error checking WhatsApp API status:', error);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to WhatsApp API',
      error: error.message
    });
  }
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
  console.log(`Frontend domain: ${APP_DOMAIN}`);
  console.log(`API Proxy: ${DEFAULT_API_URL}`);
  console.log(`Email API Proxy: ${DEFAULT_EMAIL_API_URL}`);
  console.log(`WhatsApp API Proxy: ${DEFAULT_WHATSAPP_API_URL}`);
  console.log(`PocketBase URL: ${DEFAULT_POCKETBASE_URL}`);
}); 