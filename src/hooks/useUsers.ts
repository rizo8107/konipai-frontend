import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { User } from '@/types/schema';
import { toast } from 'sonner';

export interface CreateUserData {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  emailVisibility?: boolean;
  verified?: boolean;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  oldPassword?: string;
}

export function useUsers() {
  const queryClient = useQueryClient();

  // Fetch all users
  const { data, isLoading, error } = useQuery<{ items: User[], totalItems: number }>({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        // Ensure admin authentication
        await ensureAdminAuth();

        // Use admin API to get all users
        console.log('Fetching users...');
        const records = await pb.collection('users').getList(1, 100, {
          sort: '-created',
          filter: '',
        });
        console.log('Fetched users:', records);

        return {
          items: records.items as User[],
          totalItems: records.totalItems,
        };
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create user
  const createUser = useMutation({
    mutationFn: async (data: CreateUserData) => {
      try {
        // Ensure admin authentication
        await ensureAdminAuth();

        const record = await pb.collection('users').create({
          ...data,
          verified: data.verified ?? false,
          emailVisibility: data.emailVisibility ?? true,
        });

        if (data.verified) {
          await pb.collection('users').confirmVerification(record.id);
        }
        return record;
      } catch (error) {
        console.error('Error creating user:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create user: ' + error.message);
    },
  });

  // Update user
  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      try {
        // Ensure admin authentication
        await ensureAdminAuth();

        const record = await pb.collection('users').update(id, data);
        return record;
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update user: ' + error.message);
    },
  });

  // Delete user
  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      try {
        // Ensure admin authentication
        await ensureAdminAuth();

        await pb.collection('users').delete(id);
      } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete user: ' + error.message);
    },
  });

  return {
    users: data?.items ?? [],
    totalUsers: data?.totalItems ?? 0,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
  };
}
