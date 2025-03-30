import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { toast } from '@/components/ui/use-toast';
import { ListResult, RecordModel } from 'pocketbase';

// Generic type for collection items
export type BaseRecord = RecordModel & {
  [key: string]: unknown;
};

// Response type for collection list
export type ListResponse<T> = {
  items: T[];
  totalItems: number;
  totalPages: number;
  page: number;
};

// Hook for fetching data from any collection
export function useCollectionData<T extends BaseRecord>(
  collectionName: string,
  options = {
    page: 1,
    perPage: 50,
    sort: '-created',
    filter: '',
    expand: '',
  }
) {
  return useQuery<ListResponse<T>>({
    queryKey: ['collection', collectionName, options],
    queryFn: async () => {
      try {
        const records = await pb.collection(collectionName).getList<T>(
          options.page,
          options.perPage,
          {
            sort: options.sort,
            filter: options.filter,
            expand: options.expand,
          }
        );
        return {
          items: records.items,
          totalItems: records.totalItems,
          totalPages: records.totalPages,
          page: records.page
        };
      } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        throw error;
      }
    },
  });
}

// Hook for fetching a single item from any collection
export function useCollectionItem<T extends BaseRecord>(
  collectionName: string,
  id: string,
  options = { expand: '' }
) {
  return useQuery<T>({
    queryKey: ['collection', collectionName, id],
    queryFn: async () => {
      try {
        const record = await pb.collection(collectionName).getOne<T>(id, {
          expand: options.expand,
        });
        return record;
      } catch (error) {
        console.error(`Error fetching ${collectionName} item ${id}:`, error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

// Hook for creating a new item in any collection
export function useCreateItem<T extends BaseRecord>(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation<T, Error, Omit<T, keyof BaseRecord>>({
    mutationFn: async (data) => {
      try {
        const record = await pb.collection(collectionName).create<T>(data);
        return record;
      } catch (error) {
        console.error(`Error creating ${collectionName} item:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', collectionName] });
      toast({
        title: 'Success',
        description: 'Item created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for updating an item in any collection
export function useUpdateItem<T extends BaseRecord>(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation<T, Error, { id: string; data: Partial<Omit<T, keyof BaseRecord>> }>({
    mutationFn: async ({ id, data }) => {
      try {
        const record = await pb.collection(collectionName).update<T>(id, data);
        return record;
      } catch (error) {
        console.error(`Error updating ${collectionName} item ${id}:`, error);
        throw error;
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ['collection', collectionName, id],
      });
      queryClient.invalidateQueries({
        queryKey: ['collection', collectionName],
      });
      toast({
        title: 'Success',
        description: 'Item updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for deleting an item from any collection
export function useDeleteItem(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      try {
        await pb.collection(collectionName).delete(id);
      } catch (error) {
        console.error(`Error deleting ${collectionName} item ${id}:`, error);
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ['collection', collectionName],
      });
      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
