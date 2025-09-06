# Critical Bug Investigation: Mass Soft Deletion of Invoice Line Items

**Bug ID**: `act_deleted_at-mass-deletion-2025-09-06`  
**Date Reported**: September 6, 2025  
**Status**: UNSOLVED - Requires further investigation  
**Severity**: CRITICAL - Data integrity issue  

## Issue Description

**Symptom**: Multiple invoice line items across different opportunities were inappropriately soft-deleted (had their `act_deleted_at` timestamp set) simultaneously, without user intention.

**Trigger Event**: User was updating organization billing details (specifically adding custom payment terms text) for opportunity `2a3b11a5-fe50-4c6b-8aad-15bf864b75f0` (Collegiate Retail Consulting Group).

**Impact**: 17 invoice line items across 8 different opportunities were marked as soft-deleted, affecting multiple unrelated companies.

## Evidence and Timeline

### Key Facts
- **Timestamp**: `2025-09-06 10:13:02.632+00` (exact same millisecond for all affected records)
- **Affected Records**: 17 invoice line items
- **Affected Opportunities**: 8 different opportunities
- **User ID**: `929c69b2-eeb6-4a66-a50b-6f1aa07acd73` (all affected records belong to same user)
- **Companies Affected**: Community Colleges of Spokane, George Mason University, Sheridan College, UC Berkeley, University of Denver, University of Nebraska at Omaha, Wayne State University, William & Mary

### Database Query Results
```sql
-- All affected items had identical timestamp
SELECT act_deleted_at, COUNT(*) 
FROM invoice_line_items 
WHERE act_deleted_at::date = '2025-09-06'
GROUP BY act_deleted_at;
-- Result: 2025-09-06 10:13:02.632+00 | 17
```

## Investigation Conducted

### ✅ RULED OUT (Confirmed NOT the cause):

1. **Recent Code Changes**: 
   - `updateExistingInvoiceNumbers()` function only targets specific `opportunityId`
   - Only updates `invoice_number` field, never touches `act_deleted_at`
   - Uses `.eq('opportunity_id', opportunityId)` - properly scoped

2. **Database Triggers**:
   - `set_line_items_user_id`: Only sets user_id, harmless
   - `update_invoice_totals`: Only updates parent invoice totals
   - `update_updated_at_column`: Only sets updated_at timestamp
   - None affect `act_deleted_at`

3. **Row Level Security (RLS) Policies**:
   - All affected records belong to same user (`929c69b2-eeb6-4a66-a50b-6f1aa07acd73`)
   - RLS working correctly, not a service role bypass issue
   - DELETE policy: `(auth.uid() = user_id)` - properly scoped

4. **ACT Sync Auto-Deletion**:
   - Previous auto-deletion logic confirmed removed from codebase
   - Comments in `products-sync.ts` line 246: "Step 5: Soft delete stale products (removed - UI handles manual deletion)"
   - Comments in `opportunities-sync.ts` line 514: "Step 4: Soft delete stale opportunities (removed - UI handles manual deletion)"
   - No integration logs during incident timeframe

5. **Manual Deletion Code Path**:
   - Only one code path sets `act_deleted_at`: `src/hooks/useLineItemCrud.ts` lines 239-245
   - Uses `.eq('id', itemId)` - targets single item only
   - Cannot explain mass deletion across multiple opportunities

6. **Database Relationships**:
   - No foreign key cascade deletes that could cause this behavior
   - Standard foreign key constraints only

7. **NULL opportunityId Edge Case**:
   - Tested `WHERE opportunity_id = NULL` - returns 0 rows
   - Would not cause mass matches

### Database Schema Context
```sql
-- RLS Policies on invoice_line_items:
- "Service role can manage line items for automation" (service_role, ALL, qual: true)
- "Users can only delete their own invoice line items" (public, DELETE, qual: auth.uid() = user_id)
- "Users can only update their own invoice line items" (public, UPDATE, qual: auth.uid() = user_id)

-- Triggers on invoice_line_items:
- set_line_items_user_id (BEFORE INSERT/UPDATE)
- update_invoice_line_items_updated_at (BEFORE UPDATE) 
- update_invoice_totals_on_update (AFTER INSERT/UPDATE/DELETE)
```

## Remaining Theories (Unconfirmed)

### 🚨 High Priority Theories

1. **Hidden Background Process**:
   - Some unlogged database operation or maintenance task
   - Could be Supabase platform-level process

2. **Race Condition**:
   - Multiple operations interfering with each other
   - Concurrent updates causing unexpected side effects

3. **Database Bug/Corruption**:
   - Extremely rare PostgreSQL index corruption
   - Query planner bug affecting WHERE clause execution

4. **Edge Function or Webhook**:
   - Triggered by billing update but affecting unrelated records
   - Possible malformed batch operation

### 🔍 Medium Priority Theories

5. **Concurrent User Actions**:
   - User had multiple browser tabs open
   - Simultaneous operations causing interference

6. **React State Management Bug**:
   - State synchronization issue causing multiple API calls
   - useEffect dependency issue causing re-renders

## Code Paths to `act_deleted_at`

**ONLY KNOWN PATH** (confirmed safe for single items):
```typescript
// src/hooks/useLineItemCrud.ts:239-245
const { error: updateError } = await supabase
  .from('invoice_line_items')
  .update({ act_deleted_at: deletedAt })
  .eq('id', itemId);  // ← Single item scope
```

## Next Steps for Future Investigation

### Immediate Debugging Steps

1. **Enhanced Logging**: Add comprehensive logging to all database operations that could affect `act_deleted_at`

2. **Query Analysis**: Enable PostgreSQL query logging temporarily to capture exact SQL statements

3. **User Action Timeline**: Interview user about exact sequence of actions performed around 10:13 AM

4. **Browser DevTools**: Check for JavaScript errors, network requests, or unusual API calls

### Code Review Areas

1. **useEffect Dependencies**: Review all React hooks for potential infinite re-render issues

2. **Batch Operations**: Search for any code that processes multiple line items simultaneously

3. **State Management**: Review React Query mutations and their error handling

4. **Concurrent Operations**: Look for race conditions between billing updates and other operations

### Database Investigation

1. **Enable Detailed Logging**: 
   ```sql
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_min_duration_statement = 0;
   ```

2. **Monitor Active Queries**: Use `pg_stat_activity` during testing to catch concurrent operations

3. **Check for Background Jobs**: Verify no scheduled maintenance or cleanup jobs running

### Reproduction Attempts

1. **Exact Recreation**: Try to reproduce by updating billing details for the same opportunity type

2. **Load Testing**: Test with multiple concurrent users to identify race conditions  

3. **Edge Cases**: Test with null values, special characters, or large datasets

## Critical Questions for User

When this bug reoccurs, ask the user:

1. **Concurrent Actions**: Were you performing any other actions simultaneously?
2. **Browser State**: Did you have multiple tabs open? Any JavaScript errors?
3. **Network Issues**: Any connectivity problems or slow responses?
4. **Exact Sequence**: What was the precise order of your actions?
5. **Time Correlation**: Did you notice any system slowness or unusual behavior?

## Prevention Measures

### Short-term
- Add transaction logging around all `act_deleted_at` operations
- Implement additional validation checks before soft deletion
- Add user confirmation dialogs for any bulk operations

### Long-term  
- Consider audit trails for all critical database operations
- Implement idempotency checks for state-changing operations
- Add monitoring for unusual batch operations

## Related Files

**Key Files Investigated**:
- `src/hooks/useLineItemCrud.ts` - Only known deletion code path
- `src/components/BillingDetailsModal.tsx` - Recent changes, ruled out as cause
- `supabase/functions/act-sync/*` - Auto-deletion logic removed
- `docs/tasks-feedback-session-dad-COMPLETE.md` - Documentation of removal

**Database Tables**:
- `invoice_line_items` - Primary affected table
- `integration_logs` - No relevant entries found during incident
- `opportunity_billing_info` - Table being updated when bug occurred

---

**Last Updated**: September 6, 2025  
**Investigator**: Claude (AI Assistant)  
**Status**: Investigation ongoing - manual database fix applied by user
