# Dashboard Refresh Issue - Troubleshooting Guide

## Issue Description

Users are experiencing unexpected page refreshes when switching browser tabs or applications and returning to the DeliveryDesk dashboard. This issue:
- **Does NOT occur** in local development environments
- **Does NOT occur** when developer logs into production
- **DOES occur** for some users in production (specifically reported by stakeholder)
- Persists even after cache clearing and hard refresh

## Steps Taken to Address the Issue

### Previous Fixes Attempted

1. **Initial Fix (commit 6f8f59d)** - Sept 9, 2025
   - Configured React Query to disable automatic refetch on window focus
   - Added smart user change detection to prevent unnecessary data fetching when auth token refreshes
   - Modified Dashboard component to track user ID changes

2. **Enhanced Fix (commit afc4821)** - Sept 10, 2025
   - Increased React Query cache times to 1 hour (stale) and 2 hours (cache)
   - Added `refetchOnMount: false` to prevent unnecessary data fetching
   - Configured Supabase client with `multiTab: false` to prevent session conflicts
   - Implemented comprehensive tab visibility handler outside React lifecycle
   - Added proactive session refresh 5 minutes before token expiry
   - Configured to ignore TOKEN_REFRESHED events that don't change user state

### Current Approach - Comprehensive Logging

Since the issue cannot be reproduced locally, we've added extensive logging to capture the exact sequence of events when the refresh occurs.

## How the Logging Works

### Logging Categories

1. **`[TabVisibility]`** - Tab switching and visibility events
   - Tracks when tabs become hidden/visible
   - Monitors window focus/blur
   - Logs state saving/restoration
   - Records attempts to prevent refresh

2. **`[Auth]`** - Authentication and session management
   - Tracks all auth state changes
   - Monitors token refresh events
   - Logs session refresh scheduling
   - Records when token refreshes are ignored

3. **`[Dashboard]`** - Dashboard component lifecycle
   - Component mount/unmount
   - Data fetch triggers and reasons
   - Tracks when fetches are skipped vs executed
   - Opportunity loading events

4. **`[App]`** - Application-level events
   - App initialization
   - Route changes
   - Query client configuration

5. **`[Supabase]`** - Supabase client events
   - Client initialization
   - Auth state changes at the Supabase level

### Key Events to Watch For

- `VISIBILITY_CHANGE` - When tab visibility changes
- `AUTH_STATE_CHANGE` - When authentication state updates
- `TOKEN_REFRESH_IGNORED` - When a token refresh is intentionally ignored
- `FETCH_DATA_START` - When dashboard begins fetching data
- `SKIPPING_DATA_FETCH` - When a fetch is intentionally skipped

## Troubleshooting Session Checklist

### Pre-Session Setup
- [ ] Ensure user is logged into production environment
- [ ] Confirm the issue is reproducible on their machine
- [ ] Have them open Chrome DevTools (F12 or right-click → Inspect)

### During Session

1. **Clear Console**
   - [ ] Navigate to Console tab in DevTools
   - [ ] Click "Clear console" button or press Ctrl+L
   - [ ] Keep console open and visible

2. **Reproduce the Issue**
   - [ ] Have user switch to a different browser tab
   - [ ] Wait 5-10 seconds
   - [ ] Switch back to DeliveryDesk tab
   - [ ] Note if page refreshes or flickers

3. **Alternative Test**
   - [ ] Have user switch to a different application (not just browser tab)
   - [ ] Wait 5-10 seconds
   - [ ] Switch back to browser/DeliveryDesk
   - [ ] Note if page refreshes or flickers

4. **Capture Logs**
   - [ ] Select all console output (Ctrl+A in console)
   - [ ] Copy all logs (Ctrl+C)
   - [ ] Save to a text file with timestamp

5. **Additional Information to Gather**
   - [ ] Browser version (Help → About)
   - [ ] Operating system version
   - [ ] Any browser extensions installed
   - [ ] Network speed/stability
   - [ ] Time of day when issue occurs most

### What to Look For in Logs

1. **Normal Behavior Pattern:**
   ```
   [TabVisibility] VISIBILITY_CHANGE {hidden: true}
   [TabVisibility] SAVE_STATE
   [TabVisibility] VISIBILITY_CHANGE {hidden: false}
   [TabVisibility] TAB_BECOMING_VISIBLE
   [Dashboard] SKIPPING_DATA_FETCH {reason: 'same_user'}
   ```

2. **Problematic Behavior Pattern:**
   ```
   [TabVisibility] VISIBILITY_CHANGE {hidden: false}
   [Auth] AUTH_STATE_CHANGE {event: 'TOKEN_REFRESHED'}
   [Dashboard] TRIGGERING_DATA_FETCH {reason: 'user_changed'}
   [Dashboard] FETCH_DATA_START
   ```

### Post-Session
- [ ] Review logs for unexpected auth state changes
- [ ] Check for patterns in timing (e.g., always after X seconds)
- [ ] Compare log sequence with normal behavior
- [ ] Document any browser-specific or OS-specific patterns

## Quick Reference Commands

**To enable/disable logging** (if needed to reduce noise):
- Tab Visibility: Set `DEBUG_TAB_VISIBILITY` to `false` in `tabVisibilityHandler.ts`
- Auth: Set `DEBUG_AUTH` to `false` in `AuthContext.tsx`
- Dashboard: Set `DEBUG_DASHBOARD` to `false` in `Dashboard.tsx`
- App: Set `DEBUG_APP` to `false` in `App.tsx`
- Supabase: Set `DEBUG_SUPABASE` to `false` in `client.ts`

## Expected Outcomes

The logging should reveal:
1. Whether the page is actually refreshing or just re-rendering
2. What specific event triggers the refresh
3. Whether it's related to auth token management
4. If browser-specific behaviors are involved
5. The exact timing and sequence of events

This information will guide the next steps in resolving the issue permanently.