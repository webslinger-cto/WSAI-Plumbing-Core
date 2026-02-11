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

### UI/UX Decisions
- **Frameworks**: Utilizes Radix UI for accessible primitives, shadcn/ui for components, Lucide React for icons, and Tailwind CSS for styling with a dark-first theme.
- **Design Approach**: Emphasizes clear, functional interfaces tailored to each user role.

### Feature Specifications
- **SEO Content Generation**: Integration with an external API (Builder 1) to generate SEO content using job data and uploaded media.
- **Master Customer Data List**: Central repository for customer information to facilitate targeted outreach and analytics.
- **Technician Color Coding**: Each technician has a persistent color (stored in `technicians.color` DB field, or auto-assigned from a deterministic palette). Colors appear on calendar events and job tracking tables. Utility: `client/src/lib/technicianColors.ts`. Calendar includes a color legend showing all technicians.
- **Enhanced Customer Profiles**: 8-tab profile view (Jobs, Quotes, Leads, Calls, Messages, Media, Audit, Addresses) with collapsible detail cards, outreach actions (SMS/Email), and data aggregated from calls, contact attempts, chat threads, job media, and audit logs.

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