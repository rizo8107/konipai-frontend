import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { toast } from 'sonner';
import { WhatsAppActivity } from '@/lib/whatsapp';
import { Order } from '@/types/schema';

export interface WhatsAppActivityRecord extends WhatsAppActivity {
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

export function useWhatsAppActivities(orderId?: string) {
  const queryClient = useQueryClient();

  // Fetch WhatsApp activities, filtered by orderId if provided
  const { data, isLoading, error } = useQuery<{ items: WhatsAppActivityRecord[], totalItems: number }>({    
    queryKey: ['whatsapp_activities', orderId],
    queryFn: async () => {
      try {
        await ensureAdminAuth();
        console.log('Fetching WhatsApp activities...');
        
        const options: ListOptions = {
          sort: '-timestamp',
          expand: 'order_id',
        };
        
        // If orderId is provided, filter by it
        if (orderId) {
          options.filter = `order_id = "${orderId}"`;
        }
        
        const records = await pb.collection('whatsapp_activities').getList(1, 100, options);
        console.log('Fetched WhatsApp activities:', records);

        return {
          items: records.items as WhatsAppActivityRecord[],
          totalItems: records.totalItems,
        };
      } catch (error) {
        console.error('Error fetching WhatsApp activities:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 0, // Don't retry if the collection doesn't exist
  });

  // Create WhatsApp activity
  const createActivity = useMutation({
    mutationFn: async (data: WhatsAppActivity) => {
      try {
        await ensureAdminAuth();
        const record = await pb.collection('whatsapp_activities').create(data);
        return record;
      } catch (error) {
        console.error('Error creating WhatsApp activity:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_activities', orderId] });
    },
    onError: (error: Error) => {
      toast.error('Failed to log WhatsApp activity: ' + error.message);
    },
  });

  // Delete WhatsApp activity
  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      try {
        await ensureAdminAuth();
        await pb.collection('whatsapp_activities').delete(id);
      } catch (error) {
        console.error('Error deleting WhatsApp activity:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_activities', orderId] });
      toast.success('WhatsApp activity deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete WhatsApp activity: ' + error.message);
    },
  });

  return {
    activities: data?.items || [],
    totalItems: data?.totalItems || 0,
    isLoading,
    error,
    createActivity,
    deleteActivity,
  };
}
