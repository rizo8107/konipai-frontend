/**
 * Konipai CRM - API Server
 * This server provides the email API and other backend functionalities
 */

import { createServerApp, serverConfig, logServerConfig } from '../../server.config';
import emailRoutes from '../api/email';
import { checkEmailConnection } from './emailService';

// Create and configure the server app
const app = createServerApp();
const PORT = serverConfig.port;

// Log server configuration
logServerConfig();
console.log('SMTP Configuration:', {
  host: serverConfig.email.host,
  port: serverConfig.email.port,
  secure: serverConfig.email.secure,
  user: serverConfig.email.auth.user
});

// API Routes
app.get('/api', (req, res) => {
  res.json({ status: 'API is running' });
});

// Email API Routes
app.use('/email-api', emailRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Debug endpoint to see environment configuration
app.get('/debug-config', (req, res) => {
  // Create a safe version of config
  const safeConfig = {
    port: serverConfig.port,
    emailHost: serverConfig.email.host,
    emailPort: serverConfig.email.port,
    pocketbaseUrl: serverConfig.pocketbase.url
  };
  
  res.json({
    config: safeConfig,
    workingDirectory: process.cwd(),
    nodeVersion: process.version
  });
});

// Check email connection on startup
async function checkConnections() {
  try {
    const emailStatus = await checkEmailConnection();
    console.log('Email connection check result:', emailStatus);
  } catch (error) {
    console.error('Error checking connections:', error);
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  checkConnections();
});

export default app; 