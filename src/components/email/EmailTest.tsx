import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendClientEmail, checkEmailJSConfig } from '@/lib/clientEmailService';
import { EmailTemplate } from '@/lib/email';

// Define form schema
const formSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type FormValues = z.infer<typeof formSchema>;

export function EmailTest() {
  const [isSending, setIsSending] = useState(false);
  const [configStatus, setConfigStatus] = useState<{
    configured: boolean;
    message: string;
    details?: Record<string, boolean>;
  } | null>(null);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to: '',
      subject: 'Test Email from Konipai CRM',
      message: 'This is a test email sent from the Konipai CRM application using EmailJS. No server required!',
    },
  });

  // Check EmailJS configuration on component mount
  useEffect(() => {
    const checkConfig = async () => {
      const status = await checkEmailJSConfig();
      setConfigStatus(status);
      
      if (!status.configured) {
        toast({
          title: 'EmailJS Configuration Issue',
          description: status.message,
          variant: 'destructive',
        });
      }
    };
    
    checkConfig();
  }, []);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSending(true);
    
    try {
      const result = await sendClientEmail(
        values.to,
        values.subject,
        EmailTemplate.ORDER_CONFIRMATION,
        {
          customer_name: 'Test Customer',
          order_id: 'TEST-1234',
          order_date: new Date().toLocaleDateString(),
          items: '1x Test Product - ₹1000',
          total: '₹1000',
          message: values.message,
        }
      );
      
      if (result.success) {
        toast({
          title: 'Email Sent',
          description: 'The email was sent successfully!',
        });
        form.reset();
      } else {
        toast({
          title: 'Failed to Send Email',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Test Client-Side Email</CardTitle>
        <CardDescription>
          Send emails directly from the browser using EmailJS without a server
        </CardDescription>
        {configStatus && (
          <div className={`text-sm p-2 rounded ${configStatus.configured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {configStatus.message}
            {configStatus.details && (
              <ul className="mt-1 list-disc list-inside">
                {Object.entries(configStatus.details).map(([key, value]) => (
                  <li key={key}>{key}: {value ? '✅' : '❌'}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email</FormLabel>
                  <FormControl>
                    <Input placeholder="recipient@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter the email address to send the test email to.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSending || !configStatus?.configured}
            >
              {isSending ? 'Sending...' : 'Send Test Email'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
        <p>This component demonstrates how to send emails directly from the client-side without a server.</p>
        <p className="mt-2">To use this in production:</p>
        <ol className="list-decimal list-inside mt-1">
          <li>Create an account at <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">EmailJS</a></li>
          <li>Set up an email service and create email templates</li>
          <li>Configure the environment variables with your EmailJS credentials</li>
        </ol>
      </CardFooter>
    </Card>
  );
}

export default EmailTest; 