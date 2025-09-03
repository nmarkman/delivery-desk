# Tasks: Feedback Session with Dad

## Relevant Files

- `src/components/InvoiceTemplate.tsx` - Main invoice template component that needs company/opportunity name header
- `src/components/Dashboard.tsx` - Dashboard page with metrics tiles that need calculation updates and filtering
- `src/components/BillingDetailsModal.tsx` - Modal for bill-to details where contact email needs to be optional
- `src/utils/dateBasedInvoiceNumbering.ts` - Utility functions for date-based invoice number generation (WSU-MMDDYY-XX format)
- `src/hooks/useInvoiceNumbering.ts` - New hook for date-based invoice number generation logic
- `src/pages/ActSync.tsx` - ACT sync page with existing refresh pattern to leverage
- `src/integrations/supabase/types.ts` - Auto-generated types (may update after DB migration)
- `src/utils/dateUtils.ts` - Utility functions for date handling and formatting
- `src/utils/dashboardCalculations.ts` - New utility for dashboard metrics calculations
- `supabase/migrations/` - Database migration files for making contact email nullable
- `src/components/ui/RefreshButton.tsx` - New refresh button component for dashboard
- `supabase/functions/migrate-invoice-numbers/index.ts` - Edge Function to migrate existing invoice numbers to date-based format
- `src/utils/migrateInvoiceNumbers.ts` - Client utilities for triggering and validating migration
- `src/components/admin/InvoiceNumberMigration.tsx` - Admin interface for running the migration
- `test-migration-logic.ts` - Test script to validate migration logic before deployment

### Notes

- Database migration needed to make contact email nullable in organization billing info
- Invoice number updates will affect all existing invoice line items
- Dashboard filtering needs to work with existing search functionality
- Date rendering bug needs investigation across all date inputs

## Tasks

- [x] 1.0 Fix Invoice Number Format to Date-Based System
  - [x] 1.1 Create utility function for generating WSU-MMDDYY-XX format invoice numbers
  - [x] 1.2 Implement logic to handle duplicate dates with sequential numbering (-01, -02, etc.)
  - [x] 1.3 Update all existing invoice line items with new numbering format
  - [x] 1.4 Modify invoice generation to use new numbering system
  - [x] 1.5 Add database migration to update existing records, if needed.

- [ ] 2.0 Add Company and Opportunity Header to Invoice Template
  - [ ] 2.1 Modify InvoiceTemplate component to fetch opportunity data including company name
  - [ ] 2.2 Add styled header section above line items table
  - [ ] 2.3 Display company name (from opportunity.company_name field) as first line
  - [ ] 2.4 Display opportunity name/description as second line
  - [ ] 2.5 Ensure header styling matches existing invoice template design

- [ ] 3.0 Fix JavaScript Date Rendering Bug
  - [ ] 3.1 Investigate date rendering issue where 9/6 displays as 9/5
  - [ ] 3.2 Review all date input components and their value handling
  - [ ] 3.3 Fix timezone or date parsing issues in date utilities
  - [ ] 3.4 Test date rendering across all forms (manual line items, deliverable dates, etc.)
  - [ ] 3.5 Ensure consistent date display format throughout application

- [ ] 4.0 Fix Leading Zero and Manual Entry Bugs
  - [ ] 4.1 Fix leading zero issue on manual line item creation ($02000 display bug)
  - [ ] 4.2 Fix deliverable date bug when creating manual entries (you specify a date but when you submit, the date is stripped. It works when you edit the line item afterward. I think we might have something in place creating deliverable line itesm from the contact upload modal as null deliverable date. It should default to null but if a user adds one for a deliverable in the modal, it should respect it in the creation)
  - [ ] 4.3 Fix billing details update hook from invoice page (the hook does not save the company billing information in the database. That only seems to work when saving billing details from the dashboard page. Look at how its implemented on dashboard and make sure the form submit is handled the same way from the invoice page)
  - [ ] 4.5 Test all manual entry workflows for data integrity (user to test and confirm with you)

- [ ] 5.0 Update Dashboard Metrics Calculations
  - [ ] 5.1 Modify "Total Outstanding" calculation to be ACV minus sum of paid invoices
  - [ ] 5.2 Change "Pending" to "Billed & Unpaid". This will be the same calculation in the current "outstanding" tile - sum of all sent and overdue invoices
  - [ ] 5.3 Create utility functions for new dashboard calculations, if needed. We can also just update existing
  - [ ] 5.4 Update dashboard tiles to use new calculation methods
  - [ ] 5.5 Ensure metrics update correctly when filtering is applied, see below for filtering

- [ ] 6.0 Implement Dashboard Filtering by Opportunity
  - [ ] 6.1 Add click functionality to opportunity cards for filtering. If user clicks an opportunity tile outside border, it filters to just that opp
  - [ ] 6.2 Implement filter state management that works with existing search. DO NOT REPLACE existing search
  - [ ] 6.3 Update dashboard metrics to reflect filtered opportunity data
  - [ ] 6.4 Add visual indication when filtering is active
  - [ ] 6.5 Implement toggle functionality (click again to remove filter)
  - [ ] 6.6 Ensure search bar and opportunity filter work together seamlessly

- [ ] 7.0 Add ACT Data Refresh Button to Dashboard
  - [ ] 7.1 Create reusable RefreshButton component
  - [ ] 7.2 Implement refresh functionality using existing ActSync patterns
  - [ ] 7.3 Add refresh button to dashboard with appropriate loading states
  - [ ] 7.4 Trigger full sync (opportunities and products) on button click
  - [ ] 7.5 Show sync progress and success/error feedback to user

- [ ] 8.0 Make Contact Email Optional in Billing Details
  - [ ] 8.1 Check current database schema for contact email field constraints
  - [ ] 8.2 Create database migration to make contact email nullable
  - [ ] 8.3 Update BillingDetailsModal to make contact email field optional
  - [ ] 8.4 Update form validation to allow empty contact email
  - [ ] 8.5 Test billing details functionality with and without contact email

- [ ] 9.0 Re-add Product Names to Invoice Page
  - [ ] 9.1 Analyze current invoice line item data structure for product/deliverable names
  - [ ] 9.2 Add product/deliverable name display to invoice table view as a tooltip hover where user can see the full name
  - [ ] 9.4 Ensure readability for contracts with 8-9 deliverables
  - [ ] 9.5 Test display with various deliverable name lengths and quantities

- [10.0] Fix yellow display issue of left nav bar

- [11.0] Remove or significantly update soft delete logic on opps and invoice_line_items