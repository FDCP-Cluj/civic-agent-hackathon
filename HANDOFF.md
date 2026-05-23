# Civis v4 — Agent Handoff

**Target app:** `civic-agent-hackathon/`  
**Last updated:** 2026-05-23  
**Status:** Functional MVP with deep backend/services merge; **UI/UX still reads mostly like V3** — next owner should treat UI hybridization as the top priority.

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
| **Routes** | `/`, `/login`, `/verify`, `/vault`, `/tasks`, `/scan`, `/settings`, `/workflow/$id` |
| **Auth** | Mock email login + 6-digit OTP (any code passes); demo seed on `test@gmail.com` |
| **Vault** | Zustand `civis-vault` — profile + documents; upload runs local OCR/classify; CNP validators |
| **Tasks** | Per-step completion checkboxes; syncs with workflow page |
| **Workflows** | 18 procedures in `govApiMock.ts`; `pfa-registration` + `property-sale` have V2-style `info[]` + `actions[]` |
| **Step actions** | `StepActionButton` — deep links, maps, online banks, PDF, CAEN, explain → chat |
| **Chat (V3)** | Gemini 2.5 Flash, markdown, `open_workflow`, `verify_cui` (real ANAF API), `find_caen` (local nomenclature), Google grounding, speech input, **localStorage history** |
| **Scan** | V3 laser animation + **V1-derived** Tesseract OCR + classifier + field extract |
| **Gov data** | Live ANAF CUI lookup; live favicon probes for portal health strip |
| **PDF** | Client-side antecontract + declarație PFA drafts via `pdf-lib` |
| **A11y** | Senior/high-contrast/dyslexic/read-aloud CSS + `AccessibilityMenu` |
| **Design** | V3 tokens in `src/styles.css` — trust blue, glass nav, tricolor accent |

### Partially merged / invisible in UI

| Expected from sources | Current state |
|----------------------|---------------|
| V2 **PFA wizard** (`flows.$flowId.pfa.tsx`) | Not ported — only inline step actions on workflow page |
| V2 **dedicated chat page** with conversation list | Still global drawer only (V3 pattern) |
| V2 **profile page** layout / completeness UX | Vault has validators + progress bar; not V2’s richer profile shell |
| V2 **flows index** / marketing landing | No public landing; dashboard is home |
| V1 **document quality rejection UX** | Pipeline exists; scan/vault toasts are subtle |
| **framer-motion** | In `package.json` but **barely used** in components |
| **i18n** | Scaffold only (`lib/i18n.ts`); JSX still hardcoded Romanian |
| V2 **`vanzare-auto`** full step content | Not added as workflow (only `car-registration-2nd-hand` from V3) |

### Known gaps (user-visible)

- **UI feels like V3 with backend extras** — same shell, cards, typography; little visual lift from V2’s flow wizard density or V1’s dashboard polish.
- **`info[]` accordions** only on enriched workflows — most of the 18 guides still look like plain V3 step cards.
- **Chat without `VITE_GEMINI_API_KEY`** falls back to static `resolveQuery` only — FAB hidden, no obvious “offline mode” banner on home.
- **PDF templates** strip Romanian diacritics (pdf-lib Helvetica limitation).
- **`.env.example` may contain real keys** — sanitize before commit; rotate any exposed Gemini/Supabase/Maps keys.

---

## 3. Architecture (target app)

```
civic-agent-hackathon/
├── HANDOFF.md                 ← this file
├── README.md
├── .env.example               ← template only; NO secrets
├── package.json
├── vite.config.ts             ← @lovable.dev/vite-tanstack-config
├── components.json            ← shadcn
└── src/
    ├── routes/                ← TanStack file routes
    ├── components/
    │   ├── app-shell.tsx      ← glass bottom nav, Civis FAB, a11y menu
    │   ├── civis-chat.tsx     ← global drawer chat
    │   ├── workflow/step-action-button.tsx
    │   └── ui/                ← shadcn primitives
    ├── store/                 ← Zustand slices (persisted except chatUi)
    │   ├── auth.ts
    │   ├── vault.ts
    │   ├── tasks.ts
    │   ├── settings.ts
    │   ├── accessibility.ts
    │   ├── chatUi.ts
    │   └── index.ts
    ├── services/
    │   ├── govApiMock.ts      ← workflow catalog + resolveQuery
    │   ├── geminiChat.ts      ← streaming + tools
    │   ├── anaf.ts            ← real ANAF TVA API
    │   ├── caen.ts            ← local CAEN search (~70 codes)
    │   ├── deepLinks.ts
    │   ├── onlineBanks.ts
    │   ├── findInstitution.ts
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
| `civis-auth` | auth | email, mock session flags |
| `civis-vault` | vault | **CNP, profile, document previews (base64)** |
| `civis-tasks` | tasks | active workflows + `completedSteps[]` |
| `civis-settings` | settings | seniorMode |
| `civis-a11y` | accessibility | contrast, dyslexic, read-aloud, language |
| `civis-chat-history` | (chat component) | last 60 messages (no live ANAF/CAEN cards) |

### Privacy guardrails (non-negotiable)

- Never send document files or full CNP to Gemini — system prompt masks CNP; chat has no file upload.
- Vault OCR runs in-browser (`tesseract.js`); no server upload path.
- Do not wire Supabase/Lovable from V2 unless product direction changes away from local-only vault.
- Move Gemini key to server proxy before production (`geminiChat.ts` documents the swap point).

---

## 4. Workflow catalog (18 IDs)

Core hackathon set (all present):

- `car-registration-2nd-hand`, `renew-driver-license`, `pfa-registration`, `passport-issuance`, `cadastral-registration`, `anaf-declaration`, `id-change-relocation`, `birth-certificate`, `civil-marriage`, `police-clearance`

Also: `property-sale` (V2 merge), `foreign-license-exchange`, `child-state-allowance`, `building-permit`, `anaf-declaratie-unica`, `rovinieta-anuala`, `impozit-auto-trim-3`, `itp-anual`

**Enriched with V2 `info[]` + `actions[]`:** `pfa-registration`, `property-sale` only.

---

## 5. How to run

```bash
cd civic-agent-hackathon
npm install
cp .env.example .env    # add VITE_GEMINI_API_KEY only if you want chat
npm run dev
```

Typical URL: `http://localhost:8080/` (may vary; check terminal).

```bash
npm run typecheck   # should pass
npm run lint        # 0 errors; 6 shadcn react-refresh warnings OK
npm run build
```

**Dev server note:** Vite may need unsandboxed run (`os.networkInterfaces`) on some environments.

### Demo login

- Email: `test@gmail.com` → after OTP, `lib/demoSeed.ts` fills vault with Andrei Popescu + 5 documents (ID expiring in ~35 days).

### Quick manual QA

1. `/vault` — invalid CNP shows control-digit error; valid CNP shows green “valid”.
2. `/workflow/property-sale` — accordions + action buttons + PDF antecontract.
3. Chat (with API key) — “verifică CUI 14399840” → ANAF card; “PFA software” → CAEN list.
4. `/scan` — upload image → OCR progress → extracted fields → “Adaugă în seif”.
5. Dashboard — service health strip refreshes live; profile donut if vault incomplete.

---

## 6. Source → target merge map (for next UI pass)

Use this when making **visible** hybrid UI/UX.

### From V3 (`civic-agent-alex`) — KEEP as shell base

- `styles.css`, `app-shell.tsx`, glass nav, tricolor, `civis-chat.tsx` drawer
- `accessibility-menu.tsx`, senior mode CSS
- `civic-hero.tsx`, `service-health-strip.tsx`, `civic-calendar.tsx`
- Zustand store pattern, mock 2FA, vault model
- `govApiMock.ts` + `geminiChat.ts` routing

### From V2 (`civic-agent-buian`) — PORT for UX density

| V2 asset | Path | Target action |
|----------|------|---------------|
| Step `info[]` bullets | `src/lib/flows-catalog.ts` | Copy into **all** high-traffic workflows in `govApiMock.ts` |
| PFA wizard | `flows.$flowId.pfa.tsx` | New route or modal: CAEN picker, copy helpers, print declarație |
| Antecontract preview | `flows.$flowId.antecontract.tsx` | Rich form → PDF (beyond one-click draft) |
| Flow step cards | `flows.$flowId.tsx` | Merge expandable step UI + mode badges (online/in_person/hybrid) |
| Profile page | `profile.tsx` | Borrow section layout / completeness widget for `/vault` |
| Landing | `index.tsx` (authenticated off) | Optional marketing hero if needed |
| Chat page | `chat.tsx` | Optional full-page chat with history sidebar |

**Discard from V2:** Supabase auth, Lovable gateway, RAG/pgvector, server functions.

### From V1 (`civic-agent-alexia`) — PORT for trust / doc UX

| V1 asset | Path | Target action |
|----------|------|---------------|
| OCR pipeline logic | `apps/api/.../document_intelligence/` | Already in `services/docIntelligence/` — **surface** quality scores in scan UI |
| Romanian rejection copy | `expected_type.py` | Already ported — show prominently on vault upload failure |
| Dashboard document counts | web dashboard | Add vault doc count + task progress to home hero |
| Workflow templates | `workflow_generator.py` | Translate missing EN steps if any workflow still generic |

**Discard from V1:** Next.js app, FastAPI, PostgreSQL, PaddleOCR server.

---

## 7. Recommended next work (priority order)

### P0 — Make UI change obvious (1–2 days)

1. **Enrich all workflows** — port V2 `flows-catalog.ts` `info[]` into `govApiMock.ts` for at least: `car-registration-2nd-hand`, `vanzare-auto` (new id or alias), `passport-issuance`, `renew-driver-license`, `anaf-declaration`.
2. **Workflow step UI upgrade** — V2-style mode chips (`online` / `la ghișeu` / `hibrid`), fee/duration row, collapsible “Detalii” on every step (not just enriched ones).
3. **Home dashboard** — stronger hero from V3 `civic-hero` + V2-style “start flow” cards grid; show vault completeness + active task count prominently.
4. **Use framer-motion** — page transitions, step reveal stagger, FAB pulse (already partial), accordion animate.
5. **Offline / no-AI banner** on home when Gemini key missing — explain static routing still works.

### P1 — Feature parity (2–3 days)

6. **PFA wizard surface** — dedicated sub-view at `/workflow/pfa-registration` (wizard steps, not just generic timeline).
7. **Antecontract form** — pre-fill from vault, preview before PDF.
8. **Copy V2 `vanzare-auto` →** `car-registration-2nd-hand` or new workflow id with full actions.
9. **Sanitize `.env.example`** — placeholders only; document `VITE_GEMINI_API_KEY` in handoff/README.

### P2 — Polish

10. Wire `useT()` into nav labels and vault/chat headers.
11. Server-side Gemini proxy (Cloudflare/TanStack server fn).
12. E2E smoke tests for vault persist + workflow completion.

---

## 8. Key files to read first

| File | Why |
|------|-----|
| `src/styles.css` | Design tokens + a11y |
| `src/components/app-shell.tsx` | Nav + chat mount |
| `src/components/civis-chat.tsx` | Chat UX + persistence + tools |
| `src/services/govApiMock.ts` | Workflow truth + routing |
| `src/services/geminiChat.ts` | AI contract + privacy prompt |
| `src/routes/workflow.$id.tsx` | Step UI + completion |
| `src/store/vault.ts` | Privacy-critical data |
| `src/services/docIntelligence/pipeline.ts` | Scan/upload brain |

Reference only (do not modify):

- `../civic-agent-buian/Civic Guide AI/src/lib/flows-catalog.ts`
- `../civic-agent-buian/Civic Guide AI/src/components/flow/StepActionButton.tsx`
- `../civic-agent-alexia/apps/api/app/services/document_intelligence/`

---

## 9. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_GEMINI_API_KEY` | No (chat disabled without) | Browser Gemini — **rotate if leaked** |
| Supabase / Lovable / Maps vars in `.env` | **Unused** | Leftover from V2 copy — safe to remove from `.env` |

Production: never commit `.env`. Keep `.env.example` with empty placeholders only.

---

## 10. Git / commits

- Target repo has its own `.git`; source repos are separate.
- **No commits were made by automation unless explicitly requested.**
- Before first push: scrub secrets from `.env.example`, verify `.gitignore` covers `.env`.

---

## 11. Verification snapshot (last run)

- `npx tsc --noEmit` → **0 errors**
- `npx eslint .` → **0 errors**, 6× `react-refresh/only-export-components` in shadcn ui files (acceptable)
- Dev server → HTTP 200 on `/`

---

## 12. One-paragraph summary for the next agent

**Civis v4 is a V3 fork with substantial invisible merges:** real ANAF API, client OCR, CAEN search, PDF generators, live health probes, and V2 workflow content on two flows. The user correctly observes the **UI still looks like V3** — the next phase is explicitly **visual/UX hybridization**: port V2’s dense step cards, PFA wizard, and flow catalog content into all workflows; add motion and dashboard prominence; keep V3’s a11y shell and chat. Do not touch the three source directories. Guard local-only privacy. Fix `.env.example` secrets before any public commit.
