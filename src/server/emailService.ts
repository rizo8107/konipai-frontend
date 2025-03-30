import nodemailer from 'nodemailer';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Log SMTP configuration for debugging (without password)
console.log('SMTP Configuration:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
  // Don't log the password
});

// Create a transporter using SMTP configuration from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || ''
  },
  // Add debug option for more detailed logging
  debug: true,
  // Increase timeout to 30 seconds
  connectionTimeout: 30000
});

// Initialize PocketBase for logging activities
const pb = new PocketBase(process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Ensure the email_activities collection exists
async function ensureEmailActivitiesCollection() {
  try {
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
    await ensureEmailActivitiesCollection();
    await pb.collection('email_activities').create(activity);
    console.log('Email activity logged:', activity);
  } catch (error) {
    console.error('Error logging email activity:', error);
  }
}

// Send an email
export async function sendEmail(to: string, subject: string, html: string, variables?: Record<string, string>) {
  try {
    // Verify required SMTP settings
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP configuration is incomplete. Please check your environment variables.');
    }

    // Replace variables in the content if provided
    let content = html;
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
      });
    }

    // Send the email
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: content
    });

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

// Send an email with attachment
export async function sendEmailWithAttachment(
  to: string,
  subject: string,
  html: string,
  attachments: Array<{filename: string, content: string, contentType: string}>,
  variables?: Record<string, string>
) {
  try {
    // Verify required SMTP settings
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP configuration is incomplete. Please check your environment variables.');
    }

    // Replace variables in the content if provided
    let content = html;
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, value);
      });
    }

    // Send the email with attachment
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html: content,
      attachments: attachments.map(attachment => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, 'base64'),
        contentType: attachment.contentType
      }))
    });

    return {
      success: true,
      message: 'Email with attachment sent successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error sending email with attachment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email with attachment'
    };
  }
}

// Check email connection status
export async function checkEmailConnection() {
  try {
    console.log('Checking email connection...');
    
    // Verify required SMTP settings
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error('SMTP configuration is incomplete. Missing required environment variables.');
      return {
        connected: false,
        status: 'error',
        message: 'SMTP configuration is incomplete. Please check your environment variables.'
      };
    }
    
    // Try to verify the connection
    const verification = await transporter.verify();
    console.log('Email connection verified:', verification);
    
    return {
      connected: true,
      status: 'connected',
      message: 'Successfully connected to email server'
    };
  } catch (error) {
    console.error('Error checking email connection:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to connect to email server';
    let errorStatus = 'error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error codes
      if ('code' in error) {
        const code = (error as { code: string }).code;
        if (code === 'ETIMEDOUT') {
          errorMessage = 'Connection to email server timed out. Please check your SMTP settings or firewall rules.';
          errorStatus = 'timeout';
        } else if (code === 'EAUTH') {
          errorMessage = 'Authentication failed. Please check your email credentials.';
          errorStatus = 'auth_failed';
        } else if (code === 'ECONNREFUSED') {
          errorMessage = 'Connection refused. Please check your SMTP host and port settings.';
          errorStatus = 'connection_refused';
        }
      }
    }
    
    return {
      connected: false,
      status: errorStatus,
      message: errorMessage
    };
  }
}
