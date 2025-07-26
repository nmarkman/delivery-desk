# Database Schema Design & Act! CRM Sync Implementation PRD

## Introduction/Overview

This PRD outlines the implementation of steps 2 and 3 from the DeliveryDesk development plan: **Define Database Schema** and **Implement Act! Sync (Read-Only)**. The primary goal is to establish a connection with Act! CRM API, explore the actual data structure returned by Act! opportunities and tasks, and then design a Supabase database schema that efficiently supports the accounts receivable automation workflow.

This feature will serve as the foundation for all subsequent DeliveryDesk functionality by creating the core data models and establishing the integration pipeline with Act! CRM, which serves as the system of record for client opportunities and tasks.

## Goals

1. **Establish Act! API Connection**: Successfully authenticate and retrieve sample data from Act! CRM to understand the actual data structure and available fields
2. **Design Optimal Database Schema**: Create Supabase tables that efficiently store client data, invoices, deliverables, and integration logs based on actual Act! data structure
3. **Implement Read-Only Sync**: Build a reliable, rate-limit-aware sync mechanism that imports opportunities and tasks from Act! CRM into DeliveryDesk
4. **Enable Manual Sync**: Support a user-triggered manual sync 
5. **Enable Automated Sync**: Support a daily automated update via Supabase cron
6. **Prepare for Future Enhancements**: Design schema with extensibility in mind for future CRM integrations and feature additions

## User Stories

**As Russell (CRCG Owner)**, I want to connect DeliveryDesk to our Act! CRM so that I don't have to manually enter client information and can see our opportunities automatically imported into the accounts receivable dashboard.

**As Russell**, I want to be able to manually trigger a sync with Act! CRM when I know data has changed, so that I can immediately see updated information without waiting for the scheduled sync.

**As Russell**, I want my Act! data to automatically refresh once a day regardless of whether I'm triggering a manual refresh, such that my data stays updated.

**As a Developer**, I want to see the actual structure of Act! data before finalizing the database schema so that I can design tables that efficiently support the required functionality.

**As a System Administrator**, I want sync operations to respect Act! API rate limits and handle errors gracefully so that the integration remains stable and doesn't impact Act! CRM performance.

## Functional Requirements

### Act! API Connection & Data Exploration

1. The system must authenticate with Act! CRM using Basic authentication to obtain a bearer token from `/act.web.api/authorize`
2. The system must include the `Act-Database-Name` header in all API requests as required by Act! API
3. The system must make test calls to `GET /api/opportunities` to retrieve and analyze actual opportunity data structure
4. The system must make test calls to `GET /api/tasks` to retrieve and analyze task data structure
5. The system must log and document the complete response structure from Act! API calls for schema design reference in a way that's easy for a non-technical vibe coder to review during implementation and work with Cursor on the data schema.
6. The system must identify which Act! opportunity fields map to required DeliveryDesk functionality (client name, contact info, retainer amounts, contract dates)
7. The system must determine if additional custom fields need to be created in Act! CRM to support retainer tracking and contract details relative to the goals of DeliveryDesk

### Database Schema Design

8. The system must create a `opportunities` table that stores Act! opportunity ID, client name, contact information, retainer amount, billing frequency, and contract start/end dates
9. The system must create a `deliverables` table for one-off tasks with description, fee amount, due date, delivered date, and invoiced date, linked to clients
10. The system must create an `invoices` table that captures opportunity, billing period, total amount, invoice date, due date, and status using enum values (draft, invoiced, paid, overdue)
11. The system must create an `invoice_line_items` table to support itemized invoices with multiple deliverables and/or retainer charges per invoice
12. The system must create an `integration_logs` table to store synchronization timestamps, errors, and API call details
13. The system must implement proper foreign key relationships between all tables
14. The system must include created_at and updated_at timestamps on all tables
15. The system must implement Row Level Security (RLS) policies for all tables to ensure user data isolation
16. The system must support upsert operations for all tables to handle data updates during sync operations

### Act! Sync Implementation

17. The system must create a Supabase Edge Function for Act! API synchronization written in TypeScript. Cursor has access to a Supabase MCP for this.
18. The system must implement secure storage of Act! credentials in Supabase environment variables
19. The system must retrieve active opportunities from Act! CRM and map them to the clients table
20. The system must retrieve tasks from Act! CRM and map them to appropriate DeliveryDesk entities
21. The system must implement upsert logic to update existing records when Act! data changes
22. The system must respect Act! API rate limits and implement appropriate delays between requests
23. The system must implement retry logic for failed API calls with exponential backoff
24. The system must log all sync operations, including successes, failures, and data changes to the integration_logs table
25. The system must handle partial sync failures gracefully and continue processing remaining records
26. The system must provide a manual sync trigger accessible through the DeliveryDesk UI
27. The system must implement automated daily sync scheduling using Supabase cron functionality
28. The system must track the Act! task IDs returned when creating tasks to support future updates

### Data Processing & Validation

29. The system must calculate monthly retainer amounts by dividing full contract value by the number of months between start and end dates
30. The system must validate that all required fields are present before creating database records
31. The system must handle missing or invalid data gracefully by logging warnings and using default values where appropriate
32. The system must detect and log when Act! opportunities don't map to expected DeliveryDesk client structure

## Non-Goals (Out of Scope)

- **Write Operations to Act!**: This phase focuses on read-only sync; creating tasks in Act! will be addressed in a future PRD
- **Historical Data Import**: Only current and active opportunities will be synced initially
- **Real-time Sync**: Daily automated sync and manual triggers are sufficient for MVP
- **Complex Data Transformation**: Simple field mapping is sufficient; complex business logic will be added later
- **User Interface for Sync Management**: Basic manual sync trigger only; full settings UI will be developed later
- **Multi-CRM Support**: Focus exclusively on Act! CRM integration for now
- **Advanced Error Notification**: Logging errors is sufficient; email/push notifications are out of scope

## Design Considerations

### Database Schema Flexibility
- Design tables with optional fields to accommodate variations in Act! data structure
- Include JSON fields for storing raw Act! data alongside normalized fields for debugging and future feature development
- Use consistent naming conventions that align with Act! field names where possible

### API Integration Architecture
- Implement the sync function as a Supabase Edge Function for security and scalability
- Use environment variables for all Act! credentials and configuration
- Design for future expansion to support additional CRM systems

### Rate Limiting Strategy
- Implement delays between API calls to respect Act! rate limits (specific limits TBD based on Act! documentation)
- Use batch processing for large data sets
- Provide progress indicators for long-running sync operations

## Technical Considerations

### Supabase Edge Function Requirements
- Use TypeScript for type safety and better error handling
- Implement proper error logging and monitoring
- Use Supabase client libraries for database operations
- Handle timezone conversion for date fields between Act! and Supabase

### Database Performance
- Add appropriate indexes on frequently queried fields (client lookup, invoice dates, Act! IDs)
- Use UUID primary keys for all tables to support future distributed scenarios
- Implement database constraints to maintain data integrity

### Security Requirements
- Store all Act! API credentials securely using Supabase environment variables
- Implement proper authentication checks in Edge Functions
- Use RLS policies to ensure users can only access their own data
- Log all API calls for audit purposes without exposing sensitive data

## Success Metrics

1. **API Connection Success**: Successfully authenticate with Act! CRM and retrieve sample data
2. **Data Structure Analysis**: Complete documentation of Act! opportunity and task data structure
3. **Database Schema Implementation**: All tables created and properly configured with RLS policies
4. **Sync Functionality**: Successfully sync opportunities from Act! trial account with 95% success rate
5. **Performance**: Manual sync completes within 60 seconds for up to 50 opportunities
6. **Error Handling**: All sync failures are properly logged with sufficient detail for troubleshooting
7. **Data Integrity**: 100% of successfully synced opportunities contain all required fields for DeliveryDesk functionality

## Open Questions

1. **Act! Custom Fields**: After analyzing the actual Act! opportunity data structure, will we need to recommend additional custom fields in Act! CRM to support retainer tracking and contract details?
A: Yes, we should include this as a part of the tasks. We can create custom opportunity fields in act if required to better support these needs and Russell has agreed to be flexible with this. I do not believe tasks are customizable though, so we'll need to get creative in terms of how the fees of one time deliverables (tracked via tasks) are named/stuctured such that they can be parsed into the tool and the database fields for fees. It is possible to create custom task types though in Act! so although we cannot have specific fields, we can designate a specific task type and have that be the only one the tools creates and also reads.

2. **Account vs. Opportunity Mapping**: Does Act! return company/account information within the opportunity response, or will we need separate API calls to retrieve account details?
A: we'll need to see this as a part of the initial connection and decide whether the tools needs both opportunities and accounts tables or if just the former will suffice.

3. **Task Classification**: How should we distinguish between Act! tasks that represent deliverables vs. other types of activities (meetings, calls, etc.)?
A: see above re: our ability to create a custom task type that is specific to these. That's probably the best approach we should take.

4. **Data Refresh Strategy**: Should we implement incremental sync (only changed records) or full refresh for the daily automated sync?
A: I don't think Act! supports incremental sync

5. **Error Recovery**: What should happen when Act! API is temporarily unavailable? Should we queue sync operations or simply retry at the next scheduled time?
A: for now, just retry at next scheduled time

6. **Retainer Schedule Complexity**: While you mentioned retainer amounts don't vary month-to-month within an opportunity, should we design the schema to handle this complexity in case it's needed for other clients in the future?
A: sure, it makes sense to future proof this a bit. I'll go with you reccomendation here.

7. **Act! Rate Limits**: What are the specific rate limits for the Act! API, and do we need to implement request queuing for large data sets? 
A: we'll be able to see this once we make our first test call to them. It's not clear in their documentation what the limits are.