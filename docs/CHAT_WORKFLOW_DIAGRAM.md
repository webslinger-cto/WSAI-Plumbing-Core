# Chat System Workflow Diagrams

## Public Website Chat Flow

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|  Customer visits | --> |  Fills out form   | --> |  Chat interface  |
|     /chat        |     |  (name, phone,    |     |     opens        |
|                  |     |   message)        |     |                  |
+------------------+     +-------------------+     +------------------+
                                  |                        |
                                  v                        v
                         +-------------------+     +------------------+
                         |                   |     |                  |
                         |  Lead created     |     |  Messages sent   |
                         |  source='website  |     |  via API         |
                         |  _chat'           |     |                  |
                         +-------------------+     +------------------+
                                  |                        |
                                  v                        v
                         +-------------------+     +------------------+
                         |                   |     |                  |
                         |  Chat thread      | <-- |  Session token   |
                         |  created          |     |  stored (7 days) |
                         |                   |     |                  |
                         +-------------------+     +------------------+
                                  |
                                  v
                         +-------------------+
                         |                   |
                         |  Dispatchers see  |
                         |  in their chat    |
                         |  dashboard        |
                         +-------------------+
```

## Lead-to-Job Chat Lifecycle

```
+============================================================================+
|                           CHAT THREAD LIFECYCLE                             |
+============================================================================+

  LEAD CREATED                QUOTE GENERATED              JOB CREATED
       |                            |                           |
       v                            v                           v
+---------------+           +---------------+           +---------------+
|               |           |               |           |               |
|  Chat thread  |  ------>  |  Same thread  |  ------>  |  Same thread  |
|  initiated    |           |  continues    |           |  persists     |
|               |           |               |           |               |
+---------------+           +---------------+           +---------------+
       |                            |                           |
       v                            v                           v
+---------------+           +---------------+           +---------------+
| Customer asks |           | Customer asks |           | Technician    |
| about service |           | about quote   |           | provides      |
| availability  |           | details       |           | job updates   |
+---------------+           +---------------+           +---------------+
```

## Thread Visibility Model

```
+------------------------------------------------------------------+
|                      THREAD VISIBILITY                            |
+------------------------------------------------------------------+

     CUSTOMER-VISIBLE THREADS              INTERNAL THREADS
     ----------------------               -----------------
              |                                   |
              v                                   v
     +------------------+                +------------------+
     |                  |                |                  |
     |  Customer can    |                |  Staff only      |
     |  see & respond   |                |  (dispatchers,   |
     |                  |                |   technicians,   |
     |  Via:            |                |   admins)        |
     |  - Magic links   |                |                  |
     |  - Public chat   |                |  Used for:       |
     |    sessions      |                |  - Coordination  |
     |                  |                |  - Notes         |
     +------------------+                |  - Internal      |
                                         |    discussion    |
                                         +------------------+
```

## Role-Based Chat Access

```
+------------------------------------------------------------------+
|                       ROLE-BASED ACCESS                           |
+------------------------------------------------------------------+

  +-------------+     +-------------+     +-------------+     +-------------+
  |             |     |             |     |             |     |             |
  |    ADMIN    |     | DISPATCHER  |     | TECHNICIAN  |     |  CUSTOMER   |
  |             |     |             |     |             |     |             |
  +-------------+     +-------------+     +-------------+     +-------------+
        |                   |                   |                   |
        v                   v                   v                   v
  +-----------+       +-----------+       +-----------+       +-----------+
  | All chats |       | All lead  |       | Assigned  |       | Own chat  |
  | & threads |       | chats     |       | job chats |       | thread    |
  +-----------+       +-----------+       +-----------+       +-----------+
        |                   |                   |                   |
        v                   v                   v                   v
  +-----------+       +-----------+       +-----------+       +-----------+
  | Internal  |       | Public    |       | Customer  |       | Via magic |
  | & visible |       | chat      |       | & internal|       | link or   |
  | threads   |       | incoming  |       | threads   |       | session   |
  +-----------+       +-----------+       +-----------+       +-----------+
```

## API Integration Flow

```
+------------------------------------------------------------------+
|                      PUBLIC CHAT API FLOW                         |
+------------------------------------------------------------------+

  CUSTOMER BROWSER                          SERVER
  ================                          ======

  1. POST /api/public/chat/start
     {name, phone, message}
                    ----------------------->
                                            Create Lead
                                            Create Thread
                                            Create Session
                                            Add Dispatchers
                    <-----------------------
     {sessionToken, leadId, threadId}

  2. GET /api/public/chat/messages?token=xxx
                    ----------------------->
                                            Validate Token
                                            Fetch Messages
                    <-----------------------
     [messages array]

  3. POST /api/public/chat/send
     {token, body, client_msg_id}
                    ----------------------->
                                            Validate Token
                                            Store Message
                                            Notify Dispatchers
                    <-----------------------
     {message object}
```

## Complete System Integration

```
+===========================================================================+
|                    COMPLETE CHAT SYSTEM ARCHITECTURE                       |
+===========================================================================+

                              +-------------------+
                              |                   |
                              |  PUBLIC WEBSITE   |
                              |    /chat page     |
                              |                   |
                              +--------+----------+
                                       |
                                       | Creates Lead
                                       v
+------------------+          +-------------------+          +------------------+
|                  |          |                   |          |                  |
|  LEAD SOURCES    | -------> |      LEADS        | -------> |     QUOTES       |
|                  |          |                   |          |                  |
|  - Website Chat  |          |  Chat thread      |          |  Same thread     |
|  - Phone Calls   |          |  initiated here   |          |  continues       |
|  - Thumbtack     |          |                   |          |                  |
|  - Angi          |          +-------------------+          +------------------+
|  - Manual Entry  |                   |                              |
+------------------+                   |                              |
                                       v                              v
                              +-------------------+          +------------------+
                              |                   |          |                  |
                              |  CHAT THREADS     |          |      JOBS        |
                              |                   |          |                  |
                              |  - Customer-      |          |  Same thread     |
                              |    visible        |          |  persists        |
                              |  - Internal       |          |                  |
                              +-------------------+          +------------------+
                                       |
              +------------------------+------------------------+
              |                        |                        |
              v                        v                        v
     +----------------+       +----------------+       +----------------+
     |                |       |                |       |                |
     |  DISPATCHER    |       |  TECHNICIAN    |       |   CUSTOMER     |
     |  CHAT PAGE     |       |  CHAT PAGE     |       |   CHAT ACCESS  |
     |                |       |                |       |                |
     |  See all leads |       |  See assigned  |       |  Via magic     |
     |  & public      |       |  jobs          |       |  links or      |
     |  chats         |       |                |       |  public chat   |
     +----------------+       +----------------+       +----------------+

+===========================================================================+
|                         NOTIFICATION CHANNELS                              |
+===========================================================================+

     +----------------+       +----------------+       +----------------+
     |                |       |                |       |                |
     |  IN-APP        |       |  EMAIL         |       |  SMS           |
     |  NOTIFICATIONS |       |  (Resend API)  |       |  (Twilio/      |
     |                |       |                |       |   SignalWire)  |
     +----------------+       +----------------+       +----------------+
```

## Session Token Lifecycle

```
+------------------------------------------------------------------+
|                    SESSION TOKEN LIFECYCLE                        |
+------------------------------------------------------------------+

  Customer starts chat
         |
         v
  +------------------+
  |  Generate token  |
  |  (256-bit random)|
  +------------------+
         |
         v
  +------------------+
  |  Hash token      |
  |  (SHA-256)       |
  +------------------+
         |
         +-----------------+
         |                 |
         v                 v
  +------------------+  +------------------+
  |  Store hash in   |  |  Return plain    |
  |  database with   |  |  token to        |
  |  7-day expiry    |  |  customer        |
  +------------------+  +------------------+
                               |
                               v
                        +------------------+
                        |  Customer stores |
                        |  in sessionStorage|
                        +------------------+
                               |
                               v
                        +------------------+
                        |  Token used for  |
                        |  all subsequent  |
                        |  API calls       |
                        +------------------+
                               |
                               v
                        +------------------+
                        |  After 7 days:   |
                        |  Token expires,  |
                        |  customer must   |
                        |  start new chat  |
                        +------------------+
```
