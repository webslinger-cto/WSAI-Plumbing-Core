# Emergency Chicago Sewer Experts CRM

## Overview
The Emergency Chicago Sewer Experts CRM is a comprehensive field service management and customer relationship management system designed for a sewer and plumbing services business in Chicago, IL. It manages the entire business lifecycle from initial lead capture and qualification through quote generation, job dispatch, field service execution, and financial processes like payroll and commission tracking. The system supports four distinct user roles: Admin (God Mode), Dispatcher, Technician, and Salesperson, each with specialized dashboards and functionalities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Business Workflow
The CRM operates on a "Lead-to-Quote-to-Job" workflow:
- **Lead Capture**: Manual entry, webhooks (Thumbtack, Angi), public chat widget, AI call recording intake
- **Lead Qualification**: Status tracking, assignment to sales reps, follow-up management
- **Quote Generation**: Digital estimates with pricebook integration, digital signatures, PDF export
- **Job Creation & Dispatch**: Calendar-based scheduling, technician assignment with color coding
- **Field Service**: Mobile work orders, media upload, checklists, on-site quoting
- **Job Completion**: Status tracking with automatic chat notifications, payroll integration
- **Customer Communication**: TCPA-compliant SMS/email, in-app chat threads, automated notifications

### User Roles & Dashboards
- **Admin (God Mode)**: Full system access, user management, payroll processing, AI Copilot, settings control, developer mode
- **Dispatcher**: Operational tasks, dispatching, scheduling, customer communication, call recording with AI intake, AI Copilot
- **Technician**: Mobile-first interface for assigned jobs, on-site quoting, work orders, media uploads, earnings tracking
- **Salesperson**: Lead management, quotes, sales pipeline, commission tracking, sales analytics

### Authentication & Authorization
- Session-based authentication with username/password login
- API authorization via `X-User-Id` header for all protected routes
- Role-based access control enforced on both client and server
- God Mode super admin account with server-side protection against deactivation
- Admin override password: 131381
- WebSlingerAI master license key: WSA-MASTER-2026-UNIVERSAL

## Feature Modules

### AI Copilot
Plan-then-execute AI assistant for admins and dispatchers.
- **Files**: `server/services/agent.ts`, `client/src/components/CopilotPanel.tsx`
- **Engine**: OpenAI via Replit AI Integrations
- **License**: Requires active WebSlingerAI license (validated via `checkCopilotLicense()`)
- **Routes**: POST `/api/agent/plan`, POST `/api/agent/execute`, GET `/api/agent/tools`

**Read Tools** (auto-executed):
- `search_leads` - Search leads by criteria
- `get_lead` - Get single lead details
- `list_jobs` - List jobs with filters
- `get_job` - Get single job details
- `list_technicians` - List all technicians
- `list_quotes` - List quotes with filters
- `get_chat_threads` - List chat threads (filter by jobId, leadId, visibility, status)
- `get_thread_messages` - Get messages from a specific thread
- `get_customer_profile` - Comprehensive customer lookup by phone/name/ID
- `get_calendar_schedule` - View calendar for date ranges
- `get_todays_schedule` - Today's job schedule
- `check_technician_availability` - Check tech availability for scheduling
- `list_payroll_periods` - List payroll periods
- `get_payroll_summary` - Get payroll details
- `get_stale_quotes` - Find quotes needing follow-up
- `get_unconverted_leads` - Find leads needing follow-up

**Write Tools** (require user approval):
- `create_lead` - Create new leads
- `update_lead_status` - Change lead status
- `assign_lead` - Assign leads to sales reps
- `update_job_status` - Change job status
- `assign_technician_to_job` - Assign tech to job
- `schedule_job` - Schedule a job on calendar
- `reschedule_job` - Move job to new time
- `create_and_schedule_job` - Create and schedule in one step
- `create_job_timeline_event` - Add timeline events
- `send_chat_message` - Send messages to chat threads
- `process_payroll` - Process payroll for a period
- `generate_followup_message` - Generate follow-up text
- `send_followup_sms` - Send SMS follow-ups
- `send_followup_email` - Send email follow-ups

**Voice Input**: Microphone button captures audio, transcribes via OpenAI Whisper, sends as Copilot message.

### AI-Powered In-App Messaging
- AI can read and send messages to both internal staff threads and customer-visible threads
- `send_chat_message` auto-creates threads when needed, adds appropriate participants (admins, dispatchers, assigned technician, customer)
- Only the specifically assigned technician is added as participant (not all technicians)
- `get_customer_profile` provides comprehensive lookup returning leads, jobs, quotes, calls, contact attempts, and summary stats

### Automatic Job Status Chat Notifications
- `postJobStatusChatUpdate()` helper in `server/routes.ts`
- Automatically posts messages to internal and customer-visible chat threads when job status changes
- Supported statuses: assigned, confirmed, en_route, on_site, in_progress, completed, cancelled
- Different message text for internal staff vs customer-facing threads
- 30-second deduplication window prevents duplicate messages (checks last 3 messages for matching status + meta)
- Wired into all status change routes: `/assign`, `/confirm`, `/en-route`, `/arrive`, `/start`, `/complete`, and `PATCH /api/jobs/:id`
- Technician notifications sent for assigned/cancelled/completed statuses

### AI Follow-Up Assistant
- **File**: `client/src/pages/FollowUpAssistantPage.tsx`
- Identifies open quotes and unconverted leads needing follow-up
- Urgency levels: low, medium, high, critical (calculated by days since last activity)
- AI-generated personalized follow-up messages via SMS or email
- Dashboard with metrics, filtering, and batch actions
- **Routes**: GET `/api/follow-up/metrics`, GET `/api/follow-up/stale-quotes`, GET `/api/follow-up/unconverted-leads`, POST `/api/follow-up/generate-message`, POST `/api/follow-up/send-sms`, POST `/api/follow-up/send-email`

### Call Recording & AI Intake
- **File**: `client/src/components/CallRecorder.tsx`
- Browser MediaRecorder API captures dispatcher calls
- OpenAI Whisper transcription (gpt-4o-mini-transcribe)
- AI extracts customer details with GPT (gpt-4o-mini)
- Auto-populates intake form for review, creates lead on confirmation
- **Database**: `call_recordings` table
- **Routes**: GET/POST `/api/call-recordings`, PATCH `/api/call-recordings/:id`, POST `/api/call-recordings/transcribe`, POST `/api/call-recordings/analyze`, POST `/api/call-recordings/create-lead`

### Chat System
- Thread-based communication for internal coordination and customer interaction
- Visibility levels: internal (staff only) and customer_visible
- Participant management with role tracking
- Magic link access for customers
- Dedicated chat pages: Dispatcher Chat, Technician Chat, Customer Chat, Lead Chat
- **Database**: `chatThreads`, `chatMessages`, `chatParticipants` tables

### Permit Center
- AI-powered permit detection based on job service type and scope
- Pre-filled PDF permit application generation using pdf-lib
- Status tracking (pending, submitted, approved, denied, expired)
- Email submission via Resend API
- Automatic permit filing triggered when jobs are scheduled with customer deposits

### Digital Estimate Form
- **File**: `client/src/components/EstimateForm.tsx`
- Digitized version of the company's physical paper estimate form
- Company header, date fields, customer info, authorization text with digital signature
- Right to cancel clause, pricebook-integrated work description
- Warranty terms, credit card authorization with cardholder signature
- Service tech pricing (price/discounts/deposit/balance), completion signature
- Print/PDF functionality
- Uses `formType: "estimate"` in quotes table

### Digital Work Order Form
- Paperless work orders with pre-filled data from job details
- Digital signature capture for customer authorization
- Status tracking through job lifecycle

### Payroll System
- Pay period management with configurable date ranges
- Time entry tracking for technicians
- Configurable pay rates (hourly, per-job, commission-based)
- Illinois state tax calculations
- Payroll record generation with deductions breakdown
- Admin-only on-demand processing via AI Copilot

### Customer Management
- Centralized customer profiles with 8-tab view (Jobs, Quotes, Leads, Calls, Messages, Media, Audit, Addresses)
- Collapsible detail cards with outreach actions (SMS/Email)
- Data aggregated from calls, contact attempts, chat threads, job media, and audit logs
- Customer deduplication
- Payment management

### Calendar & Scheduling
- Full calendar view with technician color coding
- Drag-and-drop job scheduling
- Technician availability checking
- AI can schedule jobs directly from call recordings
- Calendar legend showing all technicians with assigned colors

### Technician Management
- Persistent color coding (stored in `technicians.color` DB field)
- Deterministic color palette auto-assignment
- Colors appear on calendar events and job tracking tables
- **Utility**: `client/src/lib/technicianColors.ts`
- Technician map view for field tracking

### Marketing & Analytics
- Marketing ROI tracking and reporting
- Sales analytics dashboard
- Lead source attribution
- SEO content generation via Builder 1 API

### Settings & Administration
- **God Mode User Management**: Full CRUD for all user accounts. Edit name, email, phone, role. Change passwords. Delete non-superadmin users.
- **Routes**: PATCH `/api/admin/users/:userId`, POST `/api/admin/users/:userId/reset-password`, DELETE `/api/admin/users/:userId`
- **Developer Mode**: Toggle in Settings > General. Shows DEV badge, unlocks beta features (Advanced Analytics, AI Auto-Dispatch, Customer Portal, Inventory Management), debug tools. Persisted in localStorage (`cse-developer-mode`).

### Audit Logging
- Comprehensive tracking of all user-driven data changes
- Field-level differences with before/after values
- User attribution for accountability

## External Dependencies

### Database
- **PostgreSQL**: Primary database (Neon-backed via Replit)
- **Drizzle ORM**: Type-safe ORM for database interactions
- **pg (node-postgres)**: PostgreSQL client

### File Storage
- **Replit Object Storage**: GCS-backed cloud storage for job media and documents
- **@google-cloud/storage**: Google Cloud Storage client for presigned URL generation

### PDF & Documents
- **pdf-lib**: PDF generation and form filling for Permit Center

### AI & Machine Learning
- **OpenAI**: GPT models for AI Copilot, call analysis, follow-up generation, permit detection
- **Whisper**: Audio transcription for call recordings and voice input

### Communication Services
- **Twilio**: SMS integration for customer communication and follow-ups
- **SignalWire**: Communication integration for calls and messaging
- **Resend API**: Transactional email sending (follow-ups, permit submissions)

### Lead Sources
- **Thumbtack**: Webhook for lead capture
- **Builder 1 API**: SEO content generation

### Frontend Stack
- **Vite**: Build tool and development server
- **TypeScript**: Type-safe development across frontend and backend
- **React**: UI framework
- **Tailwind CSS**: Utility-first styling with dark-first theme
- **shadcn/ui**: Component library built on Radix UI
- **Lucide React**: Icon library
- **TanStack Query**: Server state management
- **Wouter**: Lightweight client-side router
- **React Hook Form + Zod**: Form handling with runtime validation

## Project Structure
```
client/src/
  components/       - Reusable UI components (CopilotPanel, CallRecorder, EstimateForm, etc.)
  pages/            - Route-level page components
  lib/              - Utilities (technicianColors, queryClient, etc.)
  hooks/            - Custom React hooks
server/
  services/         - Business logic (agent.ts, email.ts, sms.ts)
  routes.ts         - All API route definitions
  storage.ts        - Database access layer (IStorage interface)
  db.ts             - Database connection
  taxCalculation.ts - Illinois tax calculation logic
shared/
  schema.ts         - Drizzle ORM schema definitions and Zod types
```

## Recent Changes
- **Feb 2026**: Added AI-powered in-app messaging tools (get_chat_threads, get_thread_messages, send_chat_message, get_customer_profile) to Copilot
- **Feb 2026**: Implemented automatic job status chat notifications with 30-second deduplication
- **Feb 2026**: Fixed technician participant logic to only add assigned technician to chat threads
- **Feb 2026**: Consolidated ES module imports, removed legacy require() calls in agent.ts
