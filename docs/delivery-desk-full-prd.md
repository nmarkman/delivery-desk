# Collegiate Retail Consulting Group – Accounts Receivable Automation & Reporting PRD

## Objective

Collegiate Retail Consulting Group (CRCG) currently manages invoicing and accounts‑receivable (AR) manually across multiple spreadsheets.  The objective of this project is to build a simple web tool that **reduces administrative overhead** and **automates the AR process** while preserving the existing client‑engagement workflow in Act! CRM.  The tool will streamline the following functions:

* Import opportunities, signed agreements and tasks from Act! CRM through a bi‑directional API integration.  The Act! Web API uses bearer tokens for authentication (https://apimta.act.com/act.web.api?_ga=2.135555953.1524075686.1728411799-1542563797.1728411799); the tool will generate a token using basic authentication and reuse the bearer token for subsequent requests (https://apimta.act.com/act.web.api?_ga=2.135555953.1524075686.1728411799-1542563797.1728411799)
* Maintain a centralized AR tracker that records deliverables (one‑off fees), retainer schedules and invoice status per account.  Status is currently indicated by colors in a spreadsheet—this will be replaced with intuitive checkboxes (“invoiced” and “paid”) and automatic overdue reminders. Clients are invoiced once per month but the amount in each invoice can either be combination of retainer + deliverables or deliverables OR retainer singularly. Invoices must be itemized and have a distinct id.
* Generate invoice drafts (PDF) for a specific month and account, combining retainer and deliverable charges.  The invoice will reflect the layout and details of existing invoices, including CRCG’s contact information, client billing address, description of services and net‑30 terms (as in WSU invoice #2).
* Provide aggregated dashboards summarising total invoiced, total outstanding (invoiced but unpaid), upcoming deliverables and other helpful metrics.
* Facilitate Act! task creation/reminders when invoices are overdue (e.g., net‑30 days after marking an invoice as sent).  Act! API endpoints allow retrieving tasks (`GET api/tasks`) and creating tasks (`POST api/tasks`), which will be used for reminder automation.

## Success Metrics

| Goal                                          | Metric | Target |
|-----------------------------------------------|--------|-------|
| Reduce manual AR tracking time               | Hours saved per month | 80–90 % reduction (from ~10 hours to <2 hours) |
| Improve invoice accuracy                      | % of invoices generated without manual correction | >95 % |
| Decrease outstanding invoices                 | Days outstanding after net‑30 | <15 days overdue for 90 % of invoices |
| User adoption                                 | % of invoices generated through tool vs. manual | >90 % within 2 months |

## Assumptions

* **Act! CRM remains the system of record for contacts, opportunities and tasks.**  The tool should use Act! Web API for data synchronization.  Endpoints such as `GET api/opportunities` (list opportunities) and `GET api/contacts/{contactID}/activities` (list tasks per contact) will be leveraged; the API documentation lists these endpoints under the OData section.
* **Invoices will continue to be sent manually**.  The tool will generate PDF drafts for download but will not directly email clients.  Nick’s father Russell retains the authority to deliver invoices and communicate with clients. Russell should be able to optionally edit a PRD draft in the tool before downloading.
* **Net‑30 payment terms** apply to all accounts. This may change down the road, but for simplicity, assume N30D for all.  The tool will create reminders automatically 30 days after an invoice is marked as sent, if it has not been marked as paid.
* **Initial development** will use a trial Act! account for testing.  Once validated, the integration will be switched to CRCG’s production Act! credentials.
* **Target users** are CRCG’s owner Russell as the primary user and possibly a small finance assistant down the road and therefore the interface must remain simple and intuitive.

## Requirements

### User Interaction & Design

1. **Accounts Receivable Dashboard**
   * A table listing each client (pulled from Act! opportunities) with columns for deliverables, retainer amount, invoice status (checkboxes: Invoiced, Paid) and total outstanding.  Additional columns may display due date, next invoice date and notes.
   * Filters and summary totals to view outstanding balances, delivered vs. retainer work and totals per month.
   * Clicking a client row opens a detailed view showing deliverables and monthly retainer schedule.  Retainer schedules are derived from signed agreements (e.g., WSU’s project cost schedule includes deliverables of $10k, $8k, $8k, $4k, $3k). This data is not currently in Act! so we might need to have Russell add more fields on the opportunity record to support.

2. **Invoice Generation Screen**
   * A form where the user selects a client and month.  The tool pulls deliverables and retainer charges due for that month and displays them for confirmation.
   * Upon confirmation, the tool produces a PDF invoice matching the current invoice format, including CRCG’s address, client billing address, purchase order number and line‑item descriptions.  The invoice file is saved to Supabase storage and linked to the record.
   * After generation, the invoice status defaults to “Invoiced” and the invoice’s due date (send date + 30 days) is recorded to be used in future reminders tasks and views in the tool.
   * Important that invoices or link to this page should be accessible from the Accounts Receivable Dashboard. Ie if Russell is viewing an account and month in AR dashboard, there should be a quick link to view and download invoice.

3. **Deliverables & Timeline Report**
   * A dashboard summarizing deliverables across all accounts, similar to the existing “CRCG Current Contracts Deliverables and Timelines YTD” spreadsheet.  It will show tasks (kick‑off, RFP start/completion, etc.) along a timeline for each client.
   * This view helps CRCG plan workload and ensures that deliverables align with contract timelines.

4. **Metrics Dashboard**
   * Key metrics including total invoiced, total outstanding, average days to payment and number of overdue invoices.  A chart or list can highlight the largest overdue accounts.

5. **Settings & Act! Integration Management**
   * Section to enter Act! API credentials, database name and toggle synchronization frequency.
   * Manual sync button to fetch latest opportunities and tasks.

### Functional Requirements

#### 1. Data Model & Storage

* **Clients / Opportunities / Accounts** – store Act! opportunity ID, client name, contact information, retainer amount, billing frequency and contract start/end dates.
* **Deliverables** – one‑off tasks and associated fees.  Each deliverable is linked to an account and includes description, fee amount, due date, delivered date, invoiced date
* **Invoices** – records capturing account, billing period, list of deliverable and retainer charges, total amount, invoice date, due date and status (invoiced/paid).  Generated PDFs are stored in Supabase storage and can be downloaded to the user's local machine.
* **Payments** – optional table to log payment dates and amounts when an invoice is marked as paid.
* **Integration Logs** – store synchronization timestamps and errors when calling Act! API.

#### 2. Act! CRM Integration

* **Authentication** – use Basic authentication to obtain a bearer token from `/act.web.api/authorize` and supply `Act-Database-Name`
* **Retrieve Opportunities** – call `GET /api/opportunities` to fetch all opportunities for the current user.  Use OData query parameters to filter by status (e.g., active) if needed.
* **Retrieve Tasks/Activities** – call `GET /api/tasks` (or `GET /api/contacts/{contactID}/tasks` for tasks per contact) to obtain existing tasks.  Tasks will be used to cross‑reference deliverables and track scheduled invoices.
* **Create Tasks/Activities** – when an invoice is overdue, create a reminder task in Act! via `POST /api/tasks`.
* **Custom Entities (optional)** – Act! supports custom entities accessible via `GET api/custom/entities/{entityname}` and filterable via.  If CRCG wants to push AR data back to Act! as a custom entity, these endpoints can be used.

#### 3. Invoice Generation

* Combine retainer charges and deliverables due in the selected period.
* Calculate subtotal and total; include taxes/fees if needed.
* Generate a PDF using a server‑side library (e.g., jsPDF or PDFKit) based on the existing invoice template.
* Save the file to Supabase storage and attach a link in the invoice record.
* Provide a “Download” button; do not automatically send to clients.

#### 4. Reminders & Automation

* When an invoice is marked as “Invoiced,” record the send date and compute the due date (send date + 30 days).
* A scheduled job (Edge Function or cron) runs daily to check for overdue invoices.  If an invoice is overdue, set status to “Overdue” in the dashboard and call the Act! API to create a “Payment Reminder” task for that account (with due date = now).

#### 5. Security & Permissions

* Store Act! credentials securely in Supabase’s environment variables.
* Only authenticated CRCG users may access the tool.  Use Supabase Auth for login.
* Ensure that only authorized operations are performed on Act! (read/write tasks and opportunities).  Respect Act! API rate limits 

### Non‑Functional Requirements

* **Usability** – The interface must be simple and intuitive; avoid clutter.  Use checkboxes and natural language labels to minimise training time.
* **Performance** – Data syncing with Act! may occur in the background; the dashboard should load within ~2 seconds for typical data volumes.
* **Reliability** – The system must handle API errors gracefully and log them for troubleshooting.
* **Scalability** – The tool is designed for a small consultancy but should support up to 50 concurrent accounts without significant degradation.
* **Future-Proofing** – Nick Markman, the builder of this tool and automation/AI consulting company working with CRCG, might wish to adopt this tool for other CRMs so consider generalizability of the database for opps, accounts, tasks, etc to be able to support additional CRMs outside of Act! down the road. This is not a large requirement.

## Current UX

Currently CRCG uses two spreadsheets: one tracking AR where accounts are columns and deliverables/retainer billing rows, with color codes indicating invoiced/not invoiced and paid/unpaid; and another tracking deliverables and timelines across accounts.  Invoices are manually generated in Word or PDF using a template similar to the WSU example.  Act! CRM is used for tracking opportunities and tasks but is not integrated with AR.

## Problem Statement

The current manual process is time consuming (~10 hours/month) and error prone.  Using multiple spreadsheets leads to duplicate data entry and inconsistent statuses.  CRCG needs a streamlined, integrated solution that automates AR tracking and invoice preparation while preserving existing client workflows in Act! CRM.

## Design Solutions

1. **Simple Web Application** – built with Lovable for scaffolding, Supabase for database and authentication, and Cursor as the development environment.  The UI will include dashboards for AR tracking, invoice generation and deliverables report. The UI should try to consolidate these functions into singular views as much as possible. The goal is not to translate the existing separate spreadsheets into a a digital form, it's to fundamentally improve the process.
2. **Bi‑Directional Act! Integration** – use Act! Web API to import opportunities/tasks and push reminder tasks back.  Edge functions in Supabase will handle API requests securely.
3. **Automated Invoice Drafts** – generate PDF invoices from stored data and allow users to download them.  Payment reminders will be automated via Act! tasks, not email.

## Source Files & References

* **Project Proposal** – outlines the objectives and phased timeline of this automation project and emphasises the need to preserve Act! as the system of record.
* **Act! API Documentation** – provides authentication instructions and lists supported endpoints, including activities and opportunities: https://apimta.act.com/act.web.api/Swagger/index.html#/
* **Invoice Example** – shows the invoice format and net‑30 terms.
* **Contract Example** – details deliverable payments and costs for a sample client.

## Open Questions

* Should invoices support multiple currencies or tax rates?  Currently all invoices appear to be USD with no tax lines.
- A: No, just USD needed.
* Will CRCG need integration with accounting software (e.g., Quicken) in the future?  The project proposal lists this as an optional add‑on but it is out of scope for this MVP.
- A: Out of scope for MVP
* Are there any deliverable types that require special invoice wording or scheduling beyond one‑off and retainer categories?
- We need to retain the deliverables name as outlined in the attached spreadsheet examples from CRCG.
* How frequently should Act! data be synchronized?  Real‑time sync would require more API calls and may hit rate limits:contentReference[oaicite:22]{index=22}.
- It should refresh in the background once per day and the Act! Connection page of the tool should have a button or option to manual force a resync. For the connections page, consider future CRM expandability, so there should be an "Connections" page with a button for Act, that opens up the configuration.

## Out of Scope

* Automated emailing of invoices and payment reminders (considered an optional future add‑on).
* Integration with Quicken or other accounting systems (future optional add‑on).
* Support for multiple CRCG users with different roles and permissions (assume only the owner uses the tool initially).

## Development Plan & Sequencing

The project will be executed iteratively to allow for testing and feedback.  Each step builds upon the previous, enabling incremental progress in Cursor.

1. **Initial Scaffold via Lovable (Single‑Shot Prompt)**

   Use Lovable’s AI scaffolding to generate a basic Next.js/React project integrated with Supabase (PostgreSQL, Auth).  Provide the following initial prompt:

   > **Prompt for Lovable**: 
   > “Create a simple web application called **DeliveryDesk**.  It should connect to a Supabase project using environment variables for credentials.  The app must include pages for:
   >  * **Dashboard** – lists clients with their outstanding balances and invoice statuses;
   >  * **Invoice Generator** – allows selection of a client and month and generates a PDF invoice;
   >  * **Deliverables Report** – displays upcoming deliverables and timelines per client.
   >  Implement Supabase authentication (email/password) and basic navigation between pages.  Do not integrate any external APIs yet.  Use a clean, responsive layout.”

   This will produce the skeleton codebase and set up Supabase tables for clients, deliverables, invoices and users.

2. **Define Database Schema**

   Using Cursor, refine the Supabase schema: create tables for clients/accounts, deliverables, invoices, payments and integration logs.  Add enumerations for invoice status (draft, invoiced, paid, overdue).  Seed the database with sample data extracted from the current spreadsheets.

gi

   Develop a Supabase Edge Function (TypeScript) that authenticates with Act! using Basic auth and retrieves opportunities and activities.  Map opportunities to clients and tasks to deliverables.  Schedule the function to run nightly or on-demand.  Store results in the integration logs table.

4. **Build AR Dashboard**

   Construct the dashboard page using React.  Fetch client and invoice data from Supabase and display totals and outstanding amounts.  Allow toggling invoice status checkboxes (invoiced/paid) and persist changes.  Add summary metrics at the top.

5. **Invoice Generation Module**

   Create a form where the user selects an account and month.  Query deliverables and retainer schedules due in that period.  Use a server‑side PDF library (e.g., jsPDF) to generate a PDF invoice based on the template.  Save the PDF to Supabase storage and create an invoice record.  Provide a download link.  After generation, mark the invoice as “Invoiced” and set due date.

6. **Overdue Reminder Automation**

   Implement a daily scheduled Edge Function that checks invoices whose due date has passed and status ≠ “Paid.”  For each overdue invoice, call Act! API `POST /api/tasks` or `POST /api/organizers/{userId}/tasks` to create a reminder task (type “To‑Do”) for the associated contact.  Record the creation in integration logs.

7. **Deliverables & Timeline Report**

   Build the deliverables report page that displays tasks across accounts in a matrix or timeline (similar to the existing spreadsheet).  Use the tasks imported from Act! and any additional deliverable entries.  Provide filters for date range and status.

8. **Metrics Dashboard & Polishing**

   Add summary widgets (total invoiced, outstanding, overdue) and charts. Consider other business stats like active opportunities, a client list, etc.  Ensure the user interface is polished and responsive.  Conduct user testing with the CRCG owner and iterate based on feedback.

9. **Bi‑Directional Sync Enhancements**

   After initial validation, implement writing back to Act! where appropriate—e.g., updating opportunity custom fields with AR summaries or marking tasks completed when invoices are paid.

10. **Final Testing & Deployment**

    Perform end‑to‑end testing with a trial Act! account, then switch to CRCG’s production Act! credentials.  Provide training and documentation.

## Notes

* This project is scoped to deliver the core AR automation functionality.  Optional add‑ons such as automated invoice delivery, payment reminders via email and accounting software integration can be considered in future phases once the MVP is stable.
* Data import from the existing spreadsheets will require some manual cleansing to normalise deliverable names and retainer schedules.
