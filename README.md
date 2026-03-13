# Emergency Chicago Sewer Experts CRM

A fully featured field service management and customer relationship management system built for sewer and plumbing service businesses. Covers the complete business lifecycle from first contact to job completion, payroll, and customer follow-up — with AI woven throughout.

---

## Table of Contents

- [Overview](#overview)
- [User Roles](#user-roles)
- [Core Workflow](#core-workflow)
- [Feature Reference](#feature-reference)
  - [Lead Management](#lead-management)
  - [Lead Assassin System](#lead-assassin-system)
  - [Lead Disposition Tracking](#lead-disposition-tracking)
  - [Customer Intake Form](#customer-intake-form)
  - [Quote Builder](#quote-builder)
  - [Job Management & Dispatch](#job-management--dispatch)
  - [Calendar & Scheduling](#calendar--scheduling)
  - [Field Service (Technician Mobile)](#field-service-technician-mobile)
  - [Customer Management](#customer-management)
  - [Chat & Messaging System](#chat--messaging-system)
  - [AI Copilot](#ai-copilot)
  - [Call Recording & AI Intake](#call-recording--ai-intake)
  - [AI Follow-Up Assistant](#ai-follow-up-assistant)
  - [Permit Center](#permit-center)
  - [Digital Estimates & Work Orders](#digital-estimates--work-orders)
  - [Payroll System](#payroll-system)
  - [Commission Tracking](#commission-tracking)
  - [Pricebook](#pricebook)
  - [Technician Map View](#technician-map-view)
  - [SEO Content Management](#seo-content-management)
  - [Marketing ROI](#marketing-roi)
  - [Photo & Video Documentation](#photo--video-documentation)
  - [User Management](#user-management)
  - [Settings & Configuration](#settings--configuration)
- [Integrations](#integrations)
- [Webhook Reference](#webhook-reference)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Demo Accounts](#demo-accounts)
- [API Reference](#api-reference)
- [Service Types](#service-types)

---

## Overview

The Emergency Chicago Sewer Experts CRM is purpose-built for a sewer and drain service company operating in the Chicago metro area. It handles everything from real-time lead capture to technician dispatch, on-site quoting, permit processing, automated customer notifications, and payroll — all from a single application.

Four user roles each get their own tailored dashboard and toolset. An AI Copilot with 30 tools assists admins and dispatchers. A real-time Lead Assassin board surfaces incoming leads the moment they arrive.

---

## User Roles

### Super Admin (God Mode)
- Unrestricted access to every feature in the system
- Can impersonate any other role for testing and support
- Username: `godmode` — server-side protected, cannot be deleted or demoted

### Admin
- Full system access: leads, jobs, quotes, customers, payroll, reports, settings
- User account management (create, edit, delete employees)
- Pricebook configuration and marketing ROI analysis
- AI Copilot with all write tools
- Developer mode for advanced diagnostics

### Dispatcher
- Operational hub: leads, job scheduling, technician coordination
- Call Recording with AI intake for creating leads from phone calls
- AI Copilot with full read access and write tools for scheduling and communication
- Customer intake form, quote management, real-time technician map

### Technician
- Mobile-first dashboard showing assigned jobs
- On-site quote builder and digital work order completion
- Clock in/out with GPS, media upload, job status updates
- Personal earnings and pay history tracker

### Salesperson
- Lead intake and qualification pipeline
- Quote creation and follow-up
- Commission dashboard with NET-profit-based calculations
- Sales analytics and conversion tracking

---

## Core Workflow

```
Lead Arrives
  └─► Lead Assassin Board (real-time alert + sound)
  └─► Leads Page (full list with filters)

Dispatcher Opens Intake Form
  └─► Pre-filled from lead data
  └─► Saves customer record

"What's Next?" Panel Appears
  ├─► Build Quote / Estimate → QuoteBuilder opens in-sheet
  ├─► Schedule a Job → Calendar picker
  └─► Mark Lead Outcome → Disposition tracking

Quote Sent to Customer
  └─► Customer receives email with shareable link
  └─► Customer signs digitally → Job created automatically

Job Dispatched
  └─► Technician assigned + notified via SMS
  └─► Chat threads created (internal + customer-visible)

Technician In the Field
  └─► Views job on mobile dashboard
  └─► Updates status: En Route → On Site → In Progress
  └─► Uploads photos/videos, completes checklist, captures signature

Job Completed
  └─► Automatic chat notification to customer
  └─► Costs recorded → commission calculated
  └─► Pay period updated

Follow-Up (if no conversion)
  └─► AI Follow-Up Assistant identifies stale leads/quotes
  └─► Generates personalized SMS or email
  └─► Sends with one click
```

---

## Feature Reference

### Lead Management

Leads flow in from multiple sources and are managed through a full pipeline:

- **Sources**: Thumbtack, Angi, eLocal, Networx, Inquirly, Zapier, website chat widget, manual entry, AI call recording intake
- **Unified ingest endpoint**: `POST /api/v1/lead-ingest` deduplicates across all sources and creates linked records in both the Leads table and the Lead Assassin board simultaneously
- **Statuses**: New → Contacted → Qualified → Estimate Scheduled → Scheduled → Converted / Lost
- **Contact attempt log**: Tracks every SMS, call, and email attempt with timestamps
- **Duplicate detection**: Flags potential duplicates on ingest by phone and address
- **SLA tracking**: Monitors response time against configurable thresholds
- **Lead scoring**: Based on service type, urgency, and source quality
- **Filters & search**: Filter by status, source, date range, assigned technician, and more
- **"Open Intake Form" button**: Starts the intake flow from any lead record

---

### Lead Assassin System

A real-time lead management board designed for speed — claim leads before competitors do.

- **Live feed**: New leads appear instantly via Socket.io without page refresh
- **Claim & Conquer workflow**: Dispatchers claim leads directly from the board
- **Urgency timers**: Color-coded countdowns — Green (fresh) → Yellow → Red → Flashing Red (critical)
- **Audible alert**: Ascending 3-tone chime plays for all admin and dispatcher users anywhere in the app when a new lead arrives
- **Toast notification**: Appears system-wide alongside the chime
- **Live count badge**: Shows the number of unclaimed leads on the Lead Assassin button across Admin Dashboard, Dispatcher Dashboard, and Leads page
- **"Intake" button**: Opens the full customer intake form pre-filled from the lead card
- **"View Lead" link**: Navigates to the full lead record in the Leads page
- **Dashboard URL**: `/lead-assassin`

---

### Lead Disposition Tracking

Tracks the outcome of every lead that doesn't convert to a job — critical for understanding lost revenue.

- **Trigger points**: "Mark Outcome" button on lead detail dialogs; "Mark Lead Outcome" in the intake form's "What's Next?" panel
- **10 loss reasons**: Pricing, Scheduling conflict, Permits required, Chose competitor, No response, Out of service area, Duplicate, Changed mind, Already completed work, Other
- **Disposition notes**: Free-text field for additional context
- **Timestamps**: Records exactly when and by whom the outcome was set
- **Disposition badge**: Color-coded badge shown on lead records (Converted = green, Lost = red with reason label)

---

### Customer Intake Form

The bridge between a lead and a job — a structured form that captures everything needed to proceed.

- **Auto-populated**: Pre-fills from lead data (name, phone, address, service type, urgency)
- **Access points**: Lead Assassin card "Intake" button; Leads page "Open Intake Form" button
- **Fields**: Customer name, phone, email, service address, property type, service type, urgency, description, preferred scheduling windows
- **Customer creation/matching**: Finds existing customer records or creates new ones
- **"What's Next?" panel**: After saving, presents three actions:
  - **Build Quote / Estimate**: Creates a pending job and opens QuoteBuilder inline
  - **Schedule a Job**: Opens the calendar to book directly
  - **Mark Lead Outcome**: Records why the lead didn't convert

---

### Quote Builder

Full-featured quoting tool usable by dispatchers, admins, and technicians in the field.

- **Line-item quoting**: Add services, parts, and labor from the pricebook or custom entries
- **Pricebook integration**: Pulls live pricing from the service catalog
- **Discount calculator**: Apply percentage or flat-rate discounts per line or to the total
- **Digital signatures**: Customer can sign on-screen (tablet/phone) or via the public quote link
- **PDF export**: Print or save any quote as a PDF
- **Public shareable link**: Send customers a unique URL to view and accept the quote
- **Quote statuses**: Draft → Sent → Viewed → Accepted / Declined
- **Conversion trigger**: Accepted quote automatically promotes to a confirmed job
- **Quote workflow**: Inline in the intake flow ("in-sheet") or standalone from the Quotes page

---

### Job Management & Dispatch

Complete job lifecycle from creation to completion.

- **Full status pipeline**: Pending → Assigned → Confirmed → En Route → On Site → In Progress → Completed / Cancelled
- **Technician assignment**: Select from available technicians; color-coded by technician
- **Automatic SMS notification**: Technician receives assignment details via SMS when assigned
- **Customer notifications**: Automated messages at key status transitions (assigned, en route, completed)
- **Job cost tracking**: Records labor, materials, travel, and equipment costs per job
- **Revenue and profit calculation**: Net profit computed per job for commission purposes
- **Cancellation tracking**: Cancellation reason codes recorded for reporting
- **Job detail view**: Full history, attachments, messages, costs, and audit trail
- **Chat threads**: Auto-created internal and customer-visible threads per job

---

### Calendar & Scheduling

Visual scheduling with drag-and-drop rescheduling.

- **Full calendar view**: Month, week, and day views with job cards color-coded by technician
- **Drag-and-drop**: Reschedule jobs by dragging them to a new time slot
- **Technician availability check**: Warns on double-booking
- **Appointment creation**: Book directly from the calendar
- **AI scheduling**: AI Copilot can schedule jobs from call recording analysis
- **Technician color coding**: Each technician's color persists across calendar, job cards, and map

---

### Field Service (Technician Mobile)

A mobile-first experience for technicians in the field.

- **Job queue**: All assigned jobs in one view with status, address, and contact info
- **GPS clock in/out**: Verifies location at start and end of shift
- **Status updates**: One-tap status changes from the job detail screen
- **On-site quoting**: Full QuoteBuilder accessible from any job
- **Digital work order**: Captures service details, materials used, and labor time
- **Customer signature**: Collect signature on-site on any mobile device
- **Photo/video capture**: Before, during, and after documentation
- **Earnings tracker**: Personal pay history, job earnings, and commission breakdown at `/earnings`

---

### Customer Management

Centralized profiles with a complete view of every customer interaction.

- **Unified profile**: All jobs, quotes, leads, calls, messages, media, and audit history in one place
- **Tab views**: Jobs, Quotes, Leads, Calls, Messages, Media, Audit, Addresses
- **Customer deduplication**: Merges duplicate records matched by phone or address
- **Payment management**: Records payments and outstanding balances
- **Address management**: Multiple service addresses per customer
- **Search**: Find customers by name, phone, email, or address
- **Magic link access**: Customers get a unique URL for viewing their own job status and messages

---

### Chat & Messaging System

Thread-based communication keeping everyone on the same page.

- **Thread types**: Internal (staff only) and customer-visible threads per job and lead
- **Participant management**: Admins, dispatchers, assigned technician, and customer added automatically
- **Customer magic link**: Customers access their thread via a secure unique URL — no account needed
- **Automatic job notifications**: System posts to chat when job status changes (assigned, en route, on site, completed)
- **30-second deduplication**: Prevents duplicate automated messages
- **AI can read and send messages**: Copilot can look up thread history and compose messages on behalf of staff

---

### AI Copilot

A plan-then-execute AI assistant for admins and dispatchers.

**How it works:**
1. User sends a message (text or voice)
2. AI reads relevant data automatically using read tools
3. AI proposes any write actions for human review
4. User approves or rejects each proposed action
5. Approved actions execute and are logged to the audit timeline

**30 available tools:**

| Category | Tools |
|----------|-------|
| Leads | `search_leads`, `get_lead`, `create_lead`, `update_lead_status` |
| Jobs | `list_jobs`, `get_job`, `update_job_status`, `schedule_job` |
| Quotes | `list_quotes`, `get_quote` |
| Technicians | `list_technicians`, `check_technician_availability` |
| Calendar | `get_calendar_schedule`, `get_todays_schedule` |
| Customers | `get_customer_profile` |
| Chat | `get_chat_threads`, `get_thread_messages`, `send_chat_message` |
| Communication | `send_sms`, `send_email` |
| Payroll | `process_payroll` (admin only) |
| Follow-up | `get_followup_items`, `send_followup` |
| Permits | `detect_permit_requirements` |

**Voice input**: Hold the microphone button to speak — audio is transcribed via OpenAI Whisper and sent as a text query. Supports Chrome (WebM), Firefox (WebM), and Safari/iOS (MP4).

---

### Call Recording & AI Intake

Dispatchers record calls directly in the browser and AI extracts customer details automatically.

**Full flow:**
1. Dispatcher clicks "Start Recording" — microphone activates
2. Call proceeds as normal (dispatcher talks to customer)
3. Dispatcher clicks "Stop" — audio is transcribed via OpenAI Whisper
4. AI analyzes the transcript and extracts: name, phone, email, address, service type, urgency, and problem description
5. Dispatcher reviews and edits the extracted data
6. One click creates a lead (or opens the full intake form)

**Browser support**: Chrome, Firefox, Edge (WebM/Opus), Safari and iOS (MP4/AAC — full compatibility as of latest update)

**Recording history**: All past recordings stored with transcript, status, and linked lead

**API endpoints:**
- `POST /api/call-recordings` — Create recording record
- `POST /api/call-recordings/transcribe` — Transcribe audio (base64 → text via Whisper)
- `POST /api/call-recordings/analyze` — AI extraction of customer details from transcript
- `POST /api/call-recordings/create-lead` — Create lead from analyzed data

---

### AI Follow-Up Assistant

Automatically identifies stale leads and open quotes that need follow-up and drafts personalized outreach.

- **Urgency categorization**: Critical (7+ days old), High (3-7 days), Medium (1-3 days), Low (< 1 day)
- **Scope**: Open quotes not yet accepted; leads not converted after contact
- **AI-generated messages**: Personalized based on service type, customer name, and lead age
- **One-click send**: Send via SMS or email directly from the follow-up dashboard
- **Batch actions**: Select multiple leads/quotes for bulk follow-up
- **Metrics dashboard**: Conversion rate, total pipeline value, average age of open items
- **Dashboard URL**: `/follow-up`

---

### Permit Center

AI-powered permit detection and application workflow.

- **AI detection**: Analyzes job details to determine if a permit is required under Chicago municipal codes
- **Pre-filled applications**: Generates permit application PDFs using job and customer data
- **Status tracking**: Pending → Submitted → Approved / Rejected
- **Email submission**: Sends permit application via Resend directly to the permitting authority
- **Packet storage**: All permit documents stored per job
- **Dashboard URL**: `/permit-center`

---

### Digital Estimates & Work Orders

Digitized versions of the company's paper forms.

- **Digital estimate form**: Reflects the company's standard estimate document with all line items
- **Digital work order**: Captures services performed, materials used, labor time, and notes
- **Digital signatures**: Captured in-browser or on-device touchscreen
- **Pricebook integration**: Pull service prices directly into forms
- **PDF print**: Print any form to PDF with one click
- **Storage**: Saved per job and accessible from the job detail view

---

### Payroll System

Full payroll management with Illinois tax calculations.

- **Time entry**: Clock in/out with GPS verification; manual entry for adjustments
- **Pay period management**: Weekly, bi-weekly, or monthly periods; admin opens and closes periods
- **Configurable pay rates**: Hourly, per-job flat rate, commission percentage — set per employee
- **Illinois tax calculation**: State and federal withholding computed automatically
- **Overtime**: Calculated at 1.5x after 40 hours/week
- **Pay stubs**: Detailed breakdown per pay period — downloadable and printable
- **Lead fee deductions**: $125/job lead fee automatically deducted from technician pay
- **AI processing**: Admin can trigger payroll processing via AI Copilot (`process_payroll` tool)
- **Admin Pay Tracker**: Full overview of all technician earnings, projected pay, and payroll history at `/pay-tracker`
- **Technician Earnings page**: Personal earnings history, job-by-job breakdown, and time-range charts at `/earnings`

---

### Commission Tracking

NET-profit-based commissions for technicians and salespersons.

- **Commission basis**: Calculated on NET profit after materials, lead fees, and overhead
- **Lead fee deduction**: $125/job deducted from technician earnings before commission
- **Salesperson splits**: Configurable split between salesperson and technician
- **Commission statuses**: Pending → Approved → Paid
- **Monthly reporting**: Commission summaries by employee and time period
- **Salesperson dashboard**: Commission pipeline with full quote and deal tracking

---

### Pricebook

Centralized service catalog for consistent pricing across all quotes and estimates.

- **Service categories**: All standard sewer and plumbing service types
- **Unit pricing**: Per-unit, flat rate, and hourly pricing supported
- **Labor estimates**: Estimated hours per service type for dispatch planning
- **Pricebook integration**: Directly searchable from QuoteBuilder and digital estimate forms
- **Admin management**: Add, edit, and archive service items from the admin panel

---

### Technician Map View

Live field tracking for dispatchers.

- **Real-time map**: Shows current location of all active technicians using Leaflet/OpenStreetMap
- **Color-coded pins**: Each technician uses their assigned color on the map
- **Location history**: View historical GPS path per technician per day
- **Job site pins**: Active job locations shown alongside technician positions
- **GPS verification**: Location captured at clock in, clock out, and key job status updates

---

### SEO Content Management

Webhook-based content ingestion and review workflow for SEO-generated content.

- **Webhook intake**: External SEO provider POSTs content packs via `POST /api/webhooks/seo-content`
- **HMAC security**: SHA-256 signature and timestamp validation prevent replay attacks
- **Review queue**: Content appears in a Pending tab for admin review
- **Auto-approval option**: Toggle in settings to auto-approve incoming content
- **Status tabs**: Pending / Approved / Rejected / Published
- **Content packs**: Each pack contains multiple content items (blog posts, service pages, etc.)
- **Provider**: webslingeraiglassseo.com via Builder 1 API

---

### Marketing ROI

Track the return on every dollar spent acquiring leads.

- **Spend tracking**: Log marketing spend by source and campaign
- **Lead attribution**: Links every lead to its originating source
- **Cost per lead**: Calculated by source for budget optimization
- **Revenue attribution**: Traces converted leads through to final job revenue
- **Source comparison**: Side-by-side analytics across Thumbtack, Angi, eLocal, and others
- **Campaign metrics**: Open rate, conversion rate, cost per conversion

---

### Photo & Video Documentation

Media capture and management for job documentation.

- **Mobile camera integration**: Native camera access on any mobile device
- **GPS tagging**: Location embedded at capture time
- **Categorization**: Before / During / After labels per image or video
- **Captions**: Add descriptions to each media item
- **Cloud storage**: All media stored in Replit Object Storage (GCS-backed)
- **Job media gallery**: View all media for a job from the job detail screen
- **Customer profile media tab**: All media across all of a customer's jobs in one place

---

### User Management

Admin-controlled employee account management.

- **Create users**: Set username, password, role, and linked technician/salesperson profile
- **Edit users**: Update credentials and role assignments
- **Delete users**: Safe deletion that nullifies all foreign key references first (time entries, payroll records, job messages, permits, content, commissions)
- **Password reset**: Admin can reset any user's password; users can set their own on first login
- **Role assignment**: Admin, Dispatcher, Technician, Salesperson
- **Session persistence**: Login sessions persist in browser localStorage — no logout on page refresh

---

### Settings & Configuration

System-wide configuration managed by admins.

- **Company profile**: Business name, phone, address, service area
- **Notification settings**: Configure which events trigger SMS/email and to whom
- **SMS templates**: Customize message templates for each notification type
- **Automation rules**: Configure auto-assignment, auto-approval, and other automation triggers
- **Pay rate configuration**: Set default hourly rates and commission percentages per role
- **Pricebook management**: Add and manage service catalog items
- **Developer mode**: Toggle advanced diagnostic views (admin only)

---

## Integrations

### AI & Machine Learning
| Service | Usage |
|---------|-------|
| OpenAI GPT-4o-mini | AI Copilot reasoning, call analysis, follow-up generation, permit detection |
| OpenAI Whisper (gpt-4o-mini-transcribe) | Audio transcription for call recordings and Copilot voice input |

### Communication
| Service | Usage |
|---------|-------|
| SignalWire | Primary SMS — appointment reminders, job notifications, follow-up messages |
| Twilio | Backup SMS (pending A2P 10DLC verification) |
| Resend | Transactional email — quotes, confirmations, permit submissions |

### Lead Sources
| Source | Webhook Endpoint | Auth Method |
|--------|-----------------|-------------|
| Thumbtack | `POST /api/webhooks/thumbtack` | Basic Auth |
| Angi | `POST /api/webhooks/angi` | Header `x-angi-key` |
| eLocal | `POST /api/webhooks/elocal` | None |
| Networx | `POST /api/webhooks/networx` | None |
| Inquirly | `POST /api/webhooks/inquirly` | None |
| Zapier | `POST /api/webhooks/zapier/lead` | None |
| Unified Ingest | `POST /api/v1/lead-ingest` | Basic Auth |

### Storage & Infrastructure
| Service | Usage |
|---------|-------|
| Replit Object Storage (GCS) | Job photos, videos, and documents |
| PostgreSQL (Neon) | Primary database |
| Socket.io | Real-time lead alerts and notifications |

### External Platforms
| Service | Usage |
|---------|-------|
| Builder 1 API | SEO content delivery |
| Leaflet / OpenStreetMap | Interactive maps for technician tracking |
| pdf-lib | PDF generation for quotes, permits, and work orders |
| ffmpeg | Audio format conversion for cross-browser recording support |

---

## Webhook Reference

### Unified Lead Ingest
```
POST /api/v1/lead-ingest
Authorization: Basic <base64(user:pass)>
Content-Type: application/json
```
Creates records in both the Leads table and Lead Assassin board simultaneously. Deduplicates by phone number within 24 hours.

### Thumbtack
```
POST /api/webhooks/thumbtack
Authorization: Basic <THUMBTACK_WEBHOOK_USER>:<THUMBTACK_WEBHOOK_PASS>
```

### Angi
```
POST /api/webhooks/angi
x-angi-key: <ANGI_WEBHOOK_KEY>
```

### SEO Content
```
POST /api/webhooks/seo-content
X-Signature: <hmac-sha256>
X-Timestamp: <unix-timestamp>
```
Timestamp must be within 5 minutes of server time to prevent replay attacks.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type-safe development |
| Vite | Build tool and dev server |
| Tailwind CSS | Utility-first styling |
| shadcn/ui (Radix UI) | Component library |
| Wouter | Client-side routing |
| TanStack Query v5 | Server state management |
| React Hook Form + Zod | Form handling and validation |
| Recharts | Data visualization and earnings charts |
| Leaflet | Interactive maps |
| Socket.io Client | Real-time lead alerts |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20 | Runtime |
| Express.js | HTTP server |
| TypeScript | Type-safe development |
| Drizzle ORM | Type-safe database queries |
| drizzle-zod | Schema/validation integration |
| Socket.io | Real-time event broadcasting |
| pdf-lib | PDF generation |
| ffmpeg | Audio format conversion (WebM/MP4 → WAV for transcription) |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL 16 (Neon) | Primary data store |
| Drizzle ORM | ORM and migrations |

---

## Project Structure

```
├── client/                        # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/            # Reusable components
│   │   │   ├── ui/               # shadcn/ui primitives
│   │   │   ├── CallRecorder.tsx  # Call recording + AI intake
│   │   │   ├── CopilotPanel.tsx  # AI Copilot chat drawer
│   │   │   ├── CustomerIntakeForm.tsx  # Lead → intake → quote pipeline
│   │   │   ├── LeadDispositionDialog.tsx  # Lead outcome tracking
│   │   │   ├── LeadsTable.tsx    # Lead list with filters
│   │   │   └── ...
│   │   ├── pages/                 # Route-level pages
│   │   │   ├── admin-dashboard.tsx
│   │   │   ├── dispatcher-dashboard.tsx
│   │   │   ├── technician-dashboard.tsx
│   │   │   ├── salesperson-dashboard.tsx
│   │   │   ├── LeadsPage.tsx
│   │   │   ├── JobsPage.tsx
│   │   │   ├── CustomersPage.tsx
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── QuotesPage.tsx
│   │   │   ├── LeadAssassinPage.tsx
│   │   │   ├── PayTrackerPage.tsx
│   │   │   ├── EarningsPage.tsx
│   │   │   ├── PermitCenterPage.tsx
│   │   │   ├── FollowUpPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── ...
│   │   ├── hooks/                 # Custom hooks
│   │   │   ├── useNewLeadAlert.ts # Real-time lead alert + chime
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── queryClient.ts    # TanStack Query + fetch wrapper
│   │   │   └── utils.ts
│   │   └── App.tsx               # Routing, auth state, role switching
│
├── server/                        # Backend (Express)
│   ├── index.ts                  # Server entry point + Socket.io setup
│   ├── routes.ts                 # All API route definitions (~10,000 lines)
│   ├── storage.ts                # IStorage interface + implementation
│   ├── db.ts                     # Drizzle + PostgreSQL connection
│   └── replit_integrations/      # Managed integration clients
│       ├── audio/                # OpenAI Whisper + ffmpeg audio pipeline
│       ├── object_storage/       # Replit Object Storage (GCS)
│       └── ...
│
├── shared/
│   └── schema.ts                 # Drizzle schema, types, and Zod schemas
│
├── replit.md                      # Architecture reference for AI context
├── AI_INTEGRATION_AND_CAPABILITIES.md  # Full AI feature documentation
├── OPERATIONS_MENU.md             # Quick operational reference
└── README.md                      # This file
```

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session encryption key |

### AI
| Variable | Description |
|----------|-------------|
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key (via Replit AI integration) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI proxy base URL (via Replit AI integration) |

### Communication
| Variable | Description |
|----------|-------------|
| `SIGNALWIRE_PROJECT_ID` | SignalWire project ID |
| `SIGNALWIRE_API_TOKEN` | SignalWire API token |
| `SIGNALWIRE_PHONE_NUMBER` | Outbound SMS number |
| `SIGNALWIRE_SPACE_URL` | SignalWire space URL |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |

### Email
| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend email API key (via Replit integration) |

### Webhooks
| Variable | Description |
|----------|-------------|
| `THUMBTACK_WEBHOOK_USER` | Thumbtack basic auth username |
| `THUMBTACK_WEBHOOK_PASS` | Thumbtack basic auth password |
| `ANGI_WEBHOOK_KEY` | Angi API key |
| `BUILDER1_API_KEY` | Builder 1 SEO content API key |

### Storage
| Variable | Description |
|----------|-------------|
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Replit Object Storage bucket ID |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Public asset search paths |
| `PRIVATE_OBJECT_DIR` | Private upload directory |

### App
| Variable | Description |
|----------|-------------|
| `APP_BASE_URL` | Public URL of the app (used for magic links and email links) |

---

## Demo Accounts

| Username | Role | Password |
|----------|------|----------|
| `godmode` | Super Admin | `CSE2024!` |
| `admin` | Admin | `demo123` |
| `dispatcher1` | Dispatcher | `demo123` |
| `tech1` | Technician | `demo123` |

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/user` | Get current user |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List all leads |
| POST | `/api/leads` | Create lead |
| GET | `/api/leads/:id` | Get lead details |
| PATCH | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |
| GET | `/api/leads/duplicates` | Check for duplicates |
| GET | `/api/leads/sla-status` | SLA compliance report |
| POST | `/api/v1/lead-ingest` | Unified webhook ingest (all sources) |

### Lead Assassin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/velocity-leads` | List Lead Assassin board entries |
| PATCH | `/api/velocity-leads/:id` | Claim or update a velocity lead |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/:id` | Get job details |
| PATCH | `/api/jobs/:id` | Update job |
| POST | `/api/jobs/:id/complete` | Mark complete |
| GET | `/api/jobs/:id/attachments` | Get media attachments |
| POST | `/api/jobs/:id/attachments` | Upload attachment |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/:id` | Get customer profile |
| PATCH | `/api/customers/:id` | Update customer |
| GET | `/api/customers/:id/full-profile` | Aggregated profile (all jobs, quotes, leads, messages, media) |

### Quotes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes` | List quotes |
| POST | `/api/quotes` | Create quote |
| GET | `/api/quotes/:id` | Get quote |
| PATCH | `/api/quotes/:id` | Update quote |
| GET | `/api/quotes/public/:token` | Public customer quote view |

### Technicians
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/technicians` | List all technicians |
| GET | `/api/technicians/available` | Available technicians |
| GET | `/api/technicians/:id` | Technician details |
| POST | `/api/technicians/:id/location` | Update GPS location |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/threads` | List chat threads |
| POST | `/api/chat/threads` | Create thread |
| GET | `/api/chat/threads/:id/messages` | Get messages |
| POST | `/api/chat/threads/:id/messages` | Send message |
| GET | `/api/chat/customer/:token` | Customer magic link thread access |

### Call Recordings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/call-recordings` | List recordings |
| POST | `/api/call-recordings` | Create recording record |
| PATCH | `/api/call-recordings/:id` | Update recording |
| POST | `/api/call-recordings/transcribe` | Transcribe audio (base64 → text) |
| POST | `/api/call-recordings/analyze` | AI extraction from transcript |
| POST | `/api/call-recordings/create-lead` | Create lead from analysis |

### AI Copilot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/copilot/chat` | Send message to AI Copilot |
| POST | `/api/copilot/execute` | Execute an approved AI action |

### Payroll
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payroll/time-entries` | Time entry list |
| POST | `/api/payroll/clock-in` | Clock in |
| POST | `/api/payroll/clock-out` | Clock out |
| GET | `/api/payroll/pay-periods` | Pay periods |
| POST | `/api/payroll/pay-periods` | Create pay period |
| GET | `/api/payroll/pay-stubs` | Pay stubs |
| GET | `/api/pay-tracker` | Admin pay tracker summary |

### Permits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/permits` | List permit packets |
| POST | `/api/permits` | Create permit packet |
| PATCH | `/api/permits/:id` | Update permit status |
| POST | `/api/permits/:id/submit` | Submit via email |

### Salespersons & Commissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/salespersons` | List salespersons |
| GET | `/api/salespersons/:id` | Salesperson details |
| GET | `/api/sales-commissions` | List commissions |
| PATCH | `/api/sales-commissions/:id` | Update commission status |

### SEO Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content-packs` | List content packs |
| GET | `/api/content-packs/:id` | Content pack detail |
| POST | `/api/content-packs/:id/approve` | Approve |
| POST | `/api/content-packs/:id/reject` | Reject |
| PATCH | `/api/content-packs/:id/publish` | Publish |
| POST | `/api/webhooks/seo-content` | SEO content webhook |

### Webhooks (Lead Sources)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/thumbtack` | Thumbtack leads |
| POST | `/api/webhooks/angi` | Angi leads |
| POST | `/api/webhooks/elocal` | eLocal leads |
| POST | `/api/webhooks/networx` | Networx leads |
| POST | `/api/webhooks/inquirly` | Inquirly leads |
| POST | `/api/webhooks/zapier/lead` | Zapier leads |

---

## Service Types

Standard service categories available in the pricebook and throughout the system:

| Category | Services |
|----------|---------|
| Sewer Main | Clear, Camera Inspection, Repair, Replace, Lining |
| Drain Service | Drain Cleaning, Hydro Jetting, Rodding |
| Plumbing | Pipe Repair, Pipe Replacement, Faucet Repair, Toilet Repair |
| Water Heater | Repair, Replace (gas, electric, tankless) |
| Pumps | Sump Pump Install/Replace, Ejector Pit Service |
| Excavation | Point Repair, Full Replacement |
| Inspection | Camera Inspection, Smoke Testing |

---

*Emergency Chicago Sewer Experts CRM — Built for fast-moving field service teams.*
