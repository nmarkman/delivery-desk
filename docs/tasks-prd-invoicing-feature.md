# Tasks for Invoice Generation & Management Feature

## Relevant Files

- `src/pages/Invoices.tsx` - Main invoices dashboard page that replaces placeholder content
- `src/components/invoices/InvoiceTemplate.tsx` - HTML template component matching CRCG invoice design
- `src/components/invoices/InvoiceList.tsx` - Component displaying list of invoices with status indicators
- `src/components/invoices/InvoiceFilters.tsx` - Component for filtering invoices by status and client
- `src/components/invoices/InvoiceSummary.tsx` - Dashboard component showing outstanding/overdue balances
- `src/components/invoices/PaymentStatusButton.tsx` - Button component for marking invoices as paid
- `src/hooks/useInvoices.ts` - Custom hook for fetching and managing invoice data
- `src/hooks/useInvoiceGeneration.ts` - Custom hook for invoice number generation logic
- `src/utils/invoiceHelpers.ts` - Utility functions for invoice calculations and formatting
- `src/utils/pdfGenerator.ts` - Client-side PDF generation utilities
- `src/styles/invoice-print.css` - Print-specific CSS for PDF generation
- `supabase/migrations/add_invoice_fields.sql` - Database migration for any needed schema updates
- `src/integrations/supabase/types.ts` - Auto-generated types (will update after migrations)

### Notes

- The existing `invoice_line_items` table will be used as the primary data source for invoices
- Payment tracking fields may need to be added to `invoice_line_items` table
- Invoice number generation will query existing line items to determine sequential numbering per client

## Tasks

- [ ] 1.0 Set up invoice data structure and database schema updates
  - [ ] 1.1 Add `invoice_number` field to `invoice_line_items` table if not present
  - [ ] 1.2 Add `payment_date` field to `invoice_line_items` table for payment tracking
  - [ ] 1.3 Add `invoice_status` enum field to `invoice_line_items` table (draft, sent, paid, overdue)
  - [ ] 1.4 Create database migration file with the new fields
  - [ ] 1.5 Apply migration and regenerate TypeScript types
- [ ] 2.0 Create invoice number generation system
  - [ ] 2.1 Create utility function to extract client shortform from organization name
  - [ ] 2.2 Create function to query existing invoice numbers for a specific client
  - [ ] 2.3 Create function to generate next sequential invoice number per client
  - [ ] 2.4 Handle edge cases for duplicate shortforms and special characters
  - [ ] 2.5 Create custom hook `useInvoiceGeneration` to manage invoice number logic
- [ ] 3.0 Build invoice HTML template component matching CRCG design
  - [ ] 3.1 Create base `InvoiceTemplate` component structure
  - [ ] 3.2 Add CRCG header with logo and company contact information
  - [ ] 3.3 Add "COLLEGIATE RETAIL" branding element styling
  - [ ] 3.4 Create Organization and Bill To sections using opportunity_billing_info data
  - [ ] 3.5 Build line items table with quantity, description, unit price, and total columns
  - [ ] 3.6 Add subtotal, total, and payment terms sections
  - [ ] 3.7 Style invoice number and date in header bar
  - [ ] 3.8 Create print-specific CSS file for PDF optimization
- [ ] 4.0 Implement invoices dashboard page (/invoices route)
  - [ ] 4.1 Replace placeholder content in `src/pages/Invoices.tsx`
  - [ ] 4.2 Create main layout with summary cards and invoice list
  - [ ] 4.3 Implement data fetching for line items with `billed_at` dates
  - [ ] 4.4 Add routing for individual invoice views
  - [ ] 4.5 Integrate invoice filters and search functionality
- [ ] 5.0 Add payment status tracking functionality
  - [ ] 5.1 Create `PaymentStatusButton` component for status updates
  - [ ] 5.2 Implement function to update `payment_date` when marking as paid
  - [ ] 5.3 Add status indicator badges (draft, sent, paid, overdue)
  - [ ] 5.4 Create confirmation dialog for payment status changes
- [ ] 6.0 Implement client-side PDF generation and download
  - [ ] 6.1 Research and choose PDF generation approach (print CSS vs jsPDF)
  - [ ] 6.2 Create `pdfGenerator.ts` utility with download functionality
  - [ ] 6.3 Add "Download PDF" button to invoice template
  - [ ] 6.4 Implement filename convention: `[ClientShortform]_CRCG Invoice [Invoice Number]_[YYYY-MM-DD].pdf`
  - [ ] 6.5 Test PDF output matches CRCG template design
- [ ] 7.0 Add overdue calculation and status indicators
  - [ ] 7.1 Create utility function to calculate overdue status based on due_date and payment_date
  - [ ] 7.2 Add overdue highlighting in invoice list component
  - [ ] 7.3 Create overdue badge/indicator styling
  - [ ] 7.4 Update invoice status automatically based on due dates
- [ ] 8.0 Create dashboard summary views (outstanding/overdue balances)
  - [ ] 8.1 Create `InvoiceSummary` component with summary cards
  - [ ] 8.2 Implement calculation for total outstanding balance
  - [ ] 8.3 Implement calculation for total overdue balance
  - [ ] 8.4 Add counts for unpaid and overdue invoices
  - [ ] 8.5 Create filters to show invoices by status (paid, unpaid, overdue)
  - [ ] 8.6 Add client-based filtering functionality