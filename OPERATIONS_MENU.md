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

## 6. Technicians

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

## 7. Analytics

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

## 8. Export & Reporting

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

## 9. Settings Tabs

1. **Access** - User management, role-based permissions
2. **Notifications** - Email/SMS notification preferences
3. **General** - Business settings, defaults

---

## 10. Webhook Logging

### View Webhook Logs
**GET /api/webhook-logs**

All incoming webhooks are logged with:
- Timestamp
- Source
- Payload
- Processing status
- Created lead ID

---

## 11. Email Integration (Resend)

### Configured Email Types
1. **Lead Acknowledgment** - Sent automatically when lead arrives
2. **Appointment Reminder** - Sent before scheduled jobs

### Email Service Location
`server/services/email.ts`

---

## 12. Health Check

**GET /api/health**

Returns system status for monitoring.
