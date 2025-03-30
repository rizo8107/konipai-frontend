import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { RazorpayOrder } from '@/types/schema';
import { toast } from 'sonner';

export interface CreateRazorpayOrderData {
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  currency?: string;
  status: string;
  payment_id?: string;
  signature?: string;
}

export interface UpdateRazorpayOrderData extends Partial<CreateRazorpayOrderData> {}

export function useRazorpayOrders() {
  const queryClient = useQueryClient();

  // Fetch all razorpay orders
  const { data, isLoading, error } = useQuery<{ items: RazorpayOrder[], totalItems: number }>({
    queryKey: ['razorpay_orders'],
    queryFn: async () => {
      try {
        await ensureAdminAuth();
        console.log('Fetching razorpay orders...');
        const records = await pb.collection('razorpay_orders').getList(1, 100, {
          sort: '-created',
          expand: 'order_id',
        });
        console.log('Fetched razorpay orders:', records);
        console.log('Records items:', records.items);
        console.log('Records totalItems:', records.totalItems);

        return {
          items: records.items as RazorpayOrder[],
          totalItems: records.totalItems,
        };
      } catch (error) {
        console.error('Error fetching razorpay orders:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create razorpay order
  const createRazorpayOrder = useMutation({
    mutationFn: async (data: CreateRazorpayOrderData) => {
      try {
        await ensureAdminAuth();
        const record = await pb.collection('razorpay_orders').create(data);
        return record;
      } catch (error) {
        console.error('Error creating razorpay order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['razorpay_orders'] });
      toast.success('Razorpay order created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create razorpay order: ' + error.message);
    },
  });

  // Update razorpay order
  const updateRazorpayOrder = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRazorpayOrderData }) => {
      try {
        await ensureAdminAuth();
        const record = await pb.collection('razorpay_orders').update(id, data);
        return record;
      } catch (error) {
        console.error('Error updating razorpay order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['razorpay_orders'] });
      toast.success('Razorpay order updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update razorpay order: ' + error.message);
    },
  });

  // Delete razorpay order
  const deleteRazorpayOrder = useMutation({
    mutationFn: async (id: string) => {
      try {
        await ensureAdminAuth();
        await pb.collection('razorpay_orders').delete(id);
      } catch (error) {
        console.error('Error deleting razorpay order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['razorpay_orders'] });
      toast.success('Razorpay order deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete razorpay order: ' + error.message);
    },
  });

  return {
    razorpayOrders: data?.items ?? [],
    totalRazorpayOrders: data?.totalItems ?? 0,
    isLoading,
    error,
    createRazorpayOrder,
    updateRazorpayOrder,
    deleteRazorpayOrder,
  };
}
