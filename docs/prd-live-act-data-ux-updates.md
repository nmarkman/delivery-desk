# Live Act! Data UX Updates PRD

## Introduction/Overview

This PRD outlines simple UX updates to display live Act! CRM data in the DeliveryDesk application. The primary goal is to replace placeholder data with real information from synced Act! opportunities and tasks, providing immediate visual impact for user demonstrations. This focuses on quick wins that transform the app from showing "0" values and "No data found" messages to displaying actual business metrics and client information.

## Goals

1. **Replace Placeholder Data**: Transform dashboard metrics from "0" values to real numbers from Act! opportunities
2. **Display Active Clients**: Show actual client names and opportunities instead of "No clients found" messages
3. **Show Real Deliverables**: Display Act! tasks as deliverables with due dates and status
4. **Improve User Onboarding**: Guide users to Act! connection setup when no data is available
5. **Maintain Simple UX**: Keep changes minimal and focused on data display rather than complex functionality

## User Stories

**As Russell (CRCG Owner)**, I want to see real client data on the dashboard so that I can immediately understand my business metrics when demonstrating the app to stakeholders.

**As Russell**, I want to see a list of active opportunities so that I can quickly identify which clients have ongoing work and their retainer amounts.

**As Russell**, I want to see deliverables with real due dates so that I can track upcoming work and deadlines from my Act! CRM.

**As Russell**, I want clear guidance on how to connect to Act! CRM when no data is available, so that I can quickly set up the integration and start seeing real data.

## Functional Requirements

1. **Dashboard Metrics Updates**: The system must display real numbers from Act! opportunities instead of placeholder "0" values
   - Total Clients: Count of unique clients from opportunities table
   - Total Outstanding: Sum of retainer amounts from active opportunities
   - Total Invoices: Count of invoices from invoices table (keep existing logic)
   - Pending Invoices: Count of pending invoices (keep existing logic)

2. **Active Opportunities List**: The system must display a list of active opportunities from the opportunities table
   - Show client name, retainer amount, and contract dates
   - Display in a card format similar to existing "Recent Clients" section
   - Limit to 5 most recent opportunities

3. **Real Client Data**: The system must replace "No clients found" with actual client data
   - Display client names from opportunities table
   - Show outstanding balance (retainer amount)
   - Maintain existing "Recent Clients" card layout

4. **Deliverables Timeline**: The system must display Act! tasks as deliverables in a timeline view
   - Show task title, due date, status, and fee amount
   - Group deliverables by client/opportunity
   - Display in calendar/timeline format
   - Filter by status (pending, in_progress, completed)

5. **Empty State Guidance**: The system must show helpful CTAs when no Act! data is available
   - Display "Connect to Act! CRM" message with link to Act! connection section
   - Replace generic "No data found" messages with actionable guidance
   - Maintain consistent UI patterns with existing empty states

6. **Data Source Integration**: The system must fetch data from the correct database tables
   - Dashboard: Query opportunities, clients, and invoices tables
   - Deliverables: Query deliverables table (populated from Act! tasks)
   - Use existing Supabase client integration

## Non-Goals (Out of Scope)

- Invoice generator updates (handled in separate PRD)
- Complex filtering or search functionality
- Data editing or modification capabilities
- Advanced analytics or reporting features
- Real-time data updates (manual sync only)
- Complex UI animations or transitions

## Design Considerations

- **Consistency**: Maintain existing card layouts and styling patterns
- **Performance**: Use efficient database queries with proper indexing
- **Responsive**: Ensure all new data displays work on mobile devices
- **Accessibility**: Maintain proper ARIA labels and keyboard navigation
- **Loading States**: Show appropriate loading indicators while fetching data

## Technical Considerations

- **Database Queries**: Use existing Supabase client with proper user_id filtering
- **Error Handling**: Gracefully handle database connection issues
- **Data Mapping**: Map Act! opportunity data to client display format
- **RLS Policies**: Ensure all queries respect existing Row Level Security
- **TypeScript**: Maintain proper type safety for all new data structures

## Success Metrics

- **Data Visibility**: 100% of placeholder "0" values replaced with real data when Act! is connected
- **User Engagement**: Users successfully navigate to Act! connection setup when no data exists
- **Performance**: Dashboard loads within 2 seconds with real data
- **Error Rate**: Less than 1% of users encounter data loading errors

## Open Questions

1. Should we show opportunity status (active, won, lost) in the opportunities list?
A: Yes
2. How should we handle opportunities with missing client information?
A: Do not display them for now
3. Should we add any sorting options for the opportunities list (by date, amount, client name)?
A: ignore for now
4. Do we need to show any sync status indicators on the dashboard?
A: Ignore for now
5. Should we add any quick actions (like "View in Act!") for opportunities?
A: No not now

## Implementation Priority

**Phase 1 (Immediate - Demo Ready):**
- Replace dashboard "0" values with real numbers
- Show active opportunities list
- Display real client names

**Phase 2 (Quick Follow-up):**
- Implement deliverables timeline view
- Add empty state CTAs for Act! connection
- Polish loading states and error handling 