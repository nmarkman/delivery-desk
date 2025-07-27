import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ActCredentials {
  username: string;
  password: string;
  databaseName: string;
  region: 'us' | 'ca' | 'eu';
  connectionName?: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  status: 'untested' | 'connected' | 'failed' | 'expired';
  error?: string;
  lastTested?: string;
}

interface TestConnectionResult {
  success: boolean;
  error?: string;
  connectionDetails?: {
    region: string;
    databaseName: string;
    apiUrl: string;
  };
}

export function useActConnection() {
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    status: 'untested'
  });
  const { toast } = useToast();

  // Test connection without saving
  const testConnection = useCallback(async (credentials: ActCredentials): Promise<TestConnectionResult> => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call Edge Function to test connection
      const { data, error } = await supabase.functions.invoke('act-sync', {
        body: {
          user_id: user.id,
          operation_type: 'test_connection',
          test_credentials: {
            act_username: credentials.username,
            act_password: credentials.password,
            act_database_name: credentials.databaseName,
            act_region: credentials.region
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to test connection');
      }

      if (data?.authentication === 'successful') {
        setConnectionStatus({
          isConnected: true,
          status: 'connected',
          lastTested: new Date().toISOString()
        });

        return {
          success: true,
          connectionDetails: {
            region: credentials.region,
            databaseName: credentials.databaseName,
            apiUrl: data.api_url || `https://api${credentials.region}.act.com`
          }
        };
      } else {
        const errorMessage = data?.error || 'Authentication failed';
        setConnectionStatus({
          isConnected: false,
          status: 'failed',
          error: errorMessage,
          lastTested: new Date().toISOString()
        });

        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      
      setConnectionStatus({
        isConnected: false,
        status: 'failed',
        error: errorMessage,
        lastTested: new Date().toISOString()
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save connection after successful test
  const saveConnection = useCallback(async (credentials: ActCredentials): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First test the connection
      const testResult = await testConnection(credentials);
      
      if (!testResult.success) {
        toast({
          title: "Connection Test Failed",
          description: testResult.error || "Please verify your credentials and try again.",
          variant: "destructive",
        });
        return false;
      }

      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('user_act_connections')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const connectionData = {
        user_id: user.id,
        act_username: credentials.username,
        act_password_encrypted: credentials.password, // TODO: Implement actual encryption
        act_database_name: credentials.databaseName,
        act_region: credentials.region,
        connection_name: credentials.connectionName || `${credentials.databaseName} (${credentials.region})`,
        is_active: true,
        is_default: true,
        connection_status: 'connected',
        last_connection_test: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let error;
      
      if (existingConnection) {
        // Update existing connection
        const updateResult = await supabase
          .from('user_act_connections')
          .update(connectionData)
          .eq('user_id', user.id);
        error = updateResult.error;
      } else {
        // Insert new connection
        const insertResult = await supabase
          .from('user_act_connections')
          .insert(connectionData);
        error = insertResult.error;
      }

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Connection Saved",
        description: "Your Act! CRM connection has been successfully configured.",
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save connection';
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [testConnection, toast]);

  // Load existing connection status
  const loadConnectionStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connection } = await supabase
        .from('user_act_connections')
        .select('connection_status, connection_error, last_connection_test, last_sync_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (connection) {
        setConnectionStatus({
          isConnected: connection.connection_status === 'connected',
          status: connection.connection_status as any || 'untested',
          error: connection.connection_error || undefined,
          lastTested: connection.last_connection_test || undefined
        });
      }
    } catch (error) {
      console.error('Failed to load connection status:', error);
    }
  }, []);

  // Trigger manual sync
  const triggerSync = useCallback(async (operationType: 'analysis' | 'sync') => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('act-sync', {
        body: {
          user_id: user.id,
          operation_type: operationType
        }
      });

      if (error) {
        throw new Error(error.message || 'Sync failed');
      }

      if (data?.message) {
        toast({
          title: "Sync Completed",
          description: `${operationType === 'analysis' ? 'Analysis' : 'Sync'} completed successfully.`,
        });
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    connectionStatus,
    testConnection,
    saveConnection,
    loadConnectionStatus,
    triggerSync
  };
} 