import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Database, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SyncTriggerProps {
  onSyncTrigger: (operationType: 'analysis' | 'sync') => Promise<void>;
  isLoading?: boolean;
  lastSyncTime?: string;
  connectionStatus?: 'connected' | 'failed' | 'untested' | 'expired';
}

export function SyncTrigger({ 
  onSyncTrigger, 
  isLoading = false, 
  lastSyncTime,
  connectionStatus = 'untested'
}: SyncTriggerProps) {
  const [operationType, setOperationType] = useState<'analysis' | 'sync'>('analysis');
  const { toast } = useToast();

  const handleSync = async () => {
    if (connectionStatus !== 'connected') {
      toast({
        title: "Connection Required",
        description: "Please configure and test your Act! CRM connection first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSyncTrigger(operationType);
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      connected: { variant: 'default' as const, label: 'Connected', className: 'bg-green-500' },
      failed: { variant: 'destructive' as const, label: 'Failed', className: '' },
      untested: { variant: 'secondary' as const, label: 'Untested', className: '' },
      expired: { variant: 'outline' as const, label: 'Expired', className: 'border-orange-500' }
    };
    
    const config = statusConfig[connectionStatus];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getOperationDescription = () => {
    if (operationType === 'analysis') {
      return "Fetch and analyze data structure without saving to database";
    }
    return "Fetch data and save opportunities/deliverables to database";
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Act! CRM Sync
        </CardTitle>
        <CardDescription>
          Trigger manual synchronization with your Act! CRM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status:</span>
          {getStatusBadge()}
        </div>

        {/* Last Sync Time */}
        {lastSyncTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Sync:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(lastSyncTime).toLocaleString()}
            </span>
          </div>
        )}

        {/* Operation Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Operation Type:</label>
          <Select value={operationType} onValueChange={(value: 'analysis' | 'sync') => setOperationType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="analysis">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <div>
                    <div>Analysis Mode</div>
                    <div className="text-xs text-muted-foreground">View data without saving</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="sync">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <div>
                    <div>Full Sync</div>
                    <div className="text-xs text-muted-foreground">Save to database</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {getOperationDescription()}
          </p>
        </div>

        {/* Sync Button */}
        <Button 
          onClick={handleSync}
          disabled={isLoading || connectionStatus !== 'connected'}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              {operationType === 'analysis' ? 'Analyze Data' : 'Start Sync'}
            </>
          )}
        </Button>

        {connectionStatus !== 'connected' && (
          <p className="text-xs text-center text-muted-foreground">
            Configure your Act! connection to enable sync
          </p>
        )}
      </CardContent>
    </Card>
  );
} 