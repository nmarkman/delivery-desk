import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { 
  ActTask, 
  DbDeliverable, 
  UserActConnection,
  TaskMappingResult,
  SyncOperationResult,
  SyncError,
  FeeParsingResult,
  ACT_ACTIVITY_TYPES,
  SYNC_STATUSES
} from './types.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration for deliverable-specific task types
const BILLABLE_ACTIVITY_TYPES = [
  'Billing',
  'To-do',
  'Meeting', 
  'Call',
  'Project Work',
  'Consultation',
  'Research',
  'Analysis',
  'Review'
];

// Keywords that indicate billable tasks
const BILLABLE_KEYWORDS = [
  'billing',
  'invoice',
  'fee',
  'charge',
  'bill',
  'deliverable',
  'project',
  'work',
  'consultation',
  'meeting',
  'review',
  'analysis',
  'research'
];

// Keywords that indicate non-billable tasks
const NON_BILLABLE_KEYWORDS = [
  'reminder',
  'follow up',
  'follow-up',
  'internal',
  'admin',
  'administrative',
  'overhead',
  'marketing',
  'sales'
];

/**
 * Check if a task should be considered billable/deliverable
 */
function isTaskBillable(actTask: ActTask): boolean {
  // Check activity type
  if (BILLABLE_ACTIVITY_TYPES.includes(actTask.activityTypeName)) {
    return true;
  }

  // Check subject and details for keywords
  const taskText = `${actTask.subject || ''} ${actTask.details || ''}`.toLowerCase();
  
  // If it contains non-billable keywords, exclude it
  if (NON_BILLABLE_KEYWORDS.some(keyword => taskText.includes(keyword))) {
    return false;
  }

  // If it contains billable keywords, include it
  if (BILLABLE_KEYWORDS.some(keyword => taskText.includes(keyword))) {
    return true;
  }

  // Default to false for unrecognized task types
  return false;
}

/**
 * Parse fee amount from task subject or details
 */
function parseFeeFromTask(actTask: ActTask): FeeParsingResult {
  const text = `${actTask.subject || ''} ${actTask.details || ''}`;
  
  // Common patterns for fee amounts
  const patterns = [
    /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g,           // $1,000.00
    /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|usd)/gi, // 1000 dollars
    /fee[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,        // fee: $1000
    /charge[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,     // charge: 1000
    /bill[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,       // bill: $1000
    /amount[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi      // amount: 1000
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const amountStr = match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      
      if (!isNaN(amount) && amount > 0) {
        return {
          amount,
          currency: 'USD',
          source: match[0].toLowerCase().includes('subject') ? 'subject' : 'details',
          confidence: pattern.source.includes('fee|charge|bill|amount') ? 'high' : 'medium',
          rawText: match[0]
        };
      }
    }
  }

  return {
    source: 'default',
    confidence: 'low'
  };
}

/**
 * Find opportunity ID for a task based on linked opportunities or company matching
 */
async function findOpportunityForTask(
  actTask: ActTask, 
  connection: UserActConnection
): Promise<string | undefined> {
  try {
    // First, check if task has directly linked opportunities
    if (actTask.opportunities && actTask.opportunities.length > 0) {
      const actOpportunityId = actTask.opportunities[0].id;
      
      const { data: opportunity } = await supabase
        .from('opportunities')
        .select('id')
        .eq('act_opportunity_id', actOpportunityId)
        .eq('user_id', connection.user_id)
        .single();
      
      if (opportunity) {
        return opportunity.id;
      }
    }

    // Fallback: Try to match by company name
    if (actTask.companies && actTask.companies.length > 0) {
      const companyName = actTask.companies[0].name;
      
      const { data: opportunity } = await supabase
        .from('opportunities')
        .select('id')
        .eq('company_name', companyName)
        .eq('user_id', connection.user_id)
        .limit(1)
        .single();
      
      if (opportunity) {
        return opportunity.id;
      }
    }

    return undefined;
  } catch (error) {
    console.error('Error finding opportunity for task:', error);
    return undefined;
  }
}

/**
 * Map Act! task data to database deliverable record
 */
export async function mapActTaskToDb(
  actTask: ActTask, 
  connection: UserActConnection
): Promise<TaskMappingResult> {
  const warnings: string[] = [];
  const missingRequiredFields: string[] = [];

  try {
    // Check if this task should be treated as a deliverable
    const isBillable = isTaskBillable(actTask);
    
    if (!isBillable) {
      warnings.push(`Task "${actTask.subject}" filtered out as non-billable`);
    }

    // Parse fee amount from task
    const feeResult = parseFeeFromTask(actTask);
    const feeAmount = feeResult.amount || 0;
    
    if (feeResult.confidence === 'low' && isBillable) {
      warnings.push(`Could not parse fee amount from task "${actTask.subject}"`);
    }

    // Find linked opportunity
    const opportunityId = await findOpportunityForTask(actTask, connection);
    
    if (!opportunityId && isBillable) {
      warnings.push(`No opportunity found for task "${actTask.subject}"`);
    }

    // Extract client info - use null since we link via opportunity_id instead
    let clientId: string | null = null;
    // TODO: Implement proper client management if needed in the future

    // Map status from Act! task completion
    let status = 'pending';
    if (actTask.isCleared) {
      status = 'completed';
    } else {
      // Check if task is overdue (but use valid status values)
      const dueDate = new Date(actTask.endTime);
      const now = new Date();
      if (dueDate < now) {
        status = 'pending'; // Use pending instead of 'overdue' since it's not in constraint
      } else {
        status = 'in_progress';
      }
    }

    // Map priority
    let priority = 'medium';
    if (actTask.activityPriorityName) {
      const priorityName = actTask.activityPriorityName.toLowerCase();
      if (priorityName.includes('high') || priorityName.includes('urgent')) {
        priority = 'high';
      } else if (priorityName.includes('low')) {
        priority = 'low';
      }
    }

    // Build the database record
    const dbRecord: DbDeliverable = {
      act_task_id: actTask.id,
      act_series_id: actTask.seriesID,
      act_raw_data: actTask,
      title: actTask.subject || 'Untitled Task',
      description: actTask.details || undefined,
      client_id: clientId,
      opportunity_id: opportunityId,
      due_date: actTask.endTime,
      status: status,
      priority: priority,
      fee_amount: feeAmount,
      is_billable: isBillable,
      act_activity_type: actTask.activityTypeName,
      act_activity_type_id: actTask.activityTypeId,
      start_time: actTask.startTime,
      end_time: actTask.endTime,
      is_completed: actTask.isCleared,
      has_reminder: actTask.isAlarmed,
      sync_status: 'synced',
      sync_error_message: undefined,
      last_synced_at: new Date().toISOString(),
      user_id: connection.user_id
    };

    // Validate required fields
    if (!dbRecord.title || dbRecord.title === 'Untitled Task') {
      warnings.push('Task title is missing or generic');
    }
    if (!dbRecord.due_date) {
      missingRequiredFields.push('due_date');
    }
    if (!dbRecord.client_id) {
      warnings.push('No client_id set - deliverable linked via opportunity_id instead');
    }

    return {
      dbRecord,
      mappingWarnings: warnings,
      activityTypeMatched: BILLABLE_ACTIVITY_TYPES.includes(actTask.activityTypeName),
      feeAmountParsed: feeResult.amount !== undefined,
      missingRequiredFields
    };

  } catch (error) {
    console.error('Error mapping Act! task to database record:', error);
    
    // Return a minimal record with error status
    return {
      dbRecord: {
        act_task_id: actTask.id,
        act_series_id: actTask.seriesID,
        act_raw_data: actTask,
        title: actTask.subject || 'Error Processing Task',
        client_id: null,
        due_date: actTask.endTime || new Date().toISOString(),
        status: 'pending',
        is_billable: false,
        sync_status: 'error',
        sync_error_message: error.message,
        user_id: connection.user_id,
        last_synced_at: new Date().toISOString()
      },
      mappingWarnings: [`Mapping error: ${error.message}`],
      activityTypeMatched: false,
      feeAmountParsed: false,
      missingRequiredFields: ['due_date']
    };
  }
}

/**
 * Upsert deliverable record to database
 */
export async function upsertDeliverable(
  deliverable: DbDeliverable,
  connection: UserActConnection
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    console.log(`Upserting deliverable: ${deliverable.title} (Act! ID: ${deliverable.act_task_id})`);

    // Check if record already exists
    const { data: existing } = await supabase
      .from('deliverables')
      .select('id')
      .eq('act_task_id', deliverable.act_task_id)
      .eq('user_id', connection.user_id)
      .single();

    let result;
    if (existing) {
      // Update existing record
      result = await supabase
        .from('deliverables')
        .update(deliverable)
        .eq('id', existing.id)
        .select('id')
        .single();
    } else {
      // Insert new record
      result = await supabase
        .from('deliverables')
        .insert(deliverable)
        .select('id')
        .single();
    }

    if (result.error) {
      console.error('Error upserting deliverable:', result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`Successfully upserted deliverable: ${deliverable.title} (DB ID: ${result.data.id})`);
    return { success: true, id: result.data.id };

  } catch (error) {
    console.error('Exception upserting deliverable:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync tasks to deliverables for a user connection
 */
export async function syncTasks(
  actTasks: ActTask[],
  connection: UserActConnection,
  options: {
    batchSize?: number;
    logIntegration?: boolean;
    syncOnlyBillable?: boolean;
    filterActivityTypes?: string[];
  } = {}
): Promise<SyncOperationResult> {
  const batchSize = options.batchSize || 50;
  const syncOnlyBillable = options.syncOnlyBillable !== false; // Default to true
  const startTime = new Date();
  const batchId = `tasks_${connection.user_id}_${Date.now()}`;
  
  console.log(`Starting tasks sync for user ${connection.user_id}. Processing ${actTasks.length} tasks.`);

  const result: SyncOperationResult = {
    success: false,
    operation_type: 'sync_tasks',
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
    // Filter tasks if specified
    let tasksToProcess = actTasks;
    
    if (options.filterActivityTypes && options.filterActivityTypes.length > 0) {
      tasksToProcess = actTasks.filter(task => 
        options.filterActivityTypes!.includes(task.activityTypeName)
      );
      console.log(`Filtered to ${tasksToProcess.length} tasks by activity type`);
    }

    // Process tasks in batches
    for (let i = 0; i < tasksToProcess.length; i += batchSize) {
      const batch = tasksToProcess.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasksToProcess.length / batchSize)} (${batch.length} tasks)`);

      for (const actTask of batch) {
        result.total_records_processed++;

        try {
          // Map Act! task to database record
          const mappingResult = await mapActTaskToDb(actTask, connection);
          
          // Add mapping warnings to result
          result.warnings.push(...mappingResult.mappingWarnings);

          // Skip non-billable tasks if syncOnlyBillable is true
          if (syncOnlyBillable && !mappingResult.dbRecord.is_billable) {
            console.log(`Skipping non-billable task: ${mappingResult.dbRecord.title}`);
            continue;
          }

          // Check for critical mapping errors
          if (mappingResult.missingRequiredFields.length > 0) {
            const error: SyncError = {
              record_id: actTask.id,
              error_type: 'validation',
              error_message: `Missing required fields: ${mappingResult.missingRequiredFields.join(', ')}`,
              error_details: { missingFields: mappingResult.missingRequiredFields }
            };
            result.errors.push(error);
            result.records_failed++;
            continue;
          }

          // Check if this task already exists
          const { data: existingDeliverable } = await supabase
            .from('deliverables')
            .select('id, updated_at')
            .eq('act_task_id', actTask.id)
            .eq('user_id', connection.user_id)
            .single();

          // Upsert the deliverable
          const upsertResult = await upsertDeliverable(mappingResult.dbRecord, connection);

          if (upsertResult.success) {
            if (existingDeliverable) {
              result.records_updated++;
              console.log(`Updated deliverable: ${mappingResult.dbRecord.title}`);
            } else {
              result.records_created++;
              console.log(`Created deliverable: ${mappingResult.dbRecord.title}`);
            }

            // Log activity type matching
            if (!mappingResult.activityTypeMatched && mappingResult.dbRecord.is_billable) {
              result.warnings.push(`Task "${mappingResult.dbRecord.title}" marked billable but activity type "${mappingResult.dbRecord.act_activity_type}" not in standard billable types`);
            }

            // Log fee parsing results
            if (mappingResult.dbRecord.is_billable && !mappingResult.feeAmountParsed) {
              result.warnings.push(`Could not parse fee amount for billable task "${mappingResult.dbRecord.title}"`);
            }

          } else {
            const error: SyncError = {
              record_id: actTask.id,
              error_type: 'database',
              error_message: upsertResult.error || 'Failed to upsert deliverable',
              error_details: { taskTitle: mappingResult.dbRecord.title }
            };
            result.errors.push(error);
            result.records_failed++;
          }

        } catch (error) {
          console.error(`Error processing task ${actTask.id}:`, error);
          const syncError: SyncError = {
            record_id: actTask.id,
            error_type: 'mapping',
            error_message: error.message,
            error_details: { taskSubject: actTask.subject }
          };
          result.errors.push(syncError);
          result.records_failed++;
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < tasksToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate final results
    const endTime = new Date();
    result.completed_at = endTime.toISOString();
    result.duration_ms = endTime.getTime() - startTime.getTime();
    result.success = result.records_failed < result.total_records_processed; // Success if majority succeeded

    // Log summary
    console.log(`Tasks sync completed for user ${connection.user_id}:`);
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
    console.error('Fatal error during tasks sync:', error);
    
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
        api_endpoint: '/api/tasks',
        http_method: 'GET',
        response_time_ms: result.duration_ms,
        records_processed: result.total_records_processed,
        records_created: result.records_created,
        records_updated: result.records_updated,
        records_failed: result.records_failed,
        entity_type: 'task',
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