# Civis v4 — Agent Handoff

**Target app:** `civic-agent-hackathon/`  
**Last updated:** 2026-05-23  
**Status:** Demo-ready MVP — Alexia-style dashboard + sidebar shell, V2 wizards ported, enriched workflows on high-traffic flows. Remaining work is polish (health strip, motion, content depth on ~13 flows, offline banner).

**Recent commits:** `feat: update, use alexia UX` · `feat: main page redisign`

---

## 1. Product goal

Build **Civis**, a Romanian civic agent for elderly and mobile-first users that:

1. **Extreme accessibility** — Senior Mode, high contrast, dyslexic font, read-aloud, large touch targets (WCAG 2.1 AA minimum).
2. **Zero-GDPR local vault** — Profile + document metadata/previews in `localStorage` only; never upload CNP or document bytes to AI or backend.
3. **Hybrid intelligence** — Instant static workflows for common procedures; Gemini chat for niche questions with function calling to open guides.

**Do not edit source prototypes.** Read-only reference:

| Folder | Actual role (on disk) |
|--------|------------------------|
| `../civic-agent-alex/` | **V3** — TanStack Start, Zustand vault, Gemini chat, glass UI, a11y CSS, `govApiMock.ts` |
| `../civic-agent-buian/Civic Guide AI/` | **V2** — Supabase + Lovable AI + **curated step content** (`flows-catalog.ts`), PFA wizard, antecontract, step actions |
| `../civic-agent-alexia/` | **V1** — Next.js + FastAPI + **PaddleOCR document pipeline** (Python); minimal consumer UI |

The initial brief mapped V1→design, V2→vault, V3→chat. **Reality is inverted:** V3 already had design + vault + chat; V2 has the richest workflow UX content; V1 has real OCR logic (ported client-side).

---

## 2. What exists today (honest inventory)

### Shipped and working

| Area | What you get |
|------|----------------|
| **Routes** | `/`, `/login`, `/verify`, `/vault`, `/tasks`, `/scan`, `/settings`, `/workflow/$id`, `/workflow/$id/pfa`, `/workflow/$id/antecontract`, `/auth/eidkit/callback` |
| **Shell (Alexia UX)** | Desktop `AppSidebar` + mobile pill nav; `PageHeader` on main pages; global Civis FAB + drawer chat; tricolor accent |
| **Dashboard (`/`)** | Time-of-day greeting, KPI cards (tasks, docs, profile, locality), contextual alerts (expiring docs, profile nudge, ANAF season), ask-Civis search + voice, quick procedures, active tasks, vault/scan shortcuts |
| **Auth** | Mock email login + 6-digit OTP (any code passes); demo seed on `test@gmail.com`. **Optional** Supabase OTP when `VITE_SUPABASE_*` configured. **Optional** [EidKit](https://eidkit.ro/sso) CEI/NFC login when `VITE_EIDKIT_*` configured |
| **Vault** | Zustand `civis-vault` — profile + documents; upload runs local OCR/classify; CNP validators; completeness progress bar |
| **Tasks** | Per-step completion checkboxes; syncs with workflow page; inline step titles |
| **Workflows** | **19** procedures in `govApiMock.ts`; step UI with mode chips, fee/duration, accordions, offline checklist download |
| **PFA wizard** | `/workflow/pfa-registration/pfa` — CAEN suggest (RAG or local fallback), declarație PDF |
| **Antecontract** | `/workflow/property-sale/antecontract` — form pre-filled from vault, PDF draft |
| **Step actions** | `StepActionButton` — deep links, institution finder (maps dialog), online banks, PDF, CAEN/RAG explain → chat |
| **Chat** | Gemini 2.5 Flash, markdown, `open_workflow`, `verify_cui` (real ANAF API), `find_caen` / RAG CAEN, Google grounding, speech input, **localStorage history** |
| **Scan** | Laser animation + **V1-derived** Tesseract OCR + classifier + field extract + add to vault |
| **Gov data** | Live ANAF CUI lookup; live favicon probes in `serviceHealth.ts` (component exists, see gaps) |
| **PDF** | Client-side antecontract + declarație PFA via `pdf-lib`; **[Tipizatul.eu](https://www.tipizatul.eu/)** links for official fillable forms per workflow |
| **A11y** | Senior/high-contrast/dyslexic/read-aloud CSS + `AccessibilityMenu` |
| **Design** | V3 tokens in `src/styles.css`; Alexia-inspired calmer dashboard cards |

### Partially merged / still thin

| Expected from sources | Current state |
|----------------------|---------------|
| V2 **dedicated chat page** with conversation list | Global drawer only (V3 pattern) |
| V2 **profile page** layout | Vault has validators + progress; not V2’s richer profile shell |
| V2 **flows index** / marketing landing | No public landing; dashboard is home |
| V1 **document quality rejection UX** | Pipeline exists; scan/vault feedback is mostly toasts |
| **`ServiceHealthStrip`** | Built + probed live; **not mounted** on dashboard (regression from old V3 home) |
| **`CivicHero` / `CivicCalendar`** | Components exist; dashboard uses new Alexia layout instead |
| **framer-motion** | In `package.json` but **unused** in components (CSS `animate-*` used instead) |
| **i18n** | Scaffold only (`lib/i18n.ts`); JSX still hardcoded Romanian |
| **Workflow content depth** | ~8 flows richly enriched; ~11 still generic step cards |

### Known gaps (user-visible)

- **No offline / no-AI banner** — dashboard shows “Asistent AI indisponibil” in card subtitle only; FAB hidden when no Gemini key; static `resolveQuery` still works from search.
- **Portal health strip missing from home** — `ServiceHealthStrip` not imported on `/`.
- **`info[]` accordions** only where steps have `info` — most non-enriched workflows look plain.
- **PDF templates** strip Romanian diacritics (pdf-lib Helvetica limitation).
- **README stale** — still claims scan is “animation-only”; real OCR runs in-browser.

---

## 3. Architecture (target app)

```
civic-agent-hackathon/
├── HANDOFF.md                 ← this file
├── README.md
├── .env.example               ← placeholders only; NO secrets
├── package.json
├── vite.config.ts             ← @lovable.dev/vite-tanstack-config
├── components.json            ← shadcn
└── src/
    ├── routes/                ← TanStack file routes
    │   ├── index.tsx          ← Alexia-style dashboard
    │   ├── workflow.$id.tsx
    │   ├── workflow.$id.pfa.tsx
    │   └── workflow.$id.antecontract.tsx
    ├── components/
    │   ├── app-shell.tsx      ← sidebar shell, Civis FAB, a11y menu
    │   ├── dashboard/         ← app-sidebar.tsx, page-header.tsx
    │   ├── civis-chat.tsx     ← global drawer chat
    │   ├── workflow/step-action-button.tsx
    │   ├── service-health-strip.tsx  ← built, not on /
    │   └── ui/                ← shadcn primitives
    ├── store/                 ← Zustand slices (persisted except chatUi)
    │   ├── auth.ts            ← mock + optional Supabase session
    │   ├── vault.ts
    │   ├── tasks.ts
    │   ├── settings.ts
    │   ├── accessibility.ts
    │   ├── chatUi.ts
    │   └── index.ts
    ├── services/
    │   ├── govApiMock.ts      ← workflow catalog + resolveQuery + STEP_ENRICHMENTS
    │   ├── geminiChat.ts      ← streaming + tools
    │   ├── anaf.ts            ← real ANAF TVA API
    │   ├── caen.ts            ← local CAEN search (~70 codes)
    │   ├── rag.ts             ← optional Supabase RAG (CAEN + step explain); local fallback
    │   ├── eidkitAuth.ts      ← optional CEI/NFC OIDC login (EidKit)
    │   ├── tipizatul.ts       ← workflow → Tipizatul.eu form links
    │   ├── supabaseClient.ts  ← optional; anon key only
    │   ├── supabaseAuth.ts    ← optional OTP auth
    │   ├── deepLinks.ts
    │   ├── onlineBanks.ts
    │   ├── findInstitution.ts ← maps/institution finder for step actions
    │   ├── serviceHealth.ts   ← live portal favicon probes
    │   ├── docIntelligence/   ← client OCR pipeline (V1 port)
    │   └── pdf/               ← antecontract, declaratiePfa
    ├── hooks/                 ← speech, read-aloud, mobile
    ├── lib/                   ← demoSeed, profileValidation, i18n, utils
    └── styles.css             ← design tokens + a11y modes
```

### State — localStorage keys

| Key | Slice | Contents |
|-----|-------|----------|
| `civis-auth` | auth | email, session flags, optional `authProvider: mock \| supabase` |
| `civis-vault` | vault | **CNP, profile, document previews (base64)** |
| `civis-tasks` | tasks | active workflows + `completedSteps[]` |
| `civis-settings` | settings | seniorMode |
| `civis-a11y` | accessibility | contrast, dyslexic, read-aloud, language |
| `civis-chat-history` | (chat component) | last 60 messages (no live ANAF/CAEN cards) |

### Privacy guardrails (non-negotiable)

- Never send document files or full CNP to Gemini — system prompt masks CNP; chat has no file upload.
- Vault OCR runs in-browser (`tesseract.js`); no server upload path for documents.
- Supabase RAG (when enabled) sends **activity descriptions / step topics only** — queries sanitize 13-digit CNP patterns; vault bytes never leave the browser.
- Move Gemini key to server proxy before production (`geminiChat.ts` documents the swap point).

---

## 4. Workflow catalog (19 IDs)

Core hackathon set:

- `car-registration-2nd-hand`, `renew-driver-license`, `pfa-registration`, `passport-issuance`, `cadastral-registration`, `anaf-declaration`, `id-change-relocation`, `birth-certificate`, `civil-marriage`, `police-clearance`

Also:

- `property-sale`, `vanzare-auto`, `foreign-license-exchange`, `child-state-allowance`, `building-permit`, `anaf-declaratie-unica`, `rovinieta-anuala`, `impozit-auto-trim-3`, `itp-anual`

**Fully enriched** (inline `info[]` + `actions[]` on most steps):

- `pfa-registration`, `property-sale`, `vanzare-auto`

**Enriched via `STEP_ENRICHMENTS`** (mode + info/actions on key steps):

- `car-registration-2nd-hand`, `renew-driver-license`, `passport-issuance`, `anaf-declaration`

**Still generic** (basic steps only):

- `foreign-license-exchange`, `id-change-relocation`, `police-clearance`, `birth-certificate`, `civil-marriage`, `child-state-allowance`, `building-permit`, `cadastral-registration`, `anaf-declaratie-unica`, `rovinieta-anuala`, `impozit-auto-trim-3`, `itp-anual`

Dedicated sub-routes:

- `/workflow/pfa-registration/pfa` — PFA wizard
- `/workflow/property-sale/antecontract` — antecontract form

---

## 5. How to run

```bash
cd civic-agent-hackathon
npm install
cp .env.example .env    # see §9 for optional keys
npm run dev
```

Typical URL: `http://localhost:8080/` or `http://localhost:3000/` (check terminal).

```bash
npm run typecheck   # should pass
npm run lint        # 0 errors; 6 shadcn react-refresh warnings OK
npm run build
```

**Dev server note:** Vite may need unsandboxed run (`os.networkInterfaces`) on some environments.

### Demo login

- Email: `test@gmail.com` → after OTP, `lib/demoSeed.ts` fills vault with Andrei Popescu + 5 documents (ID expiring in ~35 days). Demo account always uses mock auth even if Supabase is configured.

### Recommended demo script (5–7 min)

1. Login `test@gmail.com` → OTP → dashboard shows expiring-ID alert + stats.
2. `/vault` — invalid CNP shows control-digit error; valid CNP shows green “valid”.
3. `/workflow/property-sale` — accordions + action buttons → **Formular antecontract** → PDF.
4. `/workflow/pfa-registration/pfa` — describe activity → CAEN suggest → declarație PDF.
5. Chat (with `VITE_GEMINI_API_KEY`) — “verifică CUI 14399840” → ANAF card; “PFA software” → CAEN list.
6. `/scan` — upload image → OCR progress → extracted fields → “Adaugă în seif”.
7. Home search without API key — static routing still opens matching workflow.

---

## 6. Source → target merge map

### From V3 (`civic-agent-alex`) — KEEP

- `styles.css`, a11y CSS, `civis-chat.tsx` drawer, `govApiMock.ts` + `geminiChat.ts`
- Zustand store pattern, mock 2FA, vault model
- `accessibility-menu.tsx`, design tokens, tricolor accent

**Replaced on dashboard:** glass bottom nav → Alexia sidebar + pill nav; `CivicHero` → new `index.tsx` layout.

### From V2 (`civic-agent-buian`) — PORT status

| V2 asset | Path | Status |
|----------|------|--------|
| Step `info[]` + `actions[]` | `flows-catalog.ts` | **Partial** — 8/19 flows enriched |
| PFA wizard | `flows.$flowId.pfa.tsx` | **Done** — `/workflow/$id/pfa` |
| Antecontract preview | `flows.$flowId.antecontract.tsx` | **Done** — `/workflow/$id/antecontract` |
| Flow step cards | `flows.$flowId.tsx` | **Done** — mode chips, accordions, actions |
| Profile page | `profile.tsx` | **Partial** — vault has completeness bar |
| Landing | `index.tsx` | Not ported |
| Chat page | `chat.tsx` | Not ported (drawer only) |
| Supabase RAG | server functions | **Optional** — `rag.ts` with local fallback |
| Supabase auth | auth flow | **Optional** — `supabaseAuth.ts`; demo stays mock |

**Not ported from V2:** Lovable AI gateway, server-side pgvector pipeline as required path.

### From V1 (`civic-agent-alexia`) — PORT status

| V1 asset | Path | Status |
|----------|------|--------|
| OCR pipeline | `document_intelligence/` | **Done** — `services/docIntelligence/` |
| Dashboard layout | web dashboard | **Done** — Alexia-style `/` with KPI cards + alerts |
| Document quality UX | rejection copy | **Partial** — toasts only |
| Workflow templates | `workflow_generator.py` | Partial — some EN/generic steps remain |

**Discard from V1:** Next.js app, FastAPI, PostgreSQL, PaddleOCR server.

Reference only (do not modify):

- `../civic-agent-buian/Civic Guide AI/src/lib/flows-catalog.ts`
- `../civic-agent-buian/Civic Guide AI/src/components/flow/StepActionButton.tsx`
- `../civic-agent-alexia/apps/api/app/services/document_intelligence/`

---

## 7. Recommended next work (priority order)

### P0 — Demo finish (half day)

1. **Mount `ServiceHealthStrip`** on `/` — live portal status is a strong demo beat; component exists.
2. **Offline / no-AI banner** on home when `VITE_GEMINI_API_KEY` missing — explain static routing + search still work.
3. **Set `.env`** — `VITE_GEMINI_API_KEY` required for full AI demo; Supabase optional for RAG/OTP.
4. **Fix README** — scan runs real OCR; document new routes and optional Supabase.
5. **Rehearse demo script** (§5).

### P1 — Content + polish (1–2 days)

6. **Enrich remaining ~11 workflows** — port V2 `flows-catalog.ts` into `govApiMock.ts` (priority: `id-change-relocation`, `cadastral-registration`, `building-permit`, `foreign-license-exchange`).
7. **Homepage visual pass** — plan `plans/homepage-design-refresh_04.plan.md` (calmer colors, less gradient noise).
8. **Vault/scan rejection UX** — surface quality scores and type-mismatch copy prominently.
9. **framer-motion** — page transitions, step stagger (CSS animations exist but motion lib unused).

### P2 — Post-hackathon

10. Wire `useT()` into nav labels and vault/chat headers.
11. Server-side Gemini proxy (Cloudflare/TanStack server fn).
12. Dedicated full-page chat with history sidebar.
13. E2E smoke tests for vault persist + workflow completion.
14. PDF font with Romanian diacritics support.

---

## 8. Key files to read first

| File | Why |
|------|-----|
| `src/routes/index.tsx` | Alexia dashboard — alerts, search, KPIs |
| `src/components/app-shell.tsx` | Sidebar shell + chat FAB |
| `src/components/dashboard/app-sidebar.tsx` | Desktop nav |
| `src/components/civis-chat.tsx` | Chat UX + persistence + tools + RAG CAEN |
| `src/services/govApiMock.ts` | Workflow truth + `STEP_ENRICHMENTS` |
| `src/services/geminiChat.ts` | AI contract + privacy prompt |
| `src/routes/workflow.$id.tsx` | Step UI + completion |
| `src/routes/workflow.$id.pfa.tsx` | PFA wizard |
| `src/routes/workflow.$id.antecontract.tsx` | Antecontract form |
| `src/components/workflow/step-action-button.tsx` | Per-step action dispatcher |
| `src/store/vault.ts` | Privacy-critical data |
| `src/services/docIntelligence/pipeline.ts` | Scan/upload brain |
| `src/services/rag.ts` | Optional Supabase RAG + fallbacks |

---

## 9. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_GEMINI_API_KEY` | No (chat FAB disabled without) | Browser Gemini — **rotate if leaked** |
| `VITE_SUPABASE_URL` | No | Optional RAG + OTP auth |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | No | Alias for anon key |
| `VITE_EIDKIT_CLIENT_ID` | No | EidKit OIDC client — [dashboard.eidkit.ro](https://dashboard.eidkit.ro/) |
| `VITE_EIDKIT_CLIENT_SECRET` | No | EidKit token exchange (dev `.env` only; use server proxy in production) |

**EidKit redirect URI** must match exactly: `{origin}/auth/eidkit/callback`

Production: never commit `.env`. `.env.example` uses empty placeholders only.

---

## 10. Git / commits

- Target repo has its own `.git`; source repos are separate.
- Recent: `989231e` main page redesign · `f08c6b6` alexia UX + wizards + Supabase optional layer.
- Verify `.gitignore` covers `.env` before push.

---

## 11. Verification snapshot (last run)

- `npm run typecheck` → **0 errors**
- `npm run lint` → **0 errors**, 6× `react-refresh/only-export-components` in shadcn ui files (acceptable)
- Dev server → HTTP 200 on `/`

---

## 12. One-paragraph summary for the next agent

**Civis v4 is a V3 fork with visible Alexia dashboard UX and substantial V2 merges:** sidebar shell, enriched workflow steps (mode chips, accordions, actions), PFA wizard and antecontract routes, `vanzare-auto` workflow, optional Supabase RAG/auth with local fallbacks, plus the earlier invisible wins (ANAF, client OCR, PDF, CAEN). The app is **demo-ready** with a Gemini key. Top gaps: mount `ServiceHealthStrip` on home, add offline-AI banner, enrich ~11 generic workflows, fix stale README. Do not touch the three source prototype directories. Vault stays local-only; Supabase is optional enhancement only.
