# Tasks: Feedback Session - Nice to Have Items

## Relevant Files

- `src/components/ContractUploadModal.tsx` - Modal where manual line item creation messaging needs improvement
- `src/hooks/use-toast.ts` - Toast hook that needs adjustment for manual line item creation flow
- `src/components/Dashboard.tsx` - Dashboard page where opportunity filtering needs to be implemented
- `src/components/OpportunityFilter.tsx` - Component for managing opportunity filter state (exists but may need updates)
- `src/components/BillingDetailsModal.tsx` - Modal where contact email field needs to be made optional
- `src/integrations/supabase/types.ts` - Auto-generated types that may need updates after DB migrations
- `supabase/migrations/` - Database migration files for making contact email nullable
- `src/utils/exportHelpers.ts` - New utility for Excel export functionality (TO BE CREATED)
- `src/components/ui/ExportButton.tsx` - New export button component (TO BE CREATED)

### Notes

- Manual line item messaging improvements should maintain the existing two-step process
- Dashboard filtering should work seamlessly with existing search functionality
- Excel export should replicate key data from current spreadsheet workflows

## Tasks

- [x] 1.0 Improve Manual Line Item Creation Messaging
  - [x] 1.1 Locate manual line item creation in ContractUploadModal component
  - [x] 1.2 Update modal UI to include clear messaging that line items will be confirmed in next step
  - [x] 1.3 Find and remove misleading "Line item created" toast that appears when a line item is added but BEFORE the final confirm and creation occurs (likely in toast hook calls)
  - [x] 1.4 Identify final submission success toast and ensure it only appears when items are actually saved to database
  - [x] 1.6 Test the updated flow to ensure messaging is clear and accurately represents the process state

- [ ] 2.0 Add Manual Line Item Modal Exit Confirmation
  - [ ] 2.1 Detect when user has unsaved changes in manual line item creation modal
  - [ ] 2.2 Implement "Are you sure?" confirmation dialog when user attempts to exit with unsaved changes
  - [ ] 2.3 Allow user to continue editing or discard changes based on confirmation choice
  - [ ] 2.4 Handle both X button clicks and outside-modal clicks for exit attempts
  - [ ] 2.5 Test confirmation flow with various scenarios (no changes, partial changes, etc.)

- [ ] 3.0 Add Export to Excel Functionality
  - [ ] 3.1 Create utility functions to format opportunity and line item data for Excel export
  - [ ] 3.2 Implement Excel file generation using appropriate library (e.g., xlsx)
  - [ ] 3.3 Add export button to dashboard with appropriate positioning and styling
  - [ ] 3.4 Include key fields that replicate current spreadsheet workflow (opportunity names, amounts, statuses, dates)
  - [ ] 3.5 Test export functionality with various data sets and verify Excel file integrity

- [ ] 4.0 Implement Dashboard Filtering by Opportunity
  - [ ] 4.1 Add click functionality to opportunity cards for filtering (click on card background, outside of action buttons)
  - [ ] 4.2 Implement filter state management using React state that works with existing `searchFilter` and `filteredOpportunities` logic
  - [ ] 4.3 Update dashboard metrics calculation (around line 243) to use filtered data instead of all opportunities when filter is active
  - [ ] 4.4 Add visual indication when filtering is active (e.g., highlighted/outlined card, filter badge in header)
  - [ ] 4.5 Implement toggle functionality (click selected card again to remove filter)
  - [ ] 4.6 Ensure search bar and opportunity filter work together by combining both filter conditions in the effect around line 92
  - [ ] 4.7 Add clear filter button/indicator to reset opportunity filter while preserving search

- [ ] 5.0 Add Never Truncate Product Names Option for Dashboard
  - [ ] 5.1 Add user preference toggle (localStorage-based) for displaying full product/deliverable names
  - [ ] 5.2 Identify current text truncation logic in OpportunityCard component
  - [ ] 5.3 Modify OpportunityCard to conditionally remove text truncation based on user preference
  - [ ] 5.4 Update CSS classes to handle variable card heights gracefully in the dashboard grid layout
  - [ ] 5.5 Add toggle control to dashboard header or settings area for user preference
  - [ ] 5.6 Ensure this change only affects dashboard display, not invoice page tooltips (which use separate implementation)
  - [ ] 5.7 Test with opportunities containing multiple long deliverable names

- [ ] 6.0 Make Contact Email Optional in Billing Details
  - [ ] 6.1 Check current database schema for `organization_contact_email` and `bill_to_contact_email` field constraints in opportunity_billing_info table
  - [ ] 6.2 Create database migration to make both contact email fields nullable if they aren't already
  - [ ] 6.3 Update BillingDetailsModal form validation to make contact email fields optional while maintaining other required fields
  - [ ] 6.4 Update field labeling in BillingDetailsModal to indicate contact emails are optional
  - [ ] 6.5 Ensure invoice generation handles missing contact emails gracefully (check InvoiceTemplate component)
  - [ ] 6.6 Test billing details functionality with and without contact email across all workflows (dashboard, invoice page)
