# Task List: Sync Act! Products into DeliveryDesk

Based on PRD: `prd-sync-act-products.md`

## Relevant Files

- `supabase/migrations/add_products_sync_schema.sql` - Database migration to add missing fields to invoice_line_items table and create indexes
- `supabase/functions/act-sync/types.ts` - Add TypeScript interfaces for Act! Products and database operations
- `supabase/functions/act-sync/products-sync.ts` - Main products synchronization logic with mapping and upsert functions
- `supabase/functions/act-sync/act-client.ts` - Extend ActClient class with products API methods
- `supabase/functions/act-sync/index.ts` - Integrate products sync into main edge function
- `src/integrations/supabase/types.ts` - Updated TypeScript types after database schema changes

### Notes

- Database migrations will be applied using the Supabase MCP tool as preferred by the user
- Products sync will be integrated into the existing act-sync edge function architecture
- Testing will be done through the existing edge function endpoint

## Tasks

- [x] 1.0 Update Database Schema for Act! Products Sync
  - [x] 1.1 Add `billed_at` DATE field to invoice_line_items table (parsed from Act! itemNumber)
  - [x] 1.2 Add `source` TEXT field to differentiate Act! vs tool-created records ('act_sync' | 'contract_upload' | 'manual')
  - [x] 1.3 Make `invoice_id` field nullable in invoice_line_items table (change from required to optional)
  - [x] 1.4 Add database index on `act_reference` field for improved upsert performance
  - [x] 1.5 Apply database migration using Supabase MCP tool
  - [x] 1.6 Update Supabase TypeScript types by regenerating types after schema changes

- [x] 2.0 Add TypeScript Types for Act! Products
  - [x] 2.1 Create `ActProduct` interface in types.ts with fields: id, name, quantity, price, itemNumber, opportunityID
  - [x] 2.2 Create `DbInvoiceLineItem` interface matching updated database schema including billed_at and source fields
  - [x] 2.3 Create `ProductMappingResult` interface for validation results, warnings, and missing fields tracking
  - [x] 2.4 Add products-related constants and enums (product sync status, source types)

- [ ] 3.0 Implement Act! Products API Integration  
  - [x] 3.1 Add `getOpportunityProducts(opportunityId: string)` method to ActClient for fetching products by opportunity ID
  - [x] 3.2 Add `getAllOpportunityProducts(connection)` method to fetch products for all active opportunities
  - [x] 3.5 Test products API endpoint structure and document expected response format
  - [x] 3.6 Implement robust date parsing for multiple itemNumber formats (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.)
    - ✅ Supports 6 date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, MM-DD-YYYY, DD-MM-YYYY, YYYY/MM/DD
    - ✅ Validates date components to catch invalid dates (e.g., Feb 30th)
    - ✅ Returns PostgreSQL-compatible YYYY-MM-DD format or null (skip product)  
    - ✅ Includes billing date validation (2-year range check)
    - ✅ Comprehensive logging for debugging invalid formats
    - ✅ API test successful: Retrieved 1 product with complete 21-field structure  
    - 🚨 CRITICAL FINDING: When itemNumber contains DateTime object, Act! API returns 500 error
    - ✅ CONFIRMED: Test opportunity 60043007-425e-4fc5-b90c-2b57eea12ebd has DateTime in itemNumber field
    - 📝 API Error: "Object of type 'System.DateTime' cannot be converted to type 'System.String'"
    - ✅ SOLUTION CONFIRMED: String dates in itemNumber work perfectly!
    - 🎯 SUCCESS: Retrieved product with itemNumber "2025-09-01" in YYYY-MM-DD format
    - 📝 Product: "Consulting Services - PM", $10,000, 1 qty

- [ ] 4.0 Create Products Sync Logic and Mapping
  - [x] 4.1 Create `products-sync.ts` module following existing sync architecture pattern
  - [x] 4.2 Implement `mapActProductToDb()` function with PRD field mappings (id→act_reference, name→description, etc.)
  - [x] 4.3 Add date validation for `itemNumber` field - skip products with invalid/missing dates
  - [x] 4.4 Implement `upsertInvoiceLineItem()` function with act_reference-based matching for existing records
  - [x] 4.5 Add `syncProducts()` function with batch processing, error handling, and logging integration
  - [x] 4.6 Implement filtering to only sync products from active opportunities (check opportunity status)
    - ✅ Added database query filtering to exclude "Closed Lost" and "Closed Won" opportunities
    - ✅ Implemented pre-filtering of products before batch processing (more efficient)
    - ✅ Enhanced logging to show active vs. total opportunity counts  
    - ✅ Clear messaging when products are skipped due to closed opportunities
  - [x] 4.7 Add validation to prevent overwriting custom tool-specific values (like manually set invoice_id)
    - ✅ Added getExistingInvoiceLineItem() to check for existing records before update
    - ✅ Implemented preserveManualValues() to protect invoice_id, deliverable_id, service periods
    - ✅ Smart preservation logic based on source field (manual vs act_sync records)
    - ✅ Enhanced details field preservation (keeps richer manual content)
    - ✅ Detailed logging when manual values are preserved during sync

- [ ] 5.0 Integrate Products Sync into Edge Function
  - [ ] 5.1 Add `syncProductsData()` method to ActClient class following existing patterns
  - [ ] 5.2 Update main act-sync edge function index.ts to include products sync in parallel with opportunities/tasks
  - [ ] 5.3 Add products sync results to response data structure
  - [ ] 5.4 Update integration logging to include products sync operations and statistics
  - [ ] 5.5 Add products sync to operation_type options ('sync_products', 'analysis_products')

- [ ] 6.0 Test and Validate Products Sync Implementation
  - [ ] 6.1 Test products API endpoint with real Act! connection to understand data structure
  - [ ] 6.2 Test products sync with sample data to verify field mappings work correctly
  - [ ] 6.3 Verify no duplicate act_reference entries are created during multiple sync runs
  - [ ] 6.4 Test that only products from active opportunities are synced (inactive ones filtered out)
  - [ ] 6.5 Verify itemNumber date validation correctly skips invalid records
  - [ ] 6.6 Test that existing invoice_id values are not overwritten during sync
  - [ ] 6.7 Validate that sync results show proper success/failure counts and error messages
