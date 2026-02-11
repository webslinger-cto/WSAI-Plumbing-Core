# Emergency Chicago Sewer Experts CRM

## Overview
The Emergency Chicago Sewer Experts CRM is a comprehensive field service management and customer relationship management system. It supports the full business lifecycle from lead capture to job completion, including quote generation, technician dispatch, payroll processing, and commission tracking. The system serves four distinct user roles (admin, dispatcher, technician, salesperson) and a super admin, each with tailored interfaces and functionalities. Its core purpose is to streamline operations for a sewer and plumbing services business, enhancing efficiency and customer engagement. The project aims to consolidate business processes, automate workflows, and provide robust management tools for a field service company.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Business Workflow
The CRM follows a "Lead-to-Quote-to-Job" workflow, integrating lead capture (manual, webhooks, API), qualification, quote generation with templates, customer acceptance, job dispatch, and lifecycle management (pending to completed). It includes automated customer notifications and TCPA-compliant communication tracking. A Master Customer Data List centralizes customer information for targeted outreach and metrics.

### Chat System
A thread-based chat system facilitates internal team coordination and customer communication. Chats are initiated with lead creation and persist through the workflow. It supports distinct internal and customer-facing visibility, with staff accessing chats via dedicated pages and customers using magic links. A public website chat at `/chat` allows for direct lead capture.

### Audit Logging
The system incorporates a comprehensive audit trail that tracks all user-driven data changes. It records field-level differences (old/new values), user attribution, IP address, and user-agent for changes made to jobs, leads, quotes, and customers. This is accessible via the RecordDetailPanel and a dedicated API.

### Permit Center Module
This module automates the detection of required permits based on job details, location, and service type, using jurisdiction-specific rules. It generates pre-filled PDF application packets, manages multiple jurisdictions, and tracks permit status.
Permit Center Automation extends this with:
- **Storage**: PDF handling via S3/MinIO for secure, scalable storage.
- **Queue & Workers**: Background processing for PDF generation, email submission, and form checking using BullMQ/Redis.
- **PDF Form Fill**: Utilizes `pdf-lib` for AcroForm field filling and text overlay.
- **Filing Methods**: Supports assisted manual submission and automated email submission via Resend API.
- **Webhooks**: Configurable webhooks for automation triggers with HMAC-SHA256 signature verification.

### Customer Management Module
Provides full lifecycle management for customers, including detailed profiles, multiple addresses, payment profiles, and relationship tracking. It consolidates data into a master list with tags and status classifications.

### Payroll System
A complete payroll processing system that manages pay periods, time entries (with break/overtime calculations), configurable pay rates, and generates payroll records including tax calculations for Illinois.

### User Roles & Dashboards
The system supports distinct dashboards for:
- **Admin (God Mode)**: Full system access including lead, job, quote, customer, permit, technician, payroll, and settings management.
- **Dispatcher**: Operations-focused dashboard with dispatch board, calendar, call team management, and access to jobs, quotes, customers, and permits.
- **Technician**: Field-focused mobile dashboard for assigned jobs, on-site quoting, chat, and earnings tracking.
- **Salesperson**: Sales-focused dashboard with pipeline management, quote creation, lead/job/quote management, and commission tracking.

### Digital Work Order Form
A digital version of the paper work order form used by Emergency Chicago Sewer Experts. Technicians fill this out on-site via the job detail dialog's "Work Order" tab. Features include:
- Pre-filled customer information from the job record
- Authorization and Right to Cancel acknowledgment with checkboxes
- Work description with warranty period selection
- Pricing section with auto-calculated totals (price - discounts = total, total - deposit = balance)
- Payment method selection with credit card authorization support
- Three digital signature capture areas (customer authorization, cardholder, completion)
- Draft/Submit/Complete workflow states
- Stored in `work_orders` table, linked to jobs and technicians

### Key Components
- **RecordDetailPanel**: A unified tabbed dialog for viewing and editing records (jobs, quotes, customers), including details, linked quotes, customer info, timeline, chat, permits, and audit trail.
- **Dispatcher Calendar**: An Outlook-style drag-and-drop scheduling calendar for job assignment and visualization.
- **Quote Builder**: An interactive tool for creating quotes with line items, pricebook integration, templates, and secure customer acceptance links.
- **WorkOrderForm**: Digital on-site service form with signature capture, mirroring the paper Chicago Sewer Experts work order.
- **SignatureCanvas**: Touch and mouse-friendly canvas component for capturing digital signatures.

### Frontend
Built with React and TypeScript, using Vite, Wouter for routing, TanStack Query for server state, and Radix UI/shadcn/ui with Tailwind CSS for styling. It features a dark-first design with a blue primary and red accent theme.

### Backend
An Express.js application with Node.js and TypeScript. It uses a minimal routing setup, an abstract `IStorage` interface (implemented by `DbStorage` for PostgreSQL), session-based authentication via Passport.js, and an automation service for core workflows. Integrates with Resend API for emails and uses Zod for data validation with Drizzle ORM.

### Database
PostgreSQL with Drizzle ORM defines a schema across 55+ tables for core entities (users, leads, jobs), financial data, communication, operations, permits, customers, marketing, and system settings. Drizzle Kit manages schema migrations.

### Build System
Custom build scripts for production bundling (Vite for client, esbuild for server) and a dual-server development setup with Express and Vite.

## External Dependencies

### UI/Design
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Component architecture.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.

### Data Visualization
- **Recharts**: Charting library.

### Database
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe ORM.
- **pg (node-postgres)**: PostgreSQL client.

### Form Management & Validation
- **React Hook Form**: Form state management.
- **@hookform/resolvers**: Zod integration for React Hook Form.
- **Zod**: Runtime type validation.
- **drizzle-zod**: Drizzle and Zod integration.

### Routing
- **Wouter**: Lightweight client-side router.

### Session Management
- **express-session**: Session middleware.
- **Passport.js**: Authentication framework.

### PDF & Documents
- **pdf-lib**: PDF generation and form filling.

### Development & Utilities
- **Vite**: Build tool and dev server.
- **TypeScript**: Language for type-safety.
- **tsx**: TypeScript execution.
- **esbuild**: Server bundler.
- **date-fns**: Date utility library.
- **nanoid**: Unique ID generation.
- **embla-carousel-react**: Carousel component.

### Third-Party Services/APIs
- **Twilio**: SMS integration (via `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).
- **SignalWire**: Communication integration (via `SIGNALWIRE_PROJECT_ID`, `SIGNALWIRE_API_TOKEN`, `SIGNALWIRE_PHONE_NUMBER`, `SIGNALWIRE_SPACE_URL`).
- **Thumbtack**: Webhook integration for lead capture (via `THUMBTACK_WEBHOOK_USER`, `THUMBTACK_WEBHOOK_PASS`).
- **Resend API**: For transactional email sending.
- **S3-compatible storage (AWS S3, MinIO)**: For object storage of PDFs.
- **Builder 1 API**: For SEO content generation (via `BUILDER1_API_KEY`).

### Replit Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay.
- **@replit/vite-plugin-cartographer**: Replit integration.
- **@replit/vite-plugin-dev-banner**: Development environment banner.