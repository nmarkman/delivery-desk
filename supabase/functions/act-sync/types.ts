// =================================
// Act! CRM API Response Types
// =================================

// Base types for Act! API responses
export interface ActContact {
  id: string;
  displayName: string;
  emailAddress: string;
  company: string;
  isInvited: boolean;
}

export interface ActCompany {
  id: string;
  name: string;
}

export interface ActCustomFields {
  [key: string]: string | number | boolean | null;
}

export interface ActStageProcess {
  id: string;
  name: string;
  stages: any[];
  status: string;
  description: string;
  stagesCount: number;
}

export interface ActStage {
  id: string;
  name: string;
  number: number;
  process: ActStageProcess;
}

// Opportunity Types
export interface ActOpportunity {
  id: string;
  name: string;
  contactNames: string;
  productTotal: number;
  weightedValue?: number;
  probability?: number;
  stage?: ActStage;
  reason?: string;
  source?: string;
  actualCloseDate?: string;
  estimatedCloseDate?: string;
  created: string;
  edited: string;
  customFields?: ActCustomFields;
  contacts?: ActContact[];
  companies?: ActCompany[];
  // Additional fields that may be present
  description?: string;
  notes?: string;
  priority?: string;
  salesProcess?: string;
  recordManager?: string;
}

// Task/Activity Types
export interface ActRecurSpec {
  seriesStart: string;
  day: {
    dayAsInt: number;
    daysOfWeek: string | null;
    typedDay: string;
    dayType: string;
    ordinal: string;
  };
  seriesEnd: string;
  isEndless: boolean;
  month: number;
  frequency: number;
  recurType: string;
}

export interface ActAttachment {
  displayName: string;
  fileExtension: string;
  fileName: string;
  fileSize: number;
  fileSizeDisplay: string;
  fileType: string;
  lastModified: string;
  personal: boolean;
}

export interface ActTask {
  id: string;
  isCleared: boolean;
  isAlarmCleared: boolean;
  isAlarmed: boolean;
  leadMinutes: number;
  alarmDue: string;
  seriesID: string;
  startTime: string;
  endTime: string;
  externalId: string;
  accessorId: string;
  location: string;
  isTimeless: boolean;
  isAllDay: boolean;
  isPrivate: boolean;
  activityPriorityId: number;
  activityPriorityName: string;
  activityTypeId: number;
  activityTypeName: string;
  attachment: ActAttachment | null;
  bannerColor: string;
  details: string;
  subject: string;
  recurSpec: ActRecurSpec;
  created: string;
  edited: string;
  scheduledById: string;
  scheduledBy: string;
  scheduledForId: string;
  scheduledFor: string;
  companies: ActCompany[] | null;
  contacts: ActContact[] | null;
  groups: any[] | null;
  opportunities: Array<{
    id: string;
    name: string;
  }> | null;
}

// Product Types - Based on Act! API documentation
export interface ActProduct {
  id: string;
  name: string;
  cost: number;
  createDate: string;
  discount: number;
  discountPrice: number;
  editDate: string;
  itemNumber: string; // Date string that will be parsed to billed_at
  opportunityID: string;
  price: number;
  productID: string; // Separate product template ID
  quantity: number;
  type: string;
  total: number;
  isQuickbooksProduct: boolean;
  customFields: Record<string, any>;
  created: string;
  edited: string;
  editedBy: string;
  recordOwner: string;
  recordManager: string;
}

// =================================
// Database Integration Types
// =================================

// Database types imported from Supabase (these would typically be imported)
export interface DbOpportunity {
  id?: string;
  act_opportunity_id: string;
  act_raw_data?: Record<string, any>;
  name: string;
  company_name: string;
  primary_contact: string;
  contact_email?: string;
  total_contract_value: number;
  retainer_amount?: number;
  weighted_value?: number;
  contract_start_date?: string;
  contract_end_date?: string;
  retainer_start_date?: string;
  retainer_end_date?: string;
  actual_close_date?: string;
  status: string;
  probability?: number;
  sync_status?: string;
  sync_error_message?: string;
  last_synced_at?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  // Soft delete columns
  act_last_seen_at?: string;
  act_deleted_at?: string;
}

export interface DbDeliverable {
  id?: string;
  act_task_id?: string;
  act_series_id?: string;
  act_raw_data?: Record<string, any>;
  title: string;
  description?: string;
  client_id?: string;
  opportunity_id?: string;
  due_date: string;
  status: string;
  priority?: string;
  fee_amount?: number;
  is_billable?: boolean;
  act_activity_type?: string;
  act_activity_type_id?: number;
  start_time?: string;
  end_time?: string;
  is_completed?: boolean;
  has_reminder?: boolean;
  sync_status?: string;
  sync_error_message?: string;
  last_synced_at?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbInvoiceLineItem {
  id?: string;
  act_reference?: string; // Act! product ID for upsert matching
  billed_at?: string; // Parsed from Act! itemNumber field  
  created_at?: string;
  deliverable_id?: string;
  description: string;
  details?: string;
  invoice_id?: string; // Nullable - can be assigned later
  item_type: string;
  line_number: number;
  // line_total: Auto-calculated by database as (quantity * unit_rate) - excluded from interface
  opportunity_id?: string;
  quantity?: number;
  service_period_end?: string;
  service_period_start?: string;
  source?: string; // 'act_sync' | 'contract_upload' | 'manual'
  unit_rate?: number;
  updated_at?: string;
  user_id: string;
  // Soft delete columns
  act_last_seen_at?: string;
  act_deleted_at?: string;
}

export interface DbIntegrationLog {
  id?: string;
  user_id: string;
  act_connection_id?: string;
  act_database_name?: string;
  operation_type: string;
  operation_status: string;
  api_endpoint?: string;
  http_method?: string;
  http_status_code?: number;
  request_params?: Record<string, any>;
  response_data?: Record<string, any>;
  error_message?: string;
  error_details?: Record<string, any>;
  response_time_ms?: number;
  records_processed?: number;
  records_created?: number;
  records_updated?: number;
  records_failed?: number;
  entity_type?: string;
  entity_id?: string;
  related_table?: string;
  related_record_id?: string;
  sync_batch_id?: string;
  is_retry?: boolean;
  retry_count?: number;
  parent_log_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

// =================================
// Data Transformation Types
// =================================

// Type for mapping Act! data to database records
export interface OpportunityMappingResult {
  dbRecord: DbOpportunity;
  mappingWarnings: string[];
  customFieldsUsed: string[];
  missingRequiredFields: string[];
}

export interface TaskMappingResult {
  dbRecord: DbDeliverable;
  mappingWarnings: string[];
  activityTypeMatched: boolean;
  feeAmountParsed: boolean;
  missingRequiredFields: string[];
}

export interface ProductMappingResult {
  dbRecord: DbInvoiceLineItem;
  mappingWarnings: string[];
  dateValidationPassed: boolean;
  opportunityFound: boolean;
  missingRequiredFields: string[];
}

// =================================
// Sync Operation Types
// =================================

export interface SyncOperationOptions {
  batchSize?: number;
  maxRetries?: number;
  dryRun?: boolean;
  syncOnlyBillableTypes?: boolean;
  filterActivityTypes?: string[];
  updateExistingRecords?: boolean;
  createMissingClients?: boolean;
}

export interface SyncOperationResult {
  success: boolean;
  operation_type: string;
  started_at: string;
  completed_at?: string;
  total_records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  errors: SyncError[];
  warnings: string[];
  batch_id: string;
  duration_ms?: number;
}

export interface SyncError {
  record_id?: string;
  error_type: 'validation' | 'database' | 'api' | 'mapping';
  error_message: string;
  error_details?: Record<string, any>;
  retry_count?: number;
}

// =================================
// API Client Types (Re-exported for consistency)
// =================================

export interface UserActConnection {
  id: string;
  user_id: string;
  act_username: string;
  act_password_encrypted: string;
  act_database_name: string;
  act_region: string;
  api_base_url: string | null;
  cached_bearer_token: string | null;
  token_expires_at: string | null;
  token_last_refreshed_at: string | null;
  is_active: boolean | null;
  connection_status: string | null;
  connection_error: string | null;
  total_api_calls: number | null;
  last_sync_at: string | null;
  connection_name?: string | null;
  is_default?: boolean | null;
  last_connection_test?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ActApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  rateLimited?: boolean;
}

// =================================
// Validation and Parsing Types
// =================================

export interface CustomFieldConfig {
  fieldName: string;
  fieldType: 'retainer_amount' | 'retainer_start_date' | 'retainer_end_date' | 'billing_type' | 'fee_override';
  required: boolean;
  defaultValue?: any;
  validationPattern?: string;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsedData?: Record<string, any>;
}

export interface FeeParsingResult {
  amount?: number;
  currency?: string;
  source: 'subject' | 'details' | 'custom_field' | 'default';
  confidence: 'high' | 'medium' | 'low';
  rawText?: string;
}

// =================================
// Constants and Enums
// =================================

export const ACT_ACTIVITY_TYPES = {
  CALL: 'Call',
  MEETING: 'Meeting',
  TODO: 'To-do',
  APPOINTMENT: 'Appointment',
  BILLING: 'Billing',
  EMAIL: 'E-mail',
  LETTER: 'Letter',
  FAX: 'Fax',
} as const;

export const SYNC_STATUSES = {
  PENDING: 'pending',
  SYNCED: 'synced',
  ERROR: 'error',
  COMPLETED: 'synced', // Map to 'synced' for database compatibility
  FAILED: 'error',     // Map to 'error' for database compatibility
  PARTIAL: 'error',    // Map to 'error' for database compatibility
} as const;

export const CONNECTION_STATUSES = {
  UNTESTED: 'untested',
  CONNECTED: 'connected',
  FAILED: 'failed',
  ERROR: 'error',
  EXPIRED: 'expired',
} as const;

export const SOURCE_TYPES = {
  ACT_SYNC: 'act_sync',
  CONTRACT_UPLOAD: 'contract_upload', 
  MANUAL: 'manual',
} as const;

export const OPERATION_TYPES = {
  SYNC_OPPORTUNITIES: 'sync_opportunities',
  SYNC_TASKS: 'sync_tasks',
  SYNC_PRODUCTS: 'sync_products',
  SYNC_FULL: 'sync_full',
  TEST_CONNECTION: 'test_connection',
  CREATE_TASK: 'create_task',
  UPDATE_TASK: 'update_task',
  UPLOAD_ATTACHMENT: 'upload_attachment',
} as const;

// =================================
// Date Parsing Utilities
// =================================

/**
 * Robust date parser for Act! product itemNumber fields
 * Handles multiple date formats and returns PostgreSQL-compatible date string or null
 * If null is returned, the product should NOT be imported to the database
 */
export function parseItemNumberDate(itemNumber: string | null | undefined): string | null {
  if (!itemNumber || typeof itemNumber !== 'string' || itemNumber.trim() === '') {
    return null; // No date = skip product
  }

  const cleanInput = itemNumber.trim();
  let parsedDate: Date | null = null;

  // Format 1: YYYY-MM-DD (ISO format - preferred)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanInput);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Validate the date components match (handles invalid dates like 2024-02-30)
    if (parsedDate.getFullYear() === parseInt(year) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getDate() === parseInt(day)) {
      return cleanInput; // Already in PostgreSQL format
    }
  }

  // Format 2: MM/DD/YYYY (US format)
  const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleanInput);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (parsedDate.getFullYear() === parseInt(year) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getDate() === parseInt(day)) {
      // Convert to YYYY-MM-DD format
      const yyyy = year.padStart(4, '0');
      const mm = month.padStart(2, '0');
      const dd = day.padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Format 3: DD/MM/YYYY (European format)
  const euMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleanInput);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (parsedDate.getFullYear() === parseInt(year) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getDate() === parseInt(day)) {
      // Convert to YYYY-MM-DD format
      const yyyy = year.padStart(4, '0');
      const mm = month.padStart(2, '0');
      const dd = day.padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Format 4: MM-DD-YYYY (US format with dashes)
  const usDashMatch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(cleanInput);
  if (usDashMatch) {
    const [, month, day, year] = usDashMatch;
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (parsedDate.getFullYear() === parseInt(year) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getDate() === parseInt(day)) {
      const yyyy = year.padStart(4, '0');
      const mm = month.padStart(2, '0');
      const dd = day.padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Format 5: DD-MM-YYYY (European format with dashes)
  const euDashMatch = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(cleanInput);
  if (euDashMatch) {
    const [, day, month, year] = euDashMatch;
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (parsedDate.getFullYear() === parseInt(year) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getDate() === parseInt(day)) {
      const yyyy = year.padStart(4, '0');
      const mm = month.padStart(2, '0');
      const dd = day.padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Format 6: YYYY/MM/DD (ISO format with slashes)
  const isoSlashMatch = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(cleanInput);
  if (isoSlashMatch) {
    const [, year, month, day] = isoSlashMatch;
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (parsedDate.getFullYear() === parseInt(year) && 
        parsedDate.getMonth() === parseInt(month) - 1 && 
        parsedDate.getDate() === parseInt(day)) {
      const yyyy = year.padStart(4, '0');
      const mm = month.padStart(2, '0');
      const dd = day.padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // No valid date format found
  console.warn(`Invalid date format in itemNumber: "${cleanInput}". Product will be skipped.`);
  return null;
}

/**
 * Validate that a date string is reasonable for billing purposes
 * Rejects dates too far in the past or future
 */
export function validateBillingDate(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const twoYearsFromNow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  
  return date >= twoYearsAgo && date <= twoYearsFromNow;
}

/**
 * Test function for date parser - demonstrates all supported formats
 * Remove this function in production
 */
export function testDateParser(): void {
  const testCases = [
    '2025-09-01',    // YYYY-MM-DD (preferred)
    '09/01/2025',    // MM/DD/YYYY (US)
    '01/09/2025',    // DD/MM/YYYY (European)
    '09-01-2025',    // MM-DD-YYYY (US with dashes)
    '01-09-2025',    // DD-MM-YYYY (European with dashes)
    '2025/09/01',    // YYYY/MM/DD (ISO with slashes)
    '2025-02-30',    // Invalid date
    'invalid',       // Invalid format
    '',              // Empty string
    null,            // Null
  ];

  console.log('=== DATE PARSER TEST RESULTS ===');
  testCases.forEach(testCase => {
    const result = parseItemNumberDate(testCase as any);
    console.log(`Input: "${testCase}" → Output: ${result}`);
  });
}

// Type helpers
export type ActActivityType = typeof ACT_ACTIVITY_TYPES[keyof typeof ACT_ACTIVITY_TYPES];
export type SyncStatus = typeof SYNC_STATUSES[keyof typeof SYNC_STATUSES];
export type ConnectionStatus = typeof CONNECTION_STATUSES[keyof typeof CONNECTION_STATUSES];
export type SourceType = typeof SOURCE_TYPES[keyof typeof SOURCE_TYPES];
export type OperationType = typeof OPERATION_TYPES[keyof typeof OPERATION_TYPES];

// =================================
// Utility Types
// =================================

// Generic response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// Pagination types for large datasets
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// For bulk operations
export interface BulkOperationRequest<T> {
  items: T[];
  options?: {
    batchSize?: number;
    continueOnError?: boolean;
    validateFirst?: boolean;
  };
}

export interface BulkOperationResponse<T> {
  success: boolean;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  results: Array<{
    item: T;
    success: boolean;
    error?: string;
    id?: string;
  }>;
} 