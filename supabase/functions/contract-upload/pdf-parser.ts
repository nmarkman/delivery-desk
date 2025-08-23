import { 
  ParsedLineItem, 
  ContractProcessingResult, 
  LINE_ITEM_TYPES,
  ContractUploadError
} from './types.ts';
import { 
  callClaude, 
  parseClaudeJSONResponse, 
  validateClaudeConfig,
  ClaudeRequest 
} from './claude-client.ts';

/**
 * Upload PDF to Supabase Storage and return public URL for Claude processing
 */
async function uploadPDFToStorage(pdfFile: File, userId: string): Promise<string> {
  try {
    console.log('Uploading PDF to Supabase Storage...');
    
    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `contracts/${userId}/${timestamp}_${pdfFile.name}`;
    
    // Upload file to contracts bucket
    const { data, error } = await supabase.storage
      .from('contracts')
      .upload(fileName, pdfFile, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('contracts')
      .getPublicUrl(fileName);
    
    if (!urlData.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded PDF');
    }
    
    console.log(`PDF uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('PDF storage upload failed:', error);
    throw new Error(`PDF storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract line items from PDF using Claude's native PDF support
 */
async function extractLineItemsWithClaude(
  pdfUrl: string, 
  fileName: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const config = validateClaudeConfig();
    if (!config.valid) {
      return { success: false, error: config.error };
    }

    const prompt = createPDFAnalysisPrompt();
    
    const request: ClaudeRequest = {
      model: 'claude-sonnet-4-20250514', // Use Claude 4 Sonnet for PDF processing
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'url',
                url: pdfUrl
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    };

    console.log(`Calling Claude API for PDF analysis: ${fileName}`);
    const response = await callClaude(request);
    
    if (!response.content || response.content.length === 0) {
      return { success: false, error: 'No content received from Claude API' };
    }

    const content = response.content[0].text;
    console.log(`Claude response received: ${content.length} characters`);
    
    const parsedResponse = parseClaudeJSONResponse(content);
    
    // Validate the response structure
    if (!parsedResponse.line_items || !Array.isArray(parsedResponse.line_items)) {
      return { success: false, error: 'Invalid response structure from Claude' };
    }

    console.log(`Successfully extracted ${parsedResponse.line_items.length} line items from PDF`);
    return { success: true, data: parsedResponse };
    
  } catch (error) {
    console.error('Claude PDF analysis failed:', error);
    return { 
      success: false, 
      error: `Claude PDF analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Create Claude prompt for PDF contract analysis
 */
function createPDFAnalysisPrompt(): string {
  return `You are an expert contract analyst. Analyze this contract PDF and extract all billing line items from the pricing section.

Please identify and classify each line item as either:
1. **Retainer**: Monthly recurring fees (e.g., "$X per month from [start] to [end]")
2. **Deliverable**: One-time services or products with specific amounts

For Retainers:
- Extract the monthly amount and date range
- Note the start and end dates for monthly billing
- Set the date to the start date of the retainer period (e.g., "2025-07-01")
- ONLY retainers should have dates

For Deliverables:
- Keep EXACT contract language and text, verbatim. DO NOT SUMMARIZE OR MAKE MORE SUCCINCT.
- Extract amount and description
- Set the date to NULL or omit the date field entirely
- Deliverables should NOT have due dates
- You may see financial payment information outside of the table of services and prices. For example, "Twenty-five percent of the total project cost ($11,000) is required to begin work." For cases like this, it is fine to summarize to something like "25% of total project cost required to begin work."

Return your response as valid JSON with this structure:
{
  "line_items": [
    {
      "type": "retainer",
      "name": "Monthly Retainer",
      "amount": 1000,
      "date": "2025-07-01",
      "original_text": "Monthly retainer fee",
      "retainer_details": {
        "start_date": "2025-07-01",
        "end_date": "2025-09-30",
        "monthly_amount": 1000
      }
    },
    {
      "type": "deliverable",
      "name": "Project Management phase begins - RFP developed, finalized, and issued. Weekly WSU team and CRCG calls begin.",
      "amount": 5000,
      "date": null,
      "original_text": "Project Management phase begins - RFP developed, finalized, and issued. Weekly WSU team and CRCG calls begin."
    }
  ],
  "total_items": 2,
  "confidence": 0.95
}

Analyze the contract and extract all line items:`;
}

/**
 * Expand retainer into monthly line items
 */
function expandRetainerToMonthlyItems(
  retainerItem: any,
  retainerDetails: any
): ParsedLineItem[] {
  const monthlyItems: ParsedLineItem[] = [];
  
  // Validate dates and add safety checks
  if (!retainerDetails.start_date || !retainerDetails.end_date) {
    console.warn('Missing start or end date for retainer, skipping expansion');
    return monthlyItems;
  }
  
  const startDate = new Date(retainerDetails.start_date);
  const endDate = new Date(retainerDetails.end_date);
  const monthlyAmount = retainerDetails.monthly_amount || 0;
  
  // Check for invalid dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.warn('Invalid date format for retainer, skipping expansion');
    return monthlyItems;
  }
  
  // Check if start date is after end date
  if (startDate > endDate) {
    console.warn('Start date is after end date for retainer, skipping expansion');
    return monthlyItems;
  }
  
  // Add safety limit to prevent infinite loops (max 60 months = 5 years)
  const maxMonths = 60;
  let monthCount = 0;
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate && monthCount < maxMonths) {
    const monthName = currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    monthlyItems.push({
      type: LINE_ITEM_TYPES.RETAINER,
      name: `Retainer – ${monthName}`,
      amount: monthlyAmount,
      date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
      original_text: retainerItem.original_text
    });

    // Move to next month - create new Date object to avoid mutation
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1); // Ensure 1st of month
    currentDate = nextMonth;
    monthCount++;
  }
  
  if (monthCount >= maxMonths) {
    console.warn(`Retainer expansion stopped at ${maxMonths} months to prevent infinite loop`);
  }
  
  console.log(`Expanded retainer into ${monthlyItems.length} monthly items`);
  return monthlyItems;
}

/**
 * Process Claude response and convert to our format
 */
function processClaudeResponse(claudeResponse: any): ParsedLineItem[] {
  const processedItems: ParsedLineItem[] = [];
  const seenRetainers = new Set<string>(); // Track processed retainers to avoid duplicates
  
  // Add safety check for response structure
  if (!claudeResponse.line_items || !Array.isArray(claudeResponse.line_items)) {
    console.warn('Invalid Claude response structure, no line items found');
    return processedItems;
  }
  
  // Add safety limit to prevent processing too many items
  const maxItems = 100;
  if (claudeResponse.line_items.length > maxItems) {
    console.warn(`Too many line items (${claudeResponse.line_items.length}), limiting to ${maxItems}`);
    claudeResponse.line_items = claudeResponse.line_items.slice(0, maxItems);
  }

  for (const item of claudeResponse.line_items) {
    try {
      // Validate item structure
      if (!item || typeof item !== 'object') {
        console.warn('Invalid item structure, skipping');
        continue;
      }
      
      if (item.type === LINE_ITEM_TYPES.RETAINER && item.retainer_details) {
        // Create a unique key for this retainer to avoid duplicates
        const retainerKey = `${item.original_text}-${item.retainer_details.start_date}-${item.retainer_details.end_date}`;
        
        if (seenRetainers.has(retainerKey)) {
          console.log(`Skipping duplicate retainer: ${item.original_text}`);
          continue;
        }
        
        seenRetainers.add(retainerKey);
        
        // Expand retainer into monthly items
        const monthlyItems = expandRetainerToMonthlyItems(item, item.retainer_details);
        processedItems.push(...monthlyItems);
      } else {
        // Handle deliverable or simple retainer
        processedItems.push({
          type: item.type as 'retainer' | 'deliverable',
          name: item.name || 'Unnamed Item',
          amount: item.amount || 0,
          date: item.date || undefined,
          original_text: item.original_text || item.name || 'No description'
        });
      }
    } catch (error) {
      console.error('Error processing line item:', error);
      // Continue processing other items instead of failing completely
    }
  }

  console.log(`Processed ${claudeResponse.line_items.length} items into ${processedItems.length} final items`);
  return processedItems;
}

/**
 * Validate extracted line items
 */
function validateLineItems(lineItems: ParsedLineItem[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    
    if (!item.name || item.name.trim() === '') {
      errors.push(`Line item ${i + 1}: Missing name`);
    }
    
    if (typeof item.amount !== 'number' || item.amount <= 0) {
      errors.push(`Line item ${i + 1}: Invalid amount (${item.amount})`);
    }
    
    if (item.type === LINE_ITEM_TYPES.RETAINER && !item.date) {
      errors.push(`Line item ${i + 1}: Retainer missing date`);
    }
    
    if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      errors.push(`Line item ${i + 1}: Invalid date format (${item.date})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Main function to parse contract PDF and extract line items
 */
export async function parseContractPDF(
  pdfFile: File | ArrayBuffer | string,
  fileName: string,
  userId?: string
): Promise<ContractProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log(`Starting PDF parsing for file: ${fileName}`);
    
    let pdfUrl: string;
    
    if (pdfFile instanceof File && userId) {
      // Step 1: Upload PDF to Supabase Storage and get public URL
      console.log('Uploading PDF to storage for Claude processing...');
      pdfUrl = await uploadPDFToStorage(pdfFile, userId);
    } else if (typeof pdfFile === 'string' && pdfFile.startsWith('http')) {
      // Already a URL
      pdfUrl = pdfFile;
    } else {
      throw new Error('PDF file must be a File object with userId for storage upload, or a valid URL');
    }
    
    // Step 2: Extract line items using Claude's native PDF support
    console.log('Processing PDF with Claude API...');
    const claudeResponse = await extractLineItemsWithClaude(pdfUrl, fileName);
    
    if (!claudeResponse.success) {
      throw new Error(`Claude PDF analysis failed: ${claudeResponse.error}`);
    }
    
    if (!claudeResponse.data) {
      throw new Error('Claude response data is missing');
    }
    
    console.log(`Claude extracted ${claudeResponse.data.line_items.length} line items`);
    
    // Step 3: Process and expand retainers
    const processedItems = processClaudeResponse(claudeResponse.data);
    console.log(`Processed into ${processedItems.length} line items (after retainer expansion)`);
    
    // Step 4: Validate results
    const validation = validateLineItems(processedItems);
    if (!validation.valid) {
      console.warn('Validation warnings:', validation.errors);
    }
    
    // Step 5: Calculate statistics
    const retainersCount = processedItems.filter(item => item.type === LINE_ITEM_TYPES.RETAINER).length;
    const deliverablesCount = processedItems.filter(item => item.type === LINE_ITEM_TYPES.DELIVERABLE).length;
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      line_items: processedItems,
      total_items: processedItems.length,
      retainers_count: retainersCount,
      deliverables_count: deliverablesCount,
      processing_time_ms: processingTime,
      warnings: validation.errors.length > 0 ? validation.errors : undefined
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('PDF parsing failed:', error);
    
    return {
      success: false,
      line_items: [],
      total_items: 0,
      retainers_count: 0,
      deliverables_count: 0,
      processing_time_ms: processingTime,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
}

/**
 * Test function for development
 */
export async function testPDFParsing(): Promise<void> {
  try {
    const { testClaudeConnection } = await import('./claude-client.ts');
    const result = await testClaudeConnection();
    console.log('Claude integration test result:', result);
  } catch (error) {
    console.error('Claude integration test failed:', error);
  }
}
