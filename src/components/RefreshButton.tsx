import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useActConnection } from '@/hooks/useActConnection';
import { useToast } from '@/hooks/use-toast';

interface RefreshButtonProps {
  onSyncComplete?: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function RefreshButton({ 
  onSyncComplete, 
  variant = 'secondary',
  size = 'default',
  className = ''
}: RefreshButtonProps) {
  const { triggerSync, isLoading, connectionStatus, loadConnectionStatus } = useActConnection();
  const { toast } = useToast();

  // Load connection status on component mount
  useEffect(() => {
    loadConnectionStatus();
  }, [loadConnectionStatus]);

  const handleSync = async () => {
    if (connectionStatus.status !== 'connected') {
      toast({
        title: "Connection Required",
        description: "Please configure and test your Act! CRM connection first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await triggerSync('sync'); // Full sync (opportunities and products)
      
      toast({
        title: "Sync Completed",
        description: "ACT! data has been successfully synchronized.",
      });
      
      // Call the callback to refresh dashboard data
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      // Error handling is already done in the hook with toast notification
      console.error('Sync failed:', error);
    }
  };

  return (
    <Button 
      onClick={handleSync}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:ring-4 hover:ring-purple-300 hover:ring-opacity-80 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Act!
        </>
      )}
    </Button>
  );
}
