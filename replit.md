# Emergency Chicago Sewer Experts CRM

## Overview
The Emergency Chicago Sewer Experts CRM is a comprehensive field service management and customer relationship management system designed for a sewer and plumbing services business in Chicago, IL. Its primary purpose is to manage the entire business lifecycle, from initial lead capture and qualification through quote generation, job dispatch, field service execution, and financial processes like payroll and commission tracking. The system supports four distinct user roles: Admin (God Mode), Dispatcher, Technician, and Salesperson, each with specialized dashboards and functionalities. It aims to streamline operations, enhance customer interaction, and provide robust tools for managing field services.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Business Workflow
The CRM operates on a "Lead-to-Quote-to-Job" workflow, encompassing lead capture (manual, webhooks, public chat), qualification, quote generation with digital acceptance, job creation, technician dispatch and assignment, field work management (including media upload and checklists), and job completion with payroll integration. It includes automated customer notifications and TCPA-compliant communication tracking.

### User Roles & Dashboards
The system features role-based access with tailored dashboards:
- **Admin (God Mode)**: Full system access for comprehensive management.
- **Dispatcher**: Focuses on operational tasks, dispatching, scheduling, and customer communication.
- **Technician**: Mobile-first interface for managing assigned jobs, on-site quoting, work orders, and media uploads.
- **Salesperson**: Manages leads, quotes, sales pipeline, and tracks commissions.

### Technical Implementations
- **Authentication**: Session-based authentication with username/password, role-based access control on client and server.
- **Chat System**: Thread-based communication for internal coordination and customer interaction, accessible via dedicated pages and magic links.
- **Audit Logging**: Comprehensive tracking of all user-driven data changes, including field-level differences and user attribution.
- **Permit Center Module**: Automates permit detection, generation of pre-filled PDF applications, status tracking, and email submission.
- **Customer Management Module**: Centralized customer profiles, payment management, and deduplication.
- **Payroll System**: Manages pay periods, time entries, configurable pay rates, Illinois tax calculations, and payroll record generation.
- **Digital Work Order Form**: Paperless work orders with pre-filled data, digital signature capture, and status tracking.
- **Digital Estimate Form**: Digitized version of the company's physical paper estimate form (`client/src/components/EstimateForm.tsx`). Includes company header, date fields, customer info, authorization text with digital signature, right to cancel clause, work description with pricebook integration, warranty terms, credit card authorization section with cardholder signature, service tech pricing (price/discounts/deposit/balance), completion signature, and print/PDF functionality. Uses `formType: "estimate"` in the quotes table to distinguish from legacy quotes. Extended quotes schema with 18 additional fields (city, zipCode, datePromised, workDescription, warrantyYears, pricing breakdown fields, signature fields).
- **Job Media Upload**: Technicians can upload images and video clips to jobs via presigned URLs to Replit Object Storage, with client-side validation for file types and sizes.
- **AI Copilot**: Plan-then-execute AI assistant for admins and dispatchers (`server/services/agent.ts`, `client/src/components/CopilotPanel.tsx`). Uses OpenAI via Replit AI Integrations. Tool registry with RBAC-enforced read tools (search_leads, list_jobs, list_technicians, list_quotes, get_lead, get_job, get_chat_threads, get_thread_messages, get_customer_profile) and write tools (create_lead, update_lead_status, assign_lead, update_job_status, assign_technician_to_job, schedule_job, create_job_timeline_event, send_chat_message). Write operations are always proposed first and require explicit user approval. Routes: POST /api/agent/plan, POST /api/agent/execute, GET /api/agent/tools. **In-App Messaging**: AI has full access to chat threads via get_chat_threads, get_thread_messages, and send_chat_message tools. Can send to internal staff threads or customer-visible threads. Auto-creates threads when needed. **Customer Profiles**: get_customer_profile tool provides comprehensive lookup by phone/name/ID, returning leads, jobs, quotes, calls, contact attempts, and summary stats. **Job Status Notifications**: `postJobStatusChatUpdate()` helper in routes.ts automatically posts messages to internal and customer-visible chat threads when job status changes (assigned, confirmed, en_route, on_site, in_progress, completed, cancelled). Wired into all status change routes: /assign, /confirm, /en-route, /arrive, /start, /complete, and PATCH /api/jobs/:id. **Voice Input**: Microphone button in the Copilot panel allows users to speak instead of typing. Uses browser MediaRecorder API to capture audio, sends to `/api/call-recordings/transcribe` for OpenAI Whisper transcription, and automatically sends the transcribed text as a Copilot message. Visual recording indicator with timer and "Transcribing..." feedback.
- **Call Recording & AI Intake**: Dispatcher call recording system (`client/src/components/CallRecorder.tsx`) using browser MediaRecorder API. Flow: Record call → Transcribe with OpenAI (gpt-4o-mini-transcribe via Replit AI Integrations) → AI extracts customer details with GPT (gpt-4o-mini) → Auto-populates customer intake form for review/edit → Creates lead on confirmation. Database: `call_recordings` table. Routes: GET/POST /api/call-recordings, PATCH /api/call-recordings/:id, POST /api/call-recordings/transcribe, POST /api/call-recordings/analyze, POST /api/call-recordings/create-lead. Integrated into Dispatcher Dashboard's Customer Intake tab.

### UI/UX Decisions
- **Frameworks**: Utilizes Radix UI for accessible primitives, shadcn/ui for components, Lucide React for icons, and Tailwind CSS for styling with a dark-first theme.
- **Design Approach**: Emphasizes clear, functional interfaces tailored to each user role.

### Feature Specifications
- **SEO Content Generation**: Integration with an external API (Builder 1) to generate SEO content using job data and uploaded media.
- **Master Customer Data List**: Central repository for customer information to facilitate targeted outreach and analytics.
- **Technician Color Coding**: Each technician has a persistent color (stored in `technicians.color` DB field, or auto-assigned from a deterministic palette). Colors appear on calendar events and job tracking tables. Utility: `client/src/lib/technicianColors.ts`. Calendar includes a color legend showing all technicians.
- **Enhanced Customer Profiles**: 8-tab profile view (Jobs, Quotes, Leads, Calls, Messages, Media, Audit, Addresses) with collapsible detail cards, outreach actions (SMS/Email), and data aggregated from calls, contact attempts, chat threads, job media, and audit logs.
- **God Mode User Management**: Full CRUD for all user accounts from Settings > Users tab. Edit any user's name, email, phone, role. Change password for any user including the godmode super admin account. Delete non-superadmin users with confirmation dialog. Server-side protection prevents deactivating or changing the role of super admin accounts. Routes: PATCH /api/admin/users/:userId (edit), POST /api/admin/users/:userId/reset-password (password change), DELETE /api/admin/users/:userId (delete).
- **Developer Mode**: Toggle in Settings > General tab. Persisted in localStorage (`cse-developer-mode`). When enabled: shows "DEV" badge in header, unlocks beta feature toggles (Advanced Analytics, AI Auto-Dispatch, Customer Portal, Inventory Management), and debug tools (API timing, component boundaries, verbose logging). Uses CustomEvent `devModeChange` for cross-component sync.

## External Dependencies

### Database
- **PostgreSQL**: Primary database solution (Neon-backed via Replit).
- **Drizzle ORM**: Type-safe ORM for database interactions.
- **pg (node-postgres)**: PostgreSQL client.

### File Storage
- **Replit Object Storage**: GCS-backed cloud storage for job media and documents.
- **@google-cloud/storage**: Google Cloud Storage client for presigned URL generation.

### PDF & Documents
- **pdf-lib**: Library for PDF generation and form filling, used in the Permit Center.

### Third-Party Services/APIs
- **Twilio**: SMS integration for communication.
- **SignalWire**: Communication integration for calls and messaging.
- **Thumbtack**: Webhook for lead capture.
- **Resend API**: Transactional email sending service.
- **Builder 1 API**: Used for SEO content generation.

### Development & Utilities
- **Vite**: Build tool and development server.
- **TypeScript**: For type-safe development.
- **Zod**: Runtime schema validation, integrated with `React Hook Form` and `drizzle-zod`.
- **TanStack Query**: For server state management.
- **Wouter**: Lightweight client-side router.