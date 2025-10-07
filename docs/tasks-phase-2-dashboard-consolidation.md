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
- [ ] Status filter dropdown component created
- [ ] Filter options match design: All, Draft, Sent, Paid, Overdue
- [ ] Selecting status filters opportunity list accordingly
- [ ] Shows opportunities with at least one matching invoice status
- [ ] Shows only line items matching invoice status filter
- [ ] Works together with existing search filter
- [ ] Filter state preserved during expand/collapse actions
- [ ] Dropdown styling matches mock design
- [ ] Filter resets appropriately

### Files to Modify
- Create new: `src/components/InvoiceStatusFilter.tsx` or extend existing filter component
- Modify: `src/pages/Dashboard.tsx` (add filter logic and state management)

### Design Reference
See mock showing "All invoice statuses" dropdown in filter bar

---

## Task 9: Implement Client Filter Dropdown

**Priority**: Medium | **Estimated Effort**: Small

### Description
Add a client filter dropdown to filter opportunities by company name.

### Current State
- No client-based filtering dropdown exists

### Target State
- Client dropdown filter in sticky header section
- Options: "All clients" + list of all unique company names
- Filters opportunities to show only selected client
- Works in combination with search filter and status filter

### Acceptance Criteria
- [ ] Client filter dropdown component created
- [ ] Dropdown populated with "All clients" + unique company names
- [ ] Selecting client filters opportunity list accordingly
- [ ] Works together with search and status filters
- [ ] Filter state preserved during expand/collapse actions
- [ ] Dropdown styling matches mock design
- [ ] Alphabetically sorted client list

### Files to Modify
- Create new: `src/components/ClientFilter.tsx` or extend existing filter component
- Modify: `src/pages/Dashboard.tsx` (add filter logic and state management)

### Design Reference
See mock showing "All clients" dropdown in filter bar

---

## Task 10: Redesign Invoice Line Item Actions with Hover Effects

**Priority**: High | **Estimated Effort**: Large

### Description
Implement new hover-based action buttons for invoice line items that slide price to the left and display action icons.

### Current State
- Action buttons overlay content on hover ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):299-374)
- Actions: Edit (pencil), View Invoice (file), Delete (trash)
- Buttons show with opacity transition

### Target State
- On hover, price and status slide left to reveal action buttons
- Action buttons appear in a row on the right side
- Actions vary by invoice status:
  - **Draft**: Edit, Mark as Sent (paper plane icon), Copy, Delete
  - **Sent**: Edit, Mark as Paid (check icon), Copy, View Invoice, Delete
  - **Overdue**: Edit, Mark as Paid (check icon), Copy, View Invoice, Delete
  - **Paid**: Edit, Copy, View Invoice, Delete
- Tooltips on each action button
- Smooth slide/fade animations

### Acceptance Criteria
- [ ] Hover detection on invoice line item rows
- [ ] Price and status badge slide left on hover with smooth transition
- [ ] Action buttons appear on right side
- [ ] Correct action buttons shown based on invoice status
- [ ] "Mark as Sent" functionality implemented for Draft invoices
- [ ] "Mark as Paid" functionality implemented for Sent/Overdue invoices
- [ ] Copy invoice functionality added (copies invoice details or link)
- [ ] View Invoice opens invoice modal (not separate page)
- [ ] Tooltips display on icon hover
- [ ] Action button icons match mock design
- [ ] Smooth CSS transitions throughout
- [ ] Loading states for async actions (mark as sent/paid)

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (redesign line item layout and actions)
- Add status transition logic for mark as sent/paid
- Update invoice status update mutations

### Design Reference
See mock screenshots showing hover state with sliding price and action buttons for different invoice statuses

---

## Task 11: Implement Invoice Preview Modal

**Priority**: High | **Estimated Effort**: Medium

### Description
Create an invoice preview modal that displays the full invoice PDF preview with actions, replacing the separate invoices page navigation.

### Current State
- "View Invoice" navigates to `/invoices/:invoiceId` route ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):346)
- Separate Invoices page exists ([src/pages/Invoices.tsx](../src/pages/Invoices.tsx))

### Target State
- Clicking "View Invoice" action opens a modal overlay
- Modal displays full invoice PDF preview (using existing InvoiceTemplate component)
- Action buttons at top: "Download PDF", "Mark as Sent"
- Close button (X) in top right corner
- Modal dismissible by clicking outside or pressing Escape
- Returns user to same position on dashboard when closed

### Acceptance Criteria
- [ ] Invoice preview modal component created
- [ ] Modal triggered by "View Invoice" action on line items
- [ ] Uses existing InvoiceTemplate component for preview
- [ ] "Download PDF" button generates and downloads PDF
- [ ] "Mark as Sent" button updates invoice status (only shown for Draft invoices)
- [ ] Close button (X) dismisses modal
- [ ] Click outside modal to dismiss
- [ ] Escape key dismisses modal
- [ ] Scroll position preserved when modal closes
- [ ] Modal styling matches mock design
- [ ] Smooth fade/scale animation on open/close
- [ ] Invoice data loaded correctly in modal

### Files to Modify
- Create new: `src/components/InvoicePreviewModal.tsx`
- Modify: `src/components/OpportunityCard.tsx` (trigger modal instead of navigation)
- Keep: `src/pages/Invoices.tsx` (comment out route, don't delete)
- Update: `src/App.tsx` (comment out invoices route)

### Design Reference
See mock screenshot showing full invoice modal with header actions

---

## Task 12: Rename "Add Line Items" to "Add Products"

**Priority**: Low | **Estimated Effort**: Trivial

### Description
Update button text from "Add Line Items" to "Add Products" throughout the application.

### Current State
- Button labeled "Add Line Items" ([src/components/OpportunityCard.tsx](../src/components/OpportunityCard.tsx):264)

### Target State
- Button labeled "Add Products"
- Now appears as a plus (+) icon next to gear icon in card header
- Tooltip displays "Add Products" on hover

### Acceptance Criteria
- [ ] Button text changed to "Add Products"
- [ ] Plus icon moved to card header (top right, next to gear icon)
- [ ] Tooltip added showing "Add Products"
- [ ] Button maintains same functionality (opens ContractUploadModal)
- [ ] Icon styling matches mock design

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (update button text and position)

### Design Reference
See mock showing + icon next to gear icon with "Add Products" tooltip

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
- [ ] "School Code" field moved to Organization section
- [ ] Field order and layout follows logical structure
- [ ] Form validation still works correctly
- [ ] Save functionality unaffected
- [ ] Modal styling remains consistent

### Files to Modify
- Modify: `src/components/BillingDetailsModal.tsx`

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
- [ ] Redundant "Retainer" or "Deliverable" labels removed from line items
- [ ] Line item display remains clear and readable
- [ ] No loss of critical information
- [ ] Visual hierarchy maintained

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (line item display section)

### Design Reference
Review mock to confirm simplified line item display without redundant labels

---

## Task 15: Update Contract Upload AI Prompt for Retainer Invoice Descriptions

**Priority**: Medium | **Estimated Effort**: Small

### Description
Modify the AI prompt for contract upload to generate invoice descriptions in format: "{Month YYYY} - Consulting Services" for retainer line items.

### Current State
- AI prompt generates generic "Retainer" descriptions
- Located in contract upload functionality

### Target State
- Retainer invoices auto-generated with format: "July 2025 - Consulting Services"
- More descriptive and professional invoice line item names

### Acceptance Criteria
- [ ] AI prompt updated with explicit formatting instructions
- [ ] Generated retainer descriptions follow "{Month YYYY} - Consulting Services" pattern
- [ ] Month extracted from billing date
- [ ] Prompt clearly specifies this format requirement
- [ ] Test with contract upload to verify output

### Files to Modify
- Find and modify: Contract upload AI prompt (likely in ContractUploadModal or related edge function)
- Check: `src/pages/ContractUpload.tsx`, `src/components/ContractUploadModal.tsx`
- Potentially: Supabase edge function for contract processing

### Design Reference
See mock showing invoice line items with format "July 2025 - Consulting Services"

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
- [ ] "Total Clients" changed to "Total Active Clients"
- [ ] New "Total Paid" metric card added
- [ ] Metrics reordered: Clients, ACV, Paid, Billed & Unpaid, Total Outstanding
- [ ] ACV subtitle removed
- [ ] Paid metric shows count subtitle (e.g., "X invoices paid")
- [ ] Billed & Unpaid keeps "Awaiting collection (X invoices)"
- [ ] Clicking metric cards applies corresponding invoice status filter
- [ ] Card layout remains balanced and readable
- [ ] Typography consistent across cards

### Files to Modify
- Modify: `src/pages/Dashboard.tsx` (add Paid metric, reorder metrics, update subtitles, add click handlers)

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
- [ ] **First: Verify Act! API field name for Estimated Close Date**
- [ ] Add field to opportunities sync logic in Act! edge function
- [ ] Update database schema if needed (add column to opportunities table)
- [ ] Update TypeScript types for opportunity model
- [ ] Display date in opportunity card header
- [ ] Format date consistently with design
- [ ] Handle null/missing dates gracefully
- [ ] Test sync to ensure field updates correctly

### Files to Modify
- Modify: `supabase/functions/act-sync/opportunities-sync.ts` (add field to sync)
- Potentially modify: Database migration for opportunities table
- Modify: `src/components/OpportunityCard.tsx` (display field)
- Update: TypeScript types in `src/integrations/supabase/types.ts`

### Design Reference
See mock showing "Estimated Close Date: 12/15/2025" below company name

### Notes
**⚠️ Requires clarification from Nick on exact Act! API field name before implementation**

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
- [ ] Remove or adjust `line-clamp-2` class from descriptions
- [ ] Long names wrap to multiple lines
- [ ] Dates/prices layout doesn't break with long names
- [ ] Scrolling works properly within line items container
- [ ] Visual hierarchy maintained
- [ ] Readable typography for wrapped text

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (line item description styling)

---

## Task 19: Visual Polish and Final QA

**Priority**: High | **Estimated Effort**: Medium

### Description
Final pass to ensure all visual details match the mock design and polish the user experience.

### Checklist
- [ ] Spacing and padding matches mock throughout
- [ ] Color scheme consistent (grays, blues, oranges, reds, greens)
- [ ] Typography sizes and weights match design
- [ ] Icon sizes and styles consistent
- [ ] Button hover states smooth and polished
- [ ] Card shadows and borders match mock
- [ ] Animation timings feel smooth (200-300ms transitions)
- [ ] Loading states look professional
- [ ] Empty states handled gracefully
- [ ] Error states styled appropriately
- [ ] Responsive design works on different screen sizes
- [ ] Tooltips positioned correctly and readable
- [ ] Focus states accessible and visible
- [ ] Test all interactions end-to-end
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Replace all instances of "line items" with "products" in user-facing UI text

### Files to Review
- All modified components
- Global CSS/Tailwind configurations
- Animation/transition utilities

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
