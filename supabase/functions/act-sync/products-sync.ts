import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { 
  ActProduct, 
  DbInvoiceLineItem, 
  UserActConnection,
  ProductMappingResult,
  SyncOperationResult,
  SyncError,
  SOURCE_TYPES,
  SYNC_STATUSES,
  parseItemNumberDate,
  validateBillingDate
} from './types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Map Act! product data to database invoice_line_item record
 * Returns null if product should be skipped (invalid date, etc.)
 */
export function mapActProductToDb(
  actProduct: ActProduct, 
  connection: UserActConnection
): ProductMappingResult | null {
  const warnings: string[] = [];
  const missingRequiredFields: string[] = [];
  let dateValidationPassed = false;
  let opportunityFound = false; // Will be validated during sync

  try {
    // Step 1: Parse and validate itemNumber date (allow null for deliverables)
    const billedAtDate = parseItemNumberDate(actProduct.itemNumber);
    
    // If we have a date, validate it's in a reasonable range
    if (billedAtDate && !validateBillingDate(billedAtDate)) {
      console.warn(`Product ${actProduct.id} "${actProduct.name}" has date outside reasonable billing range: "${billedAtDate}" - proceeding with null date instead`);
      // Don't skip the product, just clear the invalid date
    }

    // Always allow products regardless of date - null dates are valid for deliverables
    dateValidationPassed = true;
    
    if (!billedAtDate) {
      console.log(`Product ${actProduct.id} "${actProduct.name}" has no itemNumber date - treating as deliverable with null billing date`);
    } else if (validateBillingDate(billedAtDate)) {
      console.log(`Product ${actProduct.id} "${actProduct.name}" has valid billing date: ${billedAtDate}`);
    }

    // Step 2: Validate and handle required product fields with fallbacks
    let productName = actProduct.name;
    if (!productName || productName.trim() === '') {
      productName = `Product ${actProduct.id}`; // Fallback name
      warnings.push('Product name was missing, using fallback name');
    }

    let productPrice = actProduct.price;
    if (typeof productPrice !== 'number' || productPrice < 0) {
      productPrice = 0; // Allow $0 products (some deliverables may be no-cost)
      warnings.push('Product price was missing or invalid, set to $0');
    }

    let productQuantity = actProduct.quantity;
    if (typeof productQuantity !== 'number' || productQuantity <= 0) {
      productQuantity = 1; // Default quantity to 1
      warnings.push('Product quantity was missing or invalid, set to 1');
    }

    // Log products with fallback values applied
    if (warnings.length > 0) {
      console.log(`Product ${actProduct.id} required field corrections:`, warnings);
    }

    // Step 3: Calculate line total for validation (database will auto-calculate)
    const calculatedTotal = productPrice * productQuantity;
    
    // Check if calculated total matches Act! total (with small tolerance for rounding)
    const actTotal = actProduct.total || 0;
    const totalDifference = Math.abs(calculatedTotal - actTotal);
    if (totalDifference > 0.01) {
      warnings.push(`Calculated total (${calculatedTotal}) differs from Act! total (${actTotal})`);
    }

    // Step 4: Create database record (line_total is auto-calculated by database)
    const dbRecord: DbInvoiceLineItem = {
      // Act! reference for upsert matching
      act_reference: actProduct.id,
      
      // Core product information (use corrected values)
      description: productName.trim(),
      quantity: productQuantity,
      unit_rate: productPrice,
      // line_total: auto-calculated by database as (quantity * unit_rate)
      
      // Parsed date from itemNumber (use null for invalid dates)
      billed_at: (billedAtDate && validateBillingDate(billedAtDate)) ? billedAtDate : null,
      
      // Source tracking
      source: SOURCE_TYPES.ACT_SYNC,
      
      // Act! opportunity mapping (will be resolved during sync)
      opportunity_id: actProduct.opportunityID, // Temporary - will be mapped to UUID
      
      // Line item specifics  
      item_type: 'fee', // Products from Act! are billable fees/work items
      line_number: 1, // Will be set during database insert
      
      // Optional fields
      details: actProduct.type || undefined,
      
      // User context
      user_id: connection.user_id,
      
      // CRITICAL: Explicitly set act_deleted_at to null to restore soft-deleted items
      // This prevents the bug where previously deleted items remain deleted after sync
      act_deleted_at: null,
      
      // Timestamps (will be set by database)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Mark as seen during sync
      act_last_seen_at: new Date().toISOString()
    };

    // Log successful mapping with details
    console.log(`✅ Successfully mapped product ${actProduct.id}: "${productName}" - $${productPrice} x ${productQuantity} = $${calculatedTotal} | Date: ${dbRecord.billed_at || 'null'} | Opp: ${actProduct.opportunityID}`);

    return {
      dbRecord,
      mappingWarnings: warnings,
      dateValidationPassed,
      opportunityFound, // Will be updated during sync
      missingRequiredFields
    };

  } catch (error) {
    console.error(`Error mapping Act! product ${actProduct.id}:`, error);
    warnings.push(`Mapping error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      dbRecord: {} as DbInvoiceLineItem, // Empty record for error case
      mappingWarnings: warnings,
      dateValidationPassed: false,
      opportunityFound: false,
      missingRequiredFields
    };
  }
}

/**
 * Sync Act! products to Supabase invoice_line_items table
 */
export async function syncProducts(
  actProducts: ActProduct[],
  connection: UserActConnection,
  options: {
    batchSize?: number;
    logIntegration?: boolean;
    skipProductsWithoutDates?: boolean;
  } = {}
): Promise<SyncOperationResult> {
  const {
    batchSize = 10,
    logIntegration = true,
    skipProductsWithoutDates = true
  } = options;

  console.log(`Starting sync of ${actProducts.length} Act! products for user ${connection.user_id}...`);
  
  const results: SyncOperationResult = {
    success: true,
    operation_type: 'products_sync',
    started_at: new Date().toISOString(),
    total_records_processed: 0,
    records_created: 0,
    records_updated: 0,
    records_failed: 0,
    errors: [],
    warnings: [],
    batch_id: `products_sync_${Date.now()}`
  };

  // Additional tracking for products sync
  let skippedCount = 0;

  try {
    // Step 1: Get opportunity mappings (Act! opportunityID → Supabase opportunity_id)
    const opportunityMappings = await getOpportunityMappings(connection.user_id);
    console.log(`Found ${Object.keys(opportunityMappings).length} active opportunity mappings`);

    // Step 1.5: Pre-filter products to only include those from active opportunities
    const activeOpportunityIds = new Set(Object.keys(opportunityMappings));
    const filteredProducts = actProducts.filter(product => {
      const isFromActiveOpportunity = activeOpportunityIds.has(product.opportunityID);
      if (!isFromActiveOpportunity) {
        console.log(`⏭️ SKIP (Closed Opp): Product ${product.id} "${product.name}" - $${product.price} x ${product.quantity} - from closed/inactive opportunity ${product.opportunityID}`);
        skippedCount++;
        results.total_records_processed++;
      }
      return isFromActiveOpportunity;
    });

    console.log(`Pre-filtered products: ${filteredProducts.length}/${actProducts.length} products are from active opportunities`);

    // Step 2: Process filtered products in batches
    for (let i = 0; i < filteredProducts.length; i += batchSize) {
      const batch = filteredProducts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(filteredProducts.length/batchSize)}...`);
      
      const batchResults = await Promise.all(
        batch.map(product => processSingleProduct(product, connection, opportunityMappings))
      );

      // Aggregate batch results
      batchResults.forEach(result => {
        results.total_records_processed++;
        
        if (result.success) {
          if (result.created) results.records_created++;
          if (result.updated) results.records_updated++;
        } else if (result.skipped) {
          skippedCount++;
        } else {
          results.records_failed++;
          results.success = false; // Mark overall sync as failed if any records fail
          if (result.error) {
            results.errors.push(result.error);
          }
        }
      });

      // Small delay between batches to be respectful of database
      if (i + batchSize < filteredProducts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 3: Complete the sync result
    results.completed_at = new Date().toISOString();
    results.duration_ms = new Date().getTime() - new Date(results.started_at).getTime();

    // Step 4: Log integration if requested
    if (logIntegration) {
      await logProductsSyncIntegration(connection, results, skippedCount);
    }

    // Step 5: Soft delete stale products (removed - UI handles manual deletion)

    const successCount = results.records_created + results.records_updated;
    const successRate = results.total_records_processed > 0 
      ? Math.round((successCount / results.total_records_processed) * 100) 
      : 0;

    console.log(`🏁 Products sync completed: ${successCount}/${results.total_records_processed} successful (${successRate}%), ${skippedCount} skipped, ${results.records_failed} failed`);
    console.log(`📊 Breakdown - Created: ${results.records_created}, Updated: ${results.records_updated}, Skipped: ${skippedCount}, Failed: ${results.records_failed}`);
    
    return results;

  } catch (error) {
    console.error('Critical error during products sync:', error);
    
    results.success = false;
    results.completed_at = new Date().toISOString();
    results.errors.push({
      error_type: 'api',
      error_message: `Critical sync failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error_details: { timestamp: new Date().toISOString() }
    });

    return results;
  }
}

/**
 * Get mapping of Act! opportunity IDs to Supabase opportunity UUIDs
 * Only includes active opportunities (excludes "Closed" status)
 */
export async function getOpportunityMappings(userId: string): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, act_opportunity_id, status')
      .eq('user_id', userId)
      .not('act_opportunity_id', 'is', null)
      .not('status', 'in', '("Closed Lost","Closed Won","Closed")') // Only active opportunities
      .is('act_deleted_at', null); // Exclude soft-deleted opportunities

    if (error) {
      console.error('Error fetching opportunity mappings:', error);
      return {};
    }

    const mappings: Record<string, string> = {};
    data.forEach((opp: any) => {
      if (opp.act_opportunity_id) {
        // Convert UUID to string for the mapping key
        mappings[opp.act_opportunity_id.toString()] = opp.id;
      }
    });

    console.log(`Active opportunity mappings: ${Object.keys(mappings).length} opportunities available for products sync`);
    return mappings;
  } catch (error) {
    console.error('Error in getOpportunityMappings:', error);
    return {};
  }
}

/**
 * Process a single product for sync
 */
async function processSingleProduct(
  actProduct: ActProduct,
  connection: UserActConnection,
  opportunityMappings: Record<string, string>
): Promise<{
  success: boolean;
  created?: boolean;
  updated?: boolean;
  skipped?: boolean;
  error?: SyncError;
}> {
  try {
    // Step 1: Map Act! product to database record
    const mappingResult = mapActProductToDb(actProduct, connection);
    
    if (!mappingResult) {
      return { success: true, skipped: true }; // Product was intentionally skipped
    }

    // Step 2: Resolve opportunity ID
    const actOpportunityId = actProduct.opportunityID;
    const supabaseOpportunityId = opportunityMappings[actOpportunityId];
    
    if (!supabaseOpportunityId) {
      console.warn(`⏭️ SKIP (No Mapping): Product ${actProduct.id} "${actProduct.name}" - $${actProduct.price} - No active opportunity mapping found for Act! opportunity ${actOpportunityId} (may be closed or not synced)`);
      return { success: true, skipped: true };
    }

    // Update the database record with correct opportunity_id
    mappingResult.dbRecord.opportunity_id = supabaseOpportunityId;
    mappingResult.opportunityFound = true;

    // Step 3: Check for existing record to preserve manual values
    const existingRecord = await getExistingInvoiceLineItem(mappingResult.dbRecord.act_reference!);
    
    if (existingRecord) {
      // Preserve manually-set tool-specific values
      const preservedRecord = preserveManualValues(mappingResult.dbRecord, existingRecord);
      mappingResult.dbRecord = preservedRecord.record;
      
      if (preservedRecord.preservedFields.length > 0) {
        console.log(`Preserving manual values for product ${actProduct.id}: ${preservedRecord.preservedFields.join(', ')}`);
      }
    }

    // Step 4: Upsert to database using act_reference for matching
    // CRITICAL LOGGING: Track what we're upserting
    console.warn('🟡 UPSERT OPERATION:', {
      act_reference: mappingResult.dbRecord.act_reference,
      opportunity_id: mappingResult.dbRecord.opportunity_id,
      act_deleted_at: mappingResult.dbRecord.act_deleted_at,
      description: mappingResult.dbRecord.description,
      existingRecord: existingRecord ? {
        id: existingRecord.id,
        act_deleted_at: existingRecord.act_deleted_at,
        description: existingRecord.description
      } : null
    });
    
    const { data, error } = await supabase
      .from('invoice_line_items')
      .upsert(mappingResult.dbRecord, {
        onConflict: 'act_reference',
        ignoreDuplicates: false
      })
      .select('id, act_deleted_at')
      .single();

    if (error) {
      console.error(`Database error for product ${actProduct.id}:`, error);
      return {
        success: false,
        error: {
          error_type: 'database',
          error_message: `Failed to upsert product ${actProduct.id}: ${error.message}`,
          error_details: { 
            timestamp: new Date().toISOString(),
            productId: actProduct.id
          }
        }
      };
    }

    // Determine if this was create or update based on response
    const wasCreated = data && !mappingResult.dbRecord.id;
    
    // CRITICAL LOGGING: Verify what was actually saved
    console.warn('🟢 UPSERT RESULT:', {
      act_reference: mappingResult.dbRecord.act_reference,
      result_act_deleted_at: data?.act_deleted_at,
      was_created: wasCreated,
      description: actProduct.name
    });
    
    console.log(`${wasCreated ? 'Created' : 'Updated'} invoice line item for product ${actProduct.id}: "${actProduct.name}"`);
    
    return {
      success: true,
      created: wasCreated,
      updated: !wasCreated
    };

  } catch (error) {
    console.error(`Error processing product ${actProduct.id}:`, error);
    return {
      success: false,
      error: {
        error_type: 'api',
        error_message: `Failed to process product ${actProduct.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_details: {
          timestamp: new Date().toISOString(),
          productId: actProduct.id
        }
      }
    };
  }
}

/**
 * Get existing invoice line item record by act_reference
 */
async function getExistingInvoiceLineItem(actReference: string): Promise<DbInvoiceLineItem | null> {
  try {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('act_reference', actReference)
      .single();

    if (error) {
      // Record doesn't exist - this is expected for new products
      return null;
    }

    return data as DbInvoiceLineItem;
  } catch (error) {
    console.warn(`Error fetching existing record for act_reference ${actReference}:`, error);
    return null;
  }
}

/**
 * Preserve manually-set tool-specific values when updating records
 * Returns the updated record and list of preserved fields
 */
function preserveManualValues(
  newRecord: DbInvoiceLineItem,
  existingRecord: DbInvoiceLineItem
): { record: DbInvoiceLineItem; preservedFields: string[] } {
  const preservedFields: string[] = [];
  const updatedRecord = { ...newRecord };

  // Fields that should be preserved if manually set (not from Act! sync)
  const preservableFields = [
    'invoice_id',           // Manually assigned invoices
    'deliverable_id',       // Manually linked deliverables  
    'service_period_start', // Manually set service periods
    'service_period_end',   // Manually set service periods
    'line_number'          // Manually adjusted line ordering
  ];

  preservableFields.forEach(fieldName => {
    const existingValue = existingRecord[fieldName as keyof DbInvoiceLineItem];
    const newValue = newRecord[fieldName as keyof DbInvoiceLineItem];

    // Preserve existing value if:
    // 1. Existing record has a value AND
    // 2. New record doesn't have a value (Act! doesn't provide it) OR
    // 3. The existing record has a non-act_sync source for this field
    if (existingValue && (!newValue || shouldPreserveField(fieldName, existingRecord))) {
      (updatedRecord as any)[fieldName] = existingValue;
      preservedFields.push(fieldName);
    }
  });

  // Special handling for 'details' field - preserve if existing has more content
  if (existingRecord.details && 
      existingRecord.details.length > (newRecord.details?.length || 0)) {
    updatedRecord.details = existingRecord.details;
    preservedFields.push('details (enhanced)');
  }

  // Always preserve creation timestamp and original user_id
  if (existingRecord.created_at) {
    updatedRecord.created_at = existingRecord.created_at;
  }

  return {
    record: updatedRecord,
    preservedFields
  };
}

/**
 * Determine if a field should be preserved based on business logic
 */
function shouldPreserveField(fieldName: string, existingRecord: DbInvoiceLineItem): boolean {
  // If the existing record was created by manual entry or contract upload,
  // preserve certain fields that users may have customized
  if (existingRecord.source !== SOURCE_TYPES.ACT_SYNC) {
    return ['service_period_start', 'service_period_end', 'details'].includes(fieldName);
  }

  // For invoice_id and deliverable_id, always preserve if they exist
  // (these are typically set by the tool, not Act!)
  if (['invoice_id', 'deliverable_id'].includes(fieldName)) {
    return true;
  }

  return false;
}

/**
 * Log products sync integration to integration_logs table
 */
async function logProductsSyncIntegration(
  connection: UserActConnection,
  results: SyncOperationResult,
  skippedCount: number
): Promise<void> {
  try {
    const logData = {
      user_id: connection.user_id,
      operation_type: 'products_sync',
      operation_status: results.errors.length === 0 ? SYNC_STATUSES.SYNCED : SYNC_STATUSES.ERROR,
      records_processed: results.total_records_processed,
      records_created: results.records_created,
      records_updated: results.records_updated,
      records_failed: results.records_failed,
      error_details: results.errors.length > 0 ? JSON.stringify(results.errors) : null,
      error_message: results.errors.length > 0 ? results.errors[0].error_message : null,
      act_connection_id: connection.id,
      entity_type: 'invoice_line_items',
      started_at: results.started_at,
      completed_at: results.completed_at,
      response_time_ms: results.duration_ms || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('integration_logs')
      .insert(logData);

    if (error) {
      console.error('Error logging products sync integration:', error);
    } else {
      console.log('Products sync integration logged successfully');
    }
  } catch (error) {
    console.error('Error in logProductsSyncIntegration:', error);
  }
}

