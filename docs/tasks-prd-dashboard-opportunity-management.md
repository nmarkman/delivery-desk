# Tasks: Dashboard Opportunity Management Updates

## Relevant Files

- `src/pages/Dashboard.tsx` - Main dashboard component that needs major updates for two-column layout and opportunity management
- `src/components/OpportunityCard.tsx` - New component for expandable opportunity cards with line item display
- `src/components/OpportunityFilter.tsx` - New filter component similar to contract upload filter
- `src/components/LineItemsTable.tsx` - Existing component that may need updates for new opportunity context
- `src/components/BillingDetailsModal.tsx` - New modal component for managing billing information
- `src/hooks/useOpportunityBilling.ts` - New custom hook for managing billing information CRUD operations
- `src/hooks/useDueDateUpdate.ts` - New custom hook for updating due dates with Act! CRM sync
- `supabase/migrations/20250828204357_add_opportunity_billing_info_table.sql` - Database migration for new billing information table with RLS policies and indexes
- `supabase/functions/act-sync/products-sync.ts` - Extend existing sync to handle due date updates
- `src/integrations/supabase/types.ts` - Will be auto-updated after migration but relevant for TypeScript types

### Notes

- Unit tests should be placed alongside components (e.g., `OpportunityCard.test.tsx`)
- The existing `LineItemsTable.tsx` component may be reused but might need props updates
- Database types will auto-generate after migration, no manual editing needed

## Tasks

- [ ] 1.0 Database Schema Setup
  - [x] 1.1 Create Supabase migration file for `opportunity_billing_info` table with all required fields (id, opportunity_id, organization fields, bill_to fields, payment_terms, po_number, user_id, timestamps)
  - [x] 1.2 Run migration and verify table creation in Supabase dashboard
  - [x] 1.3 Update TypeScript types by regenerating `src/integrations/supabase/types.ts`
  - [x] 1.4 Add RLS (Row Level Security) policies for the new table to ensure user data isolation
- [ ] 2.0 Dashboard Layout Restructure  
  - [ ] 2.1 Update `src/pages/Dashboard.tsx` to implement two-column CSS Grid layout
  - [ ] 2.2 Replace existing opportunity cards section with new grid container
  - [ ] 2.3 Implement infinite scroll functionality for opportunity loading
  - [ ] 2.4 Add mobile responsiveness to stack columns vertically on small screens
  - [ ] 2.5 Sort opportunities by company name ascending as default
- [ ] 3.0 Opportunity Card Component Development
  - [ ] 3.1 Create `src/components/OpportunityCard.tsx` with expandable/collapsible functionality
  - [ ] 3.2 Design card header with opportunity info (company name, contact, project name, status badge)
  - [ ] 3.3 Add billing status indicator to show when billing details are missing vs. present
  - [ ] 3.4 Implement expand/collapse animation using existing shadcn/ui patterns
  - [ ] 3.5 Add "Manage Billing" button/link to open billing details modal
- [ ] 4.0 Line Item Display and Due Date Management
  - [ ] 4.1 Create line items table within OpportunityCard showing description, type badge, due date, status
  - [ ] 4.2 Implement item type badges (Deliverable/Retainer) using existing contract upload badge styling
  - [ ] 4.3 Add due date display with empty state for unassigned deliverable due dates
  - [ ] 4.4 Create inline due date picker/editor for deliverable items only (retainer dates remain read-only)
  - [ ] 4.5 Implement optimistic updates for due date changes using React Query
  - [ ] 4.6 Add visual highlighting for deliverables that need due date assignment
- [ ] 5.0 Billing Information Management System
  - [ ] 5.1 Create `src/components/BillingDetailsModal.tsx` with Organization and Bill To sections
  - [ ] 5.2 Design form fields for organization (name, address, contact name, contact email)
  - [ ] 5.3 Design form fields for bill to (name, address, contact name, contact email, PO number optional)
  - [ ] 5.4 Add payment terms field with integer input and default value of 30
  - [ ] 5.5 Create `src/hooks/useOpportunityBilling.ts` for CRUD operations (create, read, update billing info)
  - [ ] 5.6 Implement form validation with simple required field checks
  - [ ] 5.7 Add save/cancel functionality with proper error handling and success feedback
- [ ] 6.0 Opportunity Filtering System
  - [ ] 6.1 Create `src/components/OpportunityFilter.tsx` similar to contract upload filter design
  - [ ] 6.2 Implement text-based search filtering by company name and project name
  - [ ] 6.3 Add filter state management and debounced search functionality
  - [ ] 6.4 Position filter component above the opportunity grid
  - [ ] 6.5 Ensure filter works with infinite scroll and doesn't break pagination
- [ ] 7.0 Act! CRM Integration for Due Date Sync
  - [ ] 7.1 Create `src/hooks/useDueDateUpdate.ts` for handling due date updates with Act! sync
  - [ ] 7.2 Extend `supabase/functions/act-sync/products-sync.ts` to accept due date update operations
  - [ ] 7.3 Add API endpoint handling for individual due date updates (not full sync)
  - [ ] 7.4 Implement proper error handling and retry logic for Act! API calls
  - [ ] 7.5 Add loading states and user feedback for sync operations
  - [ ] 7.6 Update local database records after successful Act! sync
- [ ] 8.0 UI/UX Polish and Responsive Design
  - [ ] 8.1 Ensure consistent spacing and padding with existing dashboard elements
  - [ ] 8.2 Test and refine mobile layout with vertical stacking
  - [ ] 8.3 Add loading skeletons for opportunity cards during data fetching
  - [ ] 8.4 Implement smooth animations for expand/collapse and modal interactions
  - [ ] 8.5 Add proper error states and empty states for edge cases
  - [ ] 8.6 Test cross-browser compatibility and ensure accessibility standards