import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { testOpenAIConnection } from './openai-client.ts';
import { parseContractPDF } from './pdf-parser.ts';

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
        
        // Convert PDF file to ArrayBuffer for processing
        const pdfBuffer = await pdfFile.arrayBuffer();
        
        // Parse the PDF using OpenAI
        const result = await parseContractPDF(pdfBuffer, pdfFile.name);
        
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
            opportunity_id: opportunityId,
            user_id: userId,
            file_name: pdfFile.name,
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

    // Main contract upload endpoint (placeholder for now)
    if (req.method === 'POST') {
      const body = await req.json();
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Contract upload endpoint ready (not yet implemented)',
          received_data: body,
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
    }

    // Default response for unknown endpoints
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Unknown endpoint. Available endpoints: /test-openai, /test-parsing, /upload',
        available_endpoints: ['/test-openai', '/test-parsing', '/upload'],
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
