# EmailEngine Setup Guide for Konipai CRM

This guide will help you set up EmailEngine to send emails directly from the browser without relying on the backend server.

## What is EmailEngine?

EmailEngine is a modern email delivery API that provides:
- Reliable email delivery with advanced queuing and retry mechanisms
- Real-time delivery tracking and analytics
- Attachment support and HTML template functionality
- Built-in spam detection and deliverability optimization

## Step 1: Create an EmailEngine Account

1. Go to [EmailEngine.app](https://emailengine.app/) and sign up for an account
2. Choose a plan based on your email volume needs (they offer free trial options)

## Step 2: Set Up Your Email Account

1. In the EmailEngine dashboard, go to "Accounts" and click "Add Account"
2. Choose your email provider (SMTP, Gmail, Office 365, etc.)
3. Follow the instructions to connect your email account
4. Note the **Account ID** you've created for later configuration

## Step 3: Generate API Key

1. In the EmailEngine dashboard, go to "Settings" > "API Keys"
2. Click "Generate New API Key"
3. Name your key (e.g., "konipai-crm-key")
4. Choose appropriate permissions (at minimum: "Send Messages" and "Read Message Data")
5. Save the generated key securely - you'll need it for configuration

## Step 4: Configure Konipai CRM

Add the following environment variables to your project:

```
VITE_EMAILENGINE_URL=https://api.emailengine.app
VITE_EMAILENGINE_API_KEY=your_api_key_here
VITE_EMAIL_FROM=support@konipai.in
VITE_EMAIL_FROM_NAME=Konipai CRM
VITE_EMAILENGINE_ACCOUNT=your_account_id
```

Make sure these variables are added to:
- `.env.production` for production builds
- `.env.development` for development
- `easypanel.config.json` for EasyPanel deployment

## Step 5: Test Your EmailEngine Integration

1. Use the `EmailSender` component in the Settings page to test sending emails
2. Check the EmailEngine dashboard for delivery status and analytics
3. Verify emails are being delivered as expected

## EmailEngine API Usage

The `email-direct.ts` library provides the following functions:

- `sendEmailMessage`: Send a simple email message
- `sendEmailWithAttachment`: Send an email with file attachments
- `sendOrderConfirmationEmail`: Send an order confirmation
- `sendPaymentSuccessEmail`: Send payment confirmation
- `isValidEmail`: Validate email format
- `checkEmailConnection`: Check if EmailEngine is configured correctly

Here's a simple example:

```typescript
import { sendEmailMessage } from '@/lib/email-direct';

// Send a simple email
const result = await sendEmailMessage(
  'customer@example.com',
  'Welcome to Konipai CRM',
  '<h1>Welcome</h1><p>Thank you for signing up!</p>'
);

if (result.success) {
  console.log('Email sent with ID:', result.messageId);
} else {
  console.error('Failed to send email:', result.message);
}
```

## Advantages of EmailEngine

- **Direct API Access**: No middleware required, simplifying your architecture
- **Delivery Monitoring**: Real-time tracking of email delivery and open rates
- **High Deliverability**: Advanced techniques to ensure emails reach inboxes
- **Automatic Retries**: Built-in queue system for handling transient failures
- **Detailed Analytics**: Track open rates, click-through rates, and more
- **Attachment Support**: Easily send emails with attachments

## How It Works

1. Your frontend application makes a direct API call to EmailEngine
2. EmailEngine queues the message and attempts delivery
3. The message is sent through your connected email provider
4. Delivery status and analytics are tracked by EmailEngine
5. Your application can poll for status updates or receive webhooks

## Production Considerations

For production environments, consider:

1. **Security**: Ensure your API key is properly secured
2. **Monitoring**: Set up webhooks to get real-time delivery notifications
3. **Rate Limiting**: Be aware of your plan's sending limits
4. **Fallback Mechanism**: Implement retry logic for temporary failures

## Troubleshooting

If you encounter issues:

1. Check the EmailEngine dashboard for error messages
2. Verify your API key has the correct permissions
3. Ensure your account is properly configured
4. Check browser console logs for detailed error information
5. Verify the email account has sufficient sending quota 