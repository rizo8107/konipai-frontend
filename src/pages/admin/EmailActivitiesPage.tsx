import React, { useState } from 'react';
import { useEmailActivities } from '@/hooks/useEmailActivities';
import { EmailActivities } from '@/components/orders/EmailActivities';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmailTemplate } from '@/lib/email';
import { Mail, Search, Filter, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AdminLayout } from '@/components/layout/AdminLayout';

export default function EmailActivitiesPage() {
  const { activities, isLoading, totalActivities, error } = useEmailActivities();
  const [searchTerm, setSearchTerm] = useState('');
  const [templateFilter, setTemplateFilter] = useState('all');
  
  // Filter activities based on search term and template filter
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = searchTerm === '' || 
      activity.recipient.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (activity.expand?.order_id?.customer_name && 
        activity.expand.order_id.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTemplate = templateFilter === 'all' || activity.template_name === templateFilter;
    
    return matchesSearch && matchesTemplate;
  });

  // Get unique template names from activities for the dropdown
  const uniqueTemplates = [...new Set(activities.map(a => a.template_name))];

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          heading="Email Communications"
          subheading="View and manage all email messages sent to customers"
          icon={<Mail className="h-6 w-6" />}
        />
        
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Collection Not Found</AlertTitle>
            <AlertDescription>
              <p>The Email activities collection doesn't exist in PocketBase yet.</p>
              <p className="mt-2">You can initialize the email system by running <code>npm run reset:email-templates</code></p>
              <p className="mt-4 text-sm">Error details: {error.message || 'Unknown error'}</p>
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Email Activity Log</CardTitle>
              <CardDescription>
                Total emails: {totalActivities}
              </CardDescription>
              
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email address or customer name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <div className="w-full md:w-64">
                  <Select value={templateFilter} onValueChange={setTemplateFilter}>
                    <SelectTrigger>
                      <div className="flex items-center">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by template" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      <SelectItem value="order_confirmation">Order Confirmation</SelectItem>
                      <SelectItem value="payment_success">Payment Success</SelectItem>
                      <SelectItem value="payment_failed">Payment Failed</SelectItem>
                      <SelectItem value="order_shipped">Order Shipped</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="order_delivered">Order Delivered</SelectItem>
                      <SelectItem value="request_review">Request Review</SelectItem>
                      <SelectItem value="refund_confirmation">Refund Confirmation</SelectItem>
                      <SelectItem value="reorder_reminder">Reorder Reminder</SelectItem>
                      <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                      <SelectItem value="custom_email">Custom Email</SelectItem>
                      <SelectItem value="custom_email_with_attachment">Custom Email with Attachment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button variant="outline" onClick={() => {
                  setSearchTerm('');
                  setTemplateFilter('all');
                }}>
                  Reset Filters
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No email activities found
                </div>
              ) : (
                <EmailActivities activities={filteredActivities} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
