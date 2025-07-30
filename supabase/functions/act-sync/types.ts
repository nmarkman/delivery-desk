// =================================
// Act! CRM API Response Types
// =================================

// Base types for Act! API responses
export interface ActContact {
  id: string;
  displayName: string;
  emailAddress: string;
  isInvited: boolean;
}

export interface ActCompany {
  id: string;
  name: string;
}

export interface ActCustomFields {
  [key: string]: string | number | boolean | null;
}

// Opportunity Types
export interface ActOpportunity {
  id: string;
  name: string;
  contactNames: string;
  productTotal: number;
  weightedValue?: number;
  probability?: number;
  stage?: string;
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

export const OPERATION_TYPES = {
  SYNC_OPPORTUNITIES: 'sync_opportunities',
  SYNC_TASKS: 'sync_tasks',
  SYNC_FULL: 'sync_full',
  TEST_CONNECTION: 'test_connection',
  CREATE_TASK: 'create_task',
  UPDATE_TASK: 'update_task',
  UPLOAD_ATTACHMENT: 'upload_attachment',
} as const;

// Type helpers
export type ActActivityType = typeof ACT_ACTIVITY_TYPES[keyof typeof ACT_ACTIVITY_TYPES];
export type SyncStatus = typeof SYNC_STATUSES[keyof typeof SYNC_STATUSES];
export type ConnectionStatus = typeof CONNECTION_STATUSES[keyof typeof CONNECTION_STATUSES];
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