/**
 * Direct WhatsApp API implementation using child_process to execute curl commands
 * This bypasses any routing or configuration issues in the server
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { SERVER_ENV } from './env';

// Promisify exec to use async/await
const execAsync = promisify(exec);

/**
 * Build the WhatsApp API URL
 * @returns {string} The complete WhatsApp API base URL
 */
function getWhatsAppApiUrl() {
  return SERVER_ENV.VITE_WHATSAPP_API_URL || 'https://backend-whatsappapi.7za6uc.easypanel.host';
}

/**
 * Check WhatsApp API status using curl
 * @returns {Promise<Object>} Status response
 */
export async function checkWhatsAppStatus() {
  try {
    console.log('Checking WhatsApp API status...');
    const apiUrl = `${getWhatsAppApiUrl()}/status`;
    
    const { stdout, stderr } = await execAsync(`curl -s "${apiUrl}"`);
    
    if (stderr) {
      console.error('Error checking WhatsApp status:', stderr);
      return { success: false, message: stderr };
    }
    
    try {
      // Try to parse the response as JSON
      const response = JSON.parse(stdout);
      console.log('WhatsApp status check response:', response);
      return { success: true, ...response };
    } catch (parseError) {
      console.error('Failed to parse WhatsApp status response:', parseError);
      console.log('Raw response:', stdout);
      return { 
        success: false, 
        message: 'Invalid response format', 
        rawResponse: stdout 
      };
    }
  } catch (error) {
    console.error('Error in checkWhatsAppStatus:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send WhatsApp message using curl
 * @param {string} number - Recipient phone number
 * @param {string} message - Message content
 * @param {Object} variables - Optional template variables
 * @returns {Promise<Object>} Send message response
 */
export async function sendWhatsAppMessage(number, message, variables = {}) {
  try {
    console.log(`Sending WhatsApp message to ${number}...`);
    const apiUrl = `${getWhatsAppApiUrl()}/send-message`;
    
    // Prepare data for the curl command
    const data = JSON.stringify({
      number,
      message,
      variables
    });
    
    // Execute curl command with proper headers and data
    const { stdout, stderr } = await execAsync(`curl -s -X POST "${apiUrl}" \\
      -H "Content-Type: application/json" \\
      -d '${data}'`);
    
    if (stderr) {
      console.error('Error sending WhatsApp message:', stderr);
      return { success: false, message: stderr };
    }
    
    try {
      // Try to parse the response as JSON
      const response = JSON.parse(stdout);
      console.log('WhatsApp send message response:', response);
      return { success: true, ...response };
    } catch (parseError) {
      console.error('Failed to parse WhatsApp send message response:', parseError);
      console.log('Raw response:', stdout);
      
      // If we got HTML back instead of JSON, return a meaningful error
      if (stdout.includes('<!DOCTYPE html>') || stdout.includes('<html')) {
        return { 
          success: false, 
          message: 'Received HTML response instead of JSON. API endpoint might be misconfigured.',
          rawResponse: stdout.substring(0, 200) + '...' // Truncate long HTML responses
        };
      }
      
      return { 
        success: false, 
        message: 'Invalid response format', 
        rawResponse: stdout 
      };
    }
  } catch (error) {
    console.error('Error in sendWhatsAppMessage:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Send WhatsApp template message using curl
 * @param {string} number - Recipient phone number
 * @param {string} templateName - Name of the template to use
 * @param {Array} components - Template components
 * @returns {Promise<Object>} Send template response
 */
export async function sendWhatsAppTemplate(number, templateName, components = []) {
  try {
    console.log(`Sending WhatsApp template ${templateName} to ${number}...`);
    const apiUrl = `${getWhatsAppApiUrl()}/send-template`;
    
    // Prepare data for the curl command
    const data = JSON.stringify({
      number,
      template_name: templateName,
      components
    });
    
    // Execute curl command with proper headers and data
    const { stdout, stderr } = await execAsync(`curl -s -X POST "${apiUrl}" \\
      -H "Content-Type: application/json" \\
      -d '${data}'`);
    
    if (stderr) {
      console.error('Error sending WhatsApp template:', stderr);
      return { success: false, message: stderr };
    }
    
    try {
      // Try to parse the response as JSON
      const response = JSON.parse(stdout);
      console.log('WhatsApp send template response:', response);
      return { success: true, ...response };
    } catch (parseError) {
      console.error('Failed to parse WhatsApp template response:', parseError);
      console.log('Raw response:', stdout);
      return { 
        success: false, 
        message: 'Invalid response format', 
        rawResponse: stdout 
      };
    }
  } catch (error) {
    console.error('Error in sendWhatsAppTemplate:', error);
    return { success: false, message: error.message };
  }
} 