import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { 
  ParsedLineItem, 
  ProductCreationResult
} from './types.ts';
import { SOURCE_TYPES, UserActConnection } from '../act-sync/types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Sync contract upload products to database invoice_line_items
 * Follows the established patterns from act-sync/products-sync.ts
 */
export async function syncContractProductsToDatabase(
  lineItems: ParsedLineItem[],
  opportunityId: string,
  userId: string,
  connection: UserActConnection,
  options: {
    batchSize?: number;
    logIntegration?: boolean;
  } = {}
): Promise<{
  success: boolean;
  total_items: number;
  items_created: number;
  items_updated: number;
  items_failed: number;
  errors: string[];
  warnings: string[];
  sync_duration_ms: number;
  batch_id: string;
}> {
  const {
    batchSize = 10,
    logIntegration = true
  } = options;

  const startTime = Date.now();
  const batchId = `contract_upload_${Date.now()}`;
  
  console.log(`Starting database sync for ${lineItems.length} contract line items...`);
  
  const results = {
    success: true,
    total_items: lineItems.length,
    items_created: 0,
    items_updated: 0,
    items_failed: 0,
    errors: [] as string[],
    warnings: [] as string[],
    sync_duration_ms: 0,
    batch_id: batchId
  };

  try {
    // Step 1: Validate opportunity exists and is accessible
    const opportunityValidation = await validateOpportunityAccess(opportunityId, userId);
    if (!opportunityValidation.valid) {
      results.success = false;
      results.errors.push(opportunityValidation.error!);
      return results;
    }

    const companyName = opportunityValidation.companyName || 'Unknown';

    // Step 2: Process line items in batches
    for (let i = 0; i < lineItems.length; i += batchSize) {
      const batch = lineItems.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(lineItems.length/batchSize)}...`);

      const batchResults = await Promise.all(
        batch.map(item => processContractLineItem(item, opportunityId, userId, connection, companyName))
      );

      // Aggregate batch results
      batchResults.forEach(result => {
        if (result.success) {
          if (result.created) results.items_created++;
          if (result.updated) results.items_updated++;
        } else {
          results.items_failed++;
          results.success = false;
          if (result.error) {
            results.errors.push(result.error);
          }
        }
      });

      // Small delay between batches to be respectful of database
      if (i + batchSize < lineItems.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 3: Complete the sync result
    results.sync_duration_ms = Date.now() - startTime;

    // Step 4: Log integration if requested
    if (logIntegration) {
      await logContractUploadIntegration(connection, results, opportunityId);
    }

    const successCount = results.items_created + results.items_updated;
    const successRate = results.total_items > 0 
      ? Math.round((successCount / results.total_items) * 100) 
      : 0;

    console.log(`Contract upload sync completed: ${successCount}/${results.total_items} successful (${successRate}%), ${results.items_failed} failed`);
    
    return results;

  } catch (error) {
    console.error('Critical error during contract upload sync:', error);
    
    results.success = false;
    results.errors.push(`Critical sync failure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    results.sync_duration_ms = Date.now() - startTime;

    return results;
  }
}

/**
 * Validate that the opportunity exists and is accessible to the user
 */
async function validateOpportunityAccess(
  opportunityId: string,
  userId: string
): Promise<{ valid: boolean; error?: string; companyName?: string }> {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, user_id, status, company_name')
      .eq('id', opportunityId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, error: 'Opportunity not found or access denied' };
      }
      return { valid: false, error: `Database error: ${error.message}` };
    }

    if (!data) {
      return { valid: false, error: 'Opportunity not found' };
    }

    // Check if opportunity is active (not closed)
    if (data.status === 'Closed' || data.status === 'Closed Won' || data.status === 'Closed Lost') {
      return { valid: false, error: 'Cannot add products to closed opportunity' };
    }

    return { valid: true, companyName: data.company_name };

  } catch (error) {
    return { valid: false, error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Process a single contract line item for database sync
 */
async function processContractLineItem(
  lineItem: ParsedLineItem,
  opportunityId: string,
  userId: string,
  connection: UserActConnection,
  companyName: string
): Promise<{
  success: boolean;
  created?: boolean;
  updated?: boolean;
  error?: string;
}> {
  try {
    // Step 1: Map contract line item to database record
    const dbRecord = await mapContractLineItemToDb(lineItem, opportunityId, userId, companyName);
    
    // Step 2: Check for existing record to prevent duplicates
    const existingRecord = await getExistingContractLineItem(
      opportunityId, 
      lineItem.name, 
      lineItem.date || new Date().toISOString().split('T')[0],
      lineItem.type
    );
    
    if (existingRecord) {
      console.log(`Updating existing line item for: "${lineItem.name}"`);
      
      // Update existing record
      const { error: updateError } = await supabase
        .from('invoice_line_items')
        .update({
          quantity: 1, // Default to 1 for contract items
          unit_rate: lineItem.amount,
          details: lineItem.original_text,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id);

      if (updateError) {
        return {
          success: false,
          error: `Failed to update line item: ${updateError.message}`
        };
      }

      return { success: true, updated: true };
    }

    // Step 3: Insert new record
    const { error: insertError } = await supabase
      .from('invoice_line_items')
      .insert(dbRecord);

    if (insertError) {
      return {
        success: false,
        error: `Failed to insert line item: ${insertError.message}`
      };
    }

    console.log(`Created new line item: "${lineItem.name}" - $${lineItem.amount} x 1`);
    
    return { success: true, created: true };

  } catch (error) {
    console.error(`Error processing contract line item "${lineItem.name}":`, error);
    return {
      success: false,
      error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Generate invoice number for contract line item (if billed_at exists)
 */
async function generateInvoiceNumberForLineItem(
  companyName: string,
  opportunityId: string,
  billedAt: string
): Promise<string | null> {
  try {
    // Get custom school code from opportunity_billing_info
    const { data: billingData } = await supabase
      .from('opportunity_billing_info')
      .select('custom_school_code')
      .eq('opportunity_id', opportunityId)
      .single();

    const customSchoolCode = billingData?.custom_school_code;

    // Extract or use custom school code
    const shortform = customSchoolCode?.trim().toUpperCase() ||
      extractShortformFromCompanyName(companyName);

    // Format date as MMDDYY
    const dateObj = new Date(billedAt + 'T00:00:00');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);
    const dateFormatted = `${month}${day}${year}`;

    // Query existing invoice numbers for this client
    const { data: existingData } = await supabase
      .from('invoice_line_items')
      .select('invoice_number')
      .not('invoice_number', 'is', null)
      .like('invoice_number', `${shortform}-%`);

    const existingNumbers = (existingData?.map(item => item.invoice_number).filter(Boolean) as string[]) || [];
    const baseNumber = `${shortform}-${dateFormatted}`;

    // Find all existing invoice numbers with the same date prefix
    const sameDate = existingNumbers.filter(num => num.startsWith(baseNumber));

    if (sameDate.length === 0) {
      return `${baseNumber}-01`;
    }

    // Extract sequence numbers and find the highest
    const sequenceNumbers = sameDate
      .map(num => {
        const match = num.match(/-(\d{2})$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    const highestSequence = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) : 0;
    const nextSequence = highestSequence + 1;

    // Format with leading zero (2 digits)
    const paddedSequence = nextSequence.toString().padStart(2, '0');
    return `${baseNumber}-${paddedSequence}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    return null;
  }
}

/**
 * Extract shortform from company name
 */
function extractShortformFromCompanyName(organizationName: string): string {
  if (!organizationName || organizationName.trim().length === 0) {
    return 'UNK';
  }

  const name = organizationName.trim().toUpperCase();

  // Remove common business suffixes and words
  const cleanName = name
    .replace(/\b(LLC|INC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|UNIVERSITY|UNIV|COLLEGE)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .trim();

  // Split into words and filter out empty strings
  const words = cleanName.split(/\s+/).filter(word => word.length > 0);

  if (words.length === 0) {
    return name.slice(0, 3);
  }

  if (words.length === 1) {
    const word = words[0];
    return word.length >= 4 ? word.slice(0, 4) : word.slice(0, 3);
  }

  if (words.length === 2) {
    return words[0].slice(0, 2) + words[1].slice(0, 2);
  }

  // Three or more words: take first char of first 3-4 words
  if (words.length >= 4) {
    return words.slice(0, 4).map(word => word[0]).join('');
  } else {
    return words.slice(0, 3).map(word => word[0]).join('');
  }
}

/**
 * Map contract line item to database invoice_line_item record
 */
async function mapContractLineItemToDb(
  lineItem: ParsedLineItem,
  opportunityId: string,
  userId: string,
  companyName: string
): Promise<any> {
  // Generate invoice number if billed_at exists
  let invoiceNumber = null;
  if (lineItem.date) {
    invoiceNumber = await generateInvoiceNumberForLineItem(companyName, opportunityId, lineItem.date);
  }

  return {
    // Core line item information
    description: lineItem.name,
    quantity: 1, // Default to 1 for contract items
    unit_rate: lineItem.amount,
    // line_total: auto-calculated by database as (quantity * unit_rate)

    // Billing information
    billed_at: lineItem.date,
    service_period_start: lineItem.date,
    service_period_end: lineItem.date,

    // Invoice information
    invoice_number: invoiceNumber,
    invoice_status: invoiceNumber ? 'draft' : null,

    // Item classification - use 'fee' for contract upload items to avoid constraint issues
    item_type: lineItem.type === 'deliverable' ? 'fee' : lineItem.type,
    line_number: 1, // Will be set during invoice generation

    // Relationships
    opportunity_id: opportunityId,
    user_id: userId,

    // Source tracking
    source: SOURCE_TYPES.CONTRACT_UPLOAD,

    // Optional fields
    details: lineItem.original_text,

    // Timestamps (will be set by database)
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Check for existing contract line item to prevent duplicates
 * Uses a combination of fields to identify duplicates
 */
async function getExistingContractLineItem(
  opportunityId: string,
  description: string,
  billedAt: string,
  itemType: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .eq('description', description)
      .eq('billed_at', billedAt)
      .eq('item_type', itemType)
      .eq('source', SOURCE_TYPES.CONTRACT_UPLOAD)
      .single();

    if (error) {
      // Record doesn't exist - this is expected for new items
      return null;
    }

    return data;
  } catch (error) {
    console.warn(`Error checking for existing contract line item:`, error);
    return null;
  }
}

/**
 * Log contract upload integration to integration_logs table
 * Follows the established pattern from act-sync
 */
async function logContractUploadIntegration(
  connection: UserActConnection,
  results: any,
  opportunityId: string
): Promise<void> {
  try {
    const logData = {
      user_id: connection.user_id,
      operation_type: 'contract_upload_sync',
      operation_status: results.errors.length === 0 ? 'success' : 'error',
      records_processed: results.total_items,
      records_created: results.items_created,
      records_updated: results.items_updated,
      records_failed: results.items_failed,
      error_details: results.errors.length > 0 ? JSON.stringify(results.errors) : null,
      error_message: results.errors.length > 0 ? results.errors[0] : null,
      act_connection_id: connection.id,
      entity_type: 'invoice_line_items',
      entity_id: opportunityId,
      related_table: 'opportunities',
      related_record_id: opportunityId,
      started_at: new Date(Date.now() - results.sync_duration_ms).toISOString(),
      completed_at: new Date().toISOString(),
      response_time_ms: results.sync_duration_ms,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('integration_logs')
      .insert(logData);

    if (error) {
      console.error('Error logging contract upload integration:', error);
    } else {
      console.log('Contract upload integration logged successfully');
    }
  } catch (error) {
    console.error('Error in logContractUploadIntegration:', error);
  }
}

/**
 * Fetch products for a specific opportunity after creation
 * This implements Task 5.1 from the task list
 */
export async function fetchProductsForOpportunity(
  opportunityId: string,
  userId: string
): Promise<{
  success: boolean;
  products: any[];
  total_count: number;
  error?: string;
}> {
  try {
    // Validate opportunity access
    const opportunityValidation = await validateOpportunityAccess(opportunityId, userId);
    if (!opportunityValidation.valid) {
      return {
        success: false,
        products: [],
        total_count: 0,
        error: opportunityValidation.error
      };
    }

    // Fetch all line items for the opportunity
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select(`
        *,
        opportunity:opportunities(name, company_name)
      `)
      .eq('opportunity_id', opportunityId)
      .eq('user_id', userId)
      .order('billed_at', { ascending: false });

    if (error) {
      return {
        success: false,
        products: [],
        total_count: 0,
        error: `Database error: ${error.message}`
      };
    }

    const products = data || [];
    
    return {
      success: true,
      products,
      total_count: products.length
    };

  } catch (error) {
    return {
      success: false,
      products: [],
      total_count: 0,
      error: `Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get summary statistics for contract upload products
 */
export async function getContractUploadSummary(
  opportunityId: string,
  userId: string
): Promise<{
  success: boolean;
  summary: {
    total_items: number;
    total_value: number;
    retainer_items: number;
    deliverable_items: number;
    retainer_value: number;
    deliverable_value: number;
    date_range: {
      earliest: string | null;
      latest: string | null;
    };
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('item_type, unit_rate, quantity, billed_at')
      .eq('opportunity_id', opportunityId)
      .eq('user_id', userId)
      .eq('source', SOURCE_TYPES.CONTRACT_UPLOAD);

    if (error) {
      return {
        success: false,
        summary: {
          total_items: 0,
          total_value: 0,
          retainer_items: 0,
          deliverable_items: 0,
          retainer_value: 0,
          deliverable_value: 0,
          date_range: { earliest: null, latest: null }
        },
        error: `Database error: ${error.message}`
      };
    }

    const items = data || [];
    let totalValue = 0;
    let retainerItems = 0;
    let deliverableItems = 0;
    let retainerValue = 0;
    let deliverableValue = 0;
    const dates: string[] = [];

    items.forEach(item => {
      const itemValue = (item.unit_rate || 0) * (item.quantity || 1);
      totalValue += itemValue;
      dates.push(item.billed_at);

      if (item.item_type === 'retainer') {
        retainerItems++;
        retainerValue += itemValue;
      } else if (item.item_type === 'deliverable') {
        deliverableItems++;
        deliverableValue += itemValue;
      }
    });

    const sortedDates = dates.filter(d => d).sort();
    
    return {
      success: true,
      summary: {
        total_items: items.length,
        total_value: totalValue,
        retainer_items: retainerItems,
        deliverable_items: deliverableItems,
        retainer_value: retainerValue,
        deliverable_value: deliverableValue,
        date_range: {
          earliest: sortedDates.length > 0 ? sortedDates[0] : null,
          latest: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      summary: {
        total_items: 0,
        total_value: 0,
        retainer_items: 0,
        deliverable_items: 0,
        retainer_value: 0,
        deliverable_value: 0,
        date_range: { earliest: null, latest: null }
      },
      error: `Summary error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
