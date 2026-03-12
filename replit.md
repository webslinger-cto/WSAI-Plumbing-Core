# Emergency Chicago Sewer Experts CRM

## Overview
The Emergency Chicago Sewer Experts CRM is a comprehensive field service management and customer relationship management system for a sewer and plumbing services business in Chicago, IL. It manages the entire business lifecycle from lead capture to job completion and financial processes. The system supports four user roles: Admin, Dispatcher, Technician, and Salesperson, each with specialized functionalities and dashboards. Key capabilities include lead management, quote generation, job dispatch, mobile field service, customer communication, and payroll.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Business Workflow
The CRM follows a "Lead-to-Quote-to-Job" workflow:
- **Lead Capture & Qualification**: Manual entry, webhooks (Thumbtack, Angi), chat widget, AI call recording intake. Leads are tracked, assigned, and followed up.
- **Quote Generation**: Digital estimates with pricebook integration, digital signatures, PDF export.
- **Job Creation & Dispatch**: Calendar-based scheduling, technician assignment, color-coding.
- **Field Service**: Mobile work orders, media upload, checklists, on-site quoting.
- **Job Completion**: Status tracking, automatic chat notifications, payroll integration.
- **Customer Communication**: TCPA-compliant SMS/email, in-app chat, automated notifications.

### User Roles & Dashboards
- **Admin (God Mode)**: Full system access, user management, payroll, AI Copilot, settings, developer mode.
- **Dispatcher**: Operational tasks, dispatching, scheduling, customer communication, call recording with AI intake, AI Copilot.
- **Technician**: Mobile-first interface for jobs, on-site quoting, work orders, media uploads, earnings tracking.
- **Salesperson**: Lead management, quotes, sales pipeline, commission tracking, sales analytics.

### Authentication & Authorization
- Session-based authentication with username/password.
- API authorization via `X-User-Id` header.
- Role-based access control (RBAC) on client and server.
- God Mode super admin account with server-side protection.

### Feature Specifications

**AI Copilot**:
- Plan-then-execute AI assistant for admins and dispatchers using OpenAI.
- Provides read tools (e.g., `search_leads`, `get_job`, `list_technicians`) and write tools (e.g., `create_lead`, `update_job_status`, `schedule_job`, `process_payroll`) that require user approval.
- Supports voice input via OpenAI Whisper for transcription.

**AI-Powered In-App Messaging**:
- AI can read and send messages to internal staff and customer-visible threads.
- `send_chat_message` automatically creates threads and adds relevant participants (admins, dispatchers, assigned technician, customer).
- `get_customer_profile` provides a comprehensive customer lookup.

**Automatic Job Status Chat Notifications**:
- Posts automated messages to internal and customer chat threads upon job status changes (e.g., assigned, en_route, completed).
- Includes 30-second deduplication to prevent redundant messages.

**AI Follow-Up Assistant**:
- Identifies open quotes and unconverted leads for follow-up, categorizing by urgency.
- Generates personalized follow-up messages via SMS or email using AI.
- Dashboard for metrics, filtering, and batch actions.

**Call Recording & AI Intake**:
- Records dispatcher calls, transcribes via OpenAI Whisper.
- AI extracts customer details and auto-populates intake forms, creating leads on confirmation.

**Chat System**:
- Thread-based communication with internal and customer-visible threads.
- Participant management, magic link access for customers.

**Permit Center**:
- AI-powered permit detection, pre-filled PDF permit application generation, and status tracking.
- Automated email submission via Resend API.

**Digital Estimate & Work Order Forms**:
- Digitized forms reflecting company's paper documents, including digital signatures, pricebook integration, and PDF printing.

**Payroll System**:
- Manages pay periods, time entry, configurable pay rates (hourly, per-job, commission), and Illinois tax calculations.
- Admin-only on-demand processing via AI Copilot.

**Customer Management**:
- Centralized customer profiles with detailed views (Jobs, Quotes, Leads, Calls, Messages, Media, Audit, Addresses).
- Features customer deduplication and payment management.

**Calendar & Scheduling**:
- Full calendar view with technician color coding, drag-and-drop scheduling, and availability checks.
- AI can schedule jobs from call recordings.

**Technician Management**:
- Persistent color coding for technicians, appearing on calendar and job tracking.
- Technician map view for field tracking.

**Lead Velocity System**:
- Real-time lead management with Socket.io notifications, "Claim & Conquer" workflow, urgency timers (Green, Yellow, Red, Flashing Red).
- War Room Dashboard for live lead feed.
- Deduplicating webhook intake endpoint.

### Technical Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, Vite, TanStack Query, Wouter, React Hook Form + Zod.
- **Backend**: Node.js, Express.js, TypeScript.
- **Database**: PostgreSQL (Neon-backed) with Drizzle ORM and `pg` client.
- **File Storage**: Replit Object Storage (GCS-backed).

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle ORM**: Type-safe ORM.

### File Storage
- **Replit Object Storage**: For job media and documents.

### PDF & Documents
- **pdf-lib**: For PDF generation and form filling.

### AI & Machine Learning
- **OpenAI**: GPT models for AI Copilot, call analysis, follow-up generation, permit detection, and Whisper for audio transcription.

### Communication Services
- **Twilio**: SMS integration.
- **SignalWire**: Communication integration.
- **Resend API**: Transactional email sending.

### Lead Sources
- **Thumbtack**: Webhook integration for lead capture.

### Other Integrations
- **Builder 1 API**: For SEO content generation.