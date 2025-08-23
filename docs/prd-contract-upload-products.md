# PRD: Contract Upload → Line Item Parsing → Product Creation

## 1. Introduction/Overview

This feature enables CRCG users (primarily Russell) to upload a signed client contract and automatically extract the pricing section into structured billing line items. These line items will be reviewed and optionally edited by the user, then submitted to create product records in Act! CRM (associated with a selected opportunity). Upon successful creation, those product records will also be saved into the system's invoice_line_items table in Supabase.

This streamlines the contract onboarding process and ensures that all billing items are reflected in Act! and available for invoice generation and AR tracking.

## 2. Goals
- Allow CRCG users to upload a contract PDF and extract billable items
- Parse line items from the "Cost Proposal" section using OpenAI
- Classify each item as either "Retainer" or "Deliverable"
- Retain exact contract language for deliverables
- Allow user to edit extracted data before submission
- Create products in Act! using /api/opportunities/{opportunityId}/products
- Persist successfully created product line items into invoice_line_items table in Supabase

## 3. User Stories
- As a user, I want to upload a contract and automatically extract the pricing terms.
- As a user, I want the tool to clearly identify retainer vs. deliverable items.
- As a user, I want to see and edit the extracted items before committing them.
- As a user, I want each line item to be created in Act! and saved into our internal system.

## 4. Functional Requirements
1. The user must be able to select a valid opportunity from a dropdown (populated from Supabase opportunities synced from Act!, filtered to active opportunities only).
2. The user must upload a PDF contract file (stored in S3 bucket).
3. The tool will search for a section titled "Cost Proposal" within the PDF (assume this section always exists).
4. OpenAI will be prompted to extract line items from that section using the following classification:
   - **Retainers**: Recognized by language like "$X per month from [start] to [end]" → tool creates one product per month with names like "Retainer – July 2025", "Retainer – August 2025", etc. Each month gets its own line item with quantity = 1.
   - **Deliverables**: Each distinct line in the cost section with an associated dollar amount is extracted exactly as written from the contract.
5. All extracted line items will be shown to the user in an editable table with columns:
   - Type (Retainer or Deliverable)
   - Name
   - Amount
   - Date (calculated billing date for retainers, null for deliverables)
6. User may edit fields or remove items before submission.
7. Upon submission:
   - The tool will make POST requests to `/api/opportunities/{opportunityId}/products` in Act! for each line item.
   - Each successful creation will trigger an insert into the `invoice_line_items` table.
8. The Supabase insert will:
   - Use `act_reference` to store the Act! product ID
   - Set `description` from line item name
   - Set `unit_rate` from amount and `quantity = 1`
   - Set `billed_at` from calculated billing date (for retainers) or null (for deliverables)
   - Set `source = 'contract_upload'`
   - Set `item_type = 'fee'` (consistent with Act! sync)
   - Populate `opportunity_id` from selection
   - Leave `invoice_id` null
9. Line items skipped by the user are not created or persisted.

## 5. Non-Goals (Out of Scope)
- Invoice creation or assignment
- Updating or modifying already created products
- Supporting inactive opportunities
- Handling fallback AI parsing logic if "Cost Proposal" is not found
- Draft persistence or complex error recovery
- Confidence scoring or detailed error reporting
- Complex validation rules beyond basic field requirements

## 6. Design Considerations
- Deliverable names must exactly match the contract text.
- Retainers must follow naming convention "Retainer – [Month Year]" with calculated billing dates (1st of the month for each month as expressed by the retainer range of the contract language).
- The file upload and parsed output should allow tabular preview with edit/delete controls.
- Editing should not allow changes to opportunity selection after parsing.
- Simple UI with new route `/contract-upload` for testing functionality.
- AI prompts should align with existing `invoice_line_items` table schema and Act! product structure.

## 7. Technical Considerations
- Use existing Act! integration for opportunity and product endpoints
- Rely on `act_reference` to track external product IDs
- `invoice_line_items` table must support creation of records before being linked to invoices
- Parsing logic should reside in Supabase Edge Function and must handle multi-page PDFs
- PDF files stored in S3 bucket for processing
- AI prompts structured to return data compatible with `invoice_line_items` table schema
- After Act! product creation, use existing products sync or fork of it:
  - Create products via Act! API for the selected opportunity
  - Fetch products for that specific opportunity ID using existing sync logic
  - Add products to database using same mapping process as Act! sync
- Keep implementation simple and consistent with existing patterns

## 8. Success Metrics
- 100% of submitted products created in Act! without error
- 100% of successfully created products written to Supabase
- ≤5% of line items require editing due to parsing errors
- Contracts processed in <15 seconds end-to-end

## 9. Open Questions
- Should AI pre-fill type (retainer vs deliverable), or should user always confirm?
    - AI should pre fill and the user can review before submission
- Should we log skipped/removed items for audit or reattempt?
    - no
- Would this flow benefit from a persistent "draft" mode in case Russell uploads but doesn't immediately submit?
    - out of scope
- Should we use existing products sync after creation or directly insert to database?
    - I think we should use the existing products sync or some fork off of it that utilizes the same process. We will KNOW what the opportunity id is based on user selection so after we create the products via Act! api, we can fetch products for that opportunity id to add them to the database in a similar manner as our existing sync works.

## 10. Act! API Documentation

### Create Product for Opportunity
**Endpoint:** `POST /api/opportunities/{opportunityId}/products`

**Request Body:**
```json
{
  "name": "string",
  "price": 0,
  "quantity": 0,
  "itemNumber": "string",
  "type": "string"
}
```

**Response (201 Created):**
```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "name": "string",
  "cost": 0,
  "createDate": "2025-08-23T12:09:49.112Z",
  "discount": 0,
  "discountPrice": 0,
  "editDate": "2025-08-23T12:09:49.112Z",
  "itemNumber": "string",
  "opportunityID": "00000000-0000-0000-0000-000000000000",
  "price": 0,
  "productID": "00000000-0000-0000-0000-000000000000",
  "quantity": 0,
  "type": "string",
  "total": 0,
  "isQuickbooksProduct": true,
  "customFields": {},
  "created": "2025-08-23T12:09:49.112Z",
  "edited": "2025-08-23T12:09:49.112Z",
  "editedBy": "string",
  "recordOwner": "string",
  "recordManager": "string"
}
```

**Key Fields for Our Implementation:**
- `name`: Line item description (e.g., "Retainer – July 2025", "Website Design")
- `price`: Unit rate amount
- `quantity`: Always 1 for our use case
- `itemNumber`: Billing date in YYYY-MM-DD format (for retainers)
- `type`: Can be null or descriptive text