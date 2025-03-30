import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send } from 'lucide-react';
import { PocketBaseService } from '@/lib/pocketbase';
import { sendFeedbackRequestViaWhatsApp } from '@/lib/feedback';

interface SendFeedbackRequestProps {
  orderId: string;
  customerName: string;
  customerPhone: string;
  productId: string;
  productName: string;
}

const SendFeedbackRequest: React.FC<SendFeedbackRequestProps> = ({
  orderId,
  customerName,
  customerPhone,
  productId,
  productName,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendFeedbackRequest = async () => {
    if (loading || sent) return;
    
    setLoading(true);
    try {
      // Send the feedback request via WhatsApp
      const success = await sendFeedbackRequestViaWhatsApp(
        { id: orderId, productId, productName }, 
        { id: customerPhone, name: customerName, phone: customerPhone }
      );
      
      if (success) {
        // Mark as sent in the order record
        const pb = new PocketBaseService();
        await pb.update('orders', orderId, {
          feedback_request_sent: true,
          feedback_request_sent_at: new Date().toISOString(),
        });
        
        // Show success message
        toast({
          title: 'Feedback request sent',
          description: `WhatsApp message sent to ${customerName}`,
          variant: 'default',
        });
        
        setSent(true);
      } else {
        throw new Error('Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('Error sending feedback request:', error);
      
      // Show error message
      toast({
        title: 'Error sending feedback request',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={sent ? "default" : "outline"}
      onClick={handleSendFeedbackRequest}
      disabled={loading || sent}
      className={sent ? "bg-green-600 hover:bg-green-700" : ""}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : sent ? (
        <>
          <span className="mr-2">✓</span>
          Feedback Request Sent
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          Send Feedback Request
        </>
      )}
    </Button>
  );
};

export default SendFeedbackRequest; 