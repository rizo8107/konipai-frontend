import { useState } from 'react';
import { format } from 'date-fns';
import { WhatsAppActivityRecord } from '@/hooks/useWhatsAppActivities';
import { WhatsAppTemplate } from '@/lib/whatsapp';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Check, AlertTriangle, Eye } from 'lucide-react';

interface WhatsAppActivitiesProps {
  activities: WhatsAppActivityRecord[];
  isLoading?: boolean;
  orderId?: string;
}

// Map template names to more readable display names
const templateDisplayNames: Record<string, string> = {
  [WhatsAppTemplate.ORDER_CONFIRMATION]: 'Order Confirmation',
  [WhatsAppTemplate.PAYMENT_SUCCESS]: 'Payment Success',
  [WhatsAppTemplate.PAYMENT_FAILED]: 'Payment Failed',
  [WhatsAppTemplate.ORDER_SHIPPED]: 'Order Shipped',
  [WhatsAppTemplate.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [WhatsAppTemplate.ORDER_DELIVERED]: 'Order Delivered',
  [WhatsAppTemplate.REQUEST_REVIEW]: 'Review Request',
  [WhatsAppTemplate.REFUND_CONFIRMATION]: 'Refund Confirmation',
  [WhatsAppTemplate.REORDER_REMINDER]: 'Reorder Reminder',
  [WhatsAppTemplate.ABANDONED_CART]: 'Abandoned Cart Reminder',
};

export function WhatsAppActivities({ activities, isLoading = false, orderId }: WhatsAppActivitiesProps) {
  const [selectedActivity, setSelectedActivity] = useState<WhatsAppActivityRecord | null>(null);
  
  // Filter activities by orderId if provided
  const filteredActivities = orderId
    ? activities.filter(activity => activity.order_id === orderId)
    : activities;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (filteredActivities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="mx-auto h-12 w-12 opacity-20" />
        <p className="mt-2">No WhatsApp messages found</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableCaption>WhatsApp message history</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredActivities.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell>
                {formatTimestamp(activity.timestamp)}
              </TableCell>
              <TableCell>
                {templateDisplayNames[activity.template_name] || activity.template_name}
              </TableCell>
              <TableCell>{formatPhoneNumber(activity.recipient)}</TableCell>
              <TableCell>
                <StatusBadge status={activity.status} />
              </TableCell>
              <TableCell className="text-right">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedActivity && (
                          <span>
                            {templateDisplayNames[selectedActivity.template_name] || 
                              selectedActivity.template_name}
                          </span>
                        )}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedActivity && (
                          <span>
                            Sent to {formatPhoneNumber(selectedActivity.recipient)} on{' '}
                            {formatTimestamp(selectedActivity.timestamp)}
                          </span>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 p-4 bg-muted rounded-md">
                      <h4 className="text-sm font-medium mb-2">Message Content</h4>
                      {selectedActivity && (
                        <div className="text-sm whitespace-pre-wrap overflow-auto max-h-[400px]">
                          {renderMessageContent(selectedActivity.message_content)}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Format timestamp safely
function formatTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return 'N/A';
  
  try {
    const date = new Date(timestamp);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
}

// Format phone number for display
function formatPhoneNumber(phone: string): string {
  // Check if it's already formatted
  if (phone.includes(' ') || phone.includes('-') || phone.includes('(')) {
    return phone;
  }
  
  // Simple formatting for Indian numbers
  if (phone.startsWith('91') && phone.length >= 12) {
    return `+${phone.substring(0, 2)} ${phone.substring(2, 7)} ${phone.substring(7)}`;
  }
  
  // Default formatting
  return phone.replace(/\B(?=(\d{4})+(?!\d))/g, ' ');
}

// Render message content for display - format as readable text instead of JSON
function renderMessageContent(content: unknown): string {
  if (content === null || content === undefined) {
    return 'No content';
  }
  
  // If it's already a string, try to parse it as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      
      // Format the message in a readable way
      let formattedMessage = '';
      
      // Handle message text - this is the most important part
      if (parsed.message) {
        formattedMessage += parsed.message;
      } else if (parsed.messageText) {
        formattedMessage += parsed.messageText;
      }
      
      // Add response status if available
      if (parsed.response?.success || parsed.responseStatus) {
        const status = parsed.response?.success || parsed.responseStatus === 'success' ? 'Delivered' : 'Failed';
        formattedMessage += `\n\nStatus: ${status}`;
      }
      
      // Add error message if present
      if (parsed.errorMessage) {
        formattedMessage += `\n\nError: ${parsed.errorMessage}`;
      }
      
      return formattedMessage || JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If not valid JSON, return as is
      return content;
    }
  }
  
  // If it's an object, try to format it
  if (typeof content === 'object') {
    try {
      const obj = content as Record<string, unknown>;
      let formattedMessage = '';
      
      // Handle message text
      if (typeof obj.message === 'string') {
        formattedMessage += obj.message;
      } else if (typeof obj.messageText === 'string') {
        formattedMessage += obj.messageText;
      }
      
      // Add response status if available
      const response = obj.response as Record<string, unknown> | undefined;
      if (response?.success || obj.responseStatus) {
        const status = response?.success || obj.responseStatus === 'success' ? 'Delivered' : 'Failed';
        formattedMessage += `\n\nStatus: ${status}`;
      }
      
      // Add error message if present
      if (typeof obj.errorMessage === 'string') {
        formattedMessage += `\n\nError: ${obj.errorMessage}`;
      }
      
      return formattedMessage || JSON.stringify(obj, null, 2);
    } catch (e) {
      return JSON.stringify(content, null, 2);
    }
  }
  
  // For any other type, convert to string
  return String(content);
}

// Status badge component
function StatusBadge({ status }: { status: 'sent' | 'failed' }) {
  if (status === 'sent') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <Check className="h-3 w-3 mr-1" />
        Sent
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Failed
    </Badge>
  );
}
