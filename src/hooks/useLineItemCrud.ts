import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LineItem {
  id: string;
  description: string;
  item_type: string;
  billed_at: string | null;
  unit_rate: number;
  quantity: number | null;
  line_total: number | null;
  details: string | null;
  act_reference: string | null;
  opportunity_id: string;
}

interface UpdateLineItemParams {
  itemId: string;
  opportunityId: string;
  updates: {
    description?: string;
    billed_at?: string | null;
    unit_rate?: number;
  };
}

interface DeleteLineItemParams {
  itemId: string;
  opportunityId: string;
  actReference?: string | null;
}

/**
 * Enhanced CRUD hook for line items with Act! CRM integration
 * Extends the basic useLineItems hook with update and delete operations
 */
export const useLineItemCrud = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /**
   * Update a line item with Act! API sync
   */
  const updateLineItemMutation = useMutation({
    mutationFn: async ({ itemId, opportunityId, updates }: UpdateLineItemParams) => {
      // First, get the current item and its Act! opportunity ID
      const { data: currentItem, error: fetchError } = await supabase
        .from('invoice_line_items')
        .select('act_reference, opportunity_id, details, unit_rate')
        .eq('id', itemId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current item: ${fetchError.message}`);
      }

      // Get the Act! opportunity ID separately
      let actOpportunityId = opportunityId;
      if (currentItem.act_reference) {
        const { data: opportunityData, error: oppError } = await supabase
          .from('opportunities')
          .select('act_opportunity_id')
          .eq('id', currentItem.opportunity_id)
          .single();
        
        if (oppError) {
          console.warn('Could not fetch Act! opportunity ID:', oppError);
        } else {
          actOpportunityId = opportunityData.act_opportunity_id || opportunityId;
        }
      }

      // Update the database record
      const { error: updateError } = await supabase
        .from('invoice_line_items')
        .update(updates)
        .eq('id', itemId);

      if (updateError) {
        throw new Error(`Failed to update line item: ${updateError.message}`);
      }

      // If item has Act! reference, sync with Act! CRM
      let actSyncResult = null;
      if (currentItem.act_reference) {
        try {
          // Prepare Act! product update data - Act! requires ALL fields to prevent auto-calculations
          const finalPrice = updates.unit_rate !== undefined ? Number(updates.unit_rate) : Number(currentItem.unit_rate);
          
          const actProductData: Record<string, string | number> = {
            // REQUIRED: Act! requires the product id in the body even though it's in the URL
            id: currentItem.act_reference,
            // REQUIRED: Prevent Act! from adding 100% discount by explicitly setting these fields
            discount: 0.0,
            discountPrice: finalPrice
            // NOTE: Don't send "total" - let Act! calculate it
          };
          
          if (updates.description !== undefined) {
            actProductData.name = String(updates.description); // Ensure string
          }
          if (updates.unit_rate !== undefined) {
            actProductData.price = finalPrice; // Ensure number
          }
          if (updates.billed_at !== undefined) {
            // Act! expects itemNumber as a string - convert date to string or use empty string
            actProductData.itemNumber = updates.billed_at ? String(updates.billed_at) : '';
          }
          
          // Act! requires type field
          if (currentItem.details) {
            actProductData.type = currentItem.details === 'retainer' ? 'Retainer' : 'Deliverable';
          }

          console.log('Act! API call data:', {
            action: 'updateProduct',
            opportunityId: actOpportunityId,
            productId: currentItem.act_reference,
            productData: actProductData
          });

          // Act! API quirk: Need to call PUT twice with delay for pricing to work correctly
          console.log('Making first Act! PUT call...');
          const { data: firstSyncResponse, error: firstSyncError } = await supabase.functions.invoke(
            'act-sync', 
            {
              body: {
                user_id: user?.id,
                action: 'updateProduct',
                opportunityId: actOpportunityId,
                productId: currentItem.act_reference,
                productData: actProductData
              }
            }
          );

          if (firstSyncError) {
            console.warn('First Act! sync failed:', firstSyncError);
            // Still continue to second call in case it helps
          }

          // Wait 2 seconds for Act!'s internal calculations to settle
          console.log('Waiting 2 seconds for Act! calculations to settle...');
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Make the second PUT call with the same data
          console.log('Making second Act! PUT call...');
          const { data: syncResponse, error: syncError } = await supabase.functions.invoke(
            'act-sync', 
            {
              body: {
                user_id: user?.id,
                action: 'updateProduct',
                opportunityId: actOpportunityId,
                productId: currentItem.act_reference,
                productData: actProductData
              }
            }
          );

          if (syncError) {
            console.warn('Act! sync failed, but database update succeeded:', syncError);
            // Don't fail the entire operation if Act! sync fails
          } else {
            actSyncResult = syncResponse;
            console.log('Successfully synced line item update to Act!');
          }
        } catch (syncError) {
          console.warn('Act! sync encountered an error:', syncError);
          // Log but don't fail the operation
        }
      }

      return { 
        itemId, 
        updates, 
        actSyncResult,
        actSynced: !!actSyncResult 
      };
    },
    onMutate: async ({ itemId, opportunityId, updates }) => {
      const queryKey = ['lineItems', opportunityId];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Get current data
      const previousData = queryClient.getQueryData<LineItem[]>(queryKey);

      // Optimistically update
      if (previousData) {
        const updatedItems = previousData.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        );
        queryClient.setQueryData(queryKey, updatedItems);
      }

      // Return context for rollback
      return { previousData, queryKey };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      console.error('Error updating line item:', error);
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure we have latest data
      const queryKey = ['lineItems', variables.opportunityId];
      queryClient.invalidateQueries({ queryKey });
      
      console.log(`Line item ${data.itemId} updated successfully. Act! synced: ${data.actSynced}`);
    },
  });

  /**
   * Soft delete a line item with Act! API sync
   */
  const deleteLineItemMutation = useMutation({
    mutationFn: async ({ itemId, opportunityId, actReference }: DeleteLineItemParams) => {
      // First, get the Act! opportunity ID if we need to sync
      let actOpportunityId = opportunityId;
      if (actReference) {
        const { data: opportunityData, error: oppError } = await supabase
          .from('opportunities')
          .select('act_opportunity_id')
          .eq('id', opportunityId)
          .single();
        
        if (oppError) {
          console.warn('Could not fetch Act! opportunity ID:', oppError);
        } else {
          actOpportunityId = opportunityData.act_opportunity_id || opportunityId;
        }
      }

      // Soft delete by setting act_deleted_at timestamp
      const deletedAt = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('invoice_line_items')
        .update({ act_deleted_at: deletedAt })
        .eq('id', itemId);

      if (updateError) {
        throw new Error(`Failed to soft delete line item: ${updateError.message}`);
      }

      // If item has Act! reference, delete from Act! CRM
      let actSyncResult = null;
      if (actReference) {
        try {
          console.log('Act! API call data:', {
            action: 'deleteProduct',
            opportunityId: actOpportunityId,
            productId: actReference
          });

          // Call Act! delete endpoint with user_id and Act! opportunity ID
          const { data: syncResponse, error: syncError } = await supabase.functions.invoke(
            'act-sync',
            {
              body: {
                user_id: user?.id,
                action: 'deleteProduct',
                opportunityId: actOpportunityId,
                productId: actReference
              }
            }
          );

          if (syncError) {
            console.warn('Act! delete failed, but soft delete succeeded:', syncError);
            // Don't fail the entire operation if Act! delete fails
          } else {
            actSyncResult = syncResponse;
            console.log('Successfully deleted line item from Act!');
          }
        } catch (syncError) {
          console.warn('Act! delete encountered an error:', syncError);
          // Log but don't fail the operation
        }
      }

      return { 
        itemId, 
        deletedAt, 
        actSyncResult,
        actSynced: !!actSyncResult 
      };
    },
    onMutate: async ({ itemId, opportunityId }) => {
      const queryKey = ['lineItems', opportunityId];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Get current data
      const previousData = queryClient.getQueryData<LineItem[]>(queryKey);

      // Optimistically remove the item
      if (previousData) {
        const filteredItems = previousData.filter(item => item.id !== itemId);
        queryClient.setQueryData(queryKey, filteredItems);
      }

      // Return context for rollback
      return { previousData, queryKey };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
      console.error('Error deleting line item:', error);
    },
    onSuccess: (data, variables) => {
      // Invalidate to ensure we have latest data
      const queryKey = ['lineItems', variables.opportunityId];
      queryClient.invalidateQueries({ queryKey });
      
      console.log(`Line item ${data.itemId} deleted successfully. Act! synced: ${data.actSynced}`);
    },
  });

  // Helper function to get user-friendly error message
  const getUserFriendlyError = (error: unknown): string => {
    if (!error) return '';
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle common error patterns
    if (errorMessage.includes('Failed to fetch')) {
      return 'Unable to connect to Act! CRM. Please check your connection.';
    }
    if (errorMessage.includes('401')) {
      return 'Authentication failed. Please check your Act! credentials.';
    }
    if (errorMessage.includes('404')) {
      return 'Item not found in Act! CRM. It may have already been deleted.';
    }
    if (errorMessage.includes('500')) {
      return 'Act! CRM server error. Please try again later.';
    }
    if (errorMessage.includes('Rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    // Return a generic friendly message for other errors
    return 'Operation failed. Please try again or contact support if the problem persists.';
  };

  return {
    updateLineItem: updateLineItemMutation.mutate,
    deleteLineItem: deleteLineItemMutation.mutate,
    isUpdating: updateLineItemMutation.isPending,
    isDeleting: deleteLineItemMutation.isPending,
    updateError: updateLineItemMutation.error,
    deleteError: deleteLineItemMutation.error,
    // User-friendly error messages
    updateErrorMessage: getUserFriendlyError(updateLineItemMutation.error),
    deleteErrorMessage: getUserFriendlyError(deleteLineItemMutation.error),
    // Success states
    isUpdateSuccess: updateLineItemMutation.isSuccess,
    isDeleteSuccess: deleteLineItemMutation.isSuccess,
  };
};