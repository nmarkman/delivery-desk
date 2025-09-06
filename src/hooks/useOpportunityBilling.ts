import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BillingInfo {
  id?: string;
  opportunity_id: string;
  organization_name: string;
  organization_address: string;
  organization_contact_name: string;
  organization_contact_email: string;
  bill_to_name: string;
  bill_to_address: string;
  bill_to_contact_name: string;
  bill_to_contact_email: string;
  payment_terms: number;
  po_number: string;
  custom_school_code?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface CreateBillingInfoParams {
  billingInfo: Omit<BillingInfo, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
}

interface UpdateBillingInfoParams {
  id: string;
  billingInfo: Partial<Omit<BillingInfo, 'id' | 'opportunity_id' | 'created_at' | 'updated_at' | 'user_id'>>;
}

export const useOpportunityBilling = (opportunityId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['opportunityBilling', opportunityId];

  // Query to fetch billing information
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<BillingInfo | null> => {
      const { data, error } = await supabase
        .from('opportunity_billing_info')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .single();

      if (error) {
        // If no billing info exists, return null (not an error)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch billing information: ${error.message}`);
      }

      return data;
    },
    enabled: !!opportunityId,
  });

  // Mutation to create billing information
  const createBillingInfoMutation = useMutation({
    mutationFn: async ({ billingInfo }: CreateBillingInfoParams) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User authentication required');
      }

      const { data, error } = await supabase
        .from('opportunity_billing_info')
        .insert({
          ...billingInfo,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create billing information: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Update the cache with the new billing info
      queryClient.setQueryData(queryKey, data);
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Error creating billing information:', error);
    },
  });

  // Mutation to update billing information
  const updateBillingInfoMutation = useMutation({
    mutationFn: async ({ id, billingInfo }: UpdateBillingInfoParams) => {
      const { data, error } = await supabase
        .from('opportunity_billing_info')
        .update({
          ...billingInfo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update billing information: ${error.message}`);
      }

      return data;
    },
    onMutate: async ({ id, billingInfo }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Get current data
      const previousData = queryClient.getQueryData<BillingInfo | null>(queryKey);

      // Optimistically update
      if (previousData) {
        const updatedData = { ...previousData, ...billingInfo };
        queryClient.setQueryData(queryKey, updatedData);
      }

      // Return context for rollback
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      console.error('Error updating billing information:', error);
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData(queryKey, data);
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Mutation to delete billing information
  const deleteBillingInfoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opportunity_billing_info')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete billing information: ${error.message}`);
      }

      return { id };
    },
    onSuccess: () => {
      // Clear the cache
      queryClient.setQueryData(queryKey, null);
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Error deleting billing information:', error);
    },
  });

  // Helper function to save billing info (create or update)
  const saveBillingInfo = (billingInfo: BillingInfo) => {
    if (billingInfo.id) {
      // Update existing
      const { id, ...updateData } = billingInfo;
      updateBillingInfoMutation.mutate({ id, billingInfo: updateData });
    } else {
      // Create new
      const { id, created_at, updated_at, user_id, ...createData } = billingInfo;
      createBillingInfoMutation.mutate({ billingInfo: createData });
    }
  };

  // Async version for promise-based handling
  const saveBillingInfoAsync = async (billingInfo: BillingInfo) => {
    if (billingInfo.id) {
      // Update existing
      const { id, ...updateData } = billingInfo;
      return updateBillingInfoMutation.mutateAsync({ id, billingInfo: updateData });
    } else {
      // Create new
      const { id, created_at, updated_at, user_id, ...createData } = billingInfo;
      return createBillingInfoMutation.mutateAsync({ billingInfo: createData });
    }
  };

  return {
    // Data
    billingInfo: query.data,
    isLoading: query.isLoading,
    error: query.error,
    
    // Mutations
    createBillingInfo: createBillingInfoMutation.mutate,
    updateBillingInfo: updateBillingInfoMutation.mutate,
    deleteBillingInfo: deleteBillingInfoMutation.mutate,
    saveBillingInfo,
    saveBillingInfoAsync,
    
    // Loading states
    isCreating: createBillingInfoMutation.isPending,
    isUpdating: updateBillingInfoMutation.isPending,
    isDeleting: deleteBillingInfoMutation.isPending,
    isSaving: createBillingInfoMutation.isPending || updateBillingInfoMutation.isPending,
    
    // Utility
    refetch: query.refetch,
    hasBillingInfo: !!query.data,
  };
};