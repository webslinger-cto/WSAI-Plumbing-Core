# Chicago Sewer Experts CRM - Operations Menu

## Quick Reference

### Login Credentials
| Role | Username | Password |
|------|----------|----------|
| Admin | admin | demo123 |
| Dispatcher | dispatcher | demo123 |
| Technician | mike | demo123 |
| Technician | carlos | demo123 |
| Technician | james | demo123 |

---

## 1. User Roles & Access

### Admin Dashboard
- Full access to all features
- Lead management, job tracking, technician management
- Analytics with ROI and cost analysis
- Pricebook management (service catalog, pricing, labor estimates)
- Marketing ROI tracking (campaigns, spend, ROI by source)
- Settings and configuration
- Data export

### Dispatcher Dashboard
- Lead management and assignment
- Job scheduling and tracking
- Technician coordination
- Real-time status monitoring

### Technician Dashboard
- Personal job queue
- Quote builder
- Job status updates
- Earnings tracking

---

## 2. Lead Management

### Lead Sources (Webhook Endpoints)
| Source | Endpoint | Authentication |
|--------|----------|----------------|
| eLocal | POST /api/webhooks/elocal | None |
| Networx | POST /api/webhooks/networx | None |
| Angi | POST /api/webhooks/angi | Header: x-angi-key |
| Thumbtack | POST /api/webhooks/thumbtack | Basic Auth |
| Inquirly | POST /api/webhooks/inquirly | None |
| Zapier | POST /api/webhooks/zapier/lead | None |
| Direct/Form | POST /api/leads | None |

### Lead Statuses
- `new` - Just received, awaiting contact
- `contacted` - Initial contact made
- `qualified` - Customer confirmed interest
- `estimate_scheduled` - Estimate appointment set
- `scheduled` - Job scheduled
- `converted` - Became a paying job
- `lost` - Did not convert

### Lead API Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| List all leads | GET | /api/leads |
| Get single lead | GET | /api/leads/:id |
| Create lead | POST | /api/leads |
| Update lead | PATCH | /api/leads/:id |
| Contact lead | POST | /api/leads/:id/contact |
| Check duplicates | GET | /api/leads/duplicates |
| SLA status | GET | /api/leads/sla-status |

---

## 3. Automation Workflow

### Complete Lead-to-Job Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Lead Intake                                                    │
│  ─────────────────────                                                  │
│  Webhook receives lead from eLocal/Networx/Angi/Thumbtack/Inquirly     │
│  → Lead created in database                                             │
│  → Webhook logged for audit trail                                       │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2: Auto-Contact (autoContactLead)                                 │
│  ──────────────────────────────────────                                 │
│  IF lead has email:                                                     │
│    → Send acknowledgment email via Resend                               │
│    → Log contact_attempt record                                         │
│    → Update lead status to "contacted"                                  │
│  ELSE:                                                                  │
│    → Skip auto-contact, log reason                                      │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3: Customer Confirms Estimate (createJobFromLead)                 │
│  ──────────────────────────────────────────────────────                 │
│  When customer confirms they want an estimate:                          │
│  → Create job record with lead data                                     │
│  → Update lead status to "estimate_scheduled"                           │
│  → Log timeline event "Job created from lead"                           │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4: Auto-Assign Technician (autoAssignTechnician)                  │
│  ─────────────────────────────────────────────────────                  │
│  → Find available technicians                                           │
│  → Check skill match and daily job limit                                │
│  → Assign to job, set labor rate                                        │
│  → Log timeline event "Assigned to [Tech Name]"                         │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5: Job Execution                                                  │
│  ────────────────────                                                   │
│  Status progression:                                                    │
│  pending → assigned → en_route → on_site → in_progress                 │
│                                                                         │
│  Optional: Send appointment reminder (sendAppointmentReminder)          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                      ┌────────────┴────────────┐
                      ▼                         ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────────┐
│  STEP 6A: Complete Job          │ │  STEP 6B: Cancel Job                │
│  ─────────────────────          │ │  ───────────────────                │
│  (completeJob)                  │ │  (cancelJob)                        │
│                                 │ │                                     │
│  → Update labor hours           │ │  → Record cancellation reason       │
│  → Calculate labor cost         │ │  → Preserve all expense data        │
│  → Record all expenses:         │ │  → Free up technician               │
│    • Materials                  │ │  → Log timeline event               │
│    • Travel                     │ │                                     │
│    • Equipment                  │ │  Note: Cancelled jobs are           │
│    • Other                      │ │  tracked for accurate ROI           │
│  → Set revenue and profit       │ │  analysis                           │
│  → Free up technician           │ │                                     │
│  → Increment jobs today         │ │                                     │
└─────────────────────────────────┘ └─────────────────────────────────────┘
```

### Automation Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `autoContactLead` | Send acknowledgment email | Called after webhook lead creation |
| `createJobFromLead` | Convert lead to job | Customer confirms estimate |
| `autoAssignTechnician` | Assign available tech | After job creation |
| `updateJobCosts` | Update expense tracking | During job execution |
| `completeJob` | Finalize with all costs | Job finished successfully |
| `cancelJob` | Cancel with expense tracking | Job cancelled for any reason |
| `sendAppointmentReminder` | Email reminder to customer | Before scheduled appointment |
| `calculateJobROI` | Compute profit metrics | Analytics and reporting |

### Email Notification Routing (Two-Tier System)

The system uses a two-tier email notification system:

**Office Email (CSEINTAKETEST@webslingerai.com):**
- All new leads received
- All new jobs created
- All new quotes created
- General system notifications

**Technician Email (techtest@webslingerai.com):**
- Job assignments
- Job approvals/start notifications
- Field-specific notifications

| Event | Recipients | When |
|-------|-----------|------|
| New Lead | Office | Lead created via webhook or form |
| New Job | Office | Job created from lead or manually |
| Job Assigned | Technician | Tech assigned to job |
| Job Started | Technician | Tech starts work |
| New Quote | Office | Quote created by tech |

**Important Notes:**
- SMS notifications are currently DISABLED pending carrier A2P verification
- All notifications are email-only via Resend API
- Rate limited to 2 requests/second to comply with Resend limits

### Twilio Call & SMS Forwarding

All incoming calls and texts to the Twilio phone number are forwarded to the office:

**Forwarding Number:** (630) 251-5628

| Webhook | Purpose | Endpoint |
|---------|---------|----------|
| Incoming Voice | Forward calls to office | POST /api/webhooks/twilio/voice |
| Voice Status | Track call completion | POST /api/webhooks/twilio/voice-status |
| Voicemail | Handle missed call recordings | POST /api/webhooks/twilio/voicemail |
| Incoming SMS | Forward texts to office | POST /api/webhooks/twilio/sms |
| SMS Status | Track delivery status | POST /api/webhooks/twilio/status |

**Call Handling Flow:**
1. Incoming call to Twilio number
2. Caller hears "Please hold while we connect you to Chicago Sewer Experts"
3. Call forwarded to (630) 251-5628
4. If no answer after 30 seconds, caller prompted to leave voicemail
5. Voicemail recording emailed to CSEINTAKETEST@webslingerai.com

**SMS Handling Flow:**
1. Incoming text to Twilio number
2. Text forwarded to (630) 251-5628 as SMS
3. Email notification sent to CSEINTAKETEST@webslingerai.com
4. Auto-reply sent: "Thank you for your message! A Chicago Sewer Experts team member will respond shortly."

**Twilio Configuration Required:**
In your Twilio Console, configure these webhook URLs for your phone number:
- Voice Webhook: `https://your-domain.replit.app/api/webhooks/twilio/voice`
- SMS Webhook: `https://your-domain.replit.app/api/webhooks/twilio/sms`

---

## 4. Job Management

### Job Statuses
- `pending` - Created, awaiting assignment
- `assigned` - Technician assigned
- `en_route` - Tech traveling to site
- `on_site` - Tech arrived
- `in_progress` - Work started
- `completed` - Job finished
- `cancelled` - Job cancelled (expenses preserved)

### Job API Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| List all jobs | GET | /api/jobs |
| Get job pool (tech) | GET | /api/jobs/pool?technicianId=X |
| Get single job | GET | /api/jobs/:id |
| Create job | POST | /api/jobs |
| Update job | PATCH | /api/jobs/:id |
| Claim job | POST | /api/jobs/:id/claim |
| Assign tech | POST | /api/jobs/:id/assign |
| Confirm appointment | POST | /api/jobs/:id/confirm |
| Mark en route | POST | /api/jobs/:id/en-route |
| Mark arrived | POST | /api/jobs/:id/arrive |
| Start work | POST | /api/jobs/:id/start |
| Complete job | POST | /api/jobs/:id/complete |
| Get timeline | GET | /api/jobs/:id/timeline |

### Job Cost Tracking Fields
| Field | Description |
|-------|-------------|
| laborHours | Hours worked |
| laborRate | Hourly rate (from technician) |
| laborCost | laborHours × laborRate |
| materialsCost | Parts and supplies |
| travelExpense | Fuel, mileage |
| equipmentCost | Equipment rental/usage |
| otherExpenses | Miscellaneous costs |
| totalCost | Sum of all costs |
| totalRevenue | Amount charged to customer |
| profit | Revenue minus costs |

---

## 5. Quotes

### Quote API Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| List quotes | GET | /api/quotes |
| Get quote | GET | /api/quotes/:id |
| Create quote | POST | /api/quotes |
| Update quote | PATCH | /api/quotes/:id |

### Quote Templates
| Action | Method | Endpoint |
|--------|--------|----------|
| List templates | GET | /api/quote-templates |
| By service type | GET | /api/quote-templates/service/:type |
| Get template | GET | /api/quote-templates/:id |
| Create template | POST | /api/quote-templates |
| Update template | PATCH | /api/quote-templates/:id |
| Delete template | DELETE | /api/quote-templates/:id |

---

## 6. Pricebook Management

### Overview
Manage service catalog with standardized pricing, labor estimates, and materials costs.

### Pricebook API Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| List items | GET | /api/pricebook/items |
| Get item | GET | /api/pricebook/items/:id |
| Create item | POST | /api/pricebook/items |
| Update item | PATCH | /api/pricebook/items/:id |
| Delete item | DELETE | /api/pricebook/items/:id |
| List categories | GET | /api/pricebook/categories |
| Create category | POST | /api/pricebook/categories |
| Update category | PATCH | /api/pricebook/categories/:id |
| Delete category | DELETE | /api/pricebook/categories/:id |

### Pricebook Item Fields
| Field | Description |
|-------|-------------|
| name | Service name |
| category | Service category |
| basePrice | Standard price |
| laborHours | Estimated labor time |
| materialsCost | Estimated materials |
| unit | Pricing unit (each, hour, foot, etc.) |
| serviceCode | Internal reference code |
| isActive | Available for quoting |
| isTaxable | Subject to tax |

### Default Categories
- Drain Cleaning
- Sewer Repair
- Plumbing
- Water Heater
- Camera Inspection
- Hydro Jetting
- Emergency
- Maintenance

---

## 7. Marketing ROI Tracking

### Overview
Track marketing spend, lead attribution, and calculate ROI by source.

### Marketing API Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| List campaigns | GET | /api/marketing/campaigns |
| Create campaign | POST | /api/marketing/campaigns |
| Update campaign | PATCH | /api/marketing/campaigns/:id |
| Delete campaign | DELETE | /api/marketing/campaigns/:id |
| List spend | GET | /api/marketing/spend |
| Log spend | POST | /api/marketing/spend |
| Get ROI data | GET | /api/marketing/roi |

### Lead Sources
- eLocal
- Networx
- Angi
- Thumbtack
- Direct Call
- Website
- Referral
- Google Ads
- Facebook
- Other

### ROI Calculation
```
ROI % = ((Revenue - Spend) / Spend) × 100
Cost Per Lead = Total Spend / Leads Generated
Cost Per Conversion = Total Spend / Leads Converted
```

### Analytics Dashboard
- Total Spend by Source (Bar Chart)
- Spend Distribution (Pie Chart)
- ROI by Source comparison
- Lead generation metrics

---

## 8. Technicians

### Technician API Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| List all | GET | /api/technicians |
| Available only | GET | /api/technicians/available |
| Get single | GET | /api/technicians/:id |
| Create | POST | /api/technicians |
| Update | PATCH | /api/technicians/:id |

### Technician Status Values
- `available` - Ready for jobs
- `busy` - Currently on a job
- `off_duty` - Not working

---

## 9. Analytics

### Analytics Tabs
1. **Lead Sources** - Conversion rates by source
2. **Revenue** - Monthly trends and totals
3. **Marketing ROI** - Cost per lead, cost per conversion
4. **Job Costs** - Expense breakdown, profit margins
5. **Services** - Revenue by service type
6. **Technicians** - Performance metrics

### Analytics API
| Action | Method | Endpoint |
|--------|--------|----------|
| Get analytics | GET | /api/analytics |

---

## 10. Export & Reporting

### Export Endpoint
**GET /api/export**

Returns JSON with all data:
```json
{
  "leads": [...],
  "jobs": [...],
  "technicians": [...],
  "quotes": [...]
}
```

---

## 11. Settings Tabs

1. **Access** - User management, role-based permissions
2. **Notifications** - Email/SMS notification preferences
3. **General** - Business settings, defaults

---

## 12. Webhook Logging

### View Webhook Logs
**GET /api/webhook-logs**

All incoming webhooks are logged with:
- Timestamp
- Source
- Payload
- Processing status
- Created lead ID

---

## 13. Email Integration (Resend)

### Configured Email Types
1. **Lead Acknowledgment** - Sent automatically when lead arrives
2. **Appointment Reminder** - Sent before scheduled jobs

### Email Service Location
`server/services/email.ts`

---

## 14. Health Check

**GET /api/health**

Returns system status for monitoring.
