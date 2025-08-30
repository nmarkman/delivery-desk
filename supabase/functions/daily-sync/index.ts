import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { ActClient } from '../act-sync/act-client.ts';
import { UserActConnection } from '../act-sync/types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Act! client
const actClient = new ActClient();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface DailySyncResult {
  batchId: string;
  totalConnections: number;
  successfulSyncs: number;
  failedSyncs: number;
  syncResults: Array<{
    connectionId: string;
    userId: string;
    connectionName: string;
    status: 'success' | 'failed';
    error?: string;
    opportunitiesCount?: number;
    productsCount?: number;
    tasksCount?: number;
    duration?: number;
  }>;
  startedAt: string;
  completedAt?: string;
  totalDuration?: number;
}

/**
 * Generate a unique batch ID for tracking
 */
function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create batch log entry in integration_logs
 */
async function createBatchLog(batchId: string, totalConnections: number): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('integration_logs')
      .insert({
        operation_type: 'daily_sync_batch',
        operation_status: 'running',
        is_batch_operation: true,
        sync_batch_id: batchId,
        user_id: 'system',
        started_at: new Date().toISOString(),
        records_processed: 0,
        request_params: { total_connections: totalConnections }
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create batch log:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Exception creating batch log:', error);
    return null;
  }
}

/**
 * Complete batch log entry
 */
async function completeBatchLog(
  logId: string, 
  result: DailySyncResult
): Promise<void> {
  try {
    await supabase
      .from('integration_logs')
      .update({
        operation_status: result.failedSyncs === 0 ? 'success' : 'partial_success',
        completed_at: new Date().toISOString(),
        records_processed: result.successfulSyncs,
        records_failed: result.failedSyncs,
        response_time_ms: result.totalDuration || 0,
        response_data: {
          total_connections: result.totalConnections,
          successful_syncs: result.successfulSyncs,
          failed_syncs: result.failedSyncs,
          batch_id: result.batchId
        }
      })
      .eq('id', logId);
  } catch (error) {
    console.error('Failed to complete batch log:', error);
  }
}

/**
 * Get all connections ready for daily sync
 */
async function getConnectionsReadyForSync(): Promise<UserActConnection[]> {
  try {
    const { data, error } = await supabase.rpc('get_connections_ready_for_sync');
    
    if (error) {
      console.error('Failed to get connections ready for sync:', error);
      return [];
    }

    // Convert UUID types to strings for compatibility with UserActConnection interface
    const connections = (data || []).map((conn: any) => ({
      ...conn,
      id: conn.id?.toString() || '',
      user_id: conn.user_id?.toString() || '',
      api_base_url: conn.api_base_url || null,
      cached_bearer_token: conn.cached_bearer_token || null,
      token_expires_at: conn.token_expires_at || null,
      token_last_refreshed_at: conn.token_last_refreshed_at || null,
      is_active: true,
      connection_status: 'connected',
      connection_error: null,
      total_api_calls: 0,
      last_sync_at: null,
      connection_name: conn.connection_name || conn.act_database_name
    }));

    return connections;
  } catch (error) {
    console.error('Exception getting connections for sync:', error);
    return [];
  }
}

/**
 * Sync a single connection
 */
async function syncSingleConnection(
  connection: UserActConnection,
  batchId: string,
  parentLogId: string | null
): Promise<{
  status: 'success' | 'failed';
  error?: string;
  opportunitiesCount?: number;
  productsCount?: number;
  tasksCount?: number;
  duration: number;
}> {
  const startTime = Date.now();
  
  try {
    // Update connection status to 'running'
    await supabase.rpc('update_daily_sync_status', {
      connection_id: connection.id,
      status: 'running'
    });

    // Test connection first
    const connectionTest = await actClient.testConnection(connection);
    if (!connectionTest.success) {
      throw new Error(`Connection test failed: ${connectionTest.error}`);
    }

    // Step 1: Sync opportunities first (required for products sync)
    console.log(`Starting opportunities sync for connection ${connection.id}...`);
    const opportunitiesResult = await actClient.syncOpportunitiesData(connection, { 
      logIntegration: true,
      batchId,
      parentLogId 
    });

    if (!opportunitiesResult.success) {
      throw new Error(`Opportunities sync failed: ${opportunitiesResult.error}`);
    }

    // Step 2: Sync products (depends on opportunities being up-to-date)
    console.log(`Starting products sync for connection ${connection.id}...`);
    const productsResult = await actClient.syncProductsData(connection, { 
      logIntegration: true,
      batchId,
      parentLogId 
    });

    if (!productsResult.success) {
      console.warn(`Products sync failed for connection ${connection.id}: ${productsResult.error}`);
    }

    // Step 3: Sync tasks (independent of opportunities/products)
    // DISABLED: No longer syncing task data - focusing only on opportunities and products
    // console.log(`Starting tasks sync for connection ${connection.id}...`);
    // const tasksResult = await actClient.syncTasksData(connection, { 
    //   logIntegration: true,
    //   syncOnlyBillable: true,
    //   batchId,
    //   parentLogId 
    // });
    const tasksResult = { success: true, data: { sync_result: { recordsCreated: 0 } }, message: "Task sync disabled" };

    // Check if any critical syncs failed (only opportunities are critical now, products and tasks are non-fatal)
    const hasErrors = !opportunitiesResult.success;
    
    if (hasErrors) {
      const errorMessage = `Opportunities: ${opportunitiesResult.error}`;
      throw new Error(errorMessage);
    }

    // Update connection status to 'success' and set next sync time
    await Promise.all([
      supabase.rpc('update_daily_sync_status', {
        connection_id: connection.id,
        status: 'success'
      }),
      supabase.rpc('update_next_sync_time', {
        connection_id: connection.id
      }),
      actClient.updateLastSync(connection.id)
    ]);

    const duration = Date.now() - startTime;
    
    return {
      status: 'success',
      opportunitiesCount: opportunitiesResult.data?.sync_result?.recordsCreated || 0,
      productsCount: productsResult.data?.records_created || 0,
      tasksCount: tasksResult.data?.sync_result?.recordsCreated || 0,
      duration
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    console.error(`Sync failed for connection ${connection.id} (${connection.connection_name}):`, errorMessage);
    
    // Update connection status to 'failed'
    await supabase.rpc('update_daily_sync_status', {
      connection_id: connection.id,
      status: 'failed',
      error_message: errorMessage
    });

    const duration = Date.now() - startTime;
    
    return {
      status: 'failed',
      error: errorMessage,
      duration
    };
  }
}

/**
 * Add delay between sync operations to respect rate limits
 */
async function rateLimitDelay(): Promise<void> {
  // Wait 2 seconds between connection syncs to be conservative with API limits
  await new Promise(resolve => setTimeout(resolve, 2000));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("Daily sync batch operation started");

  try {
    // Generate batch ID for tracking
    const batchId = generateBatchId();
    
    // Get all connections ready for sync
    const connections = await getConnectionsReadyForSync();
    console.log(`Found ${connections.length} connections ready for daily sync`);

    if (connections.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No connections ready for daily sync",
          batchId,
          totalConnections: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          syncResults: []
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create batch log entry
    const batchLogId = await createBatchLog(batchId, connections.length);

    // Initialize result tracking
    const result: DailySyncResult = {
      batchId,
      totalConnections: connections.length,
      successfulSyncs: 0,
      failedSyncs: 0,
      syncResults: [],
      startedAt: new Date(startTime).toISOString()
    };

    // Process each connection sequentially with rate limiting
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      console.log(`Processing connection ${i + 1}/${connections.length}: ${connection.connection_name} (${connection.user_id})`);

      const syncResult = await syncSingleConnection(connection, batchId, batchLogId);
      
      // Track results
      result.syncResults.push({
        connectionId: connection.id,
        userId: connection.user_id,
        connectionName: connection.connection_name || connection.act_database_name,
        status: syncResult.status,
        error: syncResult.error,
        opportunitiesCount: syncResult.opportunitiesCount,
        productsCount: syncResult.productsCount,
        tasksCount: syncResult.tasksCount,
        duration: syncResult.duration
      });

      if (syncResult.status === 'success') {
        result.successfulSyncs++;
      } else {
        result.failedSyncs++;
      }

      // Add delay between connections (except for the last one)
      if (i < connections.length - 1) {
        await rateLimitDelay();
      }
    }

    // Finalize batch results
    const endTime = Date.now();
    result.completedAt = new Date(endTime).toISOString();
    result.totalDuration = endTime - startTime;

    // Complete batch log
    if (batchLogId) {
      await completeBatchLog(batchLogId, result);
    }

    console.log(`Daily sync batch completed: ${result.successfulSyncs}/${result.totalConnections} successful in ${result.totalDuration}ms`);

    return new Response(
      JSON.stringify({
        message: "Daily sync batch completed",
        ...result
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error("Daily sync batch failed:", errorMessage);

    return new Response(
      JSON.stringify({ 
        error: "Daily sync batch failed",
        details: errorMessage,
        duration: endTime - startTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});