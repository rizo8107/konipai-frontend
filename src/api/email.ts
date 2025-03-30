import express from 'express';
import { sendEmail, sendEmailWithAttachment, checkEmailConnection } from '../server/emailService';
import PocketBase from 'pocketbase';

// Define EmailActivity interface here to avoid import issues
interface EmailActivity {
  id?: string;
  order_id: string;
  template_name: string;
  recipient: string;
  status: 'sent' | 'failed';
  message_content: string;
  timestamp: string;
  subject?: string;
}

const router = express.Router();

// Initialize PocketBase for logging activities
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL || 'https://backend-pocketbase.7za6uc.easypanel.host');

// Ensure admin authentication for PocketBase
async function ensureAdminAuth() {
  try {
    // Check if already authenticated
    if (pb.authStore.isValid) {
      return;
    }
    
    // Authenticate with admin credentials
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com',
      process.env.POCKETBASE_ADMIN_PASSWORD || 'password123'
    );
    
    console.log('Admin authenticated successfully in email API');
  } catch (error) {
    console.error('Error authenticating admin in email API:', error);
    throw error;
  }
}

// Ensure the email_activities collection exists
async function ensureEmailActivitiesCollection() {
  try {
    await ensureAdminAuth();
    const collections = await pb.collections.getFullList();
    const collectionExists = collections.some(c => c.name === 'email_activities');
    
    if (!collectionExists) {
      await pb.collections.create({
        name: 'email_activities',
        schema: [
          {
            name: 'order_id',
            type: 'text',
            required: true,
          },
          {
            name: 'template_name',
            type: 'text',
            required: true,
          },
          {
            name: 'recipient',
            type: 'text',
            required: true,
          },
          {
            name: 'status',
            type: 'text',
            required: true,
          },
          {
            name: 'message_content',
            type: 'text',
            required: true,
          },
          {
            name: 'timestamp',
            type: 'text',
            required: true,
          },
          {
            name: 'subject',
            type: 'text',
          },
        ],
      });
      console.log('Created email_activities collection');
    }
  } catch (error) {
    console.error('Error ensuring email_activities collection:', error);
  }
}

// Log email activity to PocketBase
async function logEmailActivity(activity: EmailActivity) {
  try {
    await ensureAdminAuth();
    await ensureEmailActivitiesCollection();
    await pb.collection('email_activities').create(activity);
    console.log('Email activity logged:', activity);
  } catch (error) {
    console.error('Error logging email activity:', error);
  }
}

// Health check endpoint
router.get('/status', async (req, res) => {
  try {
    const status = await checkEmailConnection();
    return res.status(status.connected ? 200 : 500).json(status);
  } catch (error) {
    console.error('Error checking email connection:', error);
    return res.status(500).json({
      connected: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to check email connection'
    });
  }
});

// Send email endpoint
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, message, variables } = req.body;
    
    // Validate required fields
    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email, subject, and message are required'
      });
    }
    
    // Send the email
    const result = await sendEmail(to, subject, message, variables);
    
    // Log the activity if successful
    if (result.success) {
      const activity: EmailActivity = {
        order_id: variables?.orderId || 'N/A',
        template_name: variables?.templateName || 'custom_email',
        recipient: to,
        status: 'sent',
        message_content: message,
        timestamp: new Date().toISOString(),
        subject
      };
      
      await logEmailActivity(activity);
    }
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in send-email endpoint:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email'
    });
  }
});

// Send email with attachment endpoint
router.post('/send-email-with-attachment', async (req, res) => {
  try {
    const { to, subject, message, attachments, variables } = req.body;
    
    // Validate required fields
    if (!to || !subject || !message || !attachments || !Array.isArray(attachments)) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email, subject, message, and attachments are required'
      });
    }
    
    // Send the email with attachment
    const result = await sendEmailWithAttachment(to, subject, message, attachments, variables);
    
    // Log the activity if successful
    if (result.success) {
      const activity: EmailActivity = {
        order_id: variables?.orderId || 'N/A',
        template_name: variables?.templateName || 'custom_email_with_attachment',
        recipient: to,
        status: 'sent',
        message_content: message,
        timestamp: new Date().toISOString(),
        subject
      };
      
      await logEmailActivity(activity);
    }
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error in send-email-with-attachment endpoint:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email with attachment'
    });
  }
});

// Log email activity endpoint
router.post('/log-activity', async (req, res) => {
  try {
    const activity: EmailActivity = req.body;
    
    // Validate required fields
    if (!activity.order_id || !activity.template_name || !activity.recipient || !activity.status || !activity.message_content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for email activity logging'
      });
    }
    
    // Log the activity
    await logEmailActivity(activity);
    
    return res.status(200).json({
      success: true,
      message: 'Email activity logged successfully'
    });
  } catch (error) {
    console.error('Error in log-activity endpoint:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to log email activity'
    });
  }
});

// Check email connection status endpoint
router.get('/connection-status', async (req, res) => {
  try {
    const status = await checkEmailConnection();
    return res.status(200).json(status);
  } catch (error) {
    console.error('Error in status endpoint:', error);
    return res.status(500).json({
      connected: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to check email connection status'
    });
  }
});

export default router;
