# Tasks: Dashboard Opportunity Management Updates

## Relevant Files

### Completed Files
- `src/pages/Dashboard.tsx` - ✅ Two-column layout with infinite scroll implemented
- `src/components/OpportunityCard.tsx` - ✅ Expandable cards with full line item management
- `src/hooks/useLineItems.ts` - ✅ React Query hook with optimistic updates
- `src/components/LineItemsTestPanel.tsx` - ✅ Test component for API integration
- `supabase/migrations/20250828204357_add_opportunity_billing_info_table.sql` - ✅ Database migration applied
- `src/integrations/supabase/types.ts` - ✅ Auto-updated with new table types

### Files To Create  
- `src/components/BillingDetailsModal.tsx` - Modal for managing billing information
- `src/hooks/useOpportunityBilling.ts` - CRUD hook for billing information
- `src/components/OpportunityFilter.tsx` - Filter component similar to contract upload
- `src/hooks/useDueDateUpdate.ts` - Hook for Act! CRM sync integration
- `supabase/functions/act-sync/products-sync.ts` - Extend for due date updates

### Legacy Files (Reference Only)
- `src/components/LineItemsTable.tsx` - Existing component, may reference for patterns

### Notes

- Unit tests should be placed alongside components (e.g., `OpportunityCard.test.tsx`)
- The existing `LineItemsTable.tsx` component may be reused but might need props updates
- Database types will auto-generate after migration, no manual editing needed

## Current Implementation State (Last Updated: 2025-01-15)

### Completed Infrastructure
- ✅ Database: `opportunity_billing_info` table with RLS policies 
- ✅ Dashboard: Two-column responsive grid with infinite scroll
- ✅ OpportunityCard: Expandable component with full line item management
- ✅ Line Items: React Query hook with optimistic updates
- ✅ Due Date Management: Inline editor for deliverables only

### Key Implementation Details
- **Field Mapping**: Line item types stored in `details` field ("retainer"/"deliverable"), not `item_type` (contains "fee")
- **Date Terminology**: Uses "Billing Date" label (not "Due Date") 
- **React Query**: Implemented in `useLineItems.ts` with optimistic updates
- **Visual System**: Orange highlighting for deliverables needing billing dates
- **Type Safety**: LineItem interface defined in OpportunityCard and useLineItems hook

### Files Created/Modified
- ✅ `src/components/OpportunityCard.tsx` - Complete with line item management
- ✅ `src/hooks/useLineItems.ts` - React Query hook for optimistic updates  
- ✅ `src/components/LineItemsTestPanel.tsx` - Testing infrastructure
- ✅ `src/pages/Dashboard.tsx` - Updated with two-column grid
- ✅ Migration: `supabase/migrations/20250828204357_add_opportunity_billing_info_table.sql`
- 🔄 `src/integrations/supabase/types.ts` - Auto-updated after migration

### Files Still Needed
- ❌ `src/components/BillingDetailsModal.tsx` 
- ❌ `src/hooks/useOpportunityBilling.ts`
- ❌ `src/components/OpportunityFilter.tsx`
- ❌ `src/hooks/useDueDateUpdate.ts` (for Act! sync)

## Tasks

- [x] 1.0 Database Schema Setup
  - [x] 1.1 Create Supabase migration file for `opportunity_billing_info` table with all required fields (id, opportunity_id, organization fields, bill_to fields, payment_terms, po_number, user_id, timestamps)
  - [x] 1.2 Run migration and verify table creation in Supabase dashboard
  - [x] 1.3 Update TypeScript types by regenerating `src/integrations/supabase/types.ts`
  - [x] 1.4 Add RLS (Row Level Security) policies for the new table to ensure user data isolation
- [x] 2.0 Dashboard Layout Restructure  
  - [x] 2.1 Update `src/pages/Dashboard.tsx` to implement two-column CSS Grid layout
  - [x] 2.2 Replace existing opportunity cards section with new grid container
  - [x] 2.3 Implement infinite scroll functionality for opportunity loading
  - [x] 2.4 Add mobile responsiveness to stack columns vertically on small screens
  - [x] 2.5 Sort opportunities by company name ascending as default
- [x] 3.0 Opportunity Card Component Development
  - [x] 3.1 Create `src/components/OpportunityCard.tsx` with expandable/collapsible functionality
  - [x] 3.2 Design card header with opportunity info (company name, contact, project name, status badge)
  - [x] 3.3 Add billing status indicator to show when billing details are missing vs. present
  - [x] 3.4 Implement expand/collapse animation using existing shadcn/ui patterns
  - [x] 3.5 Add "Manage Billing" button/link to open billing details modal
- [x] 4.0 Line Item Display and Due Date Management
  - [x] 4.1 Create line items table within OpportunityCard showing description, type badge, due date, status
  - [x] 4.2 Implement item type badges (Deliverable/Retainer) using existing contract upload badge styling
  - [x] 4.3 Add due date display with empty state for unassigned deliverable due dates
  - [x] 4.4 Create inline due date picker/editor for deliverable items only (retainer dates remain read-only)
  - [x] 4.5 Implement optimistic updates for due date changes using React Query
  - [x] 4.6 Add visual highlighting for deliverables that need due date assignment
- [ ] 5.0 Billing Information Management System
  - [x] 5.1 Create `src/components/BillingDetailsModal.tsx` with Organization and Bill To sections
  - [x] 5.2 Design form fields for organization (name, address, contact name, contact email)
  - [x] 5.3 Design form fields for bill to (name, address, contact name, contact email, PO number optional)
  - [x] 5.4 Add payment terms field with integer input and default value of 30
  - [x] 5.5 Create `src/hooks/useOpportunityBilling.ts` for CRUD operations (create, read, update billing info)
  - [x] 5.6 Implement form validation with simple required field checks
  - [x] 5.7 Add save/cancel functionality with proper error handling and success feedback
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