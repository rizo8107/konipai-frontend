import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import emailRoutes from '../api/email';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SERVER_ENV } from '../lib/env';
import fs from 'fs';
import path from 'path';

// Handle ESM in TypeScript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables - additional attempt
console.log('Server starting - checking environment...');
try {
  // Check if .env exists in the current directory
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log(`Found .env at ${envPath}`);
    const envContents = fs.readFileSync(envPath, 'utf8');
    console.log('Env file contents (first 100 chars):', envContents.substring(0, 100));
    
    // Try to load it directly
    dotenv.config({ path: envPath });
    
    // Check if it worked
    console.log('After loading env file, VITE_API_URL =', process.env.VITE_API_URL);
  } else {
    console.log('No .env file found in current directory');
  }
} catch (error) {
  console.error('Error checking environment:', error);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

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

// Debug endpoint to see all environment variables
app.get('/debug-env', (req, res) => {
  // Create a safe version of env vars for debugging
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    VITE_API_URL: process.env.VITE_API_URL,
    VITE_EMAIL_API_URL: process.env.VITE_EMAIL_API_URL,
    VITE_WHATSAPP_API_URL: process.env.VITE_WHATSAPP_API_URL,
    VITE_POCKETBASE_URL: process.env.VITE_POCKETBASE_URL,
    SERVER_ENV: SERVER_ENV
  };
  
  res.json({
    environment: safeEnv,
    workingDirectory: process.cwd(),
    nodeVersion: process.version
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API URL:', SERVER_ENV.VITE_API_URL);
  console.log('Email API URL:', SERVER_ENV.VITE_EMAIL_API_URL);
  console.log('WhatsApp API URL:', SERVER_ENV.VITE_WHATSAPP_API_URL);
});

export default app;
