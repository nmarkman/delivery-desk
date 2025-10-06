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
- [ ] Top navigation bar component created with proper styling
- [ ] Logo and branding displayed on left side of nav bar
- [ ] "Sync Act!" button prominently placed in top right
- [ ] User email button/dropdown on far right with sign out functionality
- [ ] Old sidebar components commented out (not deleted)
- [ ] Layout component updated to use new nav structure
- [ ] Navigation bar remains fixed when scrolling
- [ ] Responsive design maintained for different screen sizes

### Files to Modify
- Create new: `src/components/TopNavigation.tsx`
- Modify: `src/components/Layout.tsx`
- Comment out: `src/components/AppSidebar.tsx` (keep file)
- Update: `src/pages/Index.tsx` to use new layout

### Design Reference
See mock navbar showing DeliveryDesk logo, Sync Act! button, and user email dropdown

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
- [ ] Dashboard grid changed to single column layout
- [ ] Opportunity cards span full width of content area
- [ ] Spacing and padding adjusted for single column view
- [ ] Infinite scroll continues to work correctly
- [ ] Loading states display properly

### Files to Modify
- Modify: `src/pages/Dashboard.tsx` (line 477 - grid classes)

### Design Reference
See mock showing single-column opportunity card layout

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
- [ ] Individual cards can collapse/expand via "View Invoices" button
- [ ] Collapsed cards show: company name, estimated close date, contract value, invoice status badges, gear icon, and + icon
- [ ] Expanded cards show all current details including invoice line items
- [ ] "Expand All" button toggles all cards at once
- [ ] Button label changes: "Expand All" ↔ "Collapse All"
- [ ] User's expand/collapse state persisted in localStorage
- [ ] Smooth CSS transitions for expand/collapse animations
- [ ] State restored on page reload

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (add collapse state management)
- Modify: `src/pages/Dashboard.tsx` (add "Expand All" button and global state)
- Create utilities for localStorage persistence

### Design Reference
See mock showing collapsed and expanded card states, "View Invoices" toggle, and "Expand All" button

---

## Task 4: Add Invoice Status Labels to Opportunity Card Headers

**Priority**: High | **Estimated Effort**: Medium

### Description
Display aggregate invoice status counts (Draft, Sent, Paid, Overdue) as badges in the opportunity card header.

### Current State
- No invoice status summary visible on collapsed cards
- Individual invoice statuses only visible in expanded line item view

### Target State
- Status badges displayed below company name in card header
- Format: "2 Draft", "1 Sent", "1 Paid", "1 Overdue"
- Color-coded badges (gray for Draft, blue for Sent, green for Paid, red for Overdue)
- Only show status types that have count > 0
- Visible in both collapsed and expanded states

### Acceptance Criteria
- [ ] Invoice line items aggregated by status per opportunity
- [ ] Status count badges displayed in card header
- [ ] Correct badge colors applied per status type
- [ ] Only non-zero counts displayed
- [ ] Badges layout horizontally with appropriate spacing
- [ ] Status counts update when invoice statuses change

### Files to Modify
- Modify: `src/components/OpportunityCard.tsx` (add status aggregation logic and badge display)

### Design Reference
See mock showing "2 Draft", "1 Paid", "1 Overdue" badges in card header

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
- [ ] Gear icon added to card header (top right corner)
- [ ] Tooltip displays "Billing Settings" on hover
- [ ] Icon color changes to orange when billing not configured
- [ ] Small exclamation badge appears when billing incomplete
- [ ] Clicking icon opens BillingDetailsModal
- [ ] Old billing details section at bottom removed/commented out
- [ ] Modal functionality remains unchanged
- [ ] Visual states match mock design

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
- Section includes: title, invoice count, "Expand All" button, search bar, status filter dropdown, client filter dropdown
- Smooth scroll behavior with appropriate z-index layering
- Background styling to maintain readability over scrolling content

### Acceptance Criteria
- [ ] Filter section uses `position: sticky` or similar approach
- [ ] Section stays at top of viewport when scrolling opportunity list
- [ ] Background color/blur prevents content showing through
- [ ] Z-index properly layered (below top nav, above cards)
- [ ] Smooth scrolling behavior maintained
- [ ] Filter changes work correctly while sticky
- [ ] Responsive design maintained

### Files to Modify
- Modify: `src/pages/Dashboard.tsx` (add sticky positioning to filter section)
- Update CSS for proper layering and background

### Design Reference
See mock demonstrating sticky filter bar behavior during scroll

---

## Task 7: Implement Invoice Status Filter Dropdown

**Priority**: High | **Estimated Effort**: Medium

### Description
Add a status filter dropdown to filter opportunities by invoice status (All, Draft, Sent, Paid, Overdue).

### Current State
- Only search filter exists ([src/components/OpportunityFilter.tsx](../src/components/OpportunityFilter.tsx))
- No status-based filtering

### Target State
- Status dropdown filter in sticky header section
- Options: "All invoice statuses", "Draft", "Sent", "Paid", "Overdue"
- Filters opportunities that have at least one invoice matching selected status
- Works in combination with search filter and client filter

### Acceptance Criteria
- [ ] Status filter dropdown component created
- [ ] Filter options match design: All, Draft, Sent, Paid, Overdue
- [ ] Selecting status filters opportunity list accordingly
- [ ] Shows opportunities with at least one matching invoice status
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

## Task 8: Implement Client Filter Dropdown

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

## Task 9: Redesign Invoice Line Item Actions with Hover Effects

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

## Task 10: Implement Invoice Preview Modal

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

## Task 11: Rename "Add Line Items" to "Add Products"

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

## Task 12: Move School Code Field in Billing Configuration Modal

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

## Task 13: Remove Redundant "Retainer/Deliverable" Text from Cards

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

## Task 14: Update Contract Upload AI Prompt for Retainer Invoice Descriptions

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

## Task 15: Update Dashboard Metric Subtitles

**Priority**: Low | **Estimated Effort**: Trivial

### Description
Simplify dashboard metric card subtitles for cleaner presentation.

### Current State
- Metrics show various subtitle texts ([src/pages/Dashboard.tsx](../src/pages/Dashboard.tsx):390-444)

### Target State
- Keep "Awaiting collection (X invoices)" for "Billed & Unpaid" metric
- Simplify or remove subtitles on other metric cards
- Cleaner, less verbose presentation

### Acceptance Criteria
- [ ] "Billed & Unpaid" subtitle kept as "Awaiting collection (X invoices)"
- [ ] Other metric subtitles simplified or removed
- [ ] Card layout remains balanced and readable
- [ ] Typography consistent across cards

### Files to Modify
- Modify: `src/pages/Dashboard.tsx` (metric card subtitle text)

---

## Task 16: Pull and Display Estimated Close Date from Act! Opportunity

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

## Task 17: Ensure Long Deliverable Names Fully Visible

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

## Task 18: Visual Polish and Final QA

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

### Phase 2: Card Enhancements (Tasks 4-6, 11-13)
Enhance opportunity cards:
4. Invoice status badges
5. Gear icon repositioning
6. Sticky filters
11. Rename to "Add Products"
12. School code field move
13. Remove redundant labels

### Phase 3: Filtering & Search (Tasks 7-8)
Add filtering capabilities:
7. Invoice status filter
8. Client filter

### Phase 4: Invoice Actions (Tasks 9-10)
Implement invoice interactions:
9. Hover-based line item actions
10. Invoice preview modal

### Phase 5: Polish & Data (Tasks 14-18)
Final touches and data improvements:
14. AI prompt updates
15. Metric subtitle cleanup
16. Estimated close date integration
17. Long name visibility
18. Visual polish and QA

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
