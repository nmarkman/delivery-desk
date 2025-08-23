# Task List: Contract Upload → Line Item Parsing → Product Creation

Based on PRD: `prd-contract-upload-products.md`

## Relevant Files

- `supabase/functions/contract-upload/` - New edge function for PDF processing and AI parsing
- `supabase/functions/contract-upload/index.ts` - Main contract upload processing logic
- `supabase/functions/contract-upload/pdf-parser.ts` - PDF text extraction and AI prompting
- `supabase/functions/contract-upload/product-creator.ts` - Act! product creation and database sync
- `supabase/functions/contract-upload/types.ts` - TypeScript interfaces for contract processing
- `src/pages/ContractUpload.tsx` - New React page for contract upload UI
- `src/components/ContractUploadForm.tsx` - Form component for file upload and opportunity selection
- `src/components/LineItemsTable.tsx` - Editable table for reviewing parsed line items
- `src/App.tsx` - Add new route for contract upload page
- `supabase/functions/act-sync/act-client.ts` - Extend with createProduct method
- `supabase/storage/buckets/contracts/` - S3 bucket for PDF storage

### Notes

- PDF processing will use Supabase Edge Functions with OpenAI integration
- Contract files will be stored in Supabase Storage (S3-compatible)
- AI parsing will target "Cost Proposal" section specifically
- Product creation will leverage existing Act! integration patterns
- Database sync will use existing products sync logic for consistency

## Tasks

- [ ] 1.0 Set Up Infrastructure and Storage
  - [ ] 1.1 Create Supabase Storage bucket for contract PDFs
  - [ ] 1.2 Configure storage policies for authenticated users
  - [ ] 1.3 Set up OpenAI API integration in Supabase Edge Functions
  - [ ] 1.4 Create new edge function directory structure for contract-upload
  - [ ] 1.5 Configure environment variables for OpenAI API key

- [ ] 2.0 Create TypeScript Types and Interfaces
  - [ ] 2.1 Create `ContractUploadRequest` interface for edge function input
  - [ ] 2.2 Create `ParsedLineItem` interface for AI-extracted data
  - [ ] 2.3 Create `ContractProcessingResult` interface for parsing results
  - [ ] 2.4 Create `ProductCreationRequest` interface for Act! API calls
  - [ ] 2.5 Create `ContractUploadResponse` interface for edge function output

- [ ] 3.0 Implement PDF Processing and AI Parsing
  - [ ] 3.1 Create PDF text extraction function using PDF.js or similar
  - [ ] 3.2 Implement "Cost Proposal" section detection logic
  - [ ] 3.3 Design OpenAI prompt for line item extraction with retainer/deliverable classification
  - [ ] 3.4 Implement retainer date calculation logic (1st of each month)
  - [ ] 3.5 Create retainer expansion logic (one product per month)
  - [ ] 3.6 Add validation for extracted line items (required fields, amount formats)
  - [ ] 3.7 Implement error handling for PDF processing failures

- [ ] 4.0 Extend Act! Integration for Product Creation
  - [ ] 4.1 Add `createProduct(opportunityId, productData)` method to ActClient
  - [ ] 4.2 Implement Act! API POST request to `/api/opportunities/{opportunityId}/products`
  - [ ] 4.3 Add proper error handling and retry logic for Act! API calls
  - [ ] 4.4 Create product creation batch processing for multiple line items
  - [ ] 4.5 Add validation for Act! API responses and error mapping

- [ ] 5.0 Implement Database Sync Logic
  - [ ] 5.1 Create function to fetch products for specific opportunity after creation
  - [ ] 5.2 Implement database insertion using existing products sync mapping logic
  - [ ] 5.3 Set `source = 'contract_upload'` for all created records
  - [ ] 5.4 Add proper error handling for database operations
  - [ ] 5.5 Implement transaction rollback if any step fails

- [ ] 6.0 Create Main Contract Upload Edge Function
  - [ ] 6.1 Create main edge function entry point with proper CORS handling
  - [ ] 6.2 Implement file upload handling and S3 storage
  - [ ] 6.3 Orchestrate PDF processing → AI parsing → product creation → database sync
  - [ ] 6.4 Add comprehensive logging and error reporting
  - [ ] 6.5 Implement proper response formatting and status codes

- [ ] 7.0 Build React UI Components
  - [ ] 7.1 Create `ContractUpload.tsx` page component with routing
  - [ ] 7.2 Build `ContractUploadForm.tsx` with file upload and opportunity selection
  - [ ] 7.3 Create `LineItemsTable.tsx` with editable fields and delete functionality
  - [ ] 7.4 Add loading states and progress indicators
  - [ ] 7.5 Implement form validation and error display
  - [ ] 7.6 Add success/error messaging and user feedback

- [ ] 8.0 Integrate UI with Backend
  - [ ] 8.1 Connect file upload to edge function endpoint
  - [ ] 8.2 Implement opportunity dropdown populated from Supabase
  - [ ] 8.3 Add line item editing and removal functionality
  - [ ] 8.4 Connect submit action to product creation workflow
  - [ ] 8.5 Add proper error handling and user feedback
  - [ ] 8.6 Implement loading states during processing

- [ ] 9.0 Add Routing and Navigation
  - [ ] 9.1 Add `/contract-upload` route to App.tsx
  - [ ] 9.2 Update navigation/sidebar to include contract upload link
  - [ ] 9.3 Add breadcrumb navigation for contract upload page
  - [ ] 9.4 Ensure proper authentication and access control

- [ ] 10.0 Testing and Validation
  - [ ] 10.1 Test PDF upload and storage functionality
  - [ ] 10.2 Validate AI parsing with sample contract PDFs
  - [ ] 10.3 Test retainer expansion logic with various date ranges
  - [ ] 10.4 Verify Act! product creation with real API calls
  - [ ] 10.5 Test database sync and record creation
  - [ ] 10.6 Validate end-to-end workflow with complete contract processing
  - [ ] 10.7 Test error scenarios and edge cases
  - [ ] 10.8 Verify UI responsiveness and user experience

## Implementation Notes

- Follow existing patterns from act-sync functions for consistency
- Use existing Act! authentication and connection management
- Leverage existing products sync logic for database operations
- Keep UI simple and focused on core functionality
- Prioritize error handling and user feedback
- Ensure proper logging for debugging and monitoring
