# Tasks: Feedback Session - Must Have Items

## Relevant Files

- `src/components/BillingDetailsModal.tsx` - Modal where custom invoice school code and payment terms text fields need to be added
- `src/integrations/supabase/types.ts` - Auto-generated types that may need updates after DB migration for new fields
- `src/components/invoices/InvoiceTemplate.tsx` - Invoice template where custom payment terms text needs to replace default "Net X" text
- `src/components/Dashboard.tsx` - Dashboard page where metrics calculations need updates and quick invoice actions need to be added
- `src/components/OpportunityCard.tsx` - Opportunity cards component (lines 266-404) where line items are rendered, product names need option to never truncate, and hover actions need to be added
- `src/utils/dashboardCalculations.ts` - New utility for updated dashboard metrics calculations (TO BE CREATED)
- `src/pages/ActSync.tsx` - ACT sync page with existing refresh pattern to leverage for dashboard refresh button
- `src/components/ui/RefreshButton.tsx` - New refresh button component for dashboard (TO BE CREATED)
- `supabase/migrations/` - Database migration files for adding new billing detail fields
- `src/hooks/useOpportunityBilling.ts` - Hook that may need updates for new billing detail fields

### Notes

- All new database fields should be optional/nullable to maintain compatibility with existing data
- Custom payment terms text should only replace invoice template text when provided, otherwise fall back to "Net X" format
- Dashboard metrics updates are foundational for other dashboard improvements

## Tasks

- [x] 1.0 Add Custom Invoice School Code Override
  - [x] 1.1 Create database migration to add optional `custom_school_code` field to opportunity_billing_info table
  - [x] 1.2 Update BillingDetailsModal to include new custom school code input field
  - [x] 1.3 Modify `extractClientShortform()` in `src/utils/invoiceHelpers.ts` to check for custom school code from billing info first
  - [x] 1.4 Update `useInvoiceNumbering.ts` hook to pass billing info to shortform extraction
  - [x] 1.5 Update form validation in BillingDetailsModal and submission handling for the new field
  - [x] 1.6 Test with various school names and custom overrides (e.g., "CSN" for College of Southern Nevada)

- [x] 2.0 Add Custom Payment Terms Text Field
  - [x] 2.1 Create database migration to add optional `custom_payment_terms_text` field to opportunity_billing_info table
  - [x] 2.2 Update BillingDetailsModal to include new payment terms text area field with clear labeling
  - [x] 2.3 Modify InvoiceTemplate component line 247 to conditionally display custom payment terms text when provided, replacing "Net {billing.payment_terms}" format
  - [x] 2.4 Ensure numeric payment_terms field is still used for overdue calculations in `calculateOverdueStatus()` function
  - [x] 2.5 Update `convertToInvoiceData()` function in Invoices.tsx to include custom payment terms in billing_info object
  - [x] 2.6 Test with examples like "1% 10 net 30" to verify proper display on generated invoices

- [ ] 3.0 Add Quick Invoice Connection from Dashboard
  - [ ] 3.1 Locate line item rendering in OpportunityCard.tsx around lines 267-404
  - [ ] 3.2 Add hover action icons/button to the existing action button area (lines 287-404) for line items that have `billed_at` dates set AND are associated with an opportunity that has their organization billing info applied. This should appear alongside the existing hover actions for edit and delete
  - [ ] 3.3 Implement click handler that navigates to `/invoices/{invoice_number}` using React Router
  - [ ] 3.4 Add appropriate visual indicators (FileText icon) for the hover action
  - [ ] 3.5 Ensure hover actions only appear for line items with both invoice_number and billed_at values (billed items)
  - [ ] 3.6 Test navigation flow from dashboard to invoice page, ensuring proper invoice filtering/display
  - [ ] 3.7 on the `/invoices/{invoice_number}` page, we should persist the same actions and status display we have on the main invoices table. A user should be able to see the status of an invoice from the specific invoice page and be able to take the same actions on an invoice that they can from the invoice line item table (mark as sent, mark as paid, etc), using the same UI buttons/elements from the invoice line item page. 

- [ ] 4.0 Add Never Truncate Product Names Option for Dashboard
  - [ ] 4.1 Add user preference toggle (localStorage-based) for displaying full product/deliverable names
  - [ ] 4.2 Identify current text truncation logic in OpportunityCard component
  - [ ] 4.3 Modify OpportunityCard to conditionally remove text truncation based on user preference
  - [ ] 4.4 Update CSS classes to handle variable card heights gracefully in the dashboard grid layout
  - [ ] 4.5 Add toggle control to dashboard header or settings area for user preference
  - [ ] 4.6 Ensure this change only affects dashboard display, not invoice page tooltips (which use separate implementation)
  - [ ] 4.7 Test with opportunities containing multiple long deliverable names

- [ ] 5.0 Update Dashboard Metrics Calculations
  - [ ] 5.1 Locate current metrics calculation in Dashboard.tsx around lines 243-258
  - [ ] 5.2 Modify "Total Outstanding" calculation (line ~246) to be ACV (sum of all line_total) minus sum of paid invoices
  - [ ] 5.3 Change "Pending" tile label and calculation to "Billed & Unpaid" using existing `outstandingInvoices` logic
  - [ ] 5.4 Create `src/utils/dashboardCalculations.ts` utility for cleaner calculation logic
  - [ ] 5.5 Update dashboard tiles JSX to use new calculation methods and labels
  - [ ] 5.6 Ensure metrics update correctly when search filtering is applied (currently uses `opportunities` vs `filteredOpportunities`)

- [ ] 6.0 Add ACT Data Refresh Button to Dashboard  
  - [ ] 6.1 Create reusable RefreshButton component using `useActConnection.ts` hook
  - [ ] 6.2 Import `triggerSync()` method from `useActConnection` hook (see SyncDashboard.tsx line 34 for reference)
  - [ ] 6.3 Add refresh button to dashboard header area with RefreshCw icon and appropriate styling
  - [ ] 6.4 Implement click handler that calls `triggerSync('sync')` for full sync (opportunities and products)
  - [ ] 6.5 Add loading states using existing `isLoading` from useActConnection hook
  - [ ] 6.6 Add success/error feedback using toast notifications (see SyncTrigger.tsx lines 27-43 for pattern)
  - [ ] 6.7 Call dashboard's `fetchData()` method after successful sync to refresh dashboard data
