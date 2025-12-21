# Chicago Sewer Experts CRM

A comprehensive Customer Relationship Management (CRM) and Field Service Management system designed for Chicago Sewer Experts, a sewer and plumbing services business.

## Overview

This application provides complete lead-to-job lifecycle management with role-based access control, automated workflows, and real-time field operations tracking.

## Features

### Lead Management
- **Multi-Source Lead Intake**: Receive leads from eLocal, Networx, Angi, Thumbtack, Inquirly, Zapier, and direct sources
- **Webhook Integration**: Automated lead capture via REST API webhooks
- **Lead Scoring**: Automatic scoring based on service type, urgency, and source quality
- **Duplicate Detection**: Intelligent duplicate lead identification
- **SLA Tracking**: Response time monitoring with breach alerts

### Job Management
- **Full Job Lifecycle**: Track jobs from creation through completion
- **Status Workflow**: Pending → Assigned → Confirmed → En Route → On Site → In Progress → Completed
- **Cost Tracking**: Labor hours, materials, travel, equipment, and other expenses
- **Revenue & Profit**: Automatic profit calculation per job
- **Cancellation Tracking**: Record cancellation reasons and associated costs

### Technician Management
- **Real-Time GPS Tracking**: Live location monitoring with map view
- **Automated Dispatch**: Assign closest available technician based on location
- **Availability Status**: Track technician status (available, busy, off duty, on break)
- **Skill-Based Assignment**: Match technicians to jobs based on approved service types
- **Commission & Hourly Rates**: Flexible pay structure tracking

### Quote Generation
- **Mobile Quote Builder**: Technicians can create quotes in the field
- **Line Item Management**: Add labor, materials, and services
- **Tax Calculation**: Automatic tax computation
- **Public Quote Links**: Shareable links for customer approval
- **Quote Status Tracking**: Draft → Sent → Viewed → Accepted/Declined

### Photo & Video Capture
- **Mobile Camera Integration**: Take photos/videos directly from mobile devices
- **GPS Tagging**: Automatic location recording for each capture
- **Category Organization**: Before, During, and After job documentation
- **Captioning**: Add descriptions to each attachment

### Automated Workflows
- **Auto-Contact**: Send acknowledgment emails when leads arrive
- **Job Creation**: Automatic job creation from qualified leads
- **Technician Assignment**: Auto-assign based on availability and proximity
- **Appointment Reminders**: Email reminders before scheduled appointments

### Analytics & Reporting
- **Revenue Dashboard**: Track income by source, technician, and time period
- **Lead Conversion Rates**: Monitor conversion from lead to completed job
- **Technician Performance**: Jobs completed, revenue generated, ratings
- **Cost Analysis**: Lead acquisition costs vs. revenue
- **Export Functionality**: Download reports as CSV

## User Roles

### Administrator
- Full system access
- Manage leads, jobs, technicians, and settings
- View analytics and reports
- Configure automation rules

### Dispatcher
- Manage incoming leads
- Create and assign jobs
- Monitor technician locations
- Handle customer communications

### Technician
- View assigned jobs
- Update job status
- Create quotes
- Capture photos/videos
- Track earnings

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | demo123 |
| Dispatcher | dispatcher | demo123 |
| Technician | mike | demo123 |
| Technician | carlos | demo123 |
| Technician | james | demo123 |

## API Endpoints

### Leads
- `GET /api/leads` - List all leads
- `POST /api/leads` - Create a lead
- `GET /api/leads/:id` - Get lead details
- `PATCH /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Jobs
- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create a job
- `GET /api/jobs/:id` - Get job details
- `PATCH /api/jobs/:id` - Update job
- `GET /api/jobs/:id/attachments` - Get job attachments
- `POST /api/jobs/:id/attachments` - Upload attachment

### Technicians
- `GET /api/technicians` - List all technicians
- `GET /api/technicians/available` - List available technicians
- `GET /api/technicians/:id` - Get technician details
- `POST /api/technicians/:id/location` - Update location
- `GET /api/technician-locations/:id/history` - Location history

### Dispatch
- `POST /api/dispatch/closest-technician` - Find and notify closest technician

### Quotes
- `GET /api/quotes` - List all quotes
- `POST /api/quotes` - Create a quote
- `GET /api/quotes/:id` - Get quote details
- `GET /api/quotes/public/:token` - Public quote view

### Webhooks
- `POST /api/webhooks/elocal` - eLocal lead intake
- `POST /api/webhooks/networx` - Networx lead intake
- `POST /api/webhooks/angi` - Angi lead intake
- `POST /api/webhooks/thumbtack` - Thumbtack lead intake
- `POST /api/webhooks/inquirly` - Inquirly lead intake
- `POST /api/webhooks/zapier` - Zapier integration

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite build system
- TanStack Query for data fetching
- Tailwind CSS for styling
- Radix UI / shadcn components
- Wouter for routing
- Recharts for analytics
- Leaflet for maps

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL database
- Drizzle ORM
- Passport.js authentication
- Resend for email delivery

## Service Types

- Sewer Main - Clear
- Sewer Main - Repair
- Sewer Main - Replace
- Drain Cleaning
- Water Heater - Repair/Replace
- Toilet Repair
- Faucet Repair
- Pipe Repair/Replacement
- Sump Pump
- Ejector Pump
- Camera Inspection
- Hydro Jetting

## Notifications

### Email Notifications (Active)
- Office notifications: New leads, jobs, and quotes
- Technician notifications: Job assignments and approvals

### SMS Notifications (Pending)
- Currently disabled pending A2P carrier verification
- Will include appointment reminders and status updates

## Environment Variables

Required secrets for full functionality:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `RESEND_API_KEY` - Email service (via Resend integration)

Optional for lead sources:
- `THUMBTACK_WEBHOOK_USER` / `THUMBTACK_WEBHOOK_PASS`
- `SIGNALWIRE_*` or `TWILIO_*` for SMS (when verified)

## Getting Started

1. The application runs on port 5000
2. Navigate to the login page
3. Use demo credentials to explore features
4. Admin dashboard provides full system overview
5. Technician view simulates mobile field experience

## Support

For questions about this CRM system, contact the development team.

---

*Chicago Sewer Experts CRM - Built for efficient field service management*
