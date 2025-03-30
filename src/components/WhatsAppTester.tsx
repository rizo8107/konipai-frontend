import React, { useState } from 'react';
import { checkStatus, sendWhatsAppTextMessage } from '@/lib/whatsapp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * WhatsApp API Testing Component
 * 
 * This component allows testing direct WhatsApp API calls without the server middleman
 */
export function WhatsAppTester() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Check WhatsApp API connection
  const handleCheckStatus = async () => {
    setIsChecking(true);
    setStatus(null);
    
    try {
      const result = await checkStatus();
      setStatus({
        success: result.success,
        message: result.message || (result.success ? 'WhatsApp API is connected' : 'Connection failed')
      });
    } catch (error) {
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check connection'
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Send WhatsApp message
  const handleSendMessage = async () => {
    if (!phoneNumber || !message) {
      setStatus({
        success: false,
        message: 'Phone number and message are required'
      });
      return;
    }
    
    setIsSending(true);
    setStatus(null);
    
    try {
      const result = await sendWhatsAppTextMessage(phoneNumber, message);
      setStatus({
        success: result.success,
        message: result.message || (result.success ? 'Message sent successfully' : 'Failed to send message')
      });
      
      if (result.success) {
        // Clear form on success
        setMessage('');
      }
    } catch (error) {
      setStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send message'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>WhatsApp API Tester</CardTitle>
        <CardDescription>Test direct WhatsApp API integration</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status display */}
        {status && (
          <div className={`p-3 rounded-md flex items-start gap-2 ${status.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            )}
            <div className="text-sm">{status.message}</div>
          </div>
        )}
        
        {/* Phone number input */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="91XXXXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter phone number with country code (e.g., 91XXXXXXXXXX)
          </p>
        </div>
        
        {/* Message input */}
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleCheckStatus}
          disabled={isChecking}
        >
          {isChecking ? 'Checking...' : 'Check Connection'}
        </Button>
        <Button 
          onClick={handleSendMessage}
          disabled={isSending || !phoneNumber || !message}
        >
          {isSending ? 'Sending...' : 'Send Message'}
        </Button>
      </CardFooter>
    </Card>
  );
} 