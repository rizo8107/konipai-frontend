import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { toast } from 'sonner';
import { EmailActivity } from '@/lib/email';
import { Order } from '@/types/schema';

export interface EmailActivityRecord extends EmailActivity {
  id: string;
  created: string;
  updated: string;
  collectionId: string;
  collectionName: string;
  expand?: {
    order_id?: Order;
  };
}

// Define the type for PocketBase list options
interface ListOptions {
  sort?: string;
  expand?: string;
  filter?: string;
}

export function useEmailActivities(orderId?: string) {
  const queryClient = useQueryClient();

  // Ensure email_activities collection exists
  const ensureEmailActivitiesCollection = async () => {
    try {
      await ensureAdminAuth();
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
  };

  // Fetch email activities, filtered by orderId if provided
  const { data, isLoading, error } = useQuery<{ items: EmailActivityRecord[], totalItems: number }>({    
    queryKey: ['email_activities', orderId],
    queryFn: async () => {
      try {
        await ensureAdminAuth();
        await ensureEmailActivitiesCollection();
        console.log('Fetching email activities...');
        
        const options: ListOptions = {
          sort: '-timestamp',
          expand: 'order_id',
        };
        
        // If orderId is provided, filter by it
        if (orderId) {
          options.filter = `order_id = "${orderId}"`;
        }
        
        const records = await pb.collection('email_activities').getList(1, 100, options);
        console.log('Fetched email activities:', records);

        return {
          items: records.items as EmailActivityRecord[],
          totalItems: records.totalItems,
        };
      } catch (error) {
        console.error('Error fetching email activities:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 0, // Don't retry if the collection doesn't exist
  });

  // Create email activity
  const createActivity = useMutation({
    mutationFn: async (data: EmailActivity) => {
      try {
        await ensureAdminAuth();
        await ensureEmailActivitiesCollection();
        const record = await pb.collection('email_activities').create(data);
        return record;
      } catch (error) {
        console.error('Error creating email activity:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_activities', orderId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to log email activity: ' + error.message);
    },
  });

  // Delete email activity
  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      try {
        await ensureAdminAuth();
        await pb.collection('email_activities').delete(id);
      } catch (error) {
        console.error('Error deleting email activity:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_activities', orderId] });
      toast.success('Email activity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete email activity: ' + error.message);
    },
  });

  return {
    activities: data?.items || [],
    totalActivities: data?.totalItems || 0,
    isLoading,
    error,
    createActivity,
    deleteActivity,
  };
}
