import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { 
  ActOpportunity, 
  DbOpportunity, 
  UserActConnection,
  OpportunityMappingResult,
  SyncOperationResult,
  SyncError,
  ActCustomFields,
  SYNC_STATUSES
} from './types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Map Act! opportunity data to database opportunity record
 */
export function mapActOpportunityToDb(
  actOpportunity: ActOpportunity, 
  connection: UserActConnection
): OpportunityMappingResult {
  const warnings: string[] = [];
  const customFieldsUsed: string[] = [];
  const missingRequiredFields: string[] = [];

  try {
    // Extract company name from contacts array, companies array, or contactNames
    let companyName = '';
    
    // First priority: Extract from contacts[0].company
    if (actOpportunity.contacts && actOpportunity.contacts.length > 0 && actOpportunity.contacts[0].company) {
      companyName = actOpportunity.contacts[0].company;
    } 
    // Second priority: Extract from companies array
    else if (actOpportunity.companies && actOpportunity.companies.length > 0) {
      companyName = actOpportunity.companies[0].name;
    } 
    // Final fallback: Try to extract company from contactNames
    else if (actOpportunity.contactNames) {
      // Try to extract company from contactNames if no other sources available
      companyName = actOpportunity.contactNames.split(' - ')[0] || actOpportunity.contactNames;
    }

    if (!companyName) {
      warnings.push('No company name found in Act! opportunity');
      companyName = 'Unknown Company';
    }

    // Extract primary contact
    let primaryContact = '';
    let contactEmail = '';
    
    if (actOpportunity.contacts && actOpportunity.contacts.length > 0) {
      const firstContact = actOpportunity.contacts[0];
      primaryContact = firstContact.displayName;
      contactEmail = firstContact.emailAddress;
    } else if (actOpportunity.contactNames) {
      // Fallback to contactNames if no contacts array
      primaryContact = actOpportunity.contactNames;
    }

    if (!primaryContact) {
      warnings.push('No primary contact found in Act! opportunity');
      primaryContact = 'Unknown Contact';
    }

    // Parse custom fields for retainer-specific data
    const customFields = actOpportunity.customFields || {};
    
    // Look for retainer amount in custom fields
    let retainerAmount: number | undefined;
    
    // First, try the specific assigned field: opportunity_field_2 for monthly retainer amount
    if (customFields.opportunity_field_2) {
      const value = customFields.opportunity_field_2;
      if (typeof value === 'number') {
        retainerAmount = value;
        customFieldsUsed.push('opportunity_field_2');
      } else if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed) && parsed >= 0) {
          retainerAmount = parsed;
          customFieldsUsed.push('opportunity_field_2');
        }
      }
    }
    
    // Fallback: try known semantic field names
    if (!retainerAmount) {
      const retainerFields = ['retainer_amount', 'retainer_monthly', 'monthly_retainer', 'retainer'];
      for (const fieldName of retainerFields) {
        if (customFields[fieldName]) {
          const value = customFields[fieldName];
          if (typeof value === 'number') {
            retainerAmount = value;
            customFieldsUsed.push(fieldName);
            break;
          } else if (typeof value === 'string') {
            const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
            if (!isNaN(parsed)) {
              retainerAmount = parsed;
              customFieldsUsed.push(fieldName);
              break;
            }
          }
        }
      }
    }
    
    // Final fallback: scan remaining opportunity_field_X for numeric values (excluding field_2 which is for retainer amount)
    if (!retainerAmount) {
      for (const [fieldName, value] of Object.entries(customFields)) {
        if (fieldName.startsWith('opportunity_field_') && fieldName !== 'opportunity_field_2' && fieldName !== 'opportunity_field_3' && fieldName !== 'opportunity_field_4' && value) {
          if (typeof value === 'number') {
            retainerAmount = value;
            customFieldsUsed.push(fieldName);
            break;
          } else if (typeof value === 'string') {
            // Check if it's a numeric string (retainer amount) vs date string
            const cleaned = value.replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            
            // Consider it a retainer amount if:
            // 1. It parses to a valid number
            // 2. It doesn't look like a date (doesn't contain T or multiple dashes)
            // 3. The parsed value is reasonable for a retainer (> 0 and < 1000000)
            if (!isNaN(parsed) && 
                !value.includes('T') && 
                !value.match(/\d{4}-\d{2}-\d{2}/) && 
                parsed > 0 && 
                parsed < 1000000) {
              retainerAmount = parsed;
              customFieldsUsed.push(fieldName);
              break;
            }
          }
        }
      }
    }

    // Look for contract dates in custom fields
    let contractStartDate: string | undefined;
    let contractEndDate: string | undefined;
    let retainerStartDate: string | undefined;
    let retainerEndDate: string | undefined;

    // First, try the specific assigned fields for retainer dates
    if (customFields.opportunity_field_3) {
      const dateValue = customFields.opportunity_field_3;
      if (typeof dateValue === 'string' && dateValue.trim()) {
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) {
          retainerStartDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          customFieldsUsed.push('opportunity_field_3');
        }
      }
    }

    if (customFields.opportunity_field_4) {
      const dateValue = customFields.opportunity_field_4;
      if (typeof dateValue === 'string' && dateValue.trim()) {
        const parsedDate = new Date(dateValue);
        if (!isNaN(parsedDate.getTime())) {
          retainerEndDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          customFieldsUsed.push('opportunity_field_4');
        }
      }
    }

    // Fallback: try semantic field names for any missing dates
    const dateFields = {
      contract_start: ['contract_start_date', 'start_date', 'contract_start'],
      contract_end: ['contract_end_date', 'end_date', 'contract_end'],
      retainer_start: retainerStartDate ? [] : ['retainer_start_date', 'retainer_start'], // Skip if already found
      retainer_end: retainerEndDate ? [] : ['retainer_end_date', 'retainer_end'] // Skip if already found
    };

    for (const [type, fieldNames] of Object.entries(dateFields)) {
      for (const fieldName of fieldNames) {
        if (customFields[fieldName]) {
          const dateValue = customFields[fieldName];
          if (typeof dateValue === 'string' && dateValue.trim()) {
            const parsedDate = new Date(dateValue);
            if (!isNaN(parsedDate.getTime())) {
              const isoDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
              
              switch (type) {
                case 'contract_start':
                  contractStartDate = isoDate;
                  break;
                case 'contract_end':
                  contractEndDate = isoDate;
                  break;
                case 'retainer_start':
                  retainerStartDate = isoDate;
                  break;
                case 'retainer_end':
                  retainerEndDate = isoDate;
                  break;
              }
              customFieldsUsed.push(fieldName);
              break;
            }
          }
        }
      }
    }

    // Final fallback: scan remaining opportunity_field_X for date values (excluding assigned fields)
    if (!retainerStartDate || !retainerEndDate) {
      const dateFieldCandidates: string[] = [];
      
      for (const [fieldName, value] of Object.entries(customFields)) {
        // Skip the specifically assigned fields to avoid conflicts
        if (fieldName.startsWith('opportunity_field_') && 
            fieldName !== 'opportunity_field_2' && 
            fieldName !== 'opportunity_field_3' && 
            fieldName !== 'opportunity_field_4' && 
            value && typeof value === 'string') {
          // Check if this looks like a date (contains T or matches date pattern)
          if (value.includes('T') || value.match(/\d{4}-\d{2}-\d{2}/)) {
            const parsedDate = new Date(value);
            if (!isNaN(parsedDate.getTime())) {
              const isoDate = parsedDate.toISOString().split('T')[0];
              dateFieldCandidates.push(isoDate);
              customFieldsUsed.push(fieldName);
            }
          }
        }
      }
      
      // Assign dates if we found any (assume first is start, second is end)
      if (dateFieldCandidates.length >= 1 && !retainerStartDate) {
        retainerStartDate = dateFieldCandidates[0];
      }
      if (dateFieldCandidates.length >= 2 && !retainerEndDate) {
        retainerEndDate = dateFieldCandidates[1];
      } else if (dateFieldCandidates.length === 1 && !retainerEndDate) {
        // If only one date found, use it for both start and end
        retainerEndDate = dateFieldCandidates[0];
      }
    }

    // Calculate total contract value
    // Use productTotal from Act! as the primary source
    let totalContractValue = actOpportunity.productTotal || 0;
    
    // Note: retainer_amount now stores monthly amount directly, no calculation needed

    // Map status from Act! to our status format
    let status = 'active'; // Default status
    if (actOpportunity.stage && typeof actOpportunity.stage === 'string') {
      const stageString = actOpportunity.stage.toLowerCase();
      if (stageString.includes('closed') || stageString.includes('won')) {
        status = 'closed_won';
      } else if (stageString.includes('lost') || stageString.includes('dead')) {
        status = 'closed_lost';
      } else if (stageString.includes('proposal') || stageString.includes('negotiation')) {
        status = 'proposal';
      } else {
        status = 'active';
      }
    }

    // Parse actual close date
    let actualCloseDate: string | undefined;
    if (actOpportunity.actualCloseDate) {
      const closeDate = new Date(actOpportunity.actualCloseDate);
      if (!isNaN(closeDate.getTime())) {
        actualCloseDate = closeDate.toISOString().split('T')[0];
      }
    }

    // Ensure we have required data - use fallbacks from the Act! opportunity itself
    const finalName = actOpportunity.name || 'Unnamed Opportunity';
    const finalCompanyName = companyName || 'Unknown Company';
    const finalPrimaryContact = primaryContact || 'Unknown Contact';

    // Build the database record
    const dbRecord: DbOpportunity = {
      act_opportunity_id: actOpportunity.id,
      act_raw_data: actOpportunity, // Store full Act! data for debugging/future use
      name: finalName,
      company_name: finalCompanyName,
      primary_contact: finalPrimaryContact,
      contact_email: contactEmail || undefined,
      total_contract_value: totalContractValue,
      retainer_amount: retainerAmount,
      weighted_value: actOpportunity.weightedValue,
      contract_start_date: contractStartDate,
      contract_end_date: contractEndDate,
      retainer_start_date: retainerStartDate,
      retainer_end_date: retainerEndDate,
      actual_close_date: actualCloseDate,
      status: status,
      probability: actOpportunity.probability,
      sync_status: 'synced',
      sync_error_message: undefined,
      last_synced_at: new Date().toISOString(),
      user_id: connection.user_id
    };

    // Validate required fields (but don't fail completely)
    if (!dbRecord.name || dbRecord.name === 'Unnamed Opportunity') {
      warnings.push('Opportunity name is missing or generic');
    }
    if (!dbRecord.company_name || dbRecord.company_name === 'Unknown Company') {
      warnings.push('Company name is missing or unknown');
    }
    if (!dbRecord.primary_contact || dbRecord.primary_contact === 'Unknown Contact') {
      warnings.push('Primary contact is missing or unknown');
    }
    if (!dbRecord.total_contract_value) {
      warnings.push('Total contract value is 0 or missing');
    }

    return {
      dbRecord,
      mappingWarnings: warnings,
      customFieldsUsed,
      missingRequiredFields: [] // Don't fail the mapping, just add warnings
    };

  } catch (error) {
    console.error('Error mapping Act! opportunity to database record:', error);
    
    // Return a minimal record with error status
    return {
      dbRecord: {
        act_opportunity_id: actOpportunity.id,
        act_raw_data: actOpportunity,
        name: actOpportunity.name || 'Unknown Opportunity',
        company_name: 'Unknown Company',
        primary_contact: 'Unknown Contact',
        total_contract_value: 0,
        status: 'active',
        sync_status: 'failed',
        sync_error_message: error.message,
        user_id: connection.user_id,
        last_synced_at: new Date().toISOString()
      },
      mappingWarnings: [`Mapping error: ${error.message}`],
      customFieldsUsed: [],
      missingRequiredFields: ['name', 'company_name', 'primary_contact']
    };
  }
}

/**
 * Upsert opportunity record to database
 */
export async function upsertOpportunity(
  opportunity: DbOpportunity,
  connection: UserActConnection
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    console.log(`Upserting opportunity: ${opportunity.name} (Act! ID: ${opportunity.act_opportunity_id})`);

    // Use Supabase upsert with conflict resolution on act_opportunity_id
    const { data, error } = await supabase
      .from('opportunities')
      .upsert(opportunity, {
        onConflict: 'act_opportunity_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error upserting opportunity:', error);
      return { success: false, error: error.message };
    }

    console.log(`Successfully upserted opportunity: ${opportunity.name} (DB ID: ${data.id})`);
    return { success: true, id: data.id };

  } catch (error) {
    console.error('Exception upserting opportunity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync all opportunities for a user connection
 */
export async function syncOpportunities(
  actOpportunities: ActOpportunity[],
  connection: UserActConnection,
  options: {
    batchSize?: number;
    logIntegration?: boolean;
  } = {}
): Promise<SyncOperationResult> {
  const batchSize = options.batchSize || 50;
  const startTime = new Date();
  const batchId = `opportunities_${connection.user_id}_${Date.now()}`;
  
  console.log(`Starting opportunities sync for user ${connection.user_id}. Processing ${actOpportunities.length} opportunities.`);

  const result: SyncOperationResult = {
    success: false,
    operation_type: 'sync_opportunities',
    started_at: startTime.toISOString(),
    total_records_processed: 0,
    records_created: 0,
    records_updated: 0,
    records_failed: 0,
    errors: [],
    warnings: [],
    batch_id: batchId
  };

  try {
    // Process opportunities in batches
    for (let i = 0; i < actOpportunities.length; i += batchSize) {
      const batch = actOpportunities.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(actOpportunities.length / batchSize)} (${batch.length} opportunities)`);

      for (const actOpportunity of batch) {
        result.total_records_processed++;

        try {
          // Map Act! opportunity to database record
          const mappingResult = mapActOpportunityToDb(actOpportunity, connection);
          
          // Add mapping warnings to result
          result.warnings.push(...mappingResult.mappingWarnings);

          // Check for critical mapping errors
          if (mappingResult.missingRequiredFields.length > 0) {
            const error: SyncError = {
              record_id: actOpportunity.id,
              error_type: 'validation',
              error_message: `Missing required fields: ${mappingResult.missingRequiredFields.join(', ')}`,
              error_details: { missingFields: mappingResult.missingRequiredFields }
            };
            result.errors.push(error);
            result.records_failed++;
            continue;
          }

          // Check if this opportunity already exists
          const { data: existingOpportunity } = await supabase
            .from('opportunities')
            .select('id, updated_at')
            .eq('act_opportunity_id', actOpportunity.id)
            .eq('user_id', connection.user_id)
            .single();

          // Upsert the opportunity
          const upsertResult = await upsertOpportunity(mappingResult.dbRecord, connection);

          if (upsertResult.success) {
            if (existingOpportunity) {
              result.records_updated++;
              console.log(`Updated opportunity: ${mappingResult.dbRecord.name}`);
            } else {
              result.records_created++;
              console.log(`Created opportunity: ${mappingResult.dbRecord.name}`);
            }

            // Log custom fields usage
            if (mappingResult.customFieldsUsed.length > 0) {
              result.warnings.push(`Opportunity ${mappingResult.dbRecord.name} used custom fields: ${mappingResult.customFieldsUsed.join(', ')}`);
            }

          } else {
            const error: SyncError = {
              record_id: actOpportunity.id,
              error_type: 'database',
              error_message: upsertResult.error || 'Failed to upsert opportunity',
              error_details: { opportunityName: mappingResult.dbRecord.name }
            };
            result.errors.push(error);
            result.records_failed++;
          }

        } catch (error) {
          console.error(`Error processing opportunity ${actOpportunity.id}:`, error);
          const syncError: SyncError = {
            record_id: actOpportunity.id,
            error_type: 'mapping',
            error_message: error.message,
            error_details: { opportunityName: actOpportunity.name }
          };
          result.errors.push(syncError);
          result.records_failed++;
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < actOpportunities.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate final results
    const endTime = new Date();
    result.completed_at = endTime.toISOString();
    result.duration_ms = endTime.getTime() - startTime.getTime();
    result.success = result.records_failed < result.total_records_processed; // Success if majority succeeded

    // Log summary
    console.log(`Opportunities sync completed for user ${connection.user_id}:`);
    console.log(`- Total processed: ${result.total_records_processed}`);
    console.log(`- Created: ${result.records_created}`);
    console.log(`- Updated: ${result.records_updated}`);
    console.log(`- Failed: ${result.records_failed}`);
    console.log(`- Warnings: ${result.warnings.length}`);
    console.log(`- Duration: ${result.duration_ms}ms`);

    // Log to integration_logs table if requested
    if (options.logIntegration) {
      await logSyncOperation(result, connection);
    }

    return result;

  } catch (error) {
    console.error('Fatal error during opportunities sync:', error);
    
    result.completed_at = new Date().toISOString();
    result.success = false;
    result.errors.push({
      error_type: 'api',
      error_message: `Fatal sync error: ${error.message}`,
      error_details: { error: error.toString() }
    });

    return result;
  }
}

/**
 * Log sync operation to integration_logs table
 */
async function logSyncOperation(
  result: SyncOperationResult,
  connection: UserActConnection
): Promise<void> {
  try {
    await supabase
      .from('integration_logs')
      .insert({
        user_id: connection.user_id,
        act_connection_id: connection.id,
        act_database_name: connection.act_database_name,
        operation_type: result.operation_type,
        operation_status: result.success ? SYNC_STATUSES.COMPLETED : SYNC_STATUSES.FAILED,
        api_endpoint: '/api/opportunities',
        http_method: 'GET',
        response_time_ms: result.duration_ms,
        records_processed: result.total_records_processed,
        records_created: result.records_created,
        records_updated: result.records_updated,
        records_failed: result.records_failed,
        entity_type: 'opportunity',
        sync_batch_id: result.batch_id,
        error_message: result.errors.length > 0 ? result.errors[0].error_message : undefined,
        error_details: result.errors.length > 0 ? { errors: result.errors } : undefined,
        started_at: result.started_at,
        completed_at: result.completed_at
      });

    console.log(`Logged sync operation to integration_logs: ${result.batch_id}`);
  } catch (error) {
    console.error('Error logging sync operation:', error);
  }
} 