# Tasks: Dashboard Opportunity Management Updates

## Relevant Files

### Completed Files
- `src/pages/Dashboard.tsx` - ✅ Two-column layout with infinite scroll implemented
- `src/components/OpportunityCard.tsx` - ✅ Expandable cards with full line item management and Act! CRM sync
- `src/hooks/useLineItems.ts` - ✅ React Query hook with optimistic updates and enhanced CRUD
- `src/hooks/useLineItemCrud.ts` - ✅ Enhanced CRUD hook with Act! sync integration
- `src/components/BillingDetailsModal.tsx` - ✅ Modal for managing billing information
- `src/hooks/useOpportunityBilling.ts` - ✅ CRUD hook for billing information
- `src/components/OpportunityFilter.tsx` - ✅ Filter component with debounced search
- `src/components/LineItemsTestPanel.tsx` - ✅ Test component for API integration
- `supabase/migrations/20250828204357_add_opportunity_billing_info_table.sql` - ✅ Database migration applied
- `src/integrations/supabase/types.ts` - ✅ Auto-updated with new table types
- `supabase/functions/act-sync/index.ts` - ✅ Enhanced with product update/delete operations
- `supabase/functions/act-sync/act-client.ts` - ✅ Added updateProduct and deleteProduct methods

### Files Still Needed (for Task 7.6+)
- ✅ `src/components/ContractUploadModal.tsx` - Modal wrapper for contract upload workflow
- ✅ Enhanced "Manage" button to trigger upload modal instead of separate page

### Legacy Files (Reference Only)
- `src/components/LineItemsTable.tsx` - Existing component, may reference for patterns

### Notes

- Unit tests should be placed alongside components (e.g., `OpportunityCard.test.tsx`)
- The existing `LineItemsTable.tsx` component may be reused but might need props updates
- Database types will auto-generate after migration, no manual editing needed

## Current Implementation State (Last Updated: 2025-08-30)

### Completed Infrastructure
- ✅ Database: `opportunity_billing_info` table with RLS policies 
- ✅ Dashboard: Two-column responsive grid with infinite scroll and filtering
- ✅ OpportunityCard: Expandable component with full line item management and Act! CRM sync
- ✅ Line Items: React Query hooks with optimistic updates and enhanced CRUD operations
- ✅ Billing Information: Complete modal system with organization/bill-to management
- ✅ Act! CRM Integration: Full product update/delete sync with error handling and user feedback
- ✅ UI Improvements: Circular action buttons, multi-field editing, type display moved to price area

### Key Implementation Details
- **Field Mapping**: Line item types stored in `details` field ("retainer"/"deliverable"), not `item_type` (contains "fee")
- **Date Terminology**: Uses "Billing Date" label (not "Due Date") 
- **React Query**: Implemented in `useLineItems.ts` with optimistic updates
- **Visual System**: Orange highlighting for deliverables needing billing dates
- **Type Safety**: LineItem interface defined in OpportunityCard and useLineItems hook

### Files Created/Modified (All Complete Through Task 7.5.3)
- ✅ `src/components/OpportunityCard.tsx` - Complete with line item management and Act! CRM sync
- ✅ `src/hooks/useLineItems.ts` - React Query hook for optimistic updates with enhanced CRUD
- ✅ `src/hooks/useLineItemCrud.ts` - Enhanced CRUD hook with Act! sync integration
- ✅ `src/components/BillingDetailsModal.tsx` - Complete billing information modal
- ✅ `src/hooks/useOpportunityBilling.ts` - CRUD hook for billing information
- ✅ `src/components/OpportunityFilter.tsx` - Filter component with debounced search
- ✅ `src/components/LineItemsTestPanel.tsx` - Testing infrastructure
- ✅ `src/pages/Dashboard.tsx` - Updated with two-column grid and filter integration
- ✅ Migration: `supabase/migrations/20250828204357_add_opportunity_billing_info_table.sql`
- ✅ `src/integrations/supabase/types.ts` - Auto-updated after migration
- ✅ `supabase/functions/act-sync/index.ts` - Enhanced with product CRUD operations
- ✅ `supabase/functions/act-sync/act-client.ts` - Added updateProduct and deleteProduct methods

### Next Focus (Task 7.6+) - Contract Upload Modal Integration
- ✅ `src/components/ContractUploadModal.tsx` - Modal wrapper for embedding upload workflow
- ✅ Enhanced "Manage" button functionality to trigger modal instead of separate page

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
- [x] 5.0 Billing Information Management System
  - [x] 5.1 Create `src/components/BillingDetailsModal.tsx` with Organization and Bill To sections
  - [x] 5.2 Design form fields for organization (name, address, contact name, contact email)
  - [x] 5.3 Design form fields for bill to (name, address, contact name, contact email, PO number optional)
  - [x] 5.4 Add payment terms field with integer input and default value of 30
  - [x] 5.5 Create `src/hooks/useOpportunityBilling.ts` for CRUD operations (create, read, update billing info)
  - [x] 5.6 Implement form validation with simple required field checks
  - [x] 5.7 Add save/cancel functionality with proper error handling and success feedback
  - [x] 5.8 Connect BillingDetailsModal to OpportunityCard Configure button
  - [x] 5.9 Integrate useOpportunityBilling hook into OpportunityCard for status display
  - [x] 5.10 Update billing status indicator to show actual billing info presence
  - [x] 5.11 Test database CRUD operations work correctly with Supabase
- [x] 6.0 Opportunity Filtering System
  - [x] 6.1 Create `src/components/OpportunityFilter.tsx` similar to contract upload filter design
  - [x] 6.2 Implement text-based search filtering by company name and project name
  - [x] 6.3 Add filter state management and debounced search functionality
  - [x] 6.4 Position filter component above the opportunity grid
- [x] 7.0 LineItem Management with Act! CRM Integration
  - [x] 7.1 Expand inline editing to support description, billing date, and unit rate for all line items
  - [x] 7.2 Add Act! API methods for updating and deleting products (PUT/DELETE endpoints)
  - [x] 7.3 Create hooks for LineItem CRUD operations with Act! sync integration
  - [x] 7.4 Implement soft delete for line items with act_deleted_at timestamp
  - [x] 7.5 Add loading states and error handling for LineItem operations
  - [x] 7.5.1 Fix DELETE edge function call to remove products from Act! CRM
  - [x] 7.5.2 Fix PUT edge function call to update products in Act! CRM  
  - [x] 7.5.3 Remove deliverable/retainer badge and add as text next to price
  - [x] 7.6 Create Contract Upload Modal component for embedding upload experience
  - [x] 7.7 Replace "Manage" button with "Upload Line Items" modal trigger
  - [x] 7.8 Integrate contract upload workflow into modal (skip opportunity selection)
  - [x] 7.9 Test and remove contract upload page from navigation
- [x] 8.0 UI/UX Polish and Responsive Design
  - [x] 8.1 Ensure consistent spacing and padding with existing dashboard elements
  - [x] 8.2 Test and refine mobile layout with vertical stacking
  - [x] 8.3 Add loading skeletons for opportunity cards during data fetching
  - [x] 8.4 Implement smooth animations for expand/collapse and modal interactions
  - [x] 8.5 Add proper error states and empty states for edge cases
  - [x] 8.6 Test cross-browser compatibility and ensure accessibility standards