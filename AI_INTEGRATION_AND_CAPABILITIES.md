# AI Integration and Capabilities
## Emergency Chicago Sewer Experts CRM

**Last Updated:** February 2026

---

## Table of Contents
1. [AI Architecture Overview](#ai-architecture-overview)
2. [AI Copilot (Plan-Then-Execute Engine)](#ai-copilot)
3. [Call Recording & AI Intake](#call-recording--ai-intake)
4. [AI-Powered Permit Center](#ai-powered-permit-center)
5. [AI Follow-Up Assistant](#ai-follow-up-assistant)
6. [AI-Powered In-App Messaging](#ai-powered-in-app-messaging)
7. [Automatic Job Status Notifications](#automatic-job-status-notifications)
8. [Customer Profile Intelligence](#customer-profile-intelligence)
9. [Workflow Schematics](#workflow-schematics)
10. [AI Models & Configuration](#ai-models--configuration)
11. [Security & Access Control](#security--access-control)

---

## AI Architecture Overview

The CRM integrates AI across six core modules, all powered by OpenAI models through Replit AI Integrations. Every AI capability follows a human-in-the-loop design principle: the AI proposes, humans approve.

```
+-------------------------------------------------------------------+
|                    AI INTEGRATION LAYER                            |
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  |   AI Copilot     |  |  Call Recording  |  |  Permit Center   | |
|  |  (Plan & Execute)|  |  (Transcribe &   |  |  (Detect &       | |
|  |                  |  |   Analyze)       |  |   Draft)         | |
|  +--------+---------+  +--------+---------+  +--------+---------+ |
|           |                     |                      |          |
|  +--------+---------+  +--------+---------+  +--------+---------+ |
|  | Follow-Up        |  |  In-App          |  |  Job Status      | |
|  | Assistant         |  |  Messaging       |  |  Notifications   | |
|  | (Generate &      |  |  (Read & Send)   |  |  (Automatic)     | |
|  |  Send)           |  |                  |  |                  | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|                   OpenAI via Replit AI Integrations                |
|                        (gpt-4o-mini / Whisper)                    |
+-------------------------------------------------------------------+
```

---

## AI Copilot

### Overview
A plan-then-execute AI assistant available to Admin and Dispatcher users. The Copilot understands the full CRM data model and can read data autonomously while proposing write actions for human approval.

### How It Works

```
+--------------------+     +--------------------+     +--------------------+
|                    |     |                    |     |                    |
|   User Message     +---->+   AI Planning      +---->+   Response with    |
|   (text or voice)  |     |   (gpt-4o-mini)    |     |   Read Results +   |
|                    |     |                    |     |   Proposed Actions |
+--------------------+     +---------+----------+     +---------+----------+
                                     |                          |
                           +---------v----------+     +---------v----------+
                           |                    |     |                    |
                           | Auto-Execute Read  |     | User Reviews &     |
                           | Tools (data gather)|     | Approves Actions   |
                           |                    |     |                    |
                           +--------------------+     +---------+----------+
                                                               |
                                                      +---------v----------+
                                                      |                    |
                                                      | Execute Approved   |
                                                      | Write Tools        |
                                                      | + Timeline Logging |
                                                      |                    |
                                                      +--------------------+
```

### Tool Registry

The Copilot has access to 30 tools organized by type:

#### Read Tools (Auto-Executed)
| Tool | Description | Role Required |
|------|-------------|---------------|
| `search_leads` | Search leads by status | Dispatcher |
| `get_lead` | Get single lead details | Dispatcher |
| `list_jobs` | List jobs with filters | Dispatcher |
| `get_job` | Get single job details | Dispatcher |
| `list_technicians` | List all technicians | Dispatcher |
| `list_quotes` | List quotes by status/lead | Dispatcher |
| `get_chat_threads` | List chat threads (filter by job, lead, visibility) | Dispatcher |
| `get_thread_messages` | Read messages from a chat thread | Dispatcher |
| `get_customer_profile` | Comprehensive customer lookup by phone/name/ID | Dispatcher |
| `get_calendar_schedule` | View calendar for date ranges | Dispatcher |
| `get_todays_schedule` | Today's job schedule | Dispatcher |
| `check_technician_availability` | Check tech open time slots | Dispatcher |
| `list_payroll_periods` | List payroll periods | Admin |
| `get_payroll_summary` | Payroll details with tax calculations | Admin |
| `get_stale_quotes` | Find quotes needing follow-up (urgency levels) | Dispatcher |
| `get_unconverted_leads` | Find leads needing follow-up (urgency levels) | Dispatcher |
| `generate_followup_message` | AI-generate personalized follow-up text | Dispatcher |

#### Write Tools (Require Approval)
| Tool | Description | Risk Level | Role Required |
|------|-------------|------------|---------------|
| `create_lead` | Create new leads | Low | Dispatcher |
| `update_lead_status` | Change lead status | Low | Dispatcher |
| `assign_lead` | Assign leads to sales reps | Low | Dispatcher |
| `update_job_status` | Change job status | Medium | Dispatcher |
| `assign_technician_to_job` | Assign tech to job | Medium | Dispatcher |
| `schedule_job` | Schedule a job on calendar | Medium | Dispatcher |
| `reschedule_job` | Move job to new time | Medium | Dispatcher |
| `create_and_schedule_job` | Create and schedule in one step | Medium | Dispatcher |
| `create_job_timeline_event` | Add timeline events | Low | Dispatcher |
| `send_chat_message` | Send messages to chat threads | Medium | Dispatcher |
| `process_payroll` | Process payroll for a period | High | Admin |
| `send_followup_sms` | Send SMS follow-ups | Medium | Dispatcher |
| `send_followup_email` | Send email follow-ups | Medium | Dispatcher |

### Voice Input
The Copilot panel includes a microphone button for voice input:

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
| Browser           +---->+ OpenAI Whisper     +---->+ Transcribed text  |
| MediaRecorder     |     | Transcription     |     | sent as Copilot   |
| (audio capture)   |     |                   |     | message           |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
```

### API Endpoints
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/agent/plan` | Send message, get AI plan with proposed actions |
| POST | `/api/agent/execute` | Execute an approved write action |
| GET | `/api/agent/tools` | List available tools for current user role |

### License Requirement
The AI Copilot requires an active WebSlingerAI license. License validation occurs on every request via `checkCopilotLicense()`.

---

## Call Recording & AI Intake

### Overview
Dispatchers can record phone calls directly in the browser. The system transcribes the audio, extracts customer details using AI, and auto-populates an intake form for review.

### Workflow

```
+-----------+     +---------------+     +----------------+     +----------------+
|           |     |               |     |                |     |                |
| Dispatcher+---->+ Browser       +---->+ OpenAI Whisper  +---->+ Raw Transcript |
| Records   |     | MediaRecorder |     | Transcription  |     |                |
| Call      |     | API           |     |                |     |                |
|           |     |               |     |                |     |                |
+-----------+     +---------------+     +----------------+     +-------+--------+
                                                                       |
                                                               +-------v--------+
                                                               |                |
                                                               | GPT-4o-mini    |
                                                               | Analysis       |
                                                               | (Extract       |
                                                               |  customer data)|
                                                               |                |
                                                               +-------+--------+
                                                                       |
                  +---------------+     +----------------+     +-------v--------+
                  |               |     |                |     |                |
                  | Lead Created  +<----+ Dispatcher     +<----+ Auto-Populated |
                  | in CRM        |     | Reviews &      |     | Intake Form    |
                  |               |     | Confirms       |     |                |
                  +-------+-------+     +----------------+     +----------------+
                          |
                  +-------v--------+
                  |                |
                  | AI Copilot can |
                  | schedule job   |
                  | from this lead |
                  |                |
                  +----------------+
```

### AI Extraction Fields
The AI extracts the following from call transcripts:
- Customer name, phone, email
- Service address, city, ZIP code
- Service type (sewer_main, drain_cleaning, plumbing, etc.)
- Problem description and priority level
- Property type (SFH, Townhome, Condo, etc.)
- Contact/tenant information if different from owner
- Notes (scheduling preferences, access instructions)
- AI recommendations for the dispatcher

### API Endpoints
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/call-recordings` | List recordings |
| POST | `/api/call-recordings` | Create recording entry |
| PATCH | `/api/call-recordings/:id` | Update recording |
| POST | `/api/call-recordings/transcribe` | Whisper transcription |
| POST | `/api/call-recordings/analyze` | GPT analysis of transcript |
| POST | `/api/call-recordings/create-lead` | Create lead from analysis |

---

## AI-Powered Permit Center

### Overview
The Permit Center uses AI to detect which permits are needed for a job based on Chicago-area regulations, draft permit application content, and generate pre-filled PDF applications.

### Workflow

```
+----------------+     +------------------+     +------------------+
|                |     |                  |     |                  |
| Job Scheduled  +---->+ AI Permit        +---->+ Permit Packets   |
| (with deposit) |     | Detection        |     | Created          |
| OR             |     | (GPT-4o-mini     |     | (auto-detected)  |
| Quote Accepted |     |  analyzes job)   |     |                  |
|                |     |                  |     |                  |
+----------------+     +------------------+     +--------+---------+
                                                         |
                       +------------------+     +--------v---------+
                       |                  |     |                  |
                       | PDF Generated    +<----+ AI Drafts        |
                       | (pdf-lib fills   |     | Application      |
                       |  permit forms)   |     | Content          |
                       |                  |     | (scope of work,  |
                       +--------+---------+     |  justification)  |
                                |               |                  |
                       +--------v---------+     +------------------+
                       |                  |
                       | Email Submitted  |
                       | to Jurisdiction  |
                       | (via Resend API) |
                       |                  |
                       +------------------+
```

### AI Analysis Capabilities
The permit AI considers Chicago-specific requirements:
- **Plumbing permits** - Required for most plumbing modifications
- **Sewer repair/replacement permits** - For sewer line work
- **Excavation/dig permits** - For any ground disturbance
- **Right-of-Way permits** - For work involving public sidewalks or streets
- **MWRD permits** - Metropolitan Water Reclamation District permits
- **Building permits** - If structural work is involved

Each recommendation includes:
- Permit type and confidence level (high/medium/low)
- Reason for requirement
- Estimated cost range
- Estimated timeline

### Automatic Trigger Conditions
Permits are automatically detected and prepared when:
1. A job is scheduled AND has a customer deposit
2. A quote is accepted with `permitRequired` flag set

### API Endpoints
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/jobs/:jobId/permits/detect` | Detect needed permits for a job |
| POST | `/api/permits/:packetId/generate` | Generate PDF for a permit packet |
| POST | `/api/permits/:packetId/finalize` | Mark packet ready to submit |
| POST | `/api/permits/:packetId/submit` | Submit permit via email |
| POST | `/api/permits/ai/analyze` | AI analysis of permit requirements |
| POST | `/api/permits/ai/draft` | AI-drafted application content |

---

## AI Follow-Up Assistant

### Overview
Identifies customers with open quotes and unconverted leads who need follow-up, calculates urgency, and generates personalized follow-up messages via SMS or email.

### Workflow

```
+--------------------+     +--------------------+     +--------------------+
|                    |     |                    |     |                    |
| Identify Stale     +---->+ Calculate Urgency  +---->+ Display Follow-Up  |
| Quotes & Leads     |     | Levels             |     | Dashboard          |
|                    |     |                    |     |                    |
+--------------------+     +--------------------+     +---------+----------+
                                                               |
                                                      +--------v-----------+
                                                      |                    |
                                                      | User Selects       |
                                                      | Customer to        |
                                                      | Follow Up          |
                                                      |                    |
                                                      +--------+-----------+
                                                               |
+--------------------+     +--------------------+     +--------v-----------+
|                    |     |                    |     |                    |
| Message Sent       +<----+ User Reviews &     +<----+ AI Generates       |
| via Twilio (SMS)   |     | Edits Message      |     | Personalized       |
| or Resend (Email)  |     |                    |     | Message            |
|                    |     |                    |     | (GPT-4o-mini)      |
+--------------------+     +--------------------+     +--------------------+
```

### Urgency Calculation
| Urgency Level | Days Since Last Activity | Action Recommended |
|---------------|--------------------------|-------------------|
| Low | 0-2 days | Monitor |
| Medium | 3-6 days | Consider follow-up |
| High | 7-13 days | Follow up soon |
| Critical | 14+ days | Immediate follow-up |

### AI Message Generation
The AI generates channel-appropriate messages:
- **SMS**: Concise (under 320 characters), friendly, with call-to-action
- **Email**: Professional with subject line, HTML formatting, detailed content

Messages are personalized using:
- Customer name and service type
- Quote amount (if applicable)
- Days since last activity
- Problem description

### API Endpoints
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/follow-up/metrics` | Dashboard metrics |
| GET | `/api/follow-up/stale-quotes` | Quotes needing follow-up |
| GET | `/api/follow-up/unconverted-leads` | Leads needing follow-up |
| POST | `/api/follow-up/generate-message` | AI-generate follow-up text |
| POST | `/api/follow-up/send-sms` | Send SMS follow-up via Twilio |
| POST | `/api/follow-up/send-email` | Send email follow-up via Resend |

---

## AI-Powered In-App Messaging

### Overview
The AI Copilot has full access to the CRM's chat system, enabling it to read conversations, send messages to staff or customers, and auto-create threads when needed.

### Capabilities

```
+--------------------+                         +--------------------+
|                    |    get_chat_threads      |                    |
| AI Copilot         +------------------------>+ Chat Thread        |
|                    |    get_thread_messages   | Database           |
|                    +------------------------>+                    |
|                    |                         +--------------------+
|                    |
|                    |    send_chat_message     +--------------------+
|                    +------------------------>+                    |
|                    |                         | Internal Thread    |
|                    |                         | (Staff Only)       |
|                    |                         +--------------------+
|                    |
|                    |    send_chat_message     +--------------------+
|                    +------------------------>+                    |
|                    |    (customer_visible)    | Customer Thread    |
|                    |                         | (Customer Sees)    |
+--------------------+                         +--------------------+
```

### Thread Auto-Creation
When `send_chat_message` targets a job or lead without an existing thread:
1. A new thread is created with appropriate subject line
2. Participants are automatically added:
   - All Admin users
   - All Dispatcher users
   - The specifically assigned technician (not all technicians)
   - The customer (for customer-visible threads only)

### Message Audiences
| Audience | Who Sees It | Use Case |
|----------|-------------|----------|
| `internal` | Admins, Dispatchers, Assigned Tech | Staff coordination, notes |
| `customer_visible` | All staff + Customer | Updates, scheduling, follow-ups |

---

## Automatic Job Status Notifications

### Overview
When a job's status changes, the system automatically posts contextual messages to all active chat threads associated with that job.

### Workflow

```
+--------------------+     +--------------------+     +--------------------+
|                    |     |                    |     |                    |
| Job Status Change  +---->+ postJobStatus      +---->+ Deduplication      |
| (any route)        |     | ChatUpdate()       |     | Check (30-sec      |
|                    |     |                    |     | window)            |
+--------------------+     +--------------------+     +---------+----------+
                                                               |
                                                      +--------v-----------+
                                                      |                    |
                                                +-----+ Post to Internal   |
                                                |     | Thread (if active) |
                                                |     |                    |
                                                |     +--------------------+
                                                |
                                                |     +--------------------+
                                                |     |                    |
                                                +-----+ Post to Customer   |
                                                |     | Thread (if active) |
                                                |     |                    |
                                                |     +--------------------+
                                                |
                                                |     +--------------------+
                                                |     |                    |
                                                +-----+ Notify Assigned    |
                                                      | Technician         |
                                                      | (if applicable)    |
                                                      |                    |
                                                      +--------------------+
```

### Status Messages
| Status | Internal Message | Customer Message |
|--------|-----------------|-----------------|
| Assigned | "Technician [Name] has been assigned" | "A technician has been assigned to your job" |
| Confirmed | "Job has been confirmed" | "Your service appointment has been confirmed" |
| En Route | "Technician is en route" | "Our technician is on the way" |
| On Site | "Technician has arrived on site" | "Our technician has arrived" |
| In Progress | "Work is now in progress" | "Work on your [service] has started" |
| Completed | "Job has been marked complete" | "Your [service] job has been completed" |
| Cancelled | "Job has been cancelled" | "Your scheduled [service] job has been cancelled" |

### Deduplication
- Checks the last 3 messages in each thread
- Looks for matching `source: "job_status_update"` and `newStatus` in message metadata
- 30-second window prevents duplicate posts from concurrent route calls
- Wired into routes: `/assign`, `/confirm`, `/en-route`, `/arrive`, `/start`, `/complete`, `PATCH /api/jobs/:id`

---

## Customer Profile Intelligence

### Overview
The `get_customer_profile` tool provides a 360-degree view of any customer by aggregating data across all CRM modules.

### Data Aggregated

```
+--------------------+
| Customer Profile   |
| Lookup             |
| (phone/name/ID)    |
+--------+-----------+
         |
         +-----------> Leads (all associated leads)
         |
         +-----------> Jobs (all service jobs)
         |
         +-----------> Quotes (all estimates/quotes)
         |
         +-----------> Call Recordings (transcripts)
         |
         +-----------> Contact Attempts (SMS/email history)
         |
         +-----------> Summary Statistics
                        - Total leads count
                        - Total jobs count
                        - Total quotes count
                        - Total calls count
                        - Total contact attempts
```

### Search Methods
- **By phone number**: Matches across leads, jobs, and customer records
- **By customer name**: Fuzzy matching across all records
- **By customer ID**: Direct lookup in customer database

---

## Workflow Schematics

### End-to-End: Call to Completed Job

```
  CALL INTAKE                    LEAD MANAGEMENT                 JOB EXECUTION
  ===========                    ===============                 =============

  +------------+                 +-------------+                 +-------------+
  | Dispatcher  |                | Lead Created |                | Job Created  |
  | Records     |                | in CRM       |                | & Scheduled  |
  | Phone Call  |                |              |                |              |
  +------+-----+                +------+------+                +------+------+
         |                              |                              |
  +------v-----+                +------v------+                +------v------+
  | Whisper     |                | AI Copilot   |                | Auto-Permit  |
  | Transcribes |                | Assigns Lead,|                | Detection    |
  | Audio       |                | Schedules    |                | (if deposit) |
  +------+-----+                | Follow-up    |                +------+------+
         |                      +------+------+                       |
  +------v-----+                       |                       +------v------+
  | GPT Extracts|               +------v------+                | Permit PDFs  |
  | Customer    |               | Quote        |                | Generated &  |
  | Details     |               | Generated &  |                | Submitted    |
  +------+-----+               | Sent         |                +------+------+
         |                      +------+------+                       |
  +------v-----+                       |                       +------v------+
  | Dispatcher  |               +------v------+                | Tech         |
  | Reviews &   |               | Customer     |                | Dispatched   |
  | Confirms    |               | Accepts      |                | (status      |
  +------+-----+               | Quote        |                |  updates     |
         |                      +------+------+                |  posted to   |
         |                              |                      |  chat)       |
         +-----------+------------------+                      +------+------+
                                                                      |
                                                               +------v------+
                                                               | Job Complete |
                                                               | + Payroll    |
                                                               | Integration  |
                                                               +-------------+
```

### AI Copilot Interaction Flow

```
  USER                          COPILOT ENGINE                  CRM DATABASE
  ====                          ==============                  ============

  "Show me stale       +------> System Prompt     +------> get_stale_quotes
   quotes"             |        + Tool Registry    |        (auto-executed)
       |               |              |            |              |
       +---------------+              |            +--------------+
                                      v                           |
                               GPT-4o-mini                        |
                               Planning                           v
                                      |                    Data returned
                                      v                    to GPT
                               Follow-up GPT               |
                               (summarize data)            |
                                      |                     |
                                      v                     |
                               "Found 5 stale      <-------+
                                quotes. Here's
                                a summary..."
                                      |
                                      v
                               PROPOSED ACTIONS:
                               [send_followup_sms
                                to Customer A]
                                      |
  User clicks          <--------------+
  "Approve"                    |
       |                       v
       +-----------------> executeAction()  +-----> Twilio SMS sent
                                            |
                                            +-----> Contact logged
                                            |
                                            +-----> Timeline event
                                                    created
```

### Follow-Up Assistant Flow

```
  +------------------+     +------------------+     +------------------+
  |                  |     |                  |     |                  |
  | Open Quotes      |     | Urgency          |     | Follow-Up        |
  | (draft, sent,    +---->+ Classification   +---->+ Dashboard        |
  |  viewed)         |     | (low/med/high/   |     | (metrics +       |
  |                  |     |  critical)       |     |  action cards)   |
  +------------------+     +------------------+     +--------+---------+
                                                             |
  +------------------+     +------------------+     +--------v---------+
  |                  |     |                  |     |                  |
  | Unconverted      |     | Urgency          |     | Select Customer  |
  | Leads (new,      +---->+ Classification   +---->+ + Choose Channel |
  |  contacted,      |     |                  |     | (SMS or Email)   |
  |  qualified)      |     |                  |     |                  |
  +------------------+     +------------------+     +--------+---------+
                                                             |
                                                    +--------v---------+
                                                    |                  |
                                                    | AI Generates     |
                                                    | Personalized     |
                                                    | Message          |
                                                    +--------+---------+
                                                             |
                                                    +--------v---------+
                                                    |                  |
                                                    | User Reviews,    |
                                                    | Edits, Sends     |
                                                    |                  |
                                                    +--------+---------+
                                                             |
                                               +-------------+-------------+
                                               |                           |
                                      +--------v---------+       +--------v---------+
                                      |                  |       |                  |
                                      | Twilio SMS       |       | Resend Email     |
                                      | Delivery         |       | Delivery         |
                                      |                  |       |                  |
                                      +------------------+       +------------------+
```

---

## AI Models & Configuration

| Module | Model | Temperature | Purpose |
|--------|-------|-------------|---------|
| Copilot Planning | gpt-4o-mini | 0.3 | Structured planning, tool selection |
| Copilot Follow-up | gpt-4o-mini | 0.3 | Data summarization |
| Call Transcript Analysis | gpt-4o-mini | default | Customer data extraction |
| Permit Detection | gpt-4o-mini | 0.3 | Permit requirement analysis |
| Permit Drafting | gpt-4o-mini | 0.4 | Application content generation |
| Follow-Up Messages | gpt-4o-mini | 0.7 | Creative message writing |
| Audio Transcription | Whisper | N/A | Speech-to-text |

### Response Formats
- **Permit AI**: Uses `response_format: { type: "json_object" }` for structured JSON
- **Call Analysis**: Uses `response_format: { type: "json_object" }` for structured extraction
- **Copilot**: Uses XML-tagged sections (`<READ_ACTIONS>`, `<PROPOSED_ACTIONS>`) in natural text
- **Follow-Up Messages**: Free-form text generation

---

## Security & Access Control

### Role-Based AI Access
| Feature | Admin | Dispatcher | Technician | Salesperson |
|---------|-------|------------|------------|-------------|
| AI Copilot | Full access | Full access | No access | No access |
| Call Recording | View all | Record & analyze | No access | No access |
| Permit AI | Full access | Full access | View only | No access |
| Follow-Up Assistant | Full access | Full access | No access | No access |

### Safety Measures
1. **Write operations always require explicit human approval** before execution
2. **Risk levels** (low/medium/high) are assigned to all write actions
3. **License validation** on every Copilot request via `checkCopilotLicense()`
4. **API authorization** via `X-User-Id` header on all protected routes
5. **Deduplication** prevents duplicate automated messages (30-second window)
6. **Graceful AI fallbacks** - All AI modules return safe defaults if AI analysis fails
7. **Timeline audit logging** - All Copilot-executed actions are logged to job timelines
8. **Parameter validation** - All tool inputs validated via Zod schemas before execution
