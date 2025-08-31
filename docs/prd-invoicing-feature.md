# Product Requirements Document: Invoice Generation & Management Feature

## Introduction/Overview

The Invoice Generation & Management feature enables automatic creation of professional PDF invoices from existing invoice line items in DeliveryDesk. When a line item receives a `billed_at` date, the system automatically generates a properly formatted invoice that can be downloaded as PDF and tracked through payment completion. This feature eliminates manual invoice creation while providing comprehensive tracking of outstanding balances and overdue payments.

## Goals

1. **Automatic Invoice Generation**: Seamlessly create invoices when line items are marked for billing
2. **Professional PDF Output**: Generate branded invoices matching CRCG's current template design  
3. **Payment Status Tracking**: Enable simple paid/unpaid status management with overdue detection
4. **Outstanding Balance Visibility**: Provide dashboard views of total outstanding and overdue amounts
5. **Streamlined Workflow**: Reduce manual invoice creation effort to zero while maintaining control

## User Stories

1. **As a user, I want invoices to be automatically created when I assign a billing date to line items** so that I don't have to manually create each invoice
2. **As a user, I want to download professional PDF invoices** so that I can email them to clients using my existing process
3. **As a user, I want to mark invoices as paid with a simple action** so that I can track which invoices have been settled
4. **As a user, I want to see overdue invoices highlighted in the app** so that I can follow up on late payments  
5. **As a user, I want to see total outstanding and overdue balances** so that I can understand my accounts receivable position
6. **As a user, I want invoice numbers to follow a client-based format** so that my filing system remains organized

## Functional Requirements

### 1. Automatic Invoice Generation
1.1. When an `invoice_line_item` receives a `billed_at` date, the system must treat this as a completed invoice ready for generation. Since line items are 1:1 with invoices initially, we can derive invoice data directly from the line item and related opportunity/billing info without requiring a separate invoice record creation step.
1.2. The system must populate invoice fields including invoice_date (set to billed_at), due_date (calculated from payment_terms), and amounts  
1.3. The system must link the invoice to the appropriate opportunity and billing information (all of this data is already available in the supabase datatables and schema)
1.4. The system must generate a unique invoice number using the client shortform + sequential number format (e.g., WSU-001, WSU-002)

### 2. Invoice Number Generation  
2.1. The system must extract a 2-4 character shortform from the organization name in opportunity_billing_info  
2.2. The system must maintain sequential numbering per client based on chronological order of billed_at dates  
2.3. The system must handle duplicate shortforms by adding distinguishing characters  
2.4. The invoice number must be stored in the `invoice_number` field and remain immutable

### 3. PDF Template Generation
3.1. The system must render invoices using an HTML template that matches the provided CRCG invoice design  
3.2. The template must include:
   - CRCG company header with logo and contact information
   - "COLLEGIATE RETAIL" branding element
   - Organization and Bill To sections populated from opportunity_billing_info  
   - Line items table showing quantity, description, unit price, and total (`invoice_line_item` data)
   - Subtotal, Total, and payment terms sections
   - Invoice number and date in the header bar
3.3. The system must support PDF export functionality from the HTML template
3.4. Generated PDFs must follow the filename convention: `[ClientShortform]_CRCG Invoice [Invoice Number]_[YYYY-MM-DD].pdf`

### 4. Payment Status Tracking
4.1. The system must provide a simple interface to mark invoices as sent and as paid  
4.2. When marked as sent, the system must record the sent_date and update status to "sent"
4.3. When marked as paid, the system must record the payment_date and update status to "paid"  
4.4. The system must calculate overdue status based on: `due_date < current_date AND status = 'sent' AND payment_date IS NULL`  
4.5. The system must support the workflow: draft → sent → paid (with automatic overdue calculation for sent unpaid invoices)

### 5. Dashboard & Reporting Views
5.1. The system must display a list of all invoices with status indicators (draft, sent, paid, overdue)  
5.2. The system must show total outstanding balance (sum of sent unpaid invoice totals)  
5.3. The system must show total overdue balance (sum of overdue invoice totals)  
5.4. The system must show counts of draft, sent, and overdue invoices  
5.5. The system must allow filtering invoices by status and client
5.6. This will use the `/invoices` route of the app and replace all of the current content on that page, which is placeholder

### 6. Client-Side PDF Generation  
6.1. The system must render invoices as HTML pages using React components and data from the database
6.2. The system must include a "Download PDF" button that uses browser print functionality or a lightweight PDF library 
6.3. PDF generation must happen entirely on the client side without storing files
6.4. The invoice HTML template must be optimized for print/PDF export with proper CSS styling

## Non-Goals (Out of Scope)

- Email automation or delivery features  
- Payment processor integrations  
- Multiple invoice templates or customization  
- Automated overdue notifications  
- Invoice editing after generation  
- Multi-line-item invoice grouping (initially)  
- Invoice approval workflows  
- Client portal access to invoices

## Design Considerations  

### HTML Template Structure
- Responsive design that prints/exports well to PDF  
- Exact visual match to current CRCG invoice format  
- Clean, professional typography and spacing  
- Proper table formatting for line items

### Required Static Assets  
- CRCG logo image file (to be uploaded to Supabase Storage)
- "COLLEGIATE RETAIL" branding graphic/styling
- Company contact information and address (you have this already from the invoice pdf example)

### Database Schema Updates
- The existing `invoices` table structure supports most requirements  
- Add `sent_date` field to track when invoice is marked as sent
- Update `invoice_status` enum to include: draft, sent, paid, overdue
- Consider adding an index on `invoice_number` for quick lookups  
- Consider adding an index on `status` and `due_date` for overdue calculations

## Technical Considerations

### PDF Generation Options
- **Option A**: HTML-to-PDF library (e.g., Puppeteer, jsPDF) for client-side generation  
- **Option B**: Server-side PDF generation via Supabase Edge Function  
- **Recommendation**: Use browser's built-in print functionality with @media print CSS or a lightweight library like jsPDF for client-side PDF generation. No server storage needed.

### Invoice Number Algorithm
- Parse organization name to extract meaningful abbreviation  
- Query existing invoices to determine next sequence number per client  
- Handle edge cases like duplicate abbreviations or special characters

### Performance Considerations  
- Batch processing for multiple line items with same billed_at date  
- Efficient queries for dashboard calculations  
- Caching of PDF files to avoid regeneration. From Developer: again, might not be needed if we're just doing client side downloads.

### Integration Points
- Leverage existing opportunity_billing_info for all client details  
- Use existing invoice_line_items structure without modification - payment tracking can be added directly to line items  
- Maintain RLS policies for multi-tenant security

## Success Metrics

1. **Invoice Generation Efficiency**: 100% of line items with billed_at dates automatically generate invoices  
2. **User Adoption**: User marks invoices as paid within the app (vs external tracking)  
3. **PDF Quality**: Generated invoices are visually similar to current manual template and are standardized.
4. **Workflow Improvement**: Time to create and track invoices reduced by 90%+  
5. **Data Accuracy**: Outstanding balance calculations match manual tracking 100%

## Open Questions

1. **Asset Upload**: What's the best way to upload and reference the CRCG logo and branding assets? 
   A: I uploaded to supabase cloud. it is publically available. It's URL is https://osywqypaamxxqlgnvgqw.supabase.co/storage/v1/object/public/public-images/crcg-logo.png
2. **Invoice Regeneration**: Should the system allow regenerating PDFs if invoice data changes?  
   A: if invoices are just a client side HTML template, then if the data changes it also automatiaclly supports the invoice changing.
3. **Batch Operations**: How should the system handle multiple line items getting billed_at dates simultaneously?  
   A: I dont know. Make it simple but make it work.
4. **Client Shortform Conflicts**: What's the fallback strategy if multiple clients have the same abbreviated name?  
   A: make one up. Not important. He can change the filenames manually if there is a problem.
5. **Status Workflow**: Should we add a "sent" status when your dad emails the invoice, or keep it simple with just paid/unpaid?
   A: **UPDATED** - Use workflow: Draft → Sent → Paid. Dad will manually mark invoices as "sent" when he emails them, then mark as "paid" when payment is received. Only "sent" invoices can become overdue.

## Implementation Notes

### Phase 1: Core Invoice Generation  
- Automatic invoice creation from line items  
- Basic HTML template matching current design  
- Simple PDF download functionality  

### Phase 2: Status Tracking & Dashboard  
- Payment marking interface  
- Overdue calculation and display  
- Outstanding balance summaries  

### Phase 3: Polish & Optimization  
- Refined PDF styling and layout  
- Performance optimizations  
- Enhanced filtering and search capabilities

🤖 Generated with [Claude Code](https://claude.ai/code)