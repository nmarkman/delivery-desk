# DeliveryDesk - Accounts Receivable Automation for CRCG

**DeliveryDesk** is a web-based accounts receivable automation tool built for Collegiate Retail Consulting Group (CRCG). It streamlines invoice management, client tracking, and financial reporting by integrating with Act! CRM while maintaining Act! as the system of record for client relationships.

## 🎯 Project Goals

**Primary Objective:** Reduce manual administrative overhead by 80-90% (from ~10 hours to <2 hours per month) while automating the AR process and preserving existing client-engagement workflows in Act! CRM.

### Key Features
- **Act! CRM Integration**: Bi-directional API sync for opportunities, companies, contacts, and tasks
- **Contract Upload & Processing**: AI-powered PDF contract parsing with Claude API for automatic line item extraction
- **Daily Automated Sync**: Scheduled daily synchronization of all active Act! connections
- **Complete Invoice Management System**: Full workflow from draft creation to payment tracking
  - Client-side PDF generation with professional CRCG branding and template
  - Intelligent billing info validation with modal configuration
  - Payment status tracking (draft → sent → paid/overdue) with visual indicators
  - Automated overdue calculation based on custom payment terms
- **Enhanced Dashboard Metrics**: Interactive tiles showing key business metrics
  - Total clients, active contract value, pending invoices, and outstanding balances
  - Clickable navigation to filtered invoice views
- **Centralized AR Tracking**: Replaces multiple spreadsheets with unified dashboard
- **Retainer Management**: Automated monthly retainer billing and tracking
- **Overdue Reminders**: Automatic Act! task creation for follow-ups

### Success Metrics
| Goal | Metric | Target |
|------|--------|--------|
| Reduce manual AR time | Hours saved/month | 80-90% reduction |
| Invoice accuracy | % generated without correction | >95% |
| Outstanding invoices | Days overdue (90% of invoices) | <15 days |
| User adoption | % tool-generated invoices | >90% within 2 months |

## 🚧 Current Development Status

**Phase:** Invoice Generation & Management - COMPLETED ✅  
**Current:** Core invoicing system fully implemented and production-ready

### ✅ Completed Milestones
- [x] **Act! API Authentication**: Bearer token flow with automatic refresh strategy
- [x] **API Data Exploration**: Full analysis of opportunities and tasks structure
- [x] **Custom Fields Strategy**: Defined retainer tracking fields for Act! 
- [x] **Field Mapping Documentation**: Complete Act! → DeliveryDesk data mapping
- [x] **File Attachment Testing**: Confirmed PDF upload capabilities to Act! tasks
- [x] **Database Schema**: Complete schema for clients, invoices, deliverables, and sync tracking
- [x] **Sync Edge Functions**: Manual and automated Act! data synchronization
- [x] **Daily Automated Sync**: Scheduled daily sync for all active Act! connections
- [x] **User Authentication**: Supabase Auth with per-user Act! connections
- [x] **Core UI Components**: SyncDashboard, connection management, and daily sync controls
- [x] **Contract Upload System**: AI-powered PDF parsing with Claude API for automatic line item extraction
- [x] **Products Pipeline**: Complete Act! CRM product creation and database sync with support for deliverables (null dates) and retainers
- [x] **Invoice Feature Planning**: Complete PRD and task breakdown for invoice generation system
- [x] **Complete Invoice Generation System**: Full implementation with all 8 major tasks and 45+ sub-tasks
  - Professional CRCG-branded PDF generation with client-side processing
  - Payment workflow (draft → sent → paid/overdue) with intelligent status tracking
  - Billing info validation and configuration modal integration
  - Enhanced dashboard metrics with clickable navigation to filtered views
  - Overdue calculation system with visual indicators and automated status updates

### ✅ Recently Completed - Invoice Generation System
- [x] **Invoice Generation System**: Client-side PDF invoices with CRCG branding using existing line items
- [x] **Payment Status Tracking**: Complete paid/unpaid status management with overdue detection
- [x] **Invoice Dashboard**: Full invoice management interface with filtering and search
- [x] **Database Schema Updates**: Added invoice_number, payment_date, invoice_status to invoice_line_items table
- [x] **Enhanced Dashboard**: Interactive metrics tiles with clickable navigation
- [x] **Billing Validation**: Intelligent billing info validation with configuration modals

### 📋 Upcoming Phases
1. ✅ **Core Functionality**: Invoice generation, payment tracking, dashboard - COMPLETED
2. **Advanced Features**: Automated reminders, advanced reporting, file management
3. **Production Deployment**: CRCG production Act! integration  
4. **User Testing & Refinement**: Russell feedback and iterations

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Integration**: Act! Web API (Bearer token authentication)
- **File Storage**: Supabase Storage (PDF invoices)
- **Deployment**: Lovable.dev platform

### Key Integrations
- **Act! CRM API**: `https://apius.act.com/act.web.api`
- **Authentication**: Basic Auth → Bearer tokens (1-hour expiry)
- **Data Sync**: Opportunities, tasks, contacts, file attachments, products
- **Custom Fields**: Enhanced retainer tracking in Act! opportunities
- **Claude API**: AI-powered PDF contract parsing and line item extraction
- **Supabase Storage**: Contract PDF storage and public URL generation for AI processing

## 📁 Project Structure

```
delivery-desk/
├── docs/                          # 📚 Project Documentation
│   ├── delivery-desk-full-prd.md     # Complete PRD and requirements
│   ├── prd-database-schema-act-sync.md # Database & sync PRD
│   ├── tasks-prd-database-schema-act-sync.md # Implementation task list
│   ├── act-api-exploration.md         # 🔍 Act! API analysis & findings
│   └── act-api-field-mapping.md       # 🗺️ Act! → DeliveryDesk field mapping
├── src/
│   ├── components/                 # React components
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── invoices/                 # Invoice management components
│   │   │   ├── InvoiceTemplate.tsx     # CRCG-branded PDF template
│   │   │   └── PaymentStatusButton.tsx # Payment workflow controls
│   │   ├── AppSidebar.tsx           # Main navigation
│   │   ├── SyncDashboard.tsx        # Act! sync management interface
│   │   ├── DailySyncSettings.tsx    # Daily sync configuration
│   │   ├── BillingDetailsModal.tsx  # Billing info configuration
│   │   └── Layout.tsx               # App layout wrapper
│   ├── pages/                      # Main application pages
│   │   ├── Dashboard.tsx            # Enhanced AR dashboard with interactive metrics
│   │   ├── Invoices.tsx             # Complete invoice management interface
│   │   ├── InvoiceGenerator.tsx     # Invoice creation
│   │   ├── DeliverablesReport.tsx   # Project timeline view
│   │   └── Auth.tsx                 # Authentication
│   ├── contexts/                   # React contexts
│   ├── hooks/                      # Custom React hooks
│   ├── integrations/              # External service integrations
│   │   └── supabase/                # Supabase client & types
│   └── lib/                       # Utilities and helpers
├── supabase/
│   ├── functions/                  # Edge Functions
│   │   ├── act-sync/                # Act! CRM sync function
│   │   ├── contract-upload/         # Contract PDF processing and AI parsing
│   │   └── daily-sync/              # Daily automated sync batch processor
│   └── migrations/                 # Database schema changes
└── public/                        # Static assets
```

## 📚 Key Documentation

### 🔍 **Act! API Integration Documentation**
- **[`docs/act-api-exploration.md`](docs/act-api-exploration.md)**: Comprehensive analysis of Act! CRM API capabilities, including:
  - Authentication flow and token management
  - Complete data structures for opportunities (37 fields) and tasks (34 fields)
  - File attachment capabilities and testing results
  - Custom field recommendations and implementation strategy
  - Performance considerations and rate limiting guidance

- **[`docs/act-api-field-mapping.md`](docs/act-api-field-mapping.md)**: Detailed field-by-field mapping between Act! CRM and DeliveryDesk, including:
  - Client/opportunity information mapping
  - Financial data transformation logic
  - Custom fields strategy for retainer tracking
  - Database schema mapping specifications
  - Data validation and quality considerations

### 📋 **Project Planning Documentation**
- **[`docs/delivery-desk-full-prd.md`](docs/delivery-desk-full-prd.md)**: Complete Product Requirements Document
- **[`docs/prd-database-schema-act-sync.md`](docs/prd-database-schema-act-sync.md)**: Focused PRD for database design and API sync
- **[`docs/tasks-prd-database-schema-act-sync.md`](docs/tasks-prd-database-schema-act-sync.md)**: Detailed implementation task breakdown
- **[`docs/prd-invoicing-feature.md`](docs/prd-invoicing-feature.md)**: Complete PRD for invoice generation system
- **[`docs/tasks-prd-invoicing-feature-COMPLETE.md`](docs/tasks-prd-invoicing-feature-COMPLETE.md)**: **COMPLETED** - Full implementation task breakdown (8 main tasks, 45+ sub-tasks)

## 🚀 Development Workflow

### Local Development Setup

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd delivery-desk

# Install dependencies
npm install

# Start development server
npm run dev
```

### Supabase Integration
The project uses Supabase MCP (Model Context Protocol) for:
- Database operations and migrations
- Edge Function development and deployment
- Authentication and authorization
- File storage management

### Act! CRM Testing
Currently using Act! trial account for development:
- **API Base**: `https://apius.act.com/act.web.api`
- **Test Data**: 5 opportunities, 24 tasks, custom "Billing" task type
- **Authentication**: Implemented with token caching and automatic refresh

## 🔗 External Links

- **Live Project**: [Lovable.dev Project](https://lovable.dev/projects/b0ca809d-73a0-4cf2-a06c-c03c5732187e)
- **Act! API Documentation**: Referenced in integration documentation
- **Deployment**: Automatic via Lovable platform integration

## 🤝 Contributing

This is a private project for CRCG.

### Recent Achievement - Complete Invoice System ✅
- ✅ **Invoice Generation**: Full client-side PDF generation with professional CRCG branding
- ✅ **Payment Tracking**: Complete workflow with draft → sent → paid/overdue status management  
- ✅ **Enhanced Dashboard**: Interactive metrics with clickable navigation and real-time calculations
- ✅ **Production Ready**: All major features implemented and tested
- **Implementation Details**: Complete task breakdown available in `docs/tasks-prd-invoicing-feature-COMPLETE.md`

---

**📧 Contact**: For questions about this project, refer to the detailed documentation in the `docs/` directory or consult the Act! API integration findings. Optionally, contact nmarkman93@gmail.com
