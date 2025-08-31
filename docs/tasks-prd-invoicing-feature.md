# Tasks for Invoice Generation & Management Feature

## Relevant Files

- `src/pages/Invoices.tsx` - Main invoices dashboard page that replaces placeholder content
- `src/components/invoices/InvoiceTemplate.tsx` - HTML template component matching CRCG invoice design
- `src/components/invoices/InvoiceList.tsx` - Component displaying list of invoices with status indicators
- `src/components/invoices/InvoiceFilters.tsx` - Component for filtering invoices by status and client
- `src/components/invoices/InvoiceSummary.tsx` - Dashboard component showing outstanding/overdue balances
- `src/components/invoices/PaymentStatusButton.tsx` - Button component for marking invoices as sent or paid
- `src/hooks/useInvoices.ts` - Custom hook for fetching and managing invoice data
- `src/hooks/useInvoiceGeneration.ts` - ✅ Custom hook for invoice number generation logic
- `src/utils/invoiceHelpers.ts` - ✅ Utility functions for invoice calculations and formatting  
- `src/utils/pdfGenerator.ts` - Client-side PDF generation utilities
- `src/styles/invoice-print.css` - Print-specific CSS for PDF generation
- `supabase/migrations/add_invoice_fields.sql` - ✅ Database migration for invoice tracking fields
- `src/integrations/supabase/types.ts` - ✅ Auto-generated types updated with new invoice fields

### Notes

- The existing `invoice_line_items` table will be used as the primary data source for invoices
- Payment tracking fields may need to be added to `invoice_line_items` table
- Invoice number generation will query existing line items to determine sequential numbering per client

## Tasks

- [x] 1.0 Set up invoice data structure and database schema updates
  - [x] 1.1 Add `invoice_number` field to `invoice_line_items` table if not present
  - [x] 1.2 Add `payment_date` field to `invoice_line_items` table for payment tracking
  - [x] 1.3 Add `sent_date` field to `invoice_line_items` table for tracking when invoice is emailed
  - [x] 1.4 Add `invoice_status` enum field to `invoice_line_items` table (draft, sent, paid, overdue)
  - [x] 1.5 Create database migration file with the new fields
  - [x] 1.6 Apply migration and regenerate TypeScript types
- [x] 2.0 Create invoice number generation system
  - [x] 2.1 Create utility function to extract client shortform from organization name
  - [x] 2.2 Create function to query existing invoice numbers for a specific client
  - [x] 2.3 Create function to generate next sequential invoice number per client
  - [x] 2.4 Handle edge cases for duplicate shortforms and special characters
  - [x] 2.5 Create custom hook `useInvoiceGeneration` to manage invoice number logic
- [x] 3.0 Build invoice HTML template component matching CRCG design
  - [x] 3.1 Create base `InvoiceTemplate` component structure
  - [x] 3.2 Add CRCG header with logo and company contact information
  - [x] 3.3 Add "COLLEGIATE RETAIL" branding element styling
  - [x] 3.4 Create Organization and Bill To sections using opportunity_billing_info data
  - [x] 3.5 Build line items table with quantity, description, unit price, and total columns
  - [x] 3.6 Add subtotal, total, and payment terms sections
  - [x] 3.7 Style invoice number and date in header bar
  - [x] 3.8 Create print-specific CSS file for PDF optimization
- [x] 4.0 Implement invoices dashboard page (/invoices route)
  - [x] 4.1 Replace placeholder content in `src/pages/Invoices.tsx`
  - [x] 4.2 Create main layout with summary cards and invoice list
  - [x] 4.3 Implement data fetching for line items with `billed_at` dates
  - [x] 4.4 Add routing for individual invoice views
  - [x] 4.5 Integrate invoice filters and search functionality
- [x] 5.0 Add payment status tracking functionality
  - [x] 5.1 Create `PaymentStatusButton` component with "Mark as Sent" and "Mark as Paid" actions
  - [x] 5.2 Implement function to update `sent_date` when marking as sent
  - [x] 5.3 Implement function to update `payment_date` when marking as paid
  - [x] 5.4 Add status indicator badges (draft, sent, paid, overdue)
  - [x] 5.5 Create confirmation dialogs for status changes
  - [x] 5.6 Ensure workflow progression: draft → sent → paid (no skipping states)
- [x] 6.0 Implement client-side PDF generation and download
  - [x] 6.1 Install jsPDF and html2canvas libraries
  - [x] 6.2 Create `pdfGenerator.ts` utility with jsPDF implementation
  - [x] 6.3 Implement invoice template to canvas conversion
  - [x] 6.4 Add PDF generation with filename convention: `[ClientShortform]_CRCG Invoice [Invoice Number]_[YYYY-MM-DD].pdf`
  - [x] 6.5 Add "Download PDF" buttons to invoice template and list views
  - [x] 6.6 Test PDF output quality and single-page layout
  - [x] 6.7 Handle edge cases (draft invoices, missing data, etc.)
- [ ] 7.0 Add overdue calculation and status indicators
  - [ ] 7.1 Create utility function to calculate overdue status (due_date < current_date AND status = 'sent' AND payment_date IS NULL)
  - [ ] 7.2 Add overdue highlighting in invoice list component
  - [ ] 7.3 Create overdue badge/indicator styling
  - [ ] 7.4 Update invoice status automatically to "overdue" for qualifying invoices
- [ ] 8.0 Create dashboard summary views (outstanding/overdue balances)
  - [ ] 8.1 Create `InvoiceSummary` component with summary cards
  - [ ] 8.2 Implement calculation for total outstanding balance (sum of sent unpaid invoices only)
  - [ ] 8.3 Implement calculation for total overdue balance
  - [ ] 8.4 Add counts for draft, sent, and overdue invoices
  - [ ] 8.5 Create filters to show invoices by status (draft, sent, paid, overdue)
  - [ ] 8.6 Add client-based filtering functionality