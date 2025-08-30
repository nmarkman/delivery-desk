import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLineItems } from '@/hooks/useLineItems';

interface LineItemsTestPanelProps {
  opportunityId: string;
}

/**
 * Test component for verifying optimistic updates and Act! API integration
 * This component helps test:
 * 1. Optimistic updates work correctly
 * 2. Error handling and rollback
 * 3. Act! API sync functionality (when implemented)
 * 4. Loading states and user feedback
 */
export default function LineItemsTestPanel({ opportunityId }: LineItemsTestPanelProps) {
  const { lineItems, isLoading, updateDueDate, isUpdating, error } = useLineItems(opportunityId);
  
  // Act! sync is not yet implemented
  const isSyncing = false;

  const testOptimisticUpdate = (itemId: string) => {
    // Test optimistic update with a future date
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 30);
    const dateString = testDate.toISOString().split('T')[0];

    updateDueDate({
      itemId,
      billed_at: dateString,
      opportunityId,
    });
  };

  const testActSync = () => {
    // Act! API sync is not yet implemented
    console.log('Act! sync feature coming soon');
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm">Line Items Test Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading line items...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="text-sm text-red-600">Test Panel - Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">Error: {error.message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-blue-200">
      <CardHeader>
        <CardTitle className="text-sm text-blue-600">Line Items Test Panel</CardTitle>
        <div className="text-xs text-muted-foreground">
          Test optimistic updates and Act! API integration
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lineItems.map((item) => (
            <div key={item.id} className="border rounded p-2 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm font-medium truncate">{item.description}</div>
                  <div className="text-xs text-gray-500">
                    Current due date: {item.billed_at || 'Not set'}
                  </div>
                </div>
                {item.details && (
                  <Badge variant="outline" className="text-xs">
                    {item.details}
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => testOptimisticUpdate(item.id)}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Test Update'}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={testActSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Syncing...' : 'Test Act! Sync'}
                </Button>
              </div>
            </div>
          ))}
          
          {lineItems.length === 0 && (
            <div className="text-sm text-muted-foreground">No line items found</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}