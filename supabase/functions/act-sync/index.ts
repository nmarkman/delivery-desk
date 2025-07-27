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
    const { user_id, operation_type = 'analysis' } = await req.json();
    
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

    // Fetch data using the ActClient
    const [opportunitiesResult, tasksResult] = await Promise.all([
      operation_type === 'sync' ? 
        actClient.syncOpportunitiesData(connection, { logIntegration: true }) :
        actClient.getOpportunities(connection),
      operation_type === 'sync' ? 
        actClient.syncTasksData(connection, { logIntegration: true, syncOnlyBillable: true }) :
        actClient.getTasks(connection)
    ]);

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
      tasks_data: tasksResult
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