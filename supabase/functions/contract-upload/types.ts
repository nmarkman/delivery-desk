// =================================
// Contract Upload Types
// =================================

/**
 * Request interface for contract upload edge function
 */
export interface ContractUploadRequest {
  user_id: string;
  opportunity_id: string;
  file_name: string;
  file_path: string; // Path in Supabase Storage
}

/**
 * Parsed line item from AI extraction
 */
export interface ParsedLineItem {
  type: 'retainer' | 'deliverable';
  name: string;
  amount: number;
  date?: string; // YYYY-MM-DD format for retainers, null for deliverables
  original_text?: string; // Original contract text for deliverables
}

/**
 * Retainer expansion result (one product per month)
 */
export interface RetainerExpansion {
  monthly_items: ParsedLineItem[];
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  monthly_amount: number;
}

/**
 * Contract processing result from AI parsing
 */
export interface ContractProcessingResult {
  success: boolean;
  line_items: ParsedLineItem[];
  total_items: number;
  retainers_count: number;
  deliverables_count: number;
  processing_time_ms: number;
  errors?: string[];
  warnings?: string[];
}

/**
 * Product creation request for Act! API
 */
export interface ProductCreationRequest {
  name: string;
  price: number;
  quantity: number;
  itemNumber?: string; // YYYY-MM-DD format for retainers
  type?: string;
}

/**
 * Act! product creation response
 */
export interface ActProductCreationResponse {
  id: string;
  name: string;
  price: number;
  quantity: number;
  itemNumber?: string;
  opportunityID: string;
  created: string;
  edited: string;
}

/**
 * Product creation result for a single line item
 */
export interface ProductCreationResult {
  success: boolean;
  line_item: ParsedLineItem;
  act_product_id?: string;
  database_record_id?: string;
  error?: string;
}

/**
 * Contract upload response from edge function
 */
export interface ContractUploadResponse {
  success: boolean;
  message: string;
  user_id: string;
  opportunity_id: string;
  file_name: string;
  processing_result?: ContractProcessingResult;
  products_created: number;
  products_failed: number;
  total_processing_time_ms: number;
  errors?: string[];
  batch_id: string;
}

/**
 * OpenAI prompt response structure
 */
export interface OpenAIParsingResponse {
  line_items: Array<{
    type: 'retainer' | 'deliverable';
    name: string;
    amount: number;
    date?: string;
    original_text?: string;
    retainer_details?: {
      start_date: string;
      end_date: string;
      monthly_amount: number;
    };
  }>;
  total_items: number;
  confidence: number;
}

// =================================
// Constants
// =================================

export const CONTRACT_UPLOAD_SOURCES = {
  CONTRACT_UPLOAD: 'contract_upload'
} as const;

export const LINE_ITEM_TYPES = {
  RETAINER: 'retainer',
  DELIVERABLE: 'deliverable'
} as const;

export const STORAGE_BUCKET = 'contracts';

// =================================
// Error Types
// =================================

export interface ContractUploadError {
  type: 'pdf_processing' | 'ai_parsing' | 'product_creation' | 'database_sync' | 'validation';
  message: string;
  details?: any;
  timestamp: string;
}

// =================================
// Utility Types
// =================================

export type LineItemType = typeof LINE_ITEM_TYPES[keyof typeof LINE_ITEM_TYPES];
export type ContractUploadSource = typeof CONTRACT_UPLOAD_SOURCES[keyof typeof CONTRACT_UPLOAD_SOURCES];
