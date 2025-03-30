# EmailJS Setup Guide for Konipai CRM

This guide will help you set up EmailJS to send emails directly from the browser without relying on a backend server.

## Step 1: Create an EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/) and sign up for an account
2. The free tier allows 200 emails per month, which is sufficient for testing

## Step 2: Set Up an Email Service

1. In the EmailJS dashboard, click on "Email Services" in the left menu
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, Custom SMTP, etc.)
4. Follow the instructions to connect your email account
5. Name your service (e.g., "konipai-email-service")
6. Note the **Service ID** for later

## Step 3: Create an Email Template

1. In the EmailJS dashboard, click on "Email Templates" in the left menu
2. Click "Create New Template"
3. Design your template with the following parameters:
   - `to_email`: Recipient email address
   - `from_email`: Sender email address
   - `subject`: Email subject
   - `message`: Email content (HTML)
   - Add any other custom parameters you need
4. Save the template and note the **Template ID** for later

## Step 4: Get Your Public Key

1. In the EmailJS dashboard, click on "Account" in the left menu
2. Find your **Public Key** in the API Keys section

## Step 5: Configure Konipai CRM

1. Add the following environment variables to your project:

```
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAIL_FROM=your_default_from_email
```

2. Make sure these variables are added to:
   - `.env.production` for production builds
   - `.env.development` for development
   - `easypanel.config.json` for EasyPanel deployment

## Step 6: Test Your Implementation

1. Use the `EmailSender` component to test sending emails
2. Verify emails are delivered as expected
3. Check the EmailJS dashboard for delivery statistics and any potential issues

## Usage Example

The `email-direct.ts` library provides the following functions:

- `sendEmailMessage`: Send a simple email message
- `sendOrderConfirmationEmail`: Send an order confirmation
- `sendPaymentSuccessEmail`: Send payment confirmation
- `isValidEmail`: Validate email format
- `checkEmailConnection`: Check if EmailJS is configured correctly

Here's a simple example:

```typescript
import { sendEmailMessage } from '@/lib/email-direct';

// Send a simple email
const result = await sendEmailMessage(
  'customer@example.com',
  'Welcome to Konipai CRM',
  '<h1>Welcome</h1><p>Thank you for signing up!</p>'
);

console.log(result.success); // true/false
```

## Advantages Over Server-Based Email

- **No Server Dependency**: Emails send directly from the client
- **Simplified Infrastructure**: No need for SMTP server configuration
- **Reduced Backend Load**: Email processing handled by EmailJS service
- **Improved Reliability**: EmailJS handles delivery, retries, and tracking

## Limitations

- **Template Restrictions**: Free tier limited to 3 templates
- **Monthly Limit**: Free tier limited to 200 emails/month
- **Client-Side Only**: Not suitable for automated emails that need to be sent without user interaction
- **Security**: API key is visible in client-side code (though it has limited permissions)

For high-volume production use, consider upgrading to a paid EmailJS plan or implementing a hybrid approach that uses both direct and server-based email sending. 