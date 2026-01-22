# Emergency Chicago Sewer Experts CRM

## Overview
The Emergency Chicago Sewer Experts CRM is a specialized lead management and customer relationship management system for a sewer and plumbing services business. Its primary functions include lead tracking from diverse sources, efficient quote generation, and comprehensive commission tracking. The system supports administrators, dispatchers, field technicians, and salespersons with tailored functionalities to manage leads, coordinate jobs, execute on-site work, and handle sales. The overarching goal is to enhance lead conversion, accurately track revenue, and analyze costs.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Business Workflow
The CRM operates on a "Quote-to-Job" workflow where jobs are automatically created upon customer acceptance of a quote. This includes automated customer notifications for appointment confirmations, reminders, and rescheduling, with TCPA-compliant consent tracking for all communications. A Master Customer Data List aggregates data from various sources for targeted outreach, providing customer metrics, auto-generated tags, and status classifications. The system also features a toggle for enabling/disabling lead API and webhook integrations.

A thread-based chat system facilitates both internal team coordination and customer communication. Chat threads are automatically initiated with lead creation and persist through lead, quote, and job transitions. There are distinct visibility types for internal discussions and customer-facing interactions. Staff access chat through dedicated pages, while customers use magic links for authenticated access to customer-visible threads.

A public website chat feature at `/chat` enables lead capture directly from the website. Customers fill in their name, phone, and initial message to start a conversation without authentication. This automatically creates a lead with source='website_chat', a customer-visible chat thread, and a token-based session for continued conversation. Dispatchers see incoming public chats in their chat page and can respond in real-time.

### Frontend
The frontend is built with React and TypeScript, utilizing Vite for tooling and Wouter for client-side routing. State management is handled by TanStack Query for server state and React hooks for local component state. The UI components are constructed using Radix UI primitives, following the shadcn/ui pattern with a "new-york" style variant. Styling is managed with Tailwind CSS, implementing a dark-first design system with a blue primary and red emergency accent theme.

### Backend
The backend is an Express.js application built with Node.js and TypeScript. It features a minimal routing setup, static file serving, and custom logging middleware. The storage layer uses an abstract `IStorage` interface, implemented by `DbStorage` for PostgreSQL, supporting CRUD operations across all core entities. Authentication is session-based via Passport.js. An automation service manages lead contact, job creation, technician assignment, and job lifecycle. The system integrates with Resend API for emails and uses Zod for data validation with Drizzle ORM.

### Database
The system uses PostgreSQL with Drizzle ORM for schema definition and interaction. Tables are defined for users, leads, technicians, salespersons, jobs, quotes, contact attempts, webhooks, and various financial and operational tracking entities. Drizzle Kit handles schema migrations.

### Build System
A custom build script handles production bundling for both client (Vite) and server (esbuild). The development environment uses a dual-server setup with Express and Vite, including Replit-specific plugins. The application uses ES Modules throughout.

## External Dependencies

### UI/Design
-   **Radix UI**: Accessible component primitives.
-   **shadcn/ui**: Component architecture.
-   **Lucide React**: Icon library.
-   **Tailwind CSS**: Utility-first CSS framework.

### Data Visualization
-   **Recharts**: Charting library.

### Database
-   **PostgreSQL**: Primary database.
-   **Drizzle ORM**: Type-safe ORM.
-   **pg (node-postgres)**: PostgreSQL client.

### Form Management & Validation
-   **React Hook Form**: Form state management.
-   **@hookform/resolvers**: Zod integration for React Hook Form.
-   **Zod**: Runtime type validation.
-   **drizzle-zod**: Drizzle and Zod integration.

### Routing
-   **Wouter**: Lightweight client-side router.

### Session Management
-   **express-session**: Session middleware.

### Development & Utilities
-   **Vite**: Build tool and dev server.
-   **TypeScript**: Language for type-safety.
-   **tsx**: TypeScript execution.
-   **esbuild**: Server bundler.
-   **date-fns**: Date utility library.
-   **nanoid**: Unique ID generation.
-   **embla-carousel-react**: Carousel component.

### Replit Specific
-   **@replit/vite-plugin-runtime-error-modal**: Development error overlay.
-   **@replit/vite-plugin-cartographer**: Replit integration.
-   **@replit/vite-plugin-dev-banner**: Development environment banner.

### 3-App Integration System
The CRM is part of a 3-app system for SEO content generation:
-   **Replit Builder 1**: Receives job data from this CRM via webhook for SEO content generation, pushing content back to this CRM and the public-facing website.
-   **EmergencyChicagoSewerExperts.replit.app**: The public-facing website that receives approved SEO content for publication.
-   **Resend API**: For transactional emails.