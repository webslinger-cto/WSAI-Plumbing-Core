# Chicago Sewer Experts CRM

## Overview

Chicago Sewer Experts CRM is a lead management and customer relationship management system designed for a sewer and plumbing services business. The application provides two primary user roles: administrators who manage leads, technicians, and analytics, and field technicians who access job information and create customer quotes. The system emphasizes efficient lead tracking from multiple sources (eLocal, Networx, direct calls), quote generation, and revenue analytics with a focus on conversion metrics and cost analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**Routing**: Client-side routing implemented with Wouter, a lightweight React router alternative. The application has two distinct routing contexts:
- Admin routes: Dashboard, leads management, technicians, analytics, import functionality, and outreach campaigns
- Technician routes: Personal dashboard, quote builder, job listings, and earnings tracking

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration. Local component state managed with React hooks. No global state management library implemented.

**UI Component System**: Radix UI primitives wrapped in custom components following the shadcn/ui pattern. All components built with the "new-york" style variant, featuring extensive use of composition patterns through Radix Slot components.

**Styling Approach**: 
- Tailwind CSS with extensive custom configuration
- Dark-first design system with custom CSS variables for theming
- Design tokens defined in `index.css` for both light and dark modes
- Custom elevation system using CSS classes (`hover-elevate`, `active-elevate-2`)
- Specific design guidelines documented in `design_guidelines.md` prescribing a Chicago Sewer Experts branded dark theme with radial gradients and a primary red accent color (#b22222)

**Component Architecture Pattern**: Compound component pattern extensively used (Sidebar, Dialog, Card, Form components). Components are highly composable with separate sub-components for headers, content, footers, triggers, etc.

### Backend Architecture

**Framework**: Express.js running on Node.js with TypeScript.

**Server Structure**: 
- Minimal routing structure in `server/routes.ts` - currently a placeholder with no implemented routes
- Static file serving for production builds via `server/static.ts`
- Development server integration with Vite HMR through `server/vite.ts`
- Custom logging middleware tracking request duration and JSON responses

**Storage Layer**: Abstract storage interface (`IStorage`) defined in `server/storage.ts` with a memory-based implementation (`MemStorage`). Currently implements basic user CRUD operations (getUser, getUserByUsername, createUser). The interface is designed to be swapped with a database-backed implementation.

**Authentication**: No authentication system currently implemented. Login page exists as a UI mockup with hardcoded credentials (password: "demo123").

**Data Validation**: Zod schemas integrated with Drizzle ORM for runtime type validation using `drizzle-zod`.

### Database Architecture

**ORM**: Drizzle ORM configured for PostgreSQL dialect.

**Schema Definition**: Located in `shared/schema.ts`. Currently defines a single `users` table with:
- UUID primary key (auto-generated)
- Username (unique, not null)
- Password (not null)

**Migration Strategy**: Drizzle Kit configured with migrations output to `./migrations` directory. Schema changes managed through `npm run db:push` script.

**Connection Management**: PostgreSQL connection pool managed through `pg` library, instantiated in `server/db.ts`.

**Design Rationale**: The minimal schema suggests the application is in early development. The actual application would require tables for leads, technicians, quotes, services, activities, and outreach campaigns based on the UI components.

### Build System

**Production Build**: Custom build script (`script/build.ts`) that:
1. Removes existing dist folder
2. Builds client with Vite
3. Builds server with esbuild, bundling specific dependencies (allowlist includes Drizzle, Express, authentication libraries, etc.) while externalizing others to reduce syscall overhead and improve cold start performance

**Development Environment**: Dual-server setup with Express backend and Vite dev server with HMR. Vite configured with Replit-specific plugins (runtime error modal, cartographer, dev banner) when `REPL_ID` environment variable is detected.

**Module System**: ES Modules throughout (type: "module" in package.json). Both client and server use ESM imports.

## External Dependencies

### UI Component Library
- **Radix UI**: Complete suite of unstyled, accessible component primitives (accordion, dialog, dropdown, popover, select, tabs, toast, tooltip, etc.)
- **shadcn/ui**: Component architecture pattern with configuration in `components.json`
- **Lucide React**: Icon library for UI icons

### Data Visualization
- **Recharts**: Charting library used for analytics dashboards (bar charts, pie charts, area charts, line charts)

### Database & ORM
- **PostgreSQL**: Primary database (connection required via DATABASE_URL environment variable)
- **Drizzle ORM**: Type-safe ORM with PostgreSQL dialect
- **pg (node-postgres)**: PostgreSQL client for connection pooling

### Form Management
- **React Hook Form**: Form state management
- **@hookform/resolvers**: Integrates Zod validation with React Hook Form

### Styling & CSS
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **class-variance-authority**: Type-safe variant management for component APIs
- **tailwind-merge + clsx**: Utility for merging Tailwind classes

### Routing
- **Wouter**: Lightweight client-side routing (alternative to React Router)

### Session Management
- **express-session**: Session middleware for Express
- **connect-pg-simple**: PostgreSQL session store (dependency present but not configured)

### Development Tools
- **Vite**: Build tool and dev server with React plugin
- **TypeScript**: Type system for both client and server
- **tsx**: TypeScript execution for development server
- **esbuild**: Server bundler for production builds

### Validation
- **Zod**: Runtime type validation and schema definition
- **drizzle-zod**: Integration between Drizzle schemas and Zod validation

### Date Handling
- **date-fns**: Date utility library for formatting and manipulation

### Utilities
- **nanoid**: Unique ID generation
- **embla-carousel-react**: Carousel/slider component implementation

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay

- **@replit/vite-plugin-cartographer**: Replit integration
- **@replit/vite-plugin-dev-banner**: Development environment banner

## Pending Integrations

### Twilio SMS Integration (Not Configured)
The Twilio integration for SMS notifications has not been set up. To enable SMS appointment reminders:
1. The user needs to provide Twilio credentials (Account SID, Auth Token, and Phone Number)
2. These should be stored as secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
3. Once credentials are available, implement the SMS sending logic in server/routes.ts using the twilio npm package