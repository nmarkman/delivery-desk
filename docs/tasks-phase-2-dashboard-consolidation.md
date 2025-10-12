# Phase 2: Dashboard Consolidation - Implementation Tasks

## Overview
This document outlines the tasks for Phase 2 UX improvements, consolidating the Invoices page into the Dashboard to create a single, streamlined entry point for the entire application.

**Reference Design**: https://e307a748-7b82-4b91-a212-f83a34666d44-preview.magicpatterns.app/

**Current Implementation**: https://delivery-desk.lovable.app/ (Nick the user can authenticate to this for you if you hit the login, just ask and he will do so in the browser playwright spins up)

## Implementation Notes
- Use Playwright MCP to reference the new UX design throughout implementation
- Preserve all removed/replaced components by commenting them out or keeping unused files
- Do not delete old components - we may need to revert design decisions

---

## Task 1: Replace Left Sidebar with Top Navigation Bar

**Priority**: High | **Estimated Effort**: Medium

### Description
Remove the current left sidebar navigation and implement a horizontal top navigation bar with Act! sync button and user menu.

### Current State
- Left sidebar with Dashboard, Invoices navigation items ([src/components/AppSidebar.tsx](../src/components/AppSidebar.tsx))
- Sidebar layout wrapper in [src/components/Layout.tsx](../src/components/Layout.tsx)
- User profile and sign out in sidebar footer

### Target State
- Horizontal navigation bar at top of page
- DeliveryDesk logo and branding on left side
- "Sync Act!" button (with icon) in top right
- User email dropdown menu on far right with sign out option
- Full-width main content area below nav bar

### Acceptance Criteria
- [X] Top navigation bar component created with proper styling
- [X] Logo and branding displayed on left side of nav bar
- [X] "Sync Act!" button prominently placed in top right
- [X] User email button/dropdown on far right with sign out functionality
- [X] Old sidebar components commented out (not deleted)
- [X] Layout component updated to use new nav structure
- [X] Navigation bar remains fixed when scrolling
- [X] Responsive design maintained for different screen sizes

### Files to Modify
- Create new: `src/components/TopNavigation.tsx`
- Modify: `src/components/Layout.tsx`
- Comment out: `src/components/AppSidebar.tsx` (keep file)
- Update: `src/pages/Index.tsx` to use new layout

### Design Reference
See mock navbar showing DeliveryDesk logo, Sync Act! button, and user email dropdown

**✅ Completed** - Git commit: `1f29f53`

---

## Task 2: Convert Dashboard from Two-Column to Single-Column Opportunity List

**Priority**: High | **Estimated Effort**: Small

### Description
Change the opportunity cards layout from a two-column grid to a single-column list view.

### Current State
- Opportunities displayed in 2-column grid ([src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx):477)
- Grid uses CSS: `grid gap-6 md:grid-cols-2 grid-cols-1`

### Target State
- Single column layout for all screen sizes
- Full-width opportunity cards
- Maintains current infinite scroll functionality

### Acceptance Criteria
- [X] Dashboard grid changed to single column layout
- [X] Opportunity cards span full width of content area
- [X] Spacing and padding adjusted for single column view
- [X] Infinite scroll continues to work correctly
- [X] Loading states display properly

### Files to Modify
- Modify: `src/pages/Dashboard.tsx` (line 477 - grid classes)

### Design Reference
See mock showing single-column opportunity card layout

**✅ Completed** - Git commit: `62fdbdb`

---

## Task 3: Add Collapse/Expand Functionality to Opportunity Cards

**Priority**: High | **Estimated Effort**: Medium

### Description
Implement collapsible opportunity cards with expand/collapse toggle and "Expand All" button.

### Current State
- Opportunity cards always show full details ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx))
- `defaultExpanded` prop exists but not fully utilized
- No collapse/expand UI controls

### Target State
- Cards can be collapsed to show only header information
- "View Invoices" / "Hide Invoices" toggle button on each card
- "Expand All" / "Collapse All" button above opportunity list
- User preference persisted in browser localStorage
- Smooth animation transitions

### Acceptance Criteria
- [X] Individual cards can collapse/expand via "View Invoices" button
- [X] Collapsed cards show: company name, estimated close date, contract value, invoice status badges, gear icon, and + icon
- [X] Expanded cards show all current details including invoice line items
- [X] "Expand All" button toggles all cards at once
- [X] Button label changes: "Expand All" ↔ "Collapse All"
- [X] User's expand/collapse state persisted in localStorage
- [X] Smooth CSS transitions for expand/collapse animations
- [X] State restored on page reload

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (add collapse state management)
- Modify: `src/pages/Dashboard.tsx` (add "Expand All" button and global state)
- Create utilities for localStorage persistence

### Design Reference
See mock showing collapsed and expanded card states, "View Invoices" toggle, and "Expand All" button

**✅ Completed** - Git commit: `d545384`

---

## Task 4: Add Invoice Status Labels to Opportunity Card Headers

**Priority**: High | **Estimated Effort**: Medium (Expanded to Large - included major line item redesign)

### Description
Display aggregate invoice status counts (Draft, Sent, Paid, Overdue) as badges in the opportunity card header. Also includes comprehensive redesign of line item display to match mock design.

### Current State
- No invoice status summary visible on collapsed cards
- Individual invoice statuses only visible in expanded line item view
- Line items displayed with gray backgrounds in multi-row format
- Line items include redundant labels (Retainer/Deliverable, "Price:")

### Target State
- Status badges displayed below company name in card header
- Format: "2 Draft", "1 Sent", "1 Paid", "1 Overdue"
- Color-coded badges (gray for Draft, blue for Sent, green for Paid, red for Overdue)
- Only show status types that have count > 0
- Visible in both collapsed and expanded states
- Compact table-like line item rows for better space efficiency

### Acceptance Criteria
- [X] Invoice line items aggregated by status per opportunity
- [X] Status count badges displayed in card header
- [X] Correct badge colors applied per status type
- [X] Only non-zero counts displayed
- [X] Badges layout horizontally with appropriate spacing
- [X] Status counts update when invoice statuses change
- [X] Status counts calculated from actual displayed line items (not external data)
- [X] Line items redesigned as compact single-row table format
- [X] Gray background added to card header
- [X] Line item backgrounds changed to white with border separators
- [X] Invoice status badge added next to price on each line item
- [X] Date, price, and status right-aligned for clean columns
- [X] "Price:" label prefix removed
- [X] Retainer/Deliverable type labels commented out (Task 13)
- [X] Billing details footer section commented out (moved to gear icon)
- [X] Added invoice_status field to LineItem interface and useLineItems query

### Files Modified
- Modified: `src/components/OpportunityCard.tsx` (major redesign of line item layout and status aggregation)
- Modified: `src/hooks/useLineItems.ts` (added invoice_status to query)
- Modified: `src/pages/Dashboard.tsx` (pass status counts to cards)

### Design Reference
See mock showing "2 Draft", "1 Paid", "1 Overdue" badges in card header and compact line item rows

### Implementation Notes
Task 4 expanded significantly beyond original scope to include:
- Complete line item visual redesign to match mock
- Implementation of Task 5 (gear icon already in header)
- Partial implementation of Task 13 (removed Retainer/Deliverable labels)
- Major layout improvements for better space efficiency and visual hierarchy

**✅ Completed** - Git commit: `3f173de`

---

## Task 5: Move Billing Configuration to Gear Icon in Card Header

**Priority**: High | **Estimated Effort**: Medium

### Description
Replace the bottom-row "Billing Details" section with a gear icon in the top right of the opportunity card header.

### Current State
- Billing details section at bottom of card ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):437-460)
- Shows "Billing Details: ✓ Configured" or "Not configured"
- Button to "Edit" or "Configure"

### Target State
- Small gear icon in top right of card header (next to + icon)
- Tooltip on hover: "Billing Settings"
- When billing is configured: standard gray gear icon
- When billing NOT configured: orange gear icon with small exclamation mark badge
- Opens same billing configuration modal when clicked

### Acceptance Criteria
- [x] Gear icon added to card header (top right corner)
- [x] Tooltip displays "Billing Settings" on hover (shows "Billing Configuration Missing" when not configured)
- [x] Icon color changes to orange when billing not configured
- [x] Small exclamation badge appears when billing incomplete
- [x] Clicking icon opens BillingDetailsModal
- [x] Old billing details section at bottom removed/commented out
- [x] Modal functionality remains unchanged
- [x] Visual states match mock design

**Status**: ✅ COMPLETE

**Git Commit**: `d545384` (Task 3) - Gear icon with warning states implemented during Task 3

**Implementation Notes**:
This task was completed as part of Task 3 (Collapse/Expand Functionality). The gear icon was moved to the card header with all requested functionality:
- Outline variant button with tooltip
- Orange pulsing animation when billing not configured
- Exclamation badge (!) on orange background when billing missing
- Opens existing BillingDetailsModal on click
- Billing footer section commented out with preservation note

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (move gear icon to header, remove footer section)

### Design Reference
See mock showing gear icon placement and orange warning state with exclamation mark

---

## Task 6: Add Sticky Filters and Search Bar

**Priority**: High | **Estimated Effort**: Small

### Description
Make the "Opportunity Management" header with filters and search bar sticky, remaining visible when scrolling through the opportunity list.

### Current State
- Filters scroll off-screen with page content
- User must scroll to top to change filters

### Target State
- "Opportunity Management" header section remains fixed when scrolling
- Section includes: title, "Expand All" button, search bar, status filter dropdown, client filter dropdown
- Smooth scroll behavior with appropriate z-index layering
- Background styling to maintain readability over scrolling content

### Acceptance Criteria
- [X] Filter section uses `position: sticky` or similar approach
- [X] Section stays at top of viewport when scrolling opportunity list
- [X] Background color/blur prevents content showing through
- [X] Z-index properly layered (below top nav, above cards)
- [X] Smooth scrolling behavior maintained
- [X] Filter changes work correctly while sticky
- [X] Responsive design maintained
- [X] "Opportunity Management" heading scrolls away, only filters remain sticky
- [X] Removed nested scroll container for natural page scrolling
- [X] Updated infinite scroll to use window-level events
- [X] Scroll position preserved when filtering (no jumping)

### Files Modified
- Modified: `src/pages/Dashboard.tsx`
  - Added sticky positioning at `top-16` (below nav bar) to filter controls
  - Moved "Opportunity Management" heading outside sticky container
  - Removed nested scroll container (`max-h-[800px] overflow-y-auto`)
  - Updated infinite scroll to listen to window scroll events
  - Added scroll position preservation in filter effect
  - Removed unused `scrollRef` variable

### Design Reference
See mock demonstrating sticky filter bar behavior during scroll

**✅ Completed** - Git commit: `f73dfa6`

---

## Task 7: Invoice Line Item and Status Badge Improvements

**Priority**: High | **Estimated Effort**: Medium

### Description
Update the sort order for invoice line items within opportunity cards to display chronologically by billing date, with items that don't have billing dates appearing at the end of the list. Additionally, improve invoice status badges in opportunity card headers with hover tooltips showing dollar amounts and remove color change hover effects.

### Current State
- Invoice line items may not be sorted optimally
- Line items without billing dates appear at beginning of list
- Status badges in card header have color change on hover
- No tooltips showing dollar amounts for status badges

### Target State
- Line items sorted chronologically by billing date (earliest first)
- Items without billing dates appear at end of list
- Status badges have hover tooltips showing total dollar value
- Color change hover effect removed from status badges
- Sort order consistent across collapsed and expanded states

### Acceptance Criteria
- [x] Line items sorted chronologically by billing date (earliest first)
- [x] Line items without billing dates appear at end of list
- [x] Sort order consistent across collapsed and expanded states
- [x] Remove color change hover effect on invoice status badges
- [x] Add hover tooltips to each status badge
- [x] Tooltips display total dollar amount with context (e.g., "$5,000 in draft invoices")
- [x] Tooltip positioning works correctly within card layout
- [x] Line item status labels use proper case formatting (Draft, Sent, Paid, Overdue)

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (update line item sort logic and status badge tooltips)
- Potentially modify: `src/pages/Dashboard.tsx` (if sort logic is there)

### Completion
**Status**: ✅ Completed
**Commit**: bafc56a - feat: improve invoice status badges and line item sorting

### Design Reference
See mock showing chronological line item ordering and status badge tooltips

---

## Task 8: Implement Invoice Status Filter Dropdown

**Priority**: High | **Estimated Effort**: Medium

### Description
Add a status filter dropdown to filter invoice line items within opportunities by invoice status (All, Draft, Sent, Paid, Overdue).

### Current State
- Only search filter exists ([src/components/OpportunityFilter.tsx](../src/components/OpportunityFilter.tsx))
- No status-based filtering

### Target State
- Status dropdown filter in sticky header section
- Options: "All invoice statuses", "Draft", "Sent", "Paid", "Overdue"
- Filters opportunities that have at least one invoice matching selected status and further filter the invoice line items within the opportunity to only those matching the filtered condition
- Works in combination with search filter and client filter

### Acceptance Criteria
- [x] Status filter dropdown component created
- [x] Filter options match design: All, Draft, Sent, Paid, Overdue
- [x] Selecting status filters opportunity list accordingly
- [x] Shows opportunities with at least one matching invoice status
- [x] Shows only line items matching invoice status filter
- [x] Works together with existing search filter
- [x] Filter state preserved during expand/collapse actions
- [x] Dropdown styling matches mock design
- [x] Filter resets appropriately
- [x] Opportunity card total reflects filtered line items
- [x] Non-matching status badges hidden when filter active
- [x] Dashboard metrics filter by opportunities (all line items from filtered opps)

### Files to Modify
- Create new: `src/components/InvoiceStatusFilter.tsx` or extend existing filter component
- Modify: `src/pages/Dashboard.tsx` (add filter logic and state management)

### Completion
**Status**: ✅ Completed
**Commit**: 23e3229 - feat: implement invoice status filter dropdown

### Design Reference
See mock showing "All invoice statuses" dropdown in filter bar

---

## Task 9: Implement Client Filter Dropdown

**Priority**: Medium | **Estimated Effort**: Small

### Description
Add a client filter dropdown to filter opportunities by company name, plus a "Clear Filters" button to reset all filters.

### Current State
- No client-based filtering dropdown exists
- No way to clear all filters at once

### Target State
- Client dropdown filter in sticky header section
- Options: "All clients" + list of all unique company names
- Filters opportunities to show only selected client
- Works in combination with search filter and status filter
- "Clear Filters" button appears when any filter is active
- Better horizontal space utilization for filter controls

### Acceptance Criteria
- [x] Client filter dropdown component created
- [x] Dropdown populated with "All clients" + unique company names
- [x] Selecting client filters opportunity list accordingly
- [x] Works together with search and status filters
- [x] Filter state preserved during expand/collapse actions
- [x] Dropdown styling matches mock design
- [x] Alphabetically sorted client list
- [x] Clear Filters button added (shows only when filters active)
- [x] Clear Filters resets all three filters (search, status, client)
- [x] Client names normalized to fix spacing/tab issues
- [x] Filter bar layout optimized for better space usage
- [x] Status filter: 240px width
- [x] Client filter: 280px width
- [x] Search bar: flex-1 with 300px minimum

### Files Modified
- Created: `src/components/ClientFilter.tsx`
- Modified: `src/components/InvoiceStatusFilter.tsx` (responsive width)
- Modified: `src/pages/Dashboard.tsx` (filter logic, Clear Filters button, layout improvements)

### Design Reference
See mock showing "All clients" dropdown in filter bar

**✅ Completed** - Git commit: `18be90e`

---

## Task 10: Redesign Invoice Line Item Actions with Hover Effects

**Priority**: High | **Estimated Effort**: Large

### Description
Implement new hover-based action buttons for invoice line items with sliding animation where price/status shift left on hover to reveal action icons.

### Current State
- Action buttons overlay content on hover
- Actions: Edit (pencil), View Invoice (file), Delete (trash)
- Buttons show with opacity transition
- Line item names truncate with ellipsis

### Target State
- On hover, price and status slide left smoothly to reveal action buttons
- Action buttons appear absolutely positioned on the right side
- Actions vary by invoice status:
  - **Draft**: Edit, View Invoice, Delete, Mark as Sent (paper plane icon)
  - **Sent**: Edit, View Invoice, Delete, Mark as Paid (check circle icon)
  - **Overdue**: Edit, View Invoice, Delete, Mark as Paid (check circle icon)
  - **Paid**: Edit, View Invoice, Delete
- Status action buttons only show if billing info configured AND billing date set
- Tooltips on each action button
- Smooth slide/fade animations
- Line item names wrap to show full text
- No hover color change on invoice status badges

### Acceptance Criteria
- [x] Hover detection on invoice line item rows
- [x] Price and status badge slide left on hover with smooth transition (group-hover:mr-40)
- [x] Action buttons absolutely positioned on right side with opacity fade-in
- [x] Correct action buttons shown based on invoice status
- [x] "Mark as Sent" functionality implemented for Draft invoices with database update
- [x] "Mark as Paid" functionality implemented for Sent/Overdue invoices with database update
- [x] Status action buttons only show if billingInfo exists AND billed_at exists
- [x] View Invoice only shows for line items with billing date and billing config
- [x] Tooltips display on all action buttons
- [x] Action button icons match mock design (Edit3, FileText, Trash2, Send, CheckCircle)
- [x] Smooth CSS transitions (200ms duration)
- [x] Loading states with spinners for async actions (mark as sent/paid)
- [x] Invoice line item names wrap instead of truncate (break-words class)
- [x] Calendar picker icon not cut off in edit mode (w-36, pr-2)
- [x] Multi-line descriptions align properly (items-start on flex container)
- [x] No hover color change on invoice status badges (pointer-events-none, explicit hover colors)

### Files Modified
- Modified: `src/components/OpportunityCard.tsx`
  - Added new imports: Send, Copy, CheckCircle icons
  - Added supabase client import for status updates
  - Added updatingStatusItemId state
  - Added markAsSent function with database update
  - Added markAsPaid function with database update and payment_date
  - Restructured line item layout with sliding container
  - Changed from items-center to items-start for multi-line support
  - Removed truncate, added break-words on description
  - Increased date input width from w-32 to w-36
  - Added pr-2 to date input for calendar icon spacing
  - Added group-hover:mr-40 for sliding animation
  - Action buttons absolutely positioned with opacity transition
  - Added status-based conditional rendering for action buttons
  - Added billingInfo check to status action buttons
  - All action buttons wrapped in Tooltips
  - Removed hover color change from status badges

### Design Reference
See https://e307a748-7b82-4b91-a212-f83a34666d44-preview.magicpatterns.app/ showing hover state with sliding price and action buttons for different invoice statuses

**✅ Completed** - Git commit: `7efed9a`

---

## Task 11: Implement Invoice Preview Modal

**Priority**: High | **Estimated Effort**: Medium

### Description
Create an invoice preview modal that displays the full invoice PDF preview with actions, replacing the separate invoices page navigation but leveraging the existing functionality for generating and downloading invoices

### Current State
- "View Invoice" navigates to `/invoices/:invoiceId` route ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):346)
- Separate Invoices page exists ([src/pages/Invoices.tsx](../src/pages/Invoices.tsx))

### Target State
- Clicking "View Invoice" action opens a modal overlay
- Modal displays full invoice PDF preview (using existing InvoiceTemplate component)
- Action buttons at top: "Download PDF", "Mark as Sent" for Draft invoices, "Mark as Paid" for sent and overdue invoices
- Close button (X) in top right corner
- Modal dismissible by clicking outside or pressing Escape
- Returns user to same position on dashboard when closed

### Acceptance Criteria
- [x] Invoice preview modal component created
- [x] Modal triggered by "View Invoice" action on line items
- [x] Uses existing InvoiceTemplate component for preview
- [x] "Download PDF" button generates and downloads PDF using existing functionality as much as possible for invoice downloads
- [x] "Mark as Sent" button updates invoice status (only shown for Draft invoices) and triggers same toast and updates that marking as sent from invoice line item action button does
- [x] "Mark as Paid" button updates invoice status (only shown for Sent and Overdue invoices) and triggers same toast and updates that marking as paid from invoice line item action button does
- [x] Close button (X) dismisses modal
- [x] Click outside modal to dismiss
- [x] Escape key dismisses modal
- [x] Scroll position preserved when modal closes
- [x] Modal styling matches mock design (but in mock ignore the changes to the actual invoice template - use what we already have for that)
- [x] Smooth fade/scale animation on open/close consistent with other modals triggered from the dashboard page
- [x] Invoice data loaded correctly in modal

### Files Modified
- Created: `src/components/InvoicePreviewModal.tsx`
- Modified: `src/components/OpportunityCard.tsx` (trigger modal instead of navigation)
- Kept: `src/pages/Invoices.tsx` (not modified - route still exists)
- Kept: `src/App.tsx` (route unchanged - invoices page still accessible)

### Implementation Notes
- Modal uses shadcn Dialog component for consistent styling and animations
- Sticky header with action buttons for easy access while scrolling invoice
- Loading states added for Download PDF and status update actions
- Converts line item data to InvoiceData format for template rendering
- Properly refetches line items and triggers dashboard updates on status changes
- Error handling for missing billing info and failed operations
- Action buttons conditionally rendered based on invoice status

### Design Reference
See https://e307a748-7b82-4b91-a212-f83a34666d44-preview.magicpatterns.app/ showing full invoice modal with header actions

**✅ Completed** - Git commit: `c4ce8d0`

---

## Task 12: Rename "Add Line Items" to "Add Products"

**Priority**: Low | **Estimated Effort**: Trivial

### Description
Update user-facing text in app from "Line Items" to "Products" throughout the application.

### Current State
- Button labeled "Add Line Items" ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):264)

### Target State
- Button labeled "Add Products"
- Contract upload modal and invoice line item creation tool says "line item" or "line items" in several places
- Now appears as a plus (+) icon next to gear icon in card header
- Tooltip displays "Add Products" on hover

### Acceptance Criteria
- [x] Button text changed to "Add Products"
- [x] Plus icon moved to card header (top right, next to gear icon)
- [x] Tooltip added showing "Add Products"
- [x] Button maintains same functionality (opens ContractUploadModal)
- [x] ContractUploadModal text says Product(s) instead of line item(s)

### Files Modified
- Modified: `src/components/ContractUploadModal.tsx`
  - Dialog title: "Add Line Items" → "Add Products"
  - Step description: "Add your line items" → "Add your products"
  - Upload helper text: "Extract line items" → "Extract products"
  - Progress message: "Retrieving line items" → "Retrieving products"
  - Error message: "No line items to process" → "No products to process"
  - Code comments updated
- No change needed: `src/components/OpportunityCard.tsx` (tooltip already said "Add Products")

**✅ Completed** - Git commit: `0b913eb`

---

## Task 13: Move School Code Field in Billing Configuration Modal

**Priority**: Low | **Estimated Effort**: Trivial

### Description
Reorganize the billing configuration modal to move "School Code" field into the Organization section.

### Current State
- Check existing field layout in BillingDetailsModal ([src/components/BillingDetailsModal.tsx](../src/components/BillingDetailsModal.tsx))

### Target State
- "School Code" field positioned within Organization information section
- Logical grouping of organization-related fields

### Acceptance Criteria
- [x] "School Code" field moved to Organization section
- [x] Field order and layout follows logical structure
- [x] Form validation still works correctly
- [x] Save functionality unaffected
- [x] Modal styling remains consistent

### Files Modified
- Modified: `src/components/BillingDetailsModal.tsx`
  - Moved School Code field to Organization Details section (after contact email)
  - Changed from 2-column grid to full-width placement
  - Custom Payment Terms now full-width (removed from grid layout)
  - All validation, save logic, and invoice number regeneration unchanged

**✅ Completed** - Git commit: `0b0d8b6`

---

## Task 14: Remove Redundant "Retainer/Deliverable" Text from Cards

**Priority**: Low | **Estimated Effort**: Small

### Description
Remove or simplify redundant item type labels displayed on invoice line items and opportunity cards.

### Current State
- Line items show item type labels like "Retainer" or "Deliverable" ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):404-408)

### Target State
- Remove redundant type labels or consolidate into more concise display
- Keep essential information only

### Acceptance Criteria
- [x] Redundant "Retainer" or "Deliverable" labels removed from line items
- [x] Line item display remains clear and readable
- [x] No loss of critical information
- [x] Visual hierarchy maintained

### Files Modified
- Modified: `src/components/OpportunityCard.tsx` (line item display section)

### Implementation Notes
This task was completed as part of Task 4's expanded scope during the line item redesign. The Retainer/Deliverable type labels were commented out to create a cleaner, more compact line item display focused on essential information (description, date, price, status).

**✅ Completed** - Git commit: `3f173de` (as part of Task 4)

---

## Task 15: Update Contract Upload AI Prompt for Retainer Invoice Descriptions

**Priority**: Medium | **Estimated Effort**: Small

### Description
Modify the AI prompt for contract upload to generate invoice descriptions in format: "{Month YYYY} - Consulting Services" for retainer line items.

### Current State
- AI prompt generates generic "Retainer" descriptions
- Located in contract upload functionality and edge function where anthropic is called for parsing contract details

### Target State
- Retainer invoices auto-generated with format: "July 2025 - Consulting Services"
- More descriptive and professional invoice line item names

### Acceptance Criteria
- [x] AI prompt updated with explicit formatting instructions
- [x] Generated retainer descriptions follow "{Month YYYY} - Consulting Services" pattern
- [x] Month extracted from billing date
- [x] Prompt clearly specifies this format requirement
- [x] Example JSON updated to show new format

### Files Modified
- Modified: `supabase/functions/contract-upload/pdf-parser.ts`
  - Updated AI prompt with new retainer format instructions
  - Changed example JSON: "Monthly Retainer" → "July 2025 - Consulting Services"
  - Updated `expandRetainerToMonthlyItems` function
  - Format change: "Retainer – {monthName}" → "{monthName} - Consulting Services"
  - Added note to prompt explaining auto-expansion format

**✅ Completed** - Git commit: `b0b71cd`

---

## Task 16: Update Dashboard Metrics and Add Paid Metric

**Priority**: Low | **Estimated Effort**: Small

### Description
Add a new "Total Paid" metric card to the dashboard, reorder existing metrics, update metric subtitles for cleaner presentation, and make metric cards clickable to apply invoice status filters.

### Current State
- Metrics show various subtitle texts ([src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx):390-444)
- No "Total Paid" metric displayed
- Metrics not clickable to apply filters
- "Total Clients" label instead of "Total Active Clients"

### Target State
- New "Total Paid" metric card added
- Metrics reordered: Clients → ACV → Paid → Billed & Unpaid → Total Outstanding
- "Total Clients" changed to "Total Active Clients"
- ACV subtitle removed entirely
- "Billed & Unpaid" keeps "Awaiting collection (X invoices)" subtitle
- New Paid metric shows count subtitle (e.g., "X invoices paid")
- Clicking metric cards applies corresponding invoice status filter
- Cleaner, less verbose presentation

### Acceptance Criteria
- [x] "Total Clients" changed to "Total Active Clients"
- [x] New "Total Paid" metric card added
- [x] Metrics reordered: Clients, ACV, Paid, Billed & Unpaid, Total Outstanding
- [x] ACV subtitle removed (also changed title to "Total ACV" for brevity)
- [x] Paid metric shows count subtitle (simplified to "X invoice(s)")
- [x] Billed & Unpaid subtitle simplified to "X invoice(s)"
- [x] Clicking Paid and Billed & Unpaid cards applies corresponding invoice status filter
- [x] Card layout balanced with 5-column grid on large screens
- [x] Typography consistent across cards
- [x] Metrics properly reflect filtered opportunities while showing all line item statuses

### Files Modified
- Modified: `src/utils/dashboardCalculations.ts`
  - Added `totalPaid` and `paidCount` to `DashboardMetrics` interface
  - Created `calculateTotalPaid()` helper function
  - Created `calculatePaidCount()` helper function
  - Updated `calculateDashboardMetrics()` to return paid metrics
- Modified: `src/pages/Dashboard.tsx`
  - Added `CheckCircle` icon import
  - Added Total Paid metric card with click handler
  - Reordered metric cards to match specification
  - Simplified all metric subtitles
  - Updated grid from 4 to 5 columns
  - Fixed metrics calculation to use filtered opportunities correctly

**✅ Completed** - Git commit: `f98fc63`

---

## Task 17: Pull and Display Estimated Close Date from Act! Opportunity

**Priority**: Medium | **Estimated Effort**: Medium

### Description
Fetch the Estimated Close Date field from Act! opportunities and display it in the dashboard opportunity card view.

### Current State
- Estimated Close Date not currently synced or displayed
- Need to verify exact Act! API field name

### Target State
- Estimated Close Date synced from Act! opportunities
- Displayed in opportunity card header below company name
- Format: "Estimated Close Date: MM/DD/YYYY"

### Acceptance Criteria
- [x] **First: Verify Act! API field name for Estimated Close Date** (confirmed: `estimatedCloseDate`)
- [x] Add field to opportunities sync logic in Act! edge function
- [x] Update database schema if needed (add column to opportunities table)
- [x] Update TypeScript types for opportunity model
- [x] Display date in opportunity card header
- [x] Format date consistently with design
- [x] Handle null/missing dates gracefully
- [x] Test sync to ensure field updates correctly
- [x] Fixed timezone issue with date parsing to show correct date

### Files Modified
- Modified: `supabase/functions/act-sync/opportunities-sync.ts` (added estimatedCloseDate parsing)
- Modified: `supabase/functions/act-sync/types.ts` (added estimated_close_date to DbOpportunity)
- Modified: `src/components/OpportunityCard.tsx` (display field below company name)
- Migration: `supabase/migrations/20251007_add_estimated_close_date_to_opportunities.sql` (added column)

### Implementation Notes
- Act! API field confirmed as `estimatedCloseDate` (already in API response)
- Database migration applied successfully via Supabase MCP
- Date displayed as "Est. Close: MM/DD/YYYY" below company name
- Used direct string parsing to avoid timezone offset issues
- Only displays when estimated_close_date has a value
- Auto-generated TypeScript types will update on next build

### Design Reference
See mock showing "Estimated Close Date: 12/15/2025" below company name

**✅ Completed** - Git commit: `34294af`

---

## Task 18: Ensure Long Deliverable Names Fully Visible

**Priority**: Medium | **Estimated Effort**: Small

### Description
Adjust invoice line item layout to ensure long deliverable/product names are fully visible without truncation.

### Current State
- Line item descriptions may truncate with ellipsis ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):293)
- Uses `line-clamp-2` CSS class

### Target State
- Full description text visible for all line items
- Dates and prices remain in separate column/area
- Text wraps naturally without truncation
- Scrollable if needed within line item container

### Acceptance Criteria
- [x] Remove or adjust `line-clamp-2` class from descriptions (removed `truncate`, added `break-words`)
- [x] Long names wrap to multiple lines
- [x] Dates/prices layout doesn't break with long names
- [x] Scrolling works properly within line items container
- [x] Visual hierarchy maintained (items-start for multi-line alignment)
- [x] Readable typography for wrapped text
- [x] Fixed calendar picker icon cutoff in edit mode

### Files Modified
- Modified: `src/components/OpportunityCard.tsx` (changed from `truncate` to `break-words`, items-start alignment, calendar width fix)

### Implementation Notes
This task was completed as part of Task 10 (Invoice Line Item Actions with Hover Effects). The line item description styling was changed from `truncate` to `break-words` to allow full text wrapping. Additional improvements included:
- Changed flex container from `items-center` to `items-start` for proper multi-line alignment
- Increased date input width from `w-32` to `w-36` and added `pr-2` for calendar icon spacing
- Text now wraps naturally without truncation, maintaining readability

**✅ Completed** - Git commit: `7efed9a` (as part of Task 10)

---

## Task 19: Visual Polish and Final QA ✅

**Priority**: High | **Estimated Effort**: Medium

### Description
Final pass to ensure all visual details match the mock design and polish the user experience.

### Checklist
- [x] Make sure dashboard metrics for acv, paid, outstanding, and billed and unpaid are filtering out soft deleted line items in their calculations
- [x] Fix opportunity card border corner visual issue (added rounded-t-lg to CardHeader)
- [x] Update estimated close date format to match billing dates (removed leading zeros)
- [x] Spacing and padding matches mock throughout
- [x] Color scheme consistent (grays, blues, oranges, reds, greens)
- [x] Typography sizes and weights match design
- [x] Icon sizes and styles consistent
- [x] Button hover states smooth and polished
- [x] Card shadows and borders match mock
- [x] Animation timings feel smooth (200-300ms transitions)
- [x] Loading states look professional
- [x] Empty states handled gracefully
- [x] Error states styled appropriately
- [x] Responsive design works on different screen sizes
- [x] Tooltips positioned correctly and readable
- [x] Focus states accessible and visible
- [x] Test all interactions end-to-end
- [x] Cross-browser testing (Chrome, Firefox, Safari)

### Files to Review
- All modified components
- Global CSS/Tailwind configurations
- Animation/transition utilities

**✅ Completed** - Git commit: `d23b197`

---

## Task 20: Preserve Dashboard State After Data Updates

**Priority**: High | **Estimated Effort**: Medium

### Description
When editing line items or changing invoice status (mark as sent/paid), the dashboard forces a full refresh that loses user context. The user is taken away from their current scroll position and any applied filters are maintained but the loading state disrupts the experience. We need to handle data updates more gracefully by updating data in the background without showing a full loading state, while preserving scroll position and filter state.

### Current State
- Editing a line item triggers `refetchLineItems()` ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):865, 875)
- Marking invoices as sent/paid triggers `refetchLineItems()` and `onDataChange()` ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):227-228, 252-253)
- `onDataChange()` calls `fetchData()` which sets `setLoading(true)` ([src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx):648)
- Full dashboard loading state shown, disrupting user experience
- Scroll position is preserved for filter changes but not for data updates
- Filter state is maintained via React state

### Target State
- Line item edits update data in background without showing full loading state
- Invoice status changes update data in background without showing full loading state
- User's scroll position is preserved during all updates
- Applied filters remain active during updates
- Expanded/collapsed card state preserved during updates
- Only the affected opportunity card shows a subtle loading indicator if needed
- React Query cache updated optimistically where possible

### Acceptance Criteria
- [x] Line item edits no longer trigger full dashboard loading state
- [x] Invoice status changes (sent/paid) no longer trigger full dashboard loading state
- [x] Scroll position preserved during all data mutations
- [x] Filter state (search, status, client) maintained during updates
- [x] Expanded/collapsed card state maintained during updates
- [x] Affected opportunity card shows subtle inline loading indicator
- [x] Dashboard metrics update smoothly without full refresh
- [x] React Query optimistic updates implemented for faster perceived performance
- [x] Error states handled gracefully without losing user context
- [x] No "flash" or "jump" in UI during updates

### Implementation Summary
1. **Replaced `onDataChange` callback pattern** with React Query cache invalidation
2. **Created mutations** for invoice status updates (`markAsSentMutation`, `markAsPaidMutation`)
3. **Added background refresh function** that fetches invoice line items and line items without loading state
4. **Set up React Query cache listener** to trigger background refresh on query invalidation
5. **Removed `onDataChange` prop** from OpportunityCard component
6. **Preserved scroll position** during all data updates using `requestAnimationFrame`

### Files Modified
- Modified: `src/components/OpportunityCard.tsx` - Added mutations, replaced callbacks with cache invalidation
- Modified: `src/pages/Dashboard.tsx` - Added background refresh, React Query listener, removed onDataChange prop
- Modified: `src/hooks/useLineItemCrud.ts` - Already uses queryClient.invalidateQueries
- Modified: `docs/tasks-phase-2-dashboard-consolidation.md` - Added task documentation

### Design Reference
No visual design changes - UX improvement only. Updates should feel instant and smooth.

**✅ Completed** - Git commit: `6b5e7c4`

---

## Task 21: Make Invoice Line Item Action Buttons Always Visible

**Priority**: Medium | **Estimated Effort**: Small

### Description
Currently, action buttons on invoice line items (Edit, View Invoice, Delete, Mark as Sent/Paid) only appear on hover with a sliding animation. This creates a "bouncy" reveal effect. We want to make these buttons permanently visible while retaining all existing button logic, design, tooltips, and conditional rendering.

### Current State
- Action buttons are absolutely positioned and hidden by default ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):672)
- CSS class: `opacity-0 group-hover:opacity-100 transition-opacity duration-200`
- Price and status slide left on hover with class: `group-hover:mr-40`
- Buttons only visible when hovering over line item row
- All button logic, tooltips, and conditional rendering work correctly

### Target State
- Action buttons are always visible on each line item row
- No hover-based reveal animation
- Price and status remain in fixed position (no sliding)
- All existing button functionality preserved:
  - Edit button with edit mode
  - View Invoice button (conditional on billing date and billing config)
  - Delete button with confirmation
  - Mark as Sent button (conditional on draft status and billing config)
  - Mark as Paid button (conditional on sent/overdue status and billing config)
- All tooltips remain functional
- All loading states remain functional
- Button styling and spacing maintained

### Acceptance Criteria
- [x] Action buttons visible at all times (no hover required)
- [x] Remove `opacity-0 group-hover:opacity-100` classes from button container
- [x] Remove `group-hover:mr-40` from price/status container
- [x] Adjust line item layout to accommodate always-visible buttons
- [x] Price and status remain right-aligned without sliding animation
- [x] All button logic unchanged (edit, view, delete, mark as sent/paid)
- [x] All conditional button rendering unchanged
- [x] All tooltips continue to work
- [x] All loading states continue to work
- [x] Visual spacing and alignment looks clean with always-visible buttons
- [x] No layout shift or overlap between price/status and action buttons

### Implementation Summary
1. **Removed hover animations** from action button container and price/status container
2. **Reordered buttons** to: Mark as Sent/Paid (conditional) → View Invoice → Edit → Delete
3. **Updated icons** for better visual clarity:
   - View Invoice: Changed from `FileText` to `Eye` icon
   - Mark as Paid: Changed from `CheckCircle` to `DollarSign` icon
4. **Applied changes to both components**:
   - OpportunityCard action buttons
   - InvoicePreviewModal Mark as Paid button

### Files Modified
- Modified: `src/components/OpportunityCard.tsx` - Removed hover classes, reordered buttons, updated icons
- Modified: `src/components/InvoicePreviewModal.tsx` - Updated Mark as Paid icon to DollarSign
- Modified: `docs/tasks-phase-2-dashboard-consolidation.md` - Added task documentation

### Design Reference
Retain all existing button styling, icons, tooltips, and behavior. Only change is making buttons always visible instead of hover-reveal.

**✅ Completed** - Git commit: `35c4730`

---

## Task 22: Fix Invoice Number Generation and Sent Date Issues

**Priority**: High | **Estimated Effort**: Medium

### Description
Two critical data integrity issues with invoice line items: (1) Invoice numbers are not being automatically assigned when billing dates are set, causing UI to show "#DRAFT", and (2) sent_date field is not being populated when marking invoices as sent, breaking overdue calculation logic.

### Current State

#### Issue 1: Invoice Numbers Not Assigned
- Line items with `billed_at` dates have `null` invoice_number field
- Example: Opportunity `07bb98fe-a210-48cf-ab50-1b1121e67e21` has 5 line items with billing dates but no invoice numbers
- UI displays "#DRAFT" instead of proper invoice numbers (e.g., "WSU-251101-001")
- Invoice number generation logic exists ([src/hooks/useInvoiceNumbering.ts](../src/hooks/useInvoiceNumbering.ts)) but only runs on `/invoices` page load
- Assignment function exists ([src/pages/Invoices.tsx](../src/pages/Invoices.tsx):300-390) but not integrated into normal workflow
- No automatic assignment when users set `billed_at` via OpportunityCard

#### Issue 2: Sent Date Not Saved
- Marking invoice as sent updates `invoice_status` to 'sent' but doesn't set `sent_date`
- Database column exists but not populated by application code
- Affects OpportunityCard markAsSent ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):122-141)
- Affects InvoicePreviewModal handleMarkAsSent ([src/components/InvoicePreviewModal.tsx](../src/components/InvoicePreviewModal.tsx):74-95)
- Mark as paid correctly sets both `invoice_status` and `payment_date` (implemented correctly)
- Missing `sent_date` breaks overdue detection and reporting

### Target State
- Invoice numbers automatically assigned when billing date is set on line item
- Invoice status defaults to 'draft' when invoice number is assigned
- Sent date automatically populated when invoice marked as sent
- All timestamp fields (sent_date, payment_date) consistently populated
- Overdue calculation works correctly with sent_date

### Acceptance Criteria

#### Invoice Number Assignment:
- [ ] When user sets `billed_at` on line item, invoice number automatically generated and assigned
- [ ] Invoice number generation uses existing logic (client shortform + date + sequence)
- [ ] Invoice status defaults to 'draft' when invoice number first assigned
- [ ] UI displays proper invoice number instead of "#DRAFT"
- [ ] Works for both manual date entry and contract upload flows
- [ ] Handles race conditions (multiple items getting billing dates simultaneously)
- [ ] No duplicate invoice numbers generated

#### Sent Date Fix:
- [ ] Mark as sent updates both `invoice_status` and `sent_date` fields
- [ ] Sent date uses format: `new Date().toISOString().split('T')[0]`
- [ ] Applied to OpportunityCard markAsSentMutation
- [ ] Applied to InvoicePreviewModal handleMarkAsSent
- [ ] Consistent with how mark as paid handles `payment_date`
- [ ] Overdue detection logic works correctly with sent_date
- [ ] Audit trail complete for when invoices were sent

### Implementation Strategy

#### Fix 1: Auto-assign Invoice Numbers
Modify `updateLineItem()` mutation in [src/hooks/useLineItemCrud.ts](../src/hooks/useLineItemCrud.ts):

1. After database update succeeds, check if `billed_at` was set and invoice_number is null
2. If so, fetch opportunity company name
3. Call invoice numbering logic to generate unique number
4. Update line item with invoice_number and default invoice_status to 'draft'
5. Handle errors gracefully without failing the entire operation
6. Log results for debugging

**Key Decision:** Keep logic in application layer (not database trigger) for:
- Easier testing and debugging
- Access to existing invoice numbering utilities
- Consistent with other business logic patterns

#### Fix 2: Add sent_date to Mark As Sent
Simple one-line addition to both locations:

1. OpportunityCard.tsx markAsSentMutation (line 126)
2. InvoicePreviewModal.tsx handleMarkAsSent (line 81)
3. Add `sent_date: new Date().toISOString().split('T')[0]` to update object

#### Fix 3: Add Overdue Detection to Dashboard
Simple addition of existing logic to Dashboard/OpportunityCard:

1. Import `calculateOverdueStatus` from invoiceHelpers
2. Calculate overdue status on-the-fly when rendering status badges
3. Display "Overdue" badge when calculation returns true
4. Update status counts to include calculated overdue items
5. Consistent with how `/invoices` page already works

### Files to Modify
- ✅ Modify: `src/hooks/useLineItemCrud.ts` (add auto-invoice number assignment logic) - Commit: 87cd279
- ✅ Modify: `src/components/OpportunityCard.tsx` (add sent_date to markAsSentMutation) - Commit: dc55ca6
- ✅ Modify: `src/components/InvoicePreviewModal.tsx` (add sent_date to handleMarkAsSent) - Commit: dc55ca6
- Modify: `src/components/OpportunityCard.tsx` (add overdue calculation for status display)
- Modify: `src/utils/dashboardCalculations.ts` (ensure overdue detection in metrics)

### Testing Plan

#### Invoice Number Testing:
1. Create new line item without billing date
2. Set billing date via OpportunityCard edit
3. Verify invoice_number auto-assigned (check DB and UI)
4. Verify invoice_status set to 'draft'
5. Verify UI shows proper invoice number (not "#DRAFT")
6. Test with contract upload flow (multiple items at once)
7. Test editing existing items with billing dates

#### Sent Date Testing:
1. Create line item with billing date and invoice number (draft status)
2. Click "Mark as Sent" from OpportunityCard action button
3. Query database to verify `sent_date` populated
4. Verify `invoice_status` also updated to 'sent'
5. Repeat test from InvoicePreviewModal
6. Verify overdue calculation works with sent_date
7. Test mark as paid flow still works correctly

#### Integration Testing:
1. Full workflow: Create → Set billing date → Mark as sent → Mark as paid
2. Verify all fields populated: invoice_number, invoice_status, sent_date, payment_date
3. Test PDF generation with proper invoice numbers
4. Test dashboard metrics with complete data
5. Test overdue detection with sent invoices

### Design Reference
No UI changes - data integrity fixes only.

---

## Task 23: Fix Line Item Delete Bug - Act! Sync Not Completing

**Priority**: Critical | **Estimated Effort**: Medium

### Description
Line item deletion from the dashboard shows success toast but does not actually delete the product from Act! CRM. The soft delete (setting `act_deleted_at`) succeeds in the database, but the Act! API delete call is not completing successfully.

### Current State
- Delete operation shows success toast to user
- Line item is soft deleted in database (`act_deleted_at` timestamp set)
- Product remains in Act! CRM (verified via Postman that Act! API works)
- Update and create operations to Act! work correctly
- Issue isolated to delete operation only

### Investigation Summary

#### What We Know:
1. **Database UPDATE works**: Soft delete by setting `act_deleted_at` timestamp succeeds
2. **Act! API works**: Direct DELETE via Postman to Act! API succeeds
3. **Edge function exists**: Delete handler in `supabase/functions/act-sync/index.ts` (lines 213-289)
4. **Act! client function exists**: `deleteProduct()` in `act-client.ts` (lines 1196-1227)
5. **Update mutation works**: Similar pattern to delete, but updates succeed in Act!

#### Code Comparison:
- `deleteProduct()` and `updateProduct()` in act-client.ts are structurally identical
- Both use same endpoint pattern: `/api/opportunities/{opportunityId}/products/{productId}`
- Only differences: HTTP method (DELETE vs PUT) and request body (none vs productData)
- Both call `makeApiCall()` with same error handling

#### Enhanced Logging Added:
Added comprehensive logging to `src/hooks/useLineItemCrud.ts` (lines 272-294):
- Logs full edge function response including `success` flag
- Checks if response contains `success: false` but no error
- Distinguishes between edge function errors and Act! API failures
- Emojis for easy log scanning (🔴 for failures, ✅ for success)

### Next Steps for Debugging

1. **Test with new logging**:
   - Attempt to delete a line item from dashboard
   - Check browser console for detailed logs
   - Verify whether:
     - Soft delete UPDATE succeeds
     - Edge function is actually called
     - Edge function returns success or error
     - Response includes `success: false` flag

2. **Check edge function logs**:
   - Review Supabase edge function logs for delete requests
   - Confirm opportunity ID lookup succeeds
   - Verify Act! API call is being made
   - Check for any error responses from Act! API

3. **Possible Issues to Investigate**:
   - Edge function opportunity lookup may be failing silently
   - Response handling may not check `success: false` in body
   - Act! API may return success but not actually delete
   - DeliveryDesk opportunity ID → Act! opportunity ID mapping issue

### Acceptance Criteria
- [ ] Line item delete from dashboard successfully removes product from Act! CRM
- [ ] Success toast only shows when both database AND Act! operations succeed
- [ ] Appropriate error messages shown when Act! delete fails
- [ ] Edge function logs provide clear debugging information
- [ ] Delete operation works as reliably as update operation

### Files Involved
- `src/hooks/useLineItemCrud.ts` (delete mutation - lines 221-298)
- `supabase/functions/act-sync/index.ts` (delete handler - lines 213-289)
- `supabase/functions/act-sync/act-client.ts` (deleteProduct - lines 1196-1227)
- `src/components/OpportunityCard.tsx` (delete button trigger - line 751)

### Design Reference
N/A - Bug fix, no design changes

**Status**: 🔴 IN PROGRESS - Enhanced logging added, awaiting test results

---

## Implementation Strategy

### Phase 1: Layout & Structure (Tasks 1-3)
Focus on major layout changes first:
1. Top navigation bar
2. Single column layout
3. Collapse/expand functionality

### Phase 2: Card Enhancements (Tasks 4-6, 12-14)
Enhance opportunity cards:
4. Invoice status badges
5. Gear icon repositioning
6. Sticky filters
12. Rename to "Add Products"
13. School code field move
14. Remove redundant labels

### Phase 3: Improvements & Filtering (Tasks 7-9)
Add filtering capabilities and improvements:
7. Invoice line item and status badge improvements
8. Invoice status filter
9. Client filter

### Phase 4: Invoice Actions (Tasks 10-11)
Implement invoice interactions:
10. Hover-based line item actions
11. Invoice preview modal

### Phase 5: Polish & Data (Tasks 15-19)
Final touches and data improvements:
15. AI prompt updates
16. Metric updates and Paid metric
17. Estimated close date integration
18. Long name visibility
19. Visual polish and QA

---

## Testing Checklist

### Functionality Testing
- [ ] All filters work correctly (search, status, client)
- [ ] Filters work in combination
- [ ] Expand/collapse persists in localStorage
- [ ] "Expand All" toggles all cards correctly
- [ ] Invoice status transitions work (Draft → Sent → Paid)
- [ ] Invoice modal opens and closes properly
- [ ] PDF generation and download works
- [ ] Billing configuration modal functions correctly
- [ ] Contract upload modal works
- [ ] Line item editing saves correctly
- [ ] Line item deletion works with confirmation
- [ ] Dashboard metrics calculate correctly
- [ ] Infinite scroll loads more opportunities

### Visual Testing
- [ ] Layout matches mock design
- [ ] Hover effects smooth and correct
- [ ] Animations feel polished
- [ ] Colors match design system
- [ ] Typography consistent
- [ ] Responsive design works
- [ ] Icons display correctly
- [ ] Tooltips positioned well

### Performance Testing
- [ ] Page loads quickly
- [ ] Scroll performance smooth
- [ ] No layout shift on data load
- [ ] Filter changes responsive
- [ ] Modal animations smooth
- [ ] Large opportunity lists perform well

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Interactive elements have labels
- [ ] Modal traps focus appropriately

---

## Reference Links

- **Live Mock Design**: https://e307a748-7b82-4b91-a212-f83a34666d44-preview.magicpatterns.app/
- **Current Live App**: https://delivery-desk.lovable.app/
- **CRCG Logo**: https://osywqypaamxxqlgnvgqw.supabase.co/storage/v1/object/public/public-images/crcg-logo.png

---

## Notes for Implementation

1. **Use Playwright MCP**: Reference the mock design URL throughout implementation to verify visual accuracy
2. **Preserve Old Code**: Comment out rather than delete removed components and routes
3. **LocalStorage Keys**: Use consistent naming convention (e.g., `deliverydesk_expanded_cards`, `deliverydesk_expand_all_state`)
4. **Animation Standards**: Use 200-300ms for most transitions, cubic-bezier easing for smoothness
5. **Error Handling**: Maintain robust error handling for all async operations
6. **Loading States**: Show appropriate loading indicators during data fetches and mutations
7. **Type Safety**: Update TypeScript types as schema changes are made
8. **Act! Sync**: Coordinate any Act! API changes with existing sync logic to avoid breaking integrations

---

**Document Version**: 1.0
**Created**: 2025-10-06
**Last Updated**: 2025-10-06
**Status**: Ready for Implementation
