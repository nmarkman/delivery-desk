# Tasks: Live Act! Data UX Updates

## Relevant Files

- `src/pages/Dashboard.tsx` - Main dashboard component that needs to display real Act! data instead of placeholder values
- `src/pages/DeliverablesReport.tsx` - Deliverables report page that needs to show Act! tasks as deliverables
- `src/integrations/supabase/types.ts` - TypeScript types for database tables (opportunities, deliverables, clients)
- `src/integrations/supabase/client.ts` - Supabase client configuration for database queries
- `src/components/ui/card.tsx` - UI components for displaying data in card format
- `src/components/ui/badge.tsx` - UI components for status badges and indicators

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `Dashboard.tsx` and `Dashboard.test.tsx` in the same directory).
- Database queries should respect existing Row Level Security (RLS) policies.
- All new data fetching should use the existing Supabase client integration.

## Tasks

- [x] 1.0 Update Dashboard to Display Real Act! Data
  - [x] 1.1 Update fetchData function to query opportunities table for client count and outstanding amounts
  - [x] 1.2 Modify dashboard metrics to use opportunities data instead of clients table
  - [x] 1.3 Update Total Clients metric to count unique clients from opportunities
  - [x] 1.4 Update Total Outstanding metric to sum retainer amounts from active opportunities
  - [x] 1.5 Keep existing invoice logic for Total Invoices and Pending Invoices metrics
  - [x] 1.6 Add proper TypeScript types for opportunities data structure



- [x] 3.0 Update Deliverables Report with Real Task Data
  - [x] 3.1 Update fetchData function to query deliverables table populated from Act! tasks
  - [x] 3.2 Display task title, due date, status, and fee amount for each deliverable
- [x] 3.3 Group deliverables by client/opportunity as specified
- [x] 3.4 Implement timeline/calendar view for deliverables display
- [x] 3.5 Add status filtering (pending, in_progress, completed)
- [x] 3.6 Update summary cards to show real counts from deliverables data
- [x] 3.7 Add proper TypeScript types for deliverables data structure

- [x] 5.0 Add Loading States and Error Handling
  - [x] 5.1 Add loading indicators for opportunities data fetching
  - [x] 5.2 Add loading indicators for deliverables data fetching
  - [x] 5.3 Implement error handling for database connection issues
  - [x] 5.4 Add error states with retry functionality