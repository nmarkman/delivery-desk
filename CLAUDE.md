# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development
- `npm run dev` - Start Vite development server on port 8080
- `npm run build` - Build for production
- `npm run build:dev` - Build for development environment
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Testing & Quality
Always run `npm run lint` after making code changes to ensure code quality. The project uses ESLint with TypeScript and React configurations.

## Project Architecture

**DeliveryDesk** is an accounts receivable automation tool for CRCG that integrates with Act! CRM while maintaining Act! as the system of record for client relationships.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **External Integration**: Act! CRM Web API with Bearer token authentication
- **State Management**: React Query + Context API
- **File Storage**: Supabase Storage (PDF invoices)

### Core Architecture Patterns

#### Database Schema
The application follows a normalized database design with these main entities:
- **clients**: Client information synced from Act! companies
- **opportunities**: Act! opportunities mapped to client projects
- **deliverables**: Tasks/activities from Act! that become billable items
- **invoices**: Generated invoices with line items
- **invoice_line_items**: Individual billing entries
- **user_act_connections**: Encrypted Act! credentials per user
- **integration_logs**: Comprehensive sync operation logging

#### Act! CRM Integration
- **Authentication**: Basic Auth → Bearer tokens (1-hour expiry) with automatic refresh
- **Sync Strategy**: Bi-directional sync preserving Act! as source of truth
- **Data Mapping**: Act! opportunities → clients, Act! tasks → deliverables
- **Error Handling**: Comprehensive logging via `integration_logs` table
- **Rate Limiting**: Built-in rate limit tracking per user connection

#### Component Architecture
- **pages/**: Main application routes (Dashboard, Auth, ActSync, InvoiceGenerator, DeliverablesReport)
- **components/**: Reusable UI components with shadcn/ui base components
- **contexts/**: React contexts for auth and global state
- **hooks/**: Custom React hooks including Act! connection management
- **integrations/supabase/**: Database client and TypeScript types

### Key Integration Points

#### Supabase Edge Functions
- **act-sync/**: Handles individual user Act! API communication
  - `index.ts`: Main sync orchestration for single user
  - `act-client.ts`: Act! API client with authentication
  - `opportunities-sync.ts`: Opportunity data synchronization
  - `tasks-sync.ts`: Task/deliverable synchronization
  - `types.ts`: TypeScript interfaces for Act! data

- **daily-sync/**: Automated batch processing for all active connections
  - `index.ts`: Daily sync orchestration for all users
  - Fault-tolerant batch processing with error isolation
  - Rate limiting and sequential processing (2-second delays)
  - Comprehensive batch logging and progress tracking

#### Act! CRM Sync Process
**Manual Sync (per user):**
1. Authenticate using stored encrypted credentials
2. Fetch opportunities and tasks from Act! API
3. Transform and normalize data according to field mappings
4. Update local database with sync status tracking
5. Log all operations for monitoring and debugging

**Daily Automated Sync (batch):**
1. Query all active connections ready for daily sync
2. Process each connection sequentially with rate limiting
3. Individual error handling without stopping batch
4. Update sync schedules and connection status
5. Comprehensive batch result tracking and reporting

### Important Implementation Notes

#### Custom Fields Strategy
Act! custom fields are used to track retainer information:
- Custom field mapping documented in `docs/act-api-field-mapping.md`
- Retainer tracking fields added to Act! opportunities
- Sync preserves custom field relationships

#### File Path Aliases
Use `@/` for imports from `src/` directory (configured in vite.config.ts):
```typescript
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
```

#### Authentication Flow
- Supabase Auth handles user authentication
- Act! credentials stored encrypted per user in `user_act_connections`
- Bearer tokens cached with automatic refresh logic

### Database Development

#### Type Safety
All database types are auto-generated in `src/integrations/supabase/types.ts`. Never modify this file directly - it's generated from the Supabase schema.

#### Daily Sync Database Functions
Key database functions for automated syncing:
- `get_connections_ready_for_sync()`: Returns all active connections ready for daily sync
- `update_next_sync_time(connection_id UUID)`: Schedules next sync time for a connection  
- `update_daily_sync_status(connection_id UUID, status TEXT, error_message TEXT)`: Updates sync status and error tracking

#### Development Workflow
1. Create migrations in `supabase/migrations/`
2. Deploy via Supabase CLI: `supabase db push` or manual SQL execution
3. Update TypeScript types will be auto-generated
4. Update components to use new schema changes

### Documentation Resources

Key documentation in `docs/` directory:
- `delivery-desk-full-prd.md`: Complete product requirements
- `act-api-exploration.md`: Comprehensive Act! API analysis
- `act-api-field-mapping.md`: Field mapping between Act! and DeliveryDesk
- `prd-database-schema-act-sync.md`: Database and sync requirements

### Environment Configuration

#### Required Environment Variables
- Supabase configuration (handled by platform)
- Act! API credentials (stored encrypted per user)

#### Platform Integration
- Deployed via Lovable.dev platform
- Automatic deployments on main branch
- Uses lovable-tagger for development component tracking