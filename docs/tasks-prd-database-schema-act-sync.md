## Relevant Files

- `supabase/functions/act-sync/index.ts` - Main Edge Function for Act! CRM API synchronization (DEPLOYED)
- `supabase/functions/act-sync/types.ts` - TypeScript types for Act! API responses and database models
- `supabase/functions/act-sync/act-client.ts` - Act! API client with authentication and request handling
- `supabase/migrations/[timestamp]-enhanced-schema.sql` - Enhanced database schema migration
- `src/components/ActSyncButton.tsx` - UI component for manual sync trigger
- `src/pages/ActConnection.tsx` - Page for Act! CRM connection management
- `src/lib/act-sync.ts` - Client-side utilities for sync operations
- `docs/act-api-exploration.md` - Documentation of Act! API data structure analysis

### Notes

- Edge Functions in Supabase use Deno runtime, not Node.js
- All database migrations should include proper RLS policies
- Act! API credentials will be stored as Supabase environment variables

## Tasks

- [x] 1.0 Set Up Act! API Connection & Exploration
  - [x] 1.1 Configure Act! trial account credentials in Supabase environment variables (ACT_USERNAME, ACT_PASSWORD, ACT_DATABASE_NAME)
  - [x] 1.2 Create basic Supabase Edge Function structure at `supabase/functions/act-sync/index.ts`
  - [x] 1.3 Implement Act! authentication flow to obtain bearer token from `/act.web.api/authorize`
  - [x] 1.4 Test basic API connectivity with a simple endpoint call
  - [x] 1.5 Verify `Act-Database-Name` header is properly included in requests

- [x] 2.0 Analyze Act! Data Structure & Document Findings
  - [x] 2.1 Make test API call to `GET /api/opportunities` and log complete response structure
  - [x] 2.1.1 Determine based on `opportunities` data if fetching companies data is required and evaluate relationship between opportunities and companies
  - [x] 2.2 Make test API call to `GET /api/tasks` and log complete response structure (COMPLETE - found 4 activity types: Meeting, Appointment, Call, To-do)  
  - [x] 2.2.1 Create custom task types in Act! trial account for DeliveryDesk-specific tasks (e.g., "Billing") and test API response
  - [x] 2.3 Analyze JWT token expiration and implement token refresh strategy in Edge Function
  - [x] 2.4 Create `docs/act-api-exploration.md` documenting all response fields and structure in user-friendly format
  - [x] 2.5 Identify which Act! opportunity fields map to DeliveryDesk requirements (client name, contact info, retainer amounts, contract dates)
  - [x] 2.6 Determine if custom opportunity fields need to be created in Act! for retainer tracking
  - [x] 2.7 Assess whether separate accounts API calls are needed or if opportunity data includes company info

- [ ] 3.0 Design Enhanced Database Schema
  - [ ] 3.1 Create invoice status enum (draft, invoiced, paid, overdue)
  - [ ] 3.2 Create `opportunities` table with Act! opportunity ID, client info, retainer amount, contract dates
  - [ ] 3.3 Create `deliverables` table linked to opportunities with fee amount, dates, and Act! task ID
  - [ ] 3.4 Create `invoices` table with opportunity reference, billing period, amounts, dates, and status
  - [ ] 3.5 Create `invoice_line_items` table for itemized invoice entries (retainer + deliverables)
  - [ ] 3.6 Create `integration_logs` table for sync timestamps, errors, and API call details
  - [ ] 3.7 Add proper foreign key relationships and constraints between all tables
  - [ ] 3.8 Implement Row Level Security (RLS) policies for all new tables
  - [ ] 3.9 Add database indexes on frequently queried fields (Act! IDs, invoice dates, client lookup)
  - [ ] 3.10 Update Supabase TypeScript types by running type generation

- [ ] 4.0 Implement Act! Sync Edge Function
  - [ ] 4.1 Create `act-client.ts` module with authentication, rate limiting, and request handling
  - [ ] 4.2 Create TypeScript types in `types.ts` for Act! API responses and database models
  - [ ] 4.3 Implement opportunities sync logic with upsert operations to `opportunities` table
  - [ ] 4.4 Implement tasks sync logic filtering for deliverable-specific task types
  - [ ] 4.5 Add rate limiting with appropriate delays between API requests
  - [ ] 4.6 Implement retry logic with exponential backoff for failed API calls
  - [ ] 4.7 Calculate monthly retainer amounts by dividing contract value by months between start/end dates
  - [ ] 4.8 Map Act! task data to `deliverables` table, parsing fee amounts from task names/descriptions
  - [ ] 4.9 Store raw Act! response data in JSON fields for debugging and future feature development

- [ ] 5.0 Create Manual Sync UI Components
  - [ ] 5.1 Create `ActSyncButton.tsx` component with loading states and sync progress indicator
  - [ ] 5.2 Create `ActConnection.tsx` page for Act! credential management and manual sync trigger
  - [ ] 5.3 Add API route for triggering manual sync from the UI
  - [ ] 5.4 Integrate sync button into existing dashboard or navigation
  - [ ] 5.5 Add success/error toast notifications for sync operations
  - [ ] 5.6 Display last sync timestamp and sync status on connection page

- [ ] 6.0 Set Up Automated Daily Sync
  - [ ] 6.1 Configure Supabase cron job to run daily sync at appropriate time
  - [ ] 6.2 Create separate scheduled function entry point that calls the main sync logic
  - [ ] 6.3 Test automated sync execution and verify it runs on schedule
  - [ ] 6.4 Add logging to track automated sync execution and results

- [ ] 7.0 Implement Error Handling & Logging
  - [ ] 7.1 Enhance integration_logs table usage throughout sync process
  - [ ] 7.2 Log all API calls with request/response details (without exposing credentials)
  - [ ] 7.3 Implement graceful handling of partial sync failures
  - [ ] 7.4 Add validation for required fields before creating database records
  - [ ] 7.5 Handle missing or invalid Act! data with appropriate default values and warnings
  - [ ] 7.6 Log Act! opportunities that don't map to expected DeliveryDesk structure

- [ ] 8.0 Testing & Validation
  - [ ] 8.1 Test Act! API authentication with trial account credentials
  - [ ] 8.2 Verify opportunities sync creates proper records in database
  - [ ] 8.3 Verify tasks sync correctly filters and maps deliverable tasks
  - [ ] 8.4 Test manual sync trigger from UI works correctly
  - [ ] 8.5 Test automated daily sync executes on schedule
  - [ ] 8.6 Validate data integrity and foreign key relationships
  - [ ] 8.7 Test error scenarios (API failures, invalid data, rate limiting)
  - [ ] 8.8 Verify RLS policies properly isolate user data
  - [ ] 8.9 Test upsert functionality with changed Act! data
  - [ ] 8.10 Document any recommended Act! custom fields or task types for Russell to configure 