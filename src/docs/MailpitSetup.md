# Mailpit Integration Guide for Konipai CRM

This guide explains how to use Mailpit for sending emails directly from the Konipai CRM frontend.

## What is Mailpit?

[Mailpit](https://github.com/axllent/mailpit) is an email testing tool that provides both SMTP server capabilities and a web interface for viewing sent emails. It's perfect for development and testing environments, and can also be used in production for certain use cases.

## Konipai CRM Mailpit Setup

Konipai CRM is configured to use the Mailpit instance deployed at:
- API Endpoint: `https://crm-mailpit.7za6uc.easypanel.host/api/v1`
- Web UI: `https://crm-mailpit.7za6uc.easypanel.host/`

## How It Works

1. The frontend application sends HTTP requests directly to the Mailpit API
2. Emails are caught by Mailpit and displayed in its web interface
3. In development, emails stay in Mailpit for testing and review
4. In production, Mailpit can be configured to relay emails to a real SMTP server

## Configuration

The following environment variables control the Mailpit integration:

```
VITE_MAILPIT_API_URL=https://crm-mailpit.7za6uc.easypanel.host/api/v1
VITE_EMAIL_FROM=support@konipai.in
```

These should be set in:
- `.env.production` for production builds
- `.env.development` for development
- `easypanel.config.json` for EasyPanel deployment

## Using the Email Component

The `EmailSender` component provides a simple interface for sending test emails:

1. Navigate to **Settings > Email** in the admin panel
2. Fill in the recipient email, subject, and message
3. Click "Send Email"
4. View the sent email in the Mailpit web interface

## Programmatic Usage

You can use the email functionality programmatically in your code:

```typescript
import { sendEmailMessage } from '@/lib/email-mailpit';

// Send a simple email
const result = await sendEmailMessage(
  'customer@example.com',
  'Welcome to Konipai CRM',
  '<h1>Welcome</h1><p>Thank you for signing up!</p>'
);

console.log(result.success); // true/false
```

The library also includes specialized functions for common email types:

```typescript
import { sendOrderConfirmationEmail, sendPaymentSuccessEmail } from '@/lib/email-mailpit';

// Send an order confirmation
await sendOrderConfirmationEmail(order, orderItems, customer.email);

// Send payment confirmation
await sendPaymentSuccessEmail(order, customer.email);
```

## Viewing Sent Emails

To view all emails sent through Mailpit:

1. Open the Mailpit web interface at [https://crm-mailpit.7za6uc.easypanel.host/](https://crm-mailpit.7za6uc.easypanel.host/)
2. Browse through the list of sent emails
3. Click on any email to view its contents, including HTML and plain text versions
4. Use the search functionality to find specific emails

## Production Considerations

For production use, consider the following options:

1. **Direct Relay**: Configure Mailpit to relay emails to a production SMTP server
2. **API Gateway**: Use Mailpit behind an API gateway with rate limiting and authentication
3. **Hybrid Approach**: Use Mailpit for non-critical emails and a professional service like SendGrid for critical communications

## Advantages over Server-Based Email

- **No Server Dependency**: Emails are sent directly from the frontend
- **Visual Testing**: All emails can be inspected in the Mailpit UI
- **Simple API**: RESTful API is easier to work with than SMTP
- **Self-Contained**: No need for complex email server configurations

## Limitations

- **Security**: API might need additional protection for production use
- **Reliability**: Not designed for high-volume production email sending
- **Features**: Limited compared to professional email services

## Troubleshooting

If emails are not being sent or received:

1. Check that the Mailpit service is running and accessible
2. Verify the environment variables are set correctly
3. Look for errors in the browser console
4. Check the Network tab to see if the API requests are being made correctly
5. Ensure there are no CORS issues preventing the API calls

For more information, see the [Mailpit documentation](https://github.com/axllent/mailpit). 