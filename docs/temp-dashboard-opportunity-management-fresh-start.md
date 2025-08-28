# Fresh Start Guide: Dashboard Opportunity Management

## Overview
This is a continuation guide for implementing the dashboard opportunity management system. Tasks 1.0-4.0 are complete, and work continues with Task 5.0 (Billing Information Management System).

## Required Reading (In Order)
Please read these files to establish context:

1. **@docs/prd-dashboard-opportunity-management.md** - Product requirements document
2. **@docs/tasks-prd-dashboard-opportunity-management.md** - Detailed task breakdown with current status

## What's Already Complete
- ✅ **Tasks 1.0-4.0**: Database schema, dashboard layout, opportunity cards, and line item management
- ✅ **Line Item System**: Full React Query implementation with optimistic updates
- ✅ **Billing Date Management**: Inline editor for deliverable items only
- ✅ **Visual Highlighting**: Orange highlighting for deliverables needing billing dates

## Critical Implementation Context
Before proceeding, understand these key details:

### Data Field Mapping
- **Line item types**: Stored in `details` field ("retainer"/"deliverable") 
- **NOT in `item_type`**: This field contains "fee" for all items
- **Billing dates**: Field is `billed_at`, displayed as "Billing Date" (not "Due Date")

### Architecture Patterns
- **React Query**: Used for optimistic updates in `src/hooks/useLineItems.ts`
- **TypeScript**: LineItem interface defined in both OpportunityCard and useLineItems
- **Visual feedback**: Orange theme for items needing attention
- **Conditional editing**: Only deliverable items can have billing dates edited

### Current File Status
- **✅ Completed**: OpportunityCard, useLineItems hook, Dashboard layout, database migration
- **❌ Still Needed**: BillingDetailsModal, useOpportunityBilling hook, OpportunityFilter
- **🔄 Auto-updated**: Supabase types after migration

## Next Steps
1. **Confirm Understanding**: Review the task list and current implementation state
2. **Start Task 5.1**: Create `src/components/BillingDetailsModal.tsx`
3. **Follow Process**: Use @.cursor/process-task-list.mdc workflow (one subtask at a time)

## Ready to Proceed?
Once you've read the required documents and understand the context above, confirm you're ready to continue with Task 5.1: "Create `src/components/BillingDetailsModal.tsx` with Organization and Bill To sections"

---
*This is a temporary file for context transfer. Delete after successful handoff.*