# Emergency Chicago Sewer Experts CRM

## Overview
Emergency Chicago Sewer Experts CRM is a lead management and customer relationship management system tailored for a sewer and plumbing services business. It facilitates efficient lead tracking from diverse sources, quote generation, and comprehensive commission tracking. The system supports four distinct user roles—administrators, dispatchers, field technicians, and salespersons—each with specialized functionalities to manage leads, coordinate jobs, perform on-site work, and handle sales. The primary goal is to optimize lead conversion, track revenue, and analyze costs.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, using Vite.
- **Routing**: Client-side routing with Wouter, supporting dedicated routes for Admin, Dispatcher, Technician, and Salesperson roles.
- **State Management**: TanStack Query for server state, React hooks for local component state.
- **UI Component System**: Radix UI primitives wrapped in custom components following the shadcn/ui pattern, with a "new-york" style variant.
- **Styling**: Tailwind CSS with custom configuration, a dark-first design system using CSS variables, and a custom elevation system. Design guidelines emphasize an Emergency Chicago Sewer Experts branded dark theme with blue primary and red emergency accents.
- **Component Architecture**: Extensive use of compound component patterns for highly composable UI elements.

### Backend
- **Framework**: Express.js on Node.js with TypeScript.
- **Server Structure**: Minimal routing, static file serving, Vite HMR integration, and custom logging middleware.
- **Storage Layer**: Abstract `IStorage` interface with a PostgreSQL-backed `DbStorage` implementation for full CRUD operations across all core entities (users, leads, jobs, quotes, etc.).
- **Authentication**: Session-based authentication via Passport.js.
- **Automation Service**: Handles automated lead contact, job creation, technician assignment, job cost updates, appointment reminders, and job lifecycle management (completion/cancellation).
- **Email Service**: Integrates with Resend API for transactional emails.
- **Data Validation**: Zod schemas integrated with Drizzle ORM for runtime type validation.

### Database
- **ORM**: Drizzle ORM configured for PostgreSQL.
- **Schema Definition**: Defines tables for users, leads, technicians, salespersons, jobs, quotes, contact attempts, webhooks, and various operational and financial tracking entities including commission tracking, marketing ROI, payroll, and SEO content management (content_packs, content_items).
- **Migration Strategy**: Drizzle Kit manages schema changes and migrations.
- **Connection Management**: PostgreSQL connection pooling via the `pg` library.

### Build System
- **Production Build**: Custom script for client (Vite) and server (esbuild) bundling, optimizing for performance and reduced cold start times.
- **Development Environment**: Dual-server setup with Express and Vite dev server, including Replit-specific plugins for enhanced development experience.
- **Module System**: ES Modules used throughout the application.

## External Dependencies

### UI/Design
- **Radix UI**: Unstyled, accessible component primitives.
- **shadcn/ui**: Component architecture pattern.
- **Lucide React**: Icon library.
- **Tailwind CSS**: Utility-first CSS framework.

### Data Visualization
- **Recharts**: Charting library for analytics dashboards.

### Database
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe ORM.
- **pg (node-postgres)**: PostgreSQL client.

### Form Management & Validation
- **React Hook Form**: Form state management.
- **@hookform/resolvers**: Zod integration for React Hook Form.
- **Zod**: Runtime type validation.
- **drizzle-zod**: Integration between Drizzle and Zod.

### Routing
- **Wouter**: Lightweight client-side router.

### Session Management
- **express-session**: Session middleware for Express.
- **connect-pg-simple**: PostgreSQL session store (present, but not fully configured).

### Development & Utilities
- **Vite**: Build tool and dev server.
- **TypeScript**: Language for type-safety.
- **tsx**: TypeScript execution for development.
- **esbuild**: Server bundler.
- **date-fns**: Date utility library.
- **nanoid**: Unique ID generation.
- **embla-carousel-react**: Carousel component.

### Replit Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay.
- **@replit/vite-plugin-cartographer**: Replit integration.
- **@replit/vite-plugin-dev-banner**: Development environment banner.

## 3-App Integration System

This CRM is part of a 3-app system for SEO content generation:

1. **Emergency Chicago Sewer Experts CRM** (this app)
   - Manages leads, jobs, technicians, and quotes
   - Pushes job data to Builder 1 when jobs are created or completed
   - Receives SEO content from Builder 1 for review/approval

2. **Replit Builder 1** (webslingeraiglassseo.com)
   - Receives job data from this CRM via webhook
   - Generates SEO content based on completed jobs
   - Pushes content back to this CRM and to the frontend site

3. **EmergencyChicagoSewerExperts.replit.app**
   - Public-facing website
   - Receives approved SEO content for publication

### Builder 1 Integration Details
- **Endpoint**: `https://replit-builder-1--jcotham.replit.app/api/v1/inbound/job`
- **Authentication**: API key in `X-API-KEY` header (stored as `BUILDER1_API_KEY` secret)
- **Events Pushed**:
  - `job_created`: When a new job is created (from leads, direct API, or Zapier)
  - `job_completed`: When a job is marked complete (triggers SEO content generation)
- **Payload**: Job details + lead information (customer name, address, service type, etc.)

### SEO Content Inbound (from Builder 1)
- **Endpoint**: `/api/webhooks/seo/content` 
- **Authentication**: Basic auth with `THUMBTACK_WEBHOOK_USER` and `THUMBTACK_WEBHOOK_PASS`
- **Content**: SEO articles, blog posts generated from job data
- **Workflow**: Content arrives → admin reviews → approve/reject → if approved, pushed to frontend site