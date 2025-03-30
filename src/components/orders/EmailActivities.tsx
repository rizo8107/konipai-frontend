import { useState } from 'react';
import { format } from 'date-fns';
import { EmailActivity } from '@/lib/email';
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
import { Mail, Check, AlertTriangle, Eye } from 'lucide-react';

interface EmailActivitiesProps {
  activities: EmailActivity[];
  isLoading?: boolean;
  orderId?: string;
}

// Map template names to more readable display names
const templateDisplayNames: Record<string, string> = {
  order_confirmation: 'Order Confirmation',
  payment_success: 'Payment Success',
  payment_failed: 'Payment Failed',
  order_shipped: 'Order Shipped',
  out_for_delivery: 'Out for Delivery',
  order_delivered: 'Order Delivered',
  request_review: 'Review Request',
  refund_confirmation: 'Refund Confirmation',
  reorder_reminder: 'Reorder Reminder',
  abandoned_cart: 'Abandoned Cart Reminder',
  custom_email: 'Custom Email',
  custom_email_with_attachment: 'Custom Email with Attachment',
};

export function EmailActivities({ activities, isLoading = false, orderId }: EmailActivitiesProps) {
  const [selectedActivity, setSelectedActivity] = useState<EmailActivity | null>(null);
  
  // Filter activities by orderId if provided
  const filteredActivities = orderId
    ? activities.filter(activity => {
        console.log('Filtering activity:', activity);
        console.log('Activity order_id:', activity.order_id);
        console.log('Comparing with orderId:', orderId);
        return activity.order_id === orderId;
      })
    : activities;

  console.log('Filtered activities:', filteredActivities);
  console.log('All activities:', activities);

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
        <Mail className="mx-auto h-12 w-12 opacity-20" />
        <p className="mt-2">No email messages found</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableCaption>Email message history</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Subject</TableHead>
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
              <TableCell>{activity.recipient}</TableCell>
              <TableCell className="max-w-[200px] truncate">{activity.subject || 'N/A'}</TableCell>
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
                            {selectedActivity.subject || 
                              (templateDisplayNames[selectedActivity.template_name] || 
                              selectedActivity.template_name)}
                          </span>
                        )}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedActivity && (
                          <span>
                            Sent to {selectedActivity.recipient} on{' '}
                            {formatTimestamp(selectedActivity.timestamp)}
                          </span>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 p-4 bg-muted rounded-md">
                      <h4 className="text-sm font-medium mb-2">Email Content</h4>
                      {selectedActivity && (
                        <div className="text-sm whitespace-pre-wrap overflow-auto max-h-[400px]">
                          {renderEmailContent(selectedActivity.message_content)}
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

// Render email content for display
function renderEmailContent(content: unknown): string | JSX.Element {
  if (content === null || content === undefined) {
    return 'No content';
  }
  
  // If it's a string, it could be HTML content
  if (typeof content === 'string') {
    // Check if it looks like HTML
    if (content.includes('<html>') || content.includes('<body>') || content.includes('<div>')) {
      // Return a sanitized version of the HTML
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    
    // If not HTML, return as plain text
    return content;
  }
  
  // If it's an object, try to format it
  if (typeof content === 'object') {
    try {
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return 'Unable to display content';
    }
  }
  
  // For any other type, convert to string
  return String(content);
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
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
