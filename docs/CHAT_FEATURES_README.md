# Chat System Features & Integrations

## Overview

The Emergency Chicago Sewer Experts CRM includes a comprehensive chat system designed to facilitate real-time communication between customers, dispatchers, and technicians throughout the entire lead-to-job lifecycle.

## Chat System Components

### 1. Public Website Chat (`/chat`)

**Purpose:** Lead capture directly from the website without requiring customer authentication.

**How It Works:**
1. Customer visits the `/chat` page
2. Clicks "Start Chat Now" to begin
3. Fills out a simple form with:
   - Name
   - Phone number
   - Initial message describing their issue
4. A real-time chat interface opens
5. Customer can continue sending messages
6. Dispatchers receive the chat instantly in their dashboard

**Technical Details:**
- Creates a new lead with `source='website_chat'`
- Generates a secure session token (7-day expiry)
- Creates a customer-visible chat thread linked to the lead
- All dispatchers are automatically added as participants

### 2. Lead Chat Page (`/lead-chat`)

**Purpose:** Staff access to all chat threads associated with leads.

**Who Uses It:** Dispatchers, Admins, Technicians

**Features:**
- View all active lead conversations
- Send and receive messages in real-time
- Access customer information from the lead record
- Transition conversations as leads become quotes and jobs

### 3. Dispatcher Chat Page (`/dispatcher-chat`)

**Purpose:** Centralized chat management for dispatch operations.

**Who Uses It:** Dispatchers, Admins

**Features:**
- View all incoming public chats
- Manage multiple conversations simultaneously
- Access lead details and customer history
- Coordinate with technicians via internal threads

### 4. Technician Chat Page (`/technician-chat`)

**Purpose:** Field communication for technicians.

**Who Uses It:** Technicians

**Features:**
- Receive job-related messages
- Communicate with dispatchers
- Send updates to customers (via customer-visible threads)
- Share photos and attachments from the field

## Thread Types

### Customer-Visible Threads
- Visible to customers via magic links or public chat sessions
- Used for direct customer communication
- Persist through lead, quote, and job stages

### Internal Threads
- Staff-only communication
- Used for coordination and notes
- Not visible to customers

## Chat Workflow Integration

### Lead Stage
- Chat thread created automatically with each new lead
- Public chat leads get immediate dispatcher visibility
- Initial customer message captured and stored

### Quote Stage
- Chat continues seamlessly when lead converts to quote
- Customer can ask questions about the quote
- Technician can provide additional details

### Job Stage
- Chat persists when quote becomes a job
- Technician uses chat for on-site coordination
- Customer receives job updates and notifications

## API Endpoints

### Public Chat (No Auth Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/chat/start` | POST | Start new chat, create lead and thread |
| `/api/public/chat/messages` | GET | Fetch messages for session |
| `/api/public/chat/send` | POST | Send customer message |

### Authenticated Chat
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/threads` | GET | List user's chat threads |
| `/api/chat/threads/:id/messages` | GET | Get thread messages |
| `/api/chat/threads/:id/messages` | POST | Send message to thread |

## Security Features

- **Token-based sessions:** Public chat uses secure, hashed session tokens
- **7-day expiry:** Sessions automatically expire for security
- **Role-based access:** Users only see threads they're participants in
- **TCPA compliance:** Consent tracking for all customer communications

## Integration Points

### With Lead Management
- Public chats automatically create leads
- Lead source tracked as 'website_chat'
- Customer name and phone captured from chat form

### With Notification System
- Real-time notifications for new messages
- Email notifications via Resend API (if configured)
- SMS notifications via Twilio/SignalWire (if configured)

### With Job Workflow
- Chat threads link to related jobs
- Technicians receive job-specific chat access
- Customer updates flow through chat system

## Best Practices

1. **Respond Quickly:** Public chat customers expect fast responses
2. **Use Internal Threads:** Keep coordination separate from customer communication
3. **Document in Chat:** Important details in chat become part of the lead record
4. **Transition Smoothly:** Chat persists through lead/quote/job so customers don't lose context
