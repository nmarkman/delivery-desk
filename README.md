# DeliveryDesk - Accounts Receivable Automation for CRCG

**DeliveryDesk** is a web-based accounts receivable automation tool built for Collegiate Retail Consulting Group (CRCG). It streamlines invoice management, client tracking, and financial reporting by integrating with Act! CRM while maintaining Act! as the system of record for client relationships.

## 🎯 Project Goals

**Primary Objective:** Reduce manual administrative overhead by 80-90% (from ~10 hours to <2 hours per month) while automating the AR process and preserving existing client-engagement workflows in Act! CRM.

### Key Features
- **Act! CRM Integration**: Bi-directional API sync for opportunities, companies, contacts, and tasks
- **Centralized AR Tracking**: Replaces multiple spreadsheets with unified dashboard
- **Automated Invoice Generation**: PDF invoices with CRCG branding and itemized billing
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

**Phase:** Database Schema Design & Act! API Integration  
**Sprint:** Initial Act! CRM connectivity and data exploration  

### ✅ Completed Milestones
- [x] **Act! API Authentication**: Bearer token flow with automatic refresh strategy
- [x] **API Data Exploration**: Full analysis of opportunities and tasks structure
- [x] **Custom Fields Strategy**: Defined retainer tracking fields for Act! 
- [x] **Field Mapping Documentation**: Complete Act! → DeliveryDesk data mapping
- [x] **File Attachment Testing**: Confirmed PDF upload capabilities to Act! tasks

### 🔄 Current Tasks
- [ ] **Database Schema Design**: Supabase tables for clients, invoices, deliverables
- [ ] **Sync Edge Functions**: Automated Act! data synchronization
- [ ] **Authentication Setup**: User auth and permissions
- [ ] **Core UI Components**: Dashboard and invoice generation screens

### 📋 Upcoming Phases
1. **Core Functionality**: Invoice generation, payment tracking, dashboard
2. **Advanced Features**: Automated reminders, reporting, file management
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
- **Data Sync**: Opportunities, tasks, contacts, file attachments
- **Custom Fields**: Enhanced retainer tracking in Act! opportunities

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
│   │   ├── AppSidebar.tsx           # Main navigation
│   │   └── Layout.tsx               # App layout wrapper
│   ├── pages/                      # Main application pages
│   │   ├── Dashboard.tsx            # AR dashboard (main view)
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
│   │   └── act-sync/                # Act! CRM sync function
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

### Current Sprint Focus
- Complete database schema design based on Act! API field mapping
- Implement initial sync Edge Functions for opportunities and tasks
- Build core dashboard components for AR tracking

---

**📧 Contact**: For questions about this project, refer to the detailed documentation in the `docs/` directory or consult the Act! API integration findings. Optionally, contact nmarkman93@gmail.com
