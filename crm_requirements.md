# CRM Module — Requirements & Implementation Plan

**Stack:** React + FastAPI | Part of Business Suite (HR, Accounts, Tasks, CRM)  
**Architecture:** Independent module, communicates via internal Event Bus

---

## Module Structure

```
backend/modules/crm/
├── models/         # SQLAlchemy / Pydantic models
├── routes/         # FastAPI routers
├── middleware/     # Auth, permission checks
├── services/       # Business logic
├── events/         # Event bus publishers & consumers
└── schemas/        # Request/response schemas

frontend/src/modules/crm/
├── pages/
├── components/
├── store/          # Zustand / Redux slice
├── api/            # Axios service layer
└── types/
```

---

## Phase 1 — Contacts ✅

> Central entity. Every person/company your business interacts with.

### 1.1 Core Contact Record ✅
- **Required fields:** Name + (Email OR Phone — at least one mandatory)
- **Standard fields:** Company, Job Title, Address, Notes, Tags, Avatar
- **Dynamic fields:** User-defined key-value pairs stored as a JSON array
  ```
  custom_fields: [{ label: "Budget", value: "$10k" }, { label: "Source", value: "Referral" }]
  ```
- ✅ **Implemented:** SQLAlchemy model with JSON fields, Pydantic schemas, API endpoints

### 1.2 Dynamic Field Management ✅
- Add/remove/reorder custom fields per contact at any time
- Field types: text, number, date, URL, dropdown (future)
- No schema migration needed — stored as flexible JSON column
- ✅ **Implemented:** Frontend form UI allows adding/removing/editing custom fields dynamically

### 1.3 Contact Actions ✅
- Create contact (standalone or from Lead conversion)
- Edit, archive, delete
- Merge duplicate contacts
- Add activity log (call, email, meeting, note) — timeline view
- Attach files/documents
- ✅ **Implemented:** Create, Read, Update, Delete, Archive endpoints; Contact merge endpoint; Activity logging with timeline component

### 1.4 Contact List View ✅
- Search, filter by tags/source/status
- Sortable columns
- Bulk actions: tag, assign, export
- ✅ **Implemented:** Table view with search, tag filtering, bulk select, inline actions (edit, archive, delete)

---

## Phase 2 — Leads (Pipeline Entries)

> A Lead is a potential deal/opportunity being tracked through a sales process.

### 2.1 Lead Creation ✅
- ✅ Create directly from scratch
- ✅ Create from a Contact (auto-links, prefills name/email/phone)
- ✅ Required: Title + Contact link (or inline contact creation)
- Optional: Value, Expected Close Date, Assignee, Source, Notes

### 2.2 Lead Statuses (Kanban Phases)
- Backend pipeline/phase support exists; pipeline editor UI is pending
- Default phases (editable): `New → Contacted → Qualified → Proposal → Negotiation → Won / Lost`
- ✅ Each phase has: name, color, order index, is_terminal flag (Won/Lost)
- ✅ Phases are **pipeline-scoped** (different pipelines have different phases)

### 2.3 Kanban Board ✅
- ✅ Drag-and-drop board UI for phase movement
- ✅ Card view with value, assignee, and converted badge
- ✅ Phase column shows count and total value
- Pending: event bus notifications

### 2.4 Lead Detail View ✅
- ✅ Notes + detail panel
- ✅ Timeline of lead events (creation, phase changes, conversion)
- ✅ Linked contact and pipeline info
- Pending: convert lead → Client (Phase 4)

### 2.5 Lead Filters & Views ✅
- ✅ Filter by pipeline, phase, assignee, date range, value range
- ✅ Switch between Kanban and List views
- Pending: saved filters / personal views

---

## Phase 3 — Pipelines (In progress)

> A Pipeline is a named workflow that organizes Leads through defined phases.

### 3.1 Pipeline Management
- [x] Create multiple pipelines (e.g., Sales, Partnerships, Enterprise)
- [x] Each pipeline has its own independent set of phases
- [ ] Set a default pipeline
- [ ] Archive/delete pipelines (with lead migration prompt)

### 3.2 Pipeline Configuration
- [x] Name, description, owner/team
- [x] Phase setup (order, color, terminal flags) — managed per pipeline
- [ ] Visibility: private / team / org

### 3.3 Pipeline Dashboard
- [ ] Per-pipeline summary: total leads, total value, conversion rate by phase
- [ ] Funnel chart showing drop-off per stage

> Phase 3 will be marked ✅ once all subphases above are completed.

---

## Phase 4 — Clients

> A Client is a Contact/Lead that has been converted (deal won or relationship established).

### 4.1 Client Record
- Converted from Lead (one-click) or created directly
- Inherits all contact data + custom fields
- Adds: Client Since date, Account Manager, Tier (Standard/Premium/VIP), Status (Active/Inactive/Churned)

### 4.2 Client Management
- Activity history (from lead + ongoing)
- Linked deals/projects (hooks into other modules via event bus)
- Renewal / subscription tracking fields
- Notes pinning and internal tagging

### 4.3 Client List
- Filter by tier, status, account manager
- Revenue tracking fields (manual entry or Accounts module sync)

---

## Phase 5 — Activities & Timeline

> Shared across Contacts, Leads, and Clients.

### 5.1 Activity Types
- Note, Call, Email, Meeting, Task (linked to Tasks module), File Upload

### 5.2 Timeline
- Chronological feed on every entity
- Automatic entries: status change, field edit, assignment change
- Manual entries: any activity type above

### 5.3 Reminders & Follow-ups
- Set follow-up date on any activity
- Triggers notification (in-app; email in future)

---

## Phase 6 — Settings & Configuration

### 6.1 Pipeline & Phase Editor
- Drag-to-reorder phases
- Inline rename, color picker, terminal flag toggle
- Warn before deleting a phase with active leads

### 6.2 Custom Field Templates
- Save commonly used field sets as templates
- Apply a template when creating contacts

### 6.3 Tags & Sources Management
- CRUD for contact/lead tags and source labels

### 6.4 User Permissions (via HR module event)
- Roles: CRM Admin, Sales Manager, Sales Rep, View Only
- Scoped access: own leads only vs all leads

---

## Event Bus Integration

| Event | Publisher | Consumers |
|---|---|---|
| `crm.lead.status_changed` | CRM | Tasks (auto-task), Notifications |
| `crm.lead.converted` | CRM | Accounts (new client billing record) |
| `crm.contact.created` | CRM | HR (if internal contact type) |
| `task.completed` | Tasks | CRM (log on lead timeline) |
| `hr.user.deactivated` | HR | CRM (reassign leads) |

---

## API Route Map (FastAPI)

```
/crm/contacts          GET, POST
/crm/contacts/{id}     GET, PUT, DELETE
/crm/contacts/{id}/activities   GET, POST

/crm/leads             GET, POST
/crm/leads/{id}        GET, PUT, DELETE
/crm/leads/{id}/move   PUT  (change phase)
/crm/leads/{id}/convert  POST (→ client)

/crm/pipelines         GET, POST
/crm/pipelines/{id}    GET, PUT, DELETE
/crm/pipelines/{id}/phases  GET, POST, PUT, DELETE

/crm/clients           GET, POST
/crm/clients/{id}      GET, PUT, DELETE

/crm/settings/tags     GET, POST, DELETE
/crm/settings/sources  GET, POST, DELETE
```

---

## Frontend Page Map (React)

```
/crm                        → Dashboard (summary cards + funnel)
/crm/contacts               → Contact list
/crm/contacts/:id           → Contact detail + timeline
/crm/leads                  → Kanban board (default pipeline)
/crm/leads?pipeline=:id     → Kanban for specific pipeline
/crm/leads/:id              → Lead detail
/crm/clients                → Client list
/crm/clients/:id            → Client detail
/crm/settings/pipelines     → Pipeline & phase editor
/crm/settings/fields        → Custom field templates
```

---

## Key Technical Notes

- **Dynamic phases:** store as ordered list in DB with `position` int; reorder via bulk PATCH
- **Custom fields:** `jsonb` column (Postgres) on Contact — no extra tables needed
- **Kanban drag:** optimistic UI update → confirm with API → rollback on failure
- **Lead ↔ Contact link:** FK on Lead; contact not required for standalone leads (edge case)
- **Event bus:** use internal pub/sub (Redis Pub/Sub or lightweight in-process broker) — same pattern as other modules
