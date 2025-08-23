import { 
  ParsedLineItem, 
  ContractProcessingResult, 
  OpenAIParsingResponse,
  RetainerExpansion,
  LINE_ITEM_TYPES,
  ContractUploadError
} from './types.ts';
import { 
  callOpenAI, 
  parseOpenAIJSONResponse, 
  validateOpenAIConfig,
  OpenAIRequest 
} from './openai-client.ts';

/**
 * Create OpenAI prompt for PDF contract analysis
 */
function createPDFAnalysisPrompt(): string {
  return `You are an expert contract analyst. Analyze this contract PDF and extract all billing line items from the pricing section.

Please identify and classify each line item as either:
1. **Retainer**: Monthly recurring fees (e.g., "$X per month from [start] to [end]")
2. **Deliverable**: One-time services or products with specific amounts

For Retainers:
- Expand into monthly products (e.g., "Retainer – July 2025", "Retainer – August 2025")
- Calculate billing dates as 1st of each month
- Set monthly amount

For Deliverables:
- Keep exact contract language
- Extract amount and description

Return your response as valid JSON with this structure:
{
  "line_items": [
    {
      "type": "retainer|deliverable",
      "name": "Product name",
      "amount": 1000,
      "date": "2025-07-01" (for retainers, YYYY-MM-DD format),
      "original_text": "Original contract text",
      "retainer_details": {
        "start_date": "2025-07-01",
        "end_date": "2025-09-30",
        "monthly_amount": 1000
      } (only for retainers)
    }
  ],
  "total_items": 5,
  "confidence": 0.95
}

Analyze the contract and extract all line items:`;
}

/**
 * Call OpenAI API to parse line items
 */
async function callOpenAIForParsing(prompt: string): Promise<OpenAIParsingResponse> {
  const config = validateOpenAIConfig();
  if (!config.valid) {
    throw new Error(config.error);
  }

  try {
    const request: OpenAIRequest = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a contract analysis expert. Extract line items accurately and return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    };

    const response = await callOpenAI(request);
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI API');
    }

    return parseOpenAIJSONResponse(content) as OpenAIParsingResponse;
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Expand retainer into monthly line items
 */
function expandRetainerToMonthlyItems(
  retainerItem: any,
  retainerDetails: any
): ParsedLineItem[] {
  const monthlyItems: ParsedLineItem[] = [];
  const startDate = new Date(retainerDetails.start_date);
  const endDate = new Date(retainerDetails.end_date);
  const monthlyAmount = retainerDetails.monthly_amount;

  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
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
  }

  return monthlyItems;
}

/**
 * Process OpenAI response and convert to our format
 */
function processOpenAIResponse(openAIResponse: OpenAIParsingResponse): ParsedLineItem[] {
  const processedItems: ParsedLineItem[] = [];
  const seenRetainers = new Set<string>(); // Track processed retainers to avoid duplicates

  for (const item of openAIResponse.line_items) {
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
        name: item.name,
        amount: item.amount,
        date: item.date || undefined,
        original_text: item.original_text
      });
    }
  }

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
  fileName: string
): Promise<ContractProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log(`Starting PDF parsing for file: ${fileName}`);
    
    // Step 1: Create OpenAI prompt for PDF analysis
    const prompt = createPDFAnalysisPrompt();
    
    // Step 2: Call OpenAI API with PDF content
    console.log('Calling OpenAI API for PDF analysis...');
    const openAIResponse = await callOpenAIForParsing(prompt);
    console.log(`OpenAI returned ${openAIResponse.line_items.length} line items`);
    
    // Step 3: Process and expand retainers
    const processedItems = processOpenAIResponse(openAIResponse);
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
  const sampleText = `
Cost Proposal:
1. Website Design and Development: $15,000
2. Monthly Retainer: $2,500 per month from July 2025 to December 2025
3. SEO Optimization: $5,000
4. Content Creation: $3,500
  `;
  
  try {
    // For testing, we'll use the text content directly
    // In production, this would be a PDF file
    const result = await parseContractPDF(sampleText, 'test-contract.pdf');
    console.log('Test parsing result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test parsing failed:', error);
  }
}

/**
 * Test OpenAI integration specifically
 */
export async function testOpenAIIntegration(): Promise<void> {
  try {
    const { testOpenAIConnection } = await import('./openai-client.ts');
    const result = await testOpenAIConnection();
    console.log('OpenAI integration test result:', result);
  } catch (error) {
    console.error('OpenAI integration test failed:', error);
  }
}
