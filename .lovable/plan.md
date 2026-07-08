## Outreach Module — Complete Redesign Plan

Rebuild the Outreach module as a Campaign Management Workspace while preserving the existing design system (Apple HIG, black/white, rounded cards, current sidebar/dashboard/analytics untouched).

### 1. Database (Supabase migration)

New tables (all with RLS scoped to `auth.uid()`, GRANTs to `authenticated` + `service_role`):

- `campaigns` — name, description, status (draft/running/paused/completed/archived), sender_account, daily_limit, working_days[], working_hours_start/end, timezone, launched_at, user_id
- `sequence_steps` — campaign_id, step_order, type (visit_profile/connection_request/message), delay_hours, config (jsonb: message body, ai-generated flag, variables, human_delay, etc.)
- `campaign_leads` — campaign_id, lead_id, current_step, status (pending/running/connected/replied/meeting/not_interested/completed), next_action_at, last_activity_at, paused
- Extend `leads` with: headline, country, company_size, profile_image, lead_score, source ('manual_import')
- `campaign_events` — campaign_id, lead_id, step_id, event_type (visited/invite_sent/invite_accepted/message_sent/replied/meeting_booked), payload jsonb, occurred_at

Keeps existing `leads`, `conversations`, `messages`, `meetings`, `activity_log` intact and wires them together.

### 2. Routes (replacing current `_app.outreach.tsx`)

```
/outreach                    → Campaigns list (cards + filters + Create)
/outreach/$campaignId        → Workspace shell with 4 tabs
  ├─ ?tab=sequence           → Sequence Builder (Visit → Connect → Message blocks)
  ├─ ?tab=leads              → Lead List (table, filters, import panel)
  ├─ ?tab=launch             → Launch confirmation screen
  └─ ?tab=performance        → Analytics (funnel, KPIs, timeline, export)
```

Also remove/disable automatic lead discovery hooks so leads only enter via manual import inside a campaign.

### 3. Server functions (`src/lib/campaigns.functions.ts`, `sequences.functions.ts`, `campaign-leads.functions.ts`)

All use `requireSupabaseAuth`:
- listCampaigns, getCampaign, createCampaign, updateCampaign, duplicateCampaign, pauseCampaign, resumeCampaign, archiveCampaign, deleteCampaign
- getSequence, upsertSequenceSteps, generateConnectionNote (AI), generateMessage (AI, uses sales_brain + knowledge_docs)
- importLeadsCsv, importLeadsUrls, importLeadManual, extractLeadMetadata (AI)
- launchCampaign — flips status to running, enqueues to n8n via webhook
- getCampaignPerformance — funnel + KPIs from `campaign_events`

### 4. n8n integration

- New server route `src/routes/api/public/webhooks/n8n-events.ts` — verifies `AUTOMATION_WEBHOOK_SECRET`, upserts events into `campaign_events`, updates `campaign_leads` status, on `replied` moves lead into `conversations` + updates `leads.status`.
- `launchCampaign` POSTs to `N8N_TRIGGER_URL` (new secret) with campaign_id + HMAC signature. If missing, campaign still launches (status running) and shows a "waiting for automation engine" banner.

### 5. UI components (new, under `src/components/outreach/`)

- `CampaignCard`, `CampaignFilters`, `CreateCampaignDialog`
- `WorkspaceTabs`, `SequenceBuilder` (vertical blocks with connectors), `StepEditor` (visit/connect/message variants), `AiGenerateButton`
- `LeadImportPanel` (4 tabs: CSV / Paste URLs / Manual / Bulk), `LeadListTable`
- `LaunchPanel` (preview + checkbox + Launch button)
- `PerformanceDashboard` (funnel, KPI cards, timeline, export CSV)

All styled with existing tokens (rounded-2xl cards, subtle borders, soft shadows, Inter type) — no new design language.

### 6. AI wiring

Reuse `src/lib/ai/gateway.server.ts`. New helpers generate connection notes (≤300 chars) and messages using `sales_brain` + `knowledge_docs` + variables. Uses Lovable AI Gateway (google/gemini-2.5-flash for speed, google/gemini-2.5-pro for high-quality message generation). Every AI output remains editable in the UI.

### 7. Cleanup

- Delete/simplify old `_app.outreach.tsx` (replaced by new routes).
- Remove any auto-discovery triggers from `discovery` page or agent (keep the Discovery page pointing to manual import).
- Update sidebar label if needed (keep "Outreach" — no sidebar redesign).

### 8. Out of scope (per your instructions)

- No changes to Sidebar, Dashboard, Analytics, Knowledge Base, AI Sales Brain, Auth, or global styles.
- No actual LinkedIn API integration — n8n owns that. App is control plane only.

---

### Scope reality check

This is a very large build (1 migration, ~4 new routes, ~10+ new components, ~15 server functions, 1 webhook, n8n trigger). It will take multiple turns and consume significant credits. I'll build in this order so each step is usable on its own:

1. Migration + types
2. Campaigns list + Create modal
3. Campaign workspace shell + Lead Import + Lead List
4. Sequence Builder + AI generation
5. Launch + n8n trigger + webhook
6. Performance dashboard

Reply **approve** to start with step 1 (migration). If you'd rather I ship a smaller first slice (e.g., just Campaigns page + Create), say so.