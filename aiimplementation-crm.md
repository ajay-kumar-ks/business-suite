# CRM AI Implementation — Google AI Studio

## Phase 1 — Lead Scoring & Prioritization ✅
- AI scores each lead (0–100) based on value, expected_close_date, contact company size, source, phase position, and history velocity
- Kanban cards show score badge; column sorts by score
- Flags hot leads (score > 80) with a badge
- API: POST /crm/leads/{id}/score → returns { score, reason }

## Phase 2 — Smart Lead Assignment ✅
- When creating a lead, AI analyzes title, value, source, notes → cross-references pipeline's assigned department members
- Considers each member's current workload (lead count in pipeline) and role fit
- Returns top 3 suggestions with confidence % and reasons
- Shown in LeadForm assignee dropdown as "AI Suggested" section with confidence badges (green 80+, yellow 60+, orange below)
- Fallback to workload-balanced sorting if Gemini API unavailable
- API: POST /crm/ai/suggest-assignee → returns { suggestions: [{employee_id, name, confidence, reason, current_load}] }

## Phase 3 — Next-Best-Action Recommendation ✅
- For any lead, AI reads full context: current phase, days in pipeline, deal value, recent activity history, notes, source
- Suggests single most impactful next action with urgency badge (high=red, medium=amber, low=green)
- Shows as a prominent card in LeadDetailModal with sparkle icon, action name, justification, and "Move to phase" button
- Action button calls the existing onMove handler to execute phase transitions
- Fallback handles stalled leads, high-value leads, and early-stage leads
- API: POST /crm/ai/next-action → returns { action, description, suggested_phase_id, urgency }

## Phase 4 — Smart Pipeline Health Dashboard ✅
- Pure rule-based analysis (no Gemini cost): stalled leads, bottlenecks, conversion rates, total pipeline value
- Uses lead updated_at for stalled detection (>7 days in non-terminal phases)
- Collapsible insights panel above kanban board with severity badges (critical=red, warning=amber, info=purple)
- "View" filter button on each insight that filters the kanban board to show only relevant leads
- Insights auto-refresh when pipeline selection changes
- API: POST /crm/ai/pipeline-insights?pipeline_id=X → returns { insights: [{severity, message, count, filter_query}] }
