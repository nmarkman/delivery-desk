# PRD: Dashboard Opportunity Management Updates

## Introduction/Overview

The current DeliveryDesk dashboard provides a high-level view of opportunities but lacks detailed management capabilities for individual opportunity line items and billing information. This feature will transform the dashboard into a central command center where users can view, manage, and track deliverable due dates and billing details for each opportunity.

The primary problem this solves is the lack of granular opportunity management, specifically around assigning due dates to deliverables and managing billing information that will be used in future invoice generation features.

## Goals

1. **Centralized Opportunity Management**: Transform the dashboard into a central hub for managing opportunities and their associated line items
2. **Deliverable Due Date Assignment**: Enable users to view and update due dates for deliverable line items directly from the dashboard
3. **Billing Information Management**: Provide a simple interface for capturing and storing billing details per opportunity
4. **Improved Workflow Efficiency**: Create a streamlined workflow for reviewing outstanding deliverables that need due date assignment
5. **Enhanced Data Visibility**: Display opportunity line items in an organized, filterable format

## User Stories

1. **As a project manager**, I want to see all line items associated with each opportunity so that I can track project deliverables and retainers in one place.

2. **As a project manager**, I want to assign due dates to deliverable line items so that I can track project timelines and ensure timely completion.

3. **As a project manager**, I want to add billing information to opportunities so that invoice generation will have the necessary organizational and billing contact details.

4. **As a project manager**, I want to filter opportunities on the dashboard so that I can focus on specific projects that need attention.

5. **As a project manager**, I want to see which opportunities are missing billing details so that I can prioritize completing that information.

## Functional Requirements

### Dashboard Layout Updates

1. **Two-Column Opportunity Grid**: The dashboard must display opportunities in a two-column layout, allowing users to view two opportunities side-by-side. Opportunities may have various expanded heights, so the grid needs to accomodate for this.

2. **Expandable Opportunity Cards**: Opportunity cards must be expanded by default showing line item details, with the ability to collapse them for a compact view.

3. **Opportunity Filter**: The dashboard must include an opportunity filter similar to the contract upload filter, allowing users to search and filter opportunities.

### Line Item Display

4. **Line Item Table**: Each expanded opportunity card must display associated invoice line items in a simple table format with columns for:
   - Item description
   - Item type (Deliverable/Retainer badge similar to contract upload styling)
   - Due date
   - Status/completion indicator

5. **Item Type Badges**: Line items must be clearly marked as either "Deliverable" or "Retainer" using badge styling consistent with the contract upload feature.

6. **Due Date Management**: The system must display due dates for line items, with deliverable items showing empty due dates until assigned by the user.

### Billing Information Management

7. **Billing Details Modal**: Each opportunity must have access to a billing information modal containing:
   - Organization section (company name, address, contact person)
   - Bill To section (billing address, procurement contact, PO numbers - PO is optional)

8. **Billing Status Indicator**: The system must clearly indicate when billing details have been added vs. when they are missing for each opportunity.

9. **New Billing Database Table**: The system must create a new Supabase table to store billing information keyed by opportunity ID.

10. **Payment Terms Configuration**: The billing information must include configurable payment terms with a default of "Net 30" and allow integer input for custom terms.

### Due Date Assignment Workflow

11. **Due Date Updates**: Users must be able to update due dates for deliverable line items directly from the dashboard.

12. **Act! CRM Synchronization**: When due dates are updated, the system must sync these changes back to Act! CRM via API call to update the corresponding product record.

13. **Outstanding Deliverables Queue**: The dashboard must serve as a review queue, highlighting deliverables that need due date assignment.

### Data Integration

14. **Line Item Data Source**: The system must pull line item data from the existing `invoice_line_items` table associated with each opportunity.

15. **Retainer Due Date Handling**: The system must recognize that retainer due dates are pre-assigned and should not be editable.

16. **Deliverable Due Date Assignment**: The system must allow assignment of due dates only to deliverable items that currently have empty due dates.

## Non-Goals (Out of Scope)

1. **Inline Line Item Editing**: This PRD does not include editing line item descriptions, amounts, or other details beyond due dates.

2. **Invoice Generation**: Invoice creation functionality is explicitly out of scope and will be addressed in a separate PRD.

3. **Complex Billing Instructions**: Special billing instructions, multiple billing contacts, or complex billing workflows are not included.

4. **Advanced Filtering**: Complex multi-criteria filtering beyond basic opportunity search is not included.

5. **Line Item Creation**: Adding new line items to opportunities is not included in this scope.

## Design Considerations

### UI Components
- Reuse existing shadcn/ui components for consistency
- Use the same badge styling as contract upload for item type indicators
- Modal design should follow existing modal patterns in the application
- Filter component should mirror the contract upload filter design

### Layout Considerations
- Two-column responsive grid that adapts to screen size
- Expandable cards with smooth animations
- Clear visual hierarchy between opportunity header and line item details
- Consistent spacing and padding with existing dashboard elements

## Technical Considerations

### Database Schema
- Create new `opportunity_billing_info` table with the following structure:
  - `id` (UUID, primary key)
  - `opportunity_id` (UUID, foreign key)
  - `organization_name` (text)
  - `organization_address` (text)
  - `organization_contact_name` (text)
  - `organization_contact_email` (text)
  - `bill_to_name` (text)
  - `bill_to_address` (text)
  - `bill_to_contact_name` (text)
  - `bill_to_contact_email` (text)
  - `payment_terms` (integer, default 30)
  - `po_number` (text, nullable)
  - `user_id` (UUID, foreign key)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

### API Integration
- Extend existing Act! CRM sync functionality to update product due dates.
- Ensure proper error handling for Act! API calls
- Maintain existing rate limiting and authentication patterns

### State Management
- Use React Query for caching opportunity and line item data
- Implement optimistic updates for due date changes
- Handle real-time updates when data changes

## Success Metrics

1. **User Engagement**: Increase time spent on dashboard by 40% as users actively manage opportunities
2. **Process Efficiency**: Reduce time to assign due dates to deliverables by 60%
3. **Data Completeness**: Achieve 90% completion rate for billing information across active opportunities
4. **Workflow Optimization**: Decrease average time to prepare opportunities for invoicing by 50%
5. **User Satisfaction**: Achieve positive feedback on centralized opportunity management workflow

## Open Questions

1. **Pagination**: Should the two-column layout support pagination if there are many opportunities, or use infinite scroll?
A: infinite scroll

2. **Notification System**: Should users receive notifications when deliverable due dates are approaching?
A: no, out of scope

3. **Bulk Operations**: Should there be bulk due date assignment capabilities for multiple deliverables?
A: out of scope

4. **Audit Trail**: Should changes to due dates and billing information be logged in the integration_logs table?
A: out of scope

5. **Mobile Responsiveness**: How should the two-column layout adapt on mobile devices - stack vertically or maintain side-by-side view?
A: stack vertically

6. **Default Sort Order**: What should be the default sorting for opportunities - by created date, due date, or opportunity status?
A: company name asc

7. **Real-time Updates**: Should multiple users see real-time updates when due dates or billing information is modified?
A: out of scope. assume single user operation for all of this

8. **Data Validation**: What validation rules should be applied to billing information fields, particularly for addresses and contact information?
A: start simple here please. This is all at the end of day just going to be used a dynamic text insertion to an invoice template. Exception being a future invoice status tracking feature which will rely on the date of the invoice, whether it's been paid or not, and the payment terms integer to use as logic to automatically determine if an invoice is overdue or not. Again, all the invoicing features will be added later in separate PRD.