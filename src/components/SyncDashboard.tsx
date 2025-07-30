import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Settings, BarChart3, History, AlertCircle } from 'lucide-react';
import { ActConnectionForm } from './ActConnectionForm';
import { SyncTrigger } from './SyncTrigger';
import { SyncResultsDisplay } from './SyncResultsDisplay';
import { useActConnection } from '@/hooks/useActConnection';

interface SyncHistoryItem {
  id: string;
  operation_type: string;
  operation_status: string;
  created_at: string;
  records_processed: number;
  response_time_ms: number;
  user_id: string;
}

export function SyncDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [syncResults, setSyncResults] = useState<any>(null);
  const [operationType, setOperationType] = useState<'analysis' | 'sync'>('analysis');
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);

  const { 
    isLoading, 
    connectionStatus, 
    loadConnectionStatus, 
    triggerSync,
    loadSyncHistory: loadSyncHistoryFromHook
  } = useActConnection();

  useEffect(() => {
    loadConnectionStatus();
    loadSyncHistory();
  }, [loadConnectionStatus]);

  const loadSyncHistory = async () => {
    try {
      const logs = await loadSyncHistoryFromHook();
      setSyncHistory(logs);
    } catch (error) {
      console.error('Failed to load sync history:', error);
      setSyncHistory([]);
    }
  };

  const handleSyncTrigger = async (opType: 'analysis' | 'sync') => {
    setOperationType(opType);
    setSyncResults(null);
    
    try {
      const results = await triggerSync(opType);
      setSyncResults(results);
      setActiveTab('results');
      
      // Refresh sync history after successful sync
      if (results) {
        loadSyncHistory();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleConnectionSaved = () => {
    loadConnectionStatus();
    setActiveTab('overview');
  };

  const getStatusBadge = () => {
    const statusConfig = {
      connected: { variant: 'default' as const, label: 'Connected', className: 'bg-green-500' },
      failed: { variant: 'destructive' as const, label: 'Failed', className: '' },
      untested: { variant: 'secondary' as const, label: 'Not Configured', className: '' },
      expired: { variant: 'outline' as const, label: 'Expired', className: 'border-orange-500' }
    };
    
    return statusConfig[connectionStatus.status] || statusConfig.untested;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Recently';
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Act! CRM Sync</h1>
        <p className="text-muted-foreground">
          Manage your Act! CRM integration and synchronize data
        </p>
      </div>

      {/* Connection Status Alert */}
      {connectionStatus.status !== 'connected' && (
        <Alert variant={connectionStatus.status === 'failed' ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connectionStatus.status === 'untested' 
              ? 'No Act! CRM connection configured. Please set up your connection to begin syncing.'
              : connectionStatus.error || 'Connection issue detected. Please check your configuration.'
            }
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Connection
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Connection Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Connection Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge variant={statusBadge.variant} className={statusBadge.className}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                  
                  {connectionStatus.lastTested && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Tested</span>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(connectionStatus.lastTested)}
                      </span>
                    </div>
                  )}

                  {connectionStatus.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {connectionStatus.error}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Sync */}
            <div className="lg:col-span-2">
              <SyncTrigger
                onSyncTrigger={handleSyncTrigger}
                isLoading={isLoading}
                connectionStatus={connectionStatus.status}
                lastSyncTime={connectionStatus.lastTested}
              />
            </div>
          </div>

          {/* Recent Sync History */}
          {syncHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Latest synchronization operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncHistory.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.operation_status === 'success' ? 'default' : 'destructive'}>
                            {item.operation_type}
                          </Badge>
                          <span className="text-sm font-medium">
                            {item.records_processed} records processed
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.created_at)} • {formatDuration(item.response_time_ms)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Connection Tab */}
        <TabsContent value="connection">
          <ActConnectionForm onConnectionSaved={handleConnectionSaved} />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {syncResults ? (
            <SyncResultsDisplay results={syncResults} operationType={operationType} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-medium">No sync results yet</h3>
                  <p className="text-muted-foreground">
                    Trigger a sync operation to see detailed results here
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>
                Complete history of synchronization operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncHistory.length > 0 ? (
                <div className="space-y-4">
                  {syncHistory.map((item, index) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.operation_status === 'success' ? 'default' : 'destructive'}>
                              {item.operation_type}
                            </Badge>
                            <span className="font-medium">
                              {item.records_processed} records processed
                            </span>
                            <Badge variant="outline">
                              {item.operation_status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()} • Duration: {formatDuration(item.response_time_ms)}
                          </div>
                        </div>
                      </div>
                      {index < syncHistory.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No sync history</h3>
                  <p className="text-muted-foreground">
                    Your synchronization history will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 