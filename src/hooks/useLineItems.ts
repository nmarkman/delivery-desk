import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLineItemCrud } from './useLineItemCrud';

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
  invoice_number: string | null;
  invoice_status?: 'draft' | 'sent' | 'paid' | 'overdue' | null;
}

interface UpdateLineItemDueDateParams {
  itemId: string;
  billed_at: string | null;
  opportunityId: string;
}

const sortLineItems = (items: LineItem[]): LineItem[] => {
  return items.sort((a, b) => {
    // Nulls go first
    if (!a.billed_at && !b.billed_at) return 0;
    if (!a.billed_at) return -1;
    if (!b.billed_at) return 1;
    
    // Then sort by date ascending
    return new Date(a.billed_at + 'T00:00:00').getTime() - new Date(b.billed_at + 'T00:00:00').getTime();
  });
};

export const useLineItems = (opportunityId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['lineItems', opportunityId];
  const { 
    updateLineItem, 
    deleteLineItem, 
    isUpdating: isCrudUpdating, 
    isDeleting,
    updateError,
    deleteError,
    updateErrorMessage,
    deleteErrorMessage,
    isUpdateSuccess,
    isDeleteSuccess
  } = useLineItemCrud();

  // Query to fetch line items
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('id, description, item_type, billed_at, unit_rate, quantity, line_total, details, act_reference, invoice_number, invoice_status')
        .eq('opportunity_id', opportunityId)
        .is('act_deleted_at', null)
        .order('line_number', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch line items: ${error.message}`);
      }

      return sortLineItems(data || []);
    },
    enabled: !!opportunityId,
  });

  // Mutation to update due date with optimistic updates
  const updateDueDateMutation = useMutation({
    mutationFn: async ({ itemId, billed_at }: UpdateLineItemDueDateParams) => {
      const { error } = await supabase
        .from('invoice_line_items')
        .update({ billed_at })
        .eq('id', itemId);

      if (error) {
        throw new Error(`Failed to update due date: ${error.message}`);
      }

      return { itemId, billed_at };
    },
    onMutate: async ({ itemId, billed_at }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Get current data
      const previousData = queryClient.getQueryData<LineItem[]>(queryKey);

      // Optimistically update
      if (previousData) {
        const updatedItems = previousData.map(item =>
          item.id === itemId ? { ...item, billed_at } : item
        );
        queryClient.setQueryData(queryKey, sortLineItems(updatedItems));
      }

      // Return context for rollback
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      console.error('Error updating due date:', error);
    },
    onSuccess: () => {
      // Invalidate to ensure we have latest data
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Enhanced line item update with Act! sync
  const updateLineItemWithActSync = (itemId: string, updates: { description?: string; billed_at?: string | null; unit_rate?: number }) => {
    updateLineItem({
      itemId,
      opportunityId,
      updates
    });
  };

  // Enhanced line item delete with Act! sync
  const deleteLineItemWithActSync = (itemId: string, actReference?: string | null) => {
    deleteLineItem({
      itemId,
      opportunityId,
      actReference
    });
  };

  return {
    lineItems: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    updateDueDate: updateDueDateMutation.mutate,
    isUpdating: updateDueDateMutation.isPending || isCrudUpdating,
    isDeleting,
    // New enhanced methods with Act! sync
    updateLineItem: updateLineItemWithActSync,
    deleteLineItem: deleteLineItemWithActSync,
    // Enhanced error states
    updateError: updateError,
    deleteError: deleteError,
    dueDateUpdateError: updateDueDateMutation.error,
    // User-friendly error messages
    updateErrorMessage,
    deleteErrorMessage,
    // Success states
    isUpdateSuccess,
    isDeleteSuccess,
    // Combined error state for convenience
    hasError: !!(query.error || updateError || deleteError || updateDueDateMutation.error),
    refetch: query.refetch,
  };
};