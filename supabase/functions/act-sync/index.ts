import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ActClient } from './act-client.ts';
import { UserActConnection, ActApiResponse } from './types.ts';

// Initialize Act! client
const actClient = new ActClient();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log("Edge Function called for Act! API sync with user-specific authentication");
  
  try {
    // Parse request body to get user_id and operation parameters
    const { user_id, operation_type = 'analysis', test_credentials, test_opportunity_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ 
          error: "user_id is required" 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Handle test_connection operation type
    if (operation_type === 'test_connection') {
      if (!test_credentials) {
        return new Response(
          JSON.stringify({ 
            error: "test_credentials are required for test_connection operation" 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Create a temporary connection object for testing
      const tempConnection: UserActConnection = {
        id: 'temp',
        user_id: user_id,
        act_username: test_credentials.act_username,
        act_password_encrypted: test_credentials.act_password,
        act_database_name: test_credentials.act_database_name,
        act_region: test_credentials.act_region,
        connection_name: 'Test Connection',
        is_active: true,
        is_default: false,
        api_base_url: `https://api${test_credentials.act_region}.act.com/act.web.api`,
        cached_bearer_token: null,
        token_expires_at: null,
        token_last_refreshed_at: null,
        last_connection_test: null,
        connection_status: 'untested',
        connection_error: null,
        total_api_calls: 0,
        last_sync_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Test the connection
      const connectionTest = await actClient.testConnection(tempConnection);
      
      if (connectionTest.success) {
        return new Response(
          JSON.stringify({
            message: "Act! connection test successful",
            user_id: user_id,
            operation_type: operation_type,
            authentication: "successful",
            connection: {
              database_name: tempConnection.act_database_name,
              region: tempConnection.act_region,
              username: tempConnection.act_username,
              status: 'connected'
            },
            api_url: tempConnection.api_base_url
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            error: "Failed to authenticate with Act! CRM",
            details: connectionTest.error,
            user_id: user_id,
            authentication: "failed"
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // Get user's Act! connection using the ActClient
    const connection = await actClient.getUserConnection(user_id);
    if (!connection) {
      return new Response(
        JSON.stringify({ 
          error: "No active Act! connection found for user",
          user_id: user_id
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Processing ${operation_type} for user ${user_id} with database ${connection.act_database_name}`);

    // Test connection first
    const connectionTest = await actClient.testConnection(connection);
    if (!connectionTest.success) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to authenticate with Act! CRM",
          details: connectionTest.error,
          user_id: user_id,
          connection_status: connection.connection_status
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Handle test_products operation type
    if (operation_type === 'test_products') {
      const productsTestResult = await actClient.testProductsApi(connection, test_opportunity_id);
      
      return new Response(
        JSON.stringify({
          message: "Act! Products API test completed",
          user_id: user_id,
          operation_type: operation_type,
          authentication: "successful",
          connection: {
            database_name: connection.act_database_name,
            region: connection.act_region,
            username: connection.act_username,
            status: connection.connection_status
          },
          api_url: connection.api_base_url || `https://api${connection.act_region}.act.com`,
          products_test_result: productsTestResult
        }, null, 2),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle test_products_sync operation type - directly sync our test product
    if (operation_type === 'test_products_sync') {
      const testOpportunityId = test_opportunity_id || '60043007-425e-4fc5-b90c-2b57eea12ebd';
      
      try {
        // Get the specific test product
        const productsResult = await actClient.getOpportunityProducts(testOpportunityId, connection);
        
        if (!productsResult.success || !productsResult.data || productsResult.data.length === 0) {
          return new Response(
            JSON.stringify({
              message: "No products found for test opportunity",
              user_id: user_id,
              test_opportunity_id: testOpportunityId,
              error: productsResult.error || 'No products data'
            }, null, 2),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          );
        }

        // Import products sync and test with detailed logging
        const { syncProducts, mapActProductToDb } = await import('./products-sync.ts');
        
        // Test mapping first
        console.log('=== TESTING PRODUCT MAPPING ===');
        const testProduct = productsResult.data[0];
        console.log('Test product:', JSON.stringify(testProduct, null, 2));
        
        const mappingResult = mapActProductToDb(testProduct, connection);
        console.log('Mapping result:', JSON.stringify(mappingResult, null, 2));
        
        if (!mappingResult) {
          return new Response(
            JSON.stringify({
              message: "Product mapping failed - product was skipped",
              user_id: user_id,
              test_product: testProduct,
              reason: "Product was filtered out (likely invalid itemNumber date)"
            }, null, 2),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
        
        // Test full sync
        const syncResult = await syncProducts([testProduct], connection, { 
          logIntegration: false, // Don't use broken integration logging
          batchSize: 1 
        });
        
        return new Response(
          JSON.stringify({
            message: "Test product sync completed",
            user_id: user_id,
            test_opportunity_id: testOpportunityId,
            test_product: testProduct,
            mapping_result: mappingResult,
            sync_result: syncResult
          }, null, 2),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
        
      } catch (error) {
        console.error('Error in test_products_sync:', error);
        return new Response(
          JSON.stringify({
            message: "Test product sync failed",
            user_id: user_id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, null, 2),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // Step 1: Fetch/sync opportunities first (required for products sync)
    console.log('Step 1: Syncing opportunities...');
    const opportunitiesResult = operation_type === 'sync' ? 
      await actClient.syncOpportunitiesData(connection, { logIntegration: true }) :
      await actClient.getOpportunities(connection);

    // Step 2: Fetch/sync products (depends on opportunities being up-to-date)
    console.log('Step 2: Syncing products...');
    const productsResult = operation_type === 'sync' ? 
      await actClient.syncProductsData(connection, { logIntegration: true }) :
      { success: true, data: { message: 'Products sync skipped in analysis mode' } };

    // Step 3: Fetch/sync tasks (independent of opportunities/products)
    console.log('Step 3: Syncing tasks...');
    const tasksResult = operation_type === 'sync' ? 
      await actClient.syncTasksData(connection, { logIntegration: true, syncOnlyBillable: true }) :
      await actClient.getTasks(connection);

    // Update last sync timestamp
    await actClient.updateLastSync(connection.id);

    // Get rate limit status
    const rateLimitStatus = actClient.getRateLimitStatus(user_id);

    // Prepare response data
    const responseData = {
      message: "Act! API sync completed with user-specific authentication",
      user_id: user_id,
      operation_type: operation_type,
      authentication: "successful",
      connection: {
        database_name: connection.act_database_name,
        region: connection.act_region,
        username: connection.act_username,
        status: connection.connection_status
      },
      api_url: connection.api_base_url || `https://api${connection.act_region}.act.com`,
      rate_limit_status: rateLimitStatus,
      opportunities_data: opportunitiesResult,
      products_data: productsResult,
      tasks_data: tasksResult,
      sync_sequence: {
        step_1: "opportunities",
        step_2: "products", 
        step_3: "tasks",
        rationale: "Products sync requires up-to-date opportunity mappings"
      }
    };

    // Log structure analysis for opportunities
    if (opportunitiesResult.success && opportunitiesResult.data && opportunitiesResult.data.length > 0) {
      const firstOpportunity = opportunitiesResult.data[0];
      console.log("Sample opportunity structure:");
      console.log("- ID:", firstOpportunity.id);
      console.log("- Name:", firstOpportunity.name);
      console.log("- Contact Names:", firstOpportunity.contactNames);
      console.log("- Product Total:", firstOpportunity.productTotal);
      console.log("- Custom Fields:", Object.keys(firstOpportunity.customFields || {}));
      console.log("- Contacts Array Length:", firstOpportunity.contacts?.length || 0);
      console.log("- Companies Array Length:", firstOpportunity.companies?.length || 0);
      console.log("- All Top-Level Keys:", Object.keys(firstOpportunity));
    }

    // Log products sync results
    if (productsResult.success && productsResult.data) {
      console.log("Products sync summary:");
      console.log("- Total Processed:", productsResult.data.total_records_processed || 0);
      console.log("- Created:", productsResult.data.records_created || 0);
      console.log("- Updated:", productsResult.data.records_updated || 0);
      console.log("- Failed:", productsResult.data.records_failed || 0);
      console.log("- Duration (ms):", productsResult.data.sync_duration_ms || 0);
      console.log("- Batch ID:", productsResult.data.batch_id || 'N/A');
    }

    // Log structure analysis for tasks
    if (tasksResult.success && tasksResult.data && tasksResult.data.length > 0) {
      const firstTask = tasksResult.data[0];
      console.log("Sample task structure:");
      console.log("- ID:", firstTask.id);
      console.log("- Subject:", firstTask.subject);
      console.log("- Activity Type Name:", firstTask.activityTypeName);
      console.log("- Start Time:", firstTask.startTime);
      console.log("- End Time:", firstTask.endTime);
      console.log("- Is Cleared:", firstTask.isCleared);
      console.log("- Is Alarmed:", firstTask.isAlarmed);
      console.log("- Contacts Array Length:", firstTask.contacts?.length || 0);
      console.log("- Opportunities Array Length:", firstTask.opportunities?.length || 0);
      console.log("- Companies Array Length:", firstTask.companies?.length || 0);
      console.log("- All Top-Level Keys:", Object.keys(firstTask));
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Sync error with user-specific authentication",
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});