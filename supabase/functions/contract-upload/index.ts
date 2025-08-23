import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { testOpenAIConnection } from './openai-client.ts';
import { parseContractPDF } from './pdf-parser.ts';
import { 
  syncContractProductsToDatabase, 
  fetchProductsForOpportunity, 
  getContractUploadSummary 
} from './database-sync.ts';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop(); // Get the last part of the path

    // Test endpoint for OpenAI connection verification
    if (path === 'test-openai') {
      console.log('Testing OpenAI connection...');
      const result = await testOpenAIConnection();
      
      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.message,
          timestamp: new Date().toISOString()
        }),
        {
          status: result.success ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Test endpoint for PDF parsing (with sample data)
    if (path === 'test-parsing') {
      console.log('Testing PDF parsing with sample data...');
      
      const sampleText = `
Cost Proposal:
1. Website Design and Development: $15,000
2. Monthly Retainer: $2,500 per month from July 2025 to December 2025
3. SEO Optimization: $5,000
4. Content Creation: $3,500
      `;
      
      const result = await parseContractPDF(sampleText, 'test-contract.pdf');
      
      return new Response(
        JSON.stringify({
          success: result.success,
          line_items: result.line_items,
          total_items: result.total_items,
          retainers_count: result.retainers_count,
          deliverables_count: result.deliverables_count,
          processing_time_ms: result.processing_time_ms,
          errors: result.errors,
          warnings: result.warnings,
          timestamp: new Date().toISOString()
        }),
        {
          status: result.success ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Test endpoint for Act! product creation
    if (path === 'test-act-product') {
      console.log('Testing Act! product creation...');
      
      try {
        // Import ActClient dynamically
        const { ActClient } = await import('../act-sync/act-client.ts');
        const actClient = new ActClient();
        
        // Test product data
        const testProductData = {
          name: "Test Product - Contract Upload",
          price: 1000,
          quantity: 1,
          itemNumber: "2025-08-23",
          type: "Test"
        };
        
        // For now, return the test data and note about testing
        // In a real test, we would need to:
        // 1. Get a valid user connection from the database
        // 2. Use that connection to create the product
        // 3. Handle the Act! API response
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Act! product creation test endpoint ready',
            test_data: {
              opportunity_id: "2a3b11a5-fe50-4c6b-8aad-15bf864b75f0",
              product_data: testProductData,
              available_connections: [
                {
                  id: "7f22ab99-6791-439c-9ce1-08fcea03a35b",
                  user_id: "ce2e4607-57f1-4256-8138-31c26779e776",
                  act_username: "nmarkman93@gmail.com",
                  act_database_name: "H72225153757",
                  act_region: "us"
                }
              ],
              note: "Ready to test actual product creation. Need to implement connection lookup and API call."
            },
            timestamp: new Date().toISOString()
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
        
      } catch (error) {
        console.error('Act! product creation test failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Act! product creation test failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Test endpoint for complete workflow simulation (without PDF)
    if (path === 'test-complete-workflow') {
      console.log('Testing complete workflow simulation...');
      
      try {
        // Import required modules
        const { ActClient } = await import('../act-sync/act-client.ts');
        const { syncProducts } = await import('../act-sync/products-sync.ts');
        const actClient = new ActClient();
        
        // Use the same mock connection as test-act-product-real
        const mockConnection = {
          id: "ca865772-ae1d-4001-97f3-dd9d3ae3769d",
          user_id: "929c69b2-eeb6-4a66-a50b-6f1aa07acd73",
          act_username: "markmanra@gmail.com",
          act_database_name: "D62921203126",
          act_region: "us",
          is_active: true,
          act_password_encrypted: "W4lcome13$",
          api_base_url: null,
          cached_bearer_token: null,
          token_expires_at: null,
          token_last_refreshed_at: null,
          last_sync_at: null,
          sync_status: "untested",
          last_error: null,
          connection_status: "active",
          connection_error: null,
          total_api_calls: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Simulate parsed line items from PDF (same as test-parsing output)
        const simulatedLineItems = [
          {
            type: "retainer",
            name: "Retainer – July 2025",
            amount: 2500,
            date: "2025-07-01",
            original_text: "$2,500 per month from July 2025 to December 2025"
          },
          {
            type: "retainer",
            name: "Retainer – August 2025",
            amount: 2500,
            date: "2025-08-01",
            original_text: "$2,500 per month from July 2025 to December 2025"
          },
          {
            type: "deliverable",
            name: "Website Design and Development",
            amount: 15000,
            original_text: "Website Design and Development: $15,000"
          },
          {
            type: "deliverable",
            name: "SEO Optimization",
            amount: 5000,
            original_text: "SEO Optimization: $5,000"
          },
          {
            type: "deliverable",
            name: "Content Creation",
            amount: 3500,
            original_text: "Content Creation: $3,500"
          }
        ];

        console.log('Step 1: Creating products in Act! CRM...');
        
        // Convert to Act! product format
        const actProducts = simulatedLineItems.map(item => ({
          name: item.name,
          price: item.amount,
          quantity: 1,
          itemNumber: item.date || new Date().toISOString().split('T')[0],
          type: item.type === 'retainer' ? 'Retainer' : 'Deliverable'
        }));

        // Create products in Act! CRM
        const actCreationResults: any[] = [];
        for (const product of actProducts) {
          const result = await actClient.createProduct(
            "60043007-425e-4fc5-b90c-2b57eea12ebd", // Act! opportunity ID
            product,
            mockConnection
          );
          actCreationResults.push(result);
        }

        const successfulCreations = actCreationResults.filter((r: any) => r.success);
        const failedCreations = actCreationResults.filter((r: any) => !r.success);

        console.log(`Step 2: Fetching products from Act! opportunity...`);
        
        // Fetch products from Act! opportunity
        const actProductsResult = await actClient.getOpportunityProducts(
          "60043007-425e-4fc5-b90c-2b57eea12ebd", // Act! opportunity ID
          mockConnection
        );

        if (!actProductsResult.success || !actProductsResult.data) {
          throw new Error(`Failed to fetch products from Act! opportunity: ${actProductsResult.error}`);
        }

        console.log(`Step 3: Syncing products to database...`);
        
        // Sync products to database using existing Act! sync logic
        const syncResult = await syncProducts(
          actProductsResult.data,
          mockConnection,
          { logIntegration: true, batchSize: 10 }
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Complete workflow simulation completed successfully',
            workflow_steps: {
              step1_act_creation: {
                success: true,
                total_attempted: actProducts.length,
                successful_creations: successfulCreations.length,
                failed_creations: failedCreations.length,
                failed_details: failedCreations.map(f => ({ error: f.error, data: f.data }))
              },
              step2_act_fetch: {
                success: actProductsResult.success,
                products_fetched: actProductsResult.data?.length || 0,
                error: actProductsResult.error
              },
              step3_database_sync: {
                success: syncResult.success,
                total_records_processed: syncResult.total_records_processed,
                records_created: syncResult.records_created,
                records_updated: syncResult.records_updated,
                records_failed: syncResult.records_failed,
                batch_id: syncResult.batch_id,
                duration_ms: syncResult.duration_ms
              }
            },
            simulated_data: {
              line_items_processed: simulatedLineItems.length,
              total_value: simulatedLineItems.reduce((sum, item) => sum + item.amount, 0),
              retainers_count: simulatedLineItems.filter(item => item.type === 'retainer').length,
              deliverables_count: simulatedLineItems.filter(item => item.type === 'deliverable').length
            },
            opportunity_id: "60043007-425e-4fc5-b90c-2b57eea12ebd",
            connection_used: mockConnection.act_username,
            timestamp: new Date().toISOString()
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
        
      } catch (error) {
        console.error('Complete workflow simulation failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Complete workflow simulation failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Main contract upload endpoint for PDF processing
    if (path === 'upload' && req.method === 'POST') {
      try {
        const formData = await req.formData();
        const pdfFile = formData.get('pdf') as File;
        const opportunityId = formData.get('opportunity_id') as string;
        const userId = formData.get('user_id') as string;
        
        if (!pdfFile || !opportunityId || !userId) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Missing required fields: pdf, opportunity_id, user_id',
              timestamp: new Date().toISOString()
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        console.log(`Processing PDF upload: ${pdfFile.name} for opportunity: ${opportunityId}`);
        
        // Step 1: Convert PDF file to ArrayBuffer for processing
        const pdfBuffer = await pdfFile.arrayBuffer();
        
        // Step 2: Parse the PDF using OpenAI
        const parsingResult = await parseContractPDF(pdfBuffer, pdfFile.name);
        
        if (!parsingResult.success) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'PDF parsing failed',
              errors: parsingResult.errors,
              warnings: parsingResult.warnings,
              opportunity_id: opportunityId,
              user_id: userId,
              file_name: pdfFile.name,
              timestamp: new Date().toISOString()
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Step 3: Get user's Act! connection for logging
        const { ActClient } = await import('../act-sync/act-client.ts');
        const actClient = new ActClient();
        const connection = await actClient.getUserConnection(userId);
        
        if (!connection) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'No active Act! connection found for user',
              opportunity_id: opportunityId,
              user_id: userId,
              file_name: pdfFile.name,
              timestamp: new Date().toISOString()
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Step 4: Create products in Act! CRM first
        console.log('Creating products in Act! CRM...');
        
        // Convert parsed line items to Act! product format
        const actProducts = parsingResult.line_items.map(item => ({
          name: item.name,
          price: item.amount,
          quantity: 1,
          itemNumber: item.date || new Date().toISOString().split('T')[0],
          type: item.type === 'retainer' ? 'Retainer' : 'Deliverable'
        }));

        // Create products in Act! using existing createProductsBatch method
        const actCreationResult = await actClient.createProductsBatch(
          opportunityId,
          parsingResult.line_items,
          connection
        );

        if (!actCreationResult.success) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Failed to create products in Act! CRM',
              pdf_parsing: {
                success: parsingResult.success,
                line_items: parsingResult.line_items,
                total_items: parsingResult.total_items,
                retainers_count: parsingResult.retainers_count,
                deliverables_count: parsingResult.deliverables_count,
                processing_time_ms: parsingResult.processing_time_ms
              },
              act_creation: {
                success: false,
                error: actCreationResult.error || 'Unknown Act! creation error',
                full_response: actCreationResult,
                data: actCreationResult.data
              },
              opportunity_id: opportunityId,
              user_id: userId,
              file_name: pdfFile.name,
              timestamp: new Date().toISOString()
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        console.log(`Successfully created ${actCreationResult.data?.totalCreated || 0} products in Act! CRM`);

        // Step 5: Fetch products from Act! opportunity and sync to database
        console.log('Fetching products from Act! opportunity for database sync...');
        
        // Import the existing syncProducts method from act-sync
        const { syncProducts } = await import('../act-sync/products-sync.ts');
        
        // Get the newly created products from Act! opportunity
        const actProductsResult = await actClient.getOpportunityProducts(opportunityId, connection);
        
        if (!actProductsResult.success || !actProductsResult.data) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Failed to fetch products from Act! opportunity',
              pdf_parsing: { success: parsingResult.success, total_items: parsingResult.total_items },
              act_creation: { success: true, products_created: actCreationResult.data?.totalCreated || 0 },
              act_fetch: { success: false, error: actProductsResult.error },
              opportunity_id: opportunityId,
              user_id: userId,
              file_name: pdfFile.name,
              timestamp: new Date().toISOString()
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Sync products to database using existing Act! sync logic
        const syncResult = await syncProducts(
          actProductsResult.data,
          connection,
          { logIntegration: true, batchSize: 10 }
        );

        // Step 5: Return comprehensive result
        return new Response(
          JSON.stringify({
            success: parsingResult.success && syncResult.success,
            message: 'Contract upload and processing completed',
            pdf_parsing: {
              success: parsingResult.success,
              line_items: parsingResult.line_items,
              total_items: parsingResult.total_items,
              retainers_count: parsingResult.retainers_count,
              deliverables_count: parsingResult.deliverables_count,
              processing_time_ms: parsingResult.processing_time_ms,
              errors: parsingResult.errors,
              warnings: parsingResult.warnings
            },
            database_sync: {
              success: syncResult.success,
              total_items: syncResult.total_records_processed,
              items_created: syncResult.records_created,
              items_updated: syncResult.records_updated,
              items_failed: syncResult.records_failed,
              errors: syncResult.errors,
              warnings: syncResult.warnings,
              sync_duration_ms: syncResult.duration_ms,
              batch_id: syncResult.batch_id
            },
            opportunity_id: opportunityId,
            user_id: userId,
            file_name: pdfFile.name,
            total_processing_time_ms: parsingResult.processing_time_ms + (syncResult.duration_ms || 0),
            timestamp: new Date().toISOString()
          }),
          {
            status: (parsingResult.success && syncResult.success) ? 200 : 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
        
      } catch (error) {
        console.error('PDF upload processing failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'PDF processing failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Test endpoint to check connection details
    if (path === 'test-connection') {
      console.log('Testing connection details...');
      
      try {
        // Get the connection from database
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: connection, error } = await supabaseClient
          .from('user_act_connections')
          .select('*')
          .eq('id', 'ca865772-ae1d-4001-97f3-dd9d3ae3769d')
          .single();

        if (error || !connection) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Failed to fetch connection',
              error: error?.message || 'Connection not found',
              timestamp: new Date().toISOString()
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Connection details retrieved',
            connection: {
              id: connection.id,
              user_id: connection.user_id,
              act_username: connection.act_username,
              act_database_name: connection.act_database_name,
              act_region: connection.act_region,
              is_active: connection.is_active,
              has_password: !!connection.act_password_encrypted,
              has_bearer_token: !!connection.cached_bearer_token,
              token_expires_at: connection.token_expires_at,
              last_sync_at: connection.last_sync_at,
              sync_status: connection.sync_status,
              last_error: connection.last_error
            },
            timestamp: new Date().toISOString()
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
        
      } catch (error) {
        console.error('Connection test failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Connection test failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Debug endpoint to test Act! authentication directly
    if (path === 'debug-auth') {
      console.log('Debugging Act! authentication...');
      
      try {
        // Get the connection from database
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: connection, error } = await supabaseClient
          .from('user_act_connections')
          .select('*')
          .eq('id', 'ca865772-ae1d-4001-97f3-dd9d3ae3769d')
          .single();

        if (error || !connection) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Failed to fetch connection',
              error: error?.message || 'Connection not found',
              timestamp: new Date().toISOString()
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Test the exact credentials that Postman used successfully
        const credentials = btoa(`${connection.act_username}:bze-VXR_bdp9jkn8zpn`);
        
        const response = await fetch('https://apius.act.com/act.web.api/authorize', {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Act-Database-Name': connection.act_database_name
          }
        });

        const responseText = await response.text();
        
        return new Response(
          JSON.stringify({
            success: response.ok,
            message: 'Auth test completed',
            status: response.status,
            statusText: response.statusText,
            responseText: responseText,
            credentials_used: {
              username: connection.act_username,
              password_from_env: 'bze-VXR_bdp9jkn8zpn',
              password_from_db: connection.act_password_encrypted ? '***ENCRYPTED***' : '***NOT FOUND***',
              has_password_in_db: !!connection.act_password_encrypted,
              base64_credentials: credentials
            },
            timestamp: new Date().toISOString()
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
        
      } catch (error) {
        console.error('Auth debug failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Auth debug failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Test endpoint for actual Act! product creation (real API call)
    if (path === 'test-act-product-real') {
      console.log('Testing actual Act! product creation...');
      
      try {
        // Import ActClient dynamically
        const { ActClient } = await import('../act-sync/act-client.ts');
        const actClient = new ActClient();
        
        // Test product data
        const testProductData = {
          name: "Test Product - Contract Upload - " + new Date().toISOString().split('T')[0],
          price: 1000,
          quantity: 1,
          itemNumber: new Date().toISOString().split('T')[0],
          type: "Test"
        };
        
        // For this test, we'll need to create a mock connection object
        // In production, this would come from the database
        const mockConnection = {
          id: "ca865772-ae1d-4001-97f3-dd9d3ae3769d",
          user_id: "929c69b2-eeb6-4a66-a50b-6f1aa07acd73",
          act_username: "markmanra@gmail.com", // Correct username
          act_database_name: "D62921203126", // Correct database name
          act_region: "us",
          is_active: true,
          // Add other required fields that ActClient expects
          act_password_encrypted: "W4lcome13$", // Correct password (stored as plain text)
          api_base_url: null,
          cached_bearer_token: null,
          token_expires_at: null,
          token_last_refreshed_at: null,
          last_sync_at: null,
          connection_status: "untested",
          connection_error: null,
          total_api_calls: 0,
          connection_name: null,
          is_default: null,
          last_connection_test: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Attempting to create product with mock connection...');
        
        // Attempt to create the product
        const result = await actClient.createProduct(
          "60043007-425e-4fc5-b90c-2b57eea12ebd", // Act! opportunity ID (not our internal UUID)
          testProductData,
          mockConnection
        );
        
        return new Response(
          JSON.stringify({
            success: result.success,
            message: result.success ? 'Product creation attempted' : 'Product creation failed',
            result: result,
            test_data: {
              opportunity_id: "60043007-425e-4fc5-b90c-2b57eea12ebd",
              product_data: testProductData,
              connection_used: mockConnection.act_username
            },
            timestamp: new Date().toISOString()
          }),
          {
            status: result.success ? 200 : 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
        
      } catch (error) {
        console.error('Real Act! product creation test failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Real Act! product creation test failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Database sync endpoint for contract upload products
    if (path === 'sync-to-database') {
      console.log('Syncing contract products to database...');
      
      try {
        const body = await req.json();
        const { line_items, opportunity_id, user_id } = body;
        
        if (!line_items || !opportunity_id || !user_id) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Missing required fields: line_items, opportunity_id, user_id',
              timestamp: new Date().toISOString()
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Get user's Act! connection for logging purposes
        const { ActClient } = await import('../act-sync/act-client.ts');
        const actClient = new ActClient();
        const connection = await actClient.getUserConnection(user_id);
        
        if (!connection) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'No active Act! connection found for user',
              timestamp: new Date().toISOString()
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Sync products to database
        const syncResult = await syncContractProductsToDatabase(
          line_items,
          opportunity_id,
          user_id,
          connection,
          { logIntegration: true }
        );

        return new Response(
          JSON.stringify({
            success: syncResult.success,
            message: 'Database sync completed',
            sync_result: syncResult,
            timestamp: new Date().toISOString()
          }),
          {
            status: syncResult.success ? 200 : 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );

      } catch (error) {
        console.error('Database sync failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Database sync failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Fetch products for opportunity endpoint
    if (path === 'fetch-products') {
      console.log('Fetching products for opportunity...');
      
      try {
        const body = await req.json();
        const { opportunity_id, user_id } = body;
        
        if (!opportunity_id || !user_id) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Missing required fields: opportunity_id, user_id',
              timestamp: new Date().toISOString()
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        const fetchResult = await fetchProductsForOpportunity(opportunity_id, user_id);

        return new Response(
          JSON.stringify({
            success: fetchResult.success,
            message: 'Products fetch completed',
            fetch_result: fetchResult,
            timestamp: new Date().toISOString()
          }),
          {
            status: fetchResult.success ? 200 : 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );

      } catch (error) {
        console.error('Products fetch failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Products fetch failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Get contract upload summary endpoint
    if (path === 'summary') {
      console.log('Getting contract upload summary...');
      
      try {
        const body = await req.json();
        const { opportunity_id, user_id } = body;
        
        if (!opportunity_id || !user_id) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Missing required fields: opportunity_id, user_id',
              timestamp: new Date().toISOString()
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        const summaryResult = await getContractUploadSummary(opportunity_id, user_id);

        return new Response(
          JSON.stringify({
            success: summaryResult.success,
            message: 'Summary retrieved',
            summary: summaryResult.summary,
            timestamp: new Date().toISOString()
          }),
          {
            status: summaryResult.success ? 200 : 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );

      } catch (error) {
        console.error('Summary retrieval failed:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Summary retrieval failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }



    // Default response for unknown endpoints
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Unknown endpoint. Available endpoints: /test-openai, /test-parsing, /test-act-product, /test-act-product-real, /upload, /sync-to-database, /fetch-products, /summary',
        available_endpoints: ['/test-openai', '/test-parsing', '/test-act-product', '/test-act-product-real', '/upload', '/sync-to-database', '/fetch-products', '/summary'],
        timestamp: new Date().toISOString()
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
