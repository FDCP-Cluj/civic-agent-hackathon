# Civis — Agent Civic AI

An accessibility-first, local-first AI civic agent that walks Romanian citizens
through state bureaucracy. Built for the Bosch hackathon by synthesizing the
strongest assets of three predecessor prototypes (`civic-agent-alexia`,
`civic-agent-buian`, `civic-agent-alex`).

## Core pillars

1. **Extreme accessibility.** Senior Mode (120% type, larger touch targets),
   high-contrast WCAG-AAA, dyslexic font (Atkinson Hyperlegible), read-aloud
   highlighting, `prefers-reduced-motion`. Mobile-first.
2. **Zero-GDPR Local Vault.** Profile (incl. CNP) and document previews live
   in `localStorage` only. The Gemini chat sees a masked CNP for
   personalization and never sees document bytes.
3. **Hybrid intelligence.** Static routing (`services/govApiMock.ts`) handles
   every common procedure instantly. Gemini chat (`services/geminiChat.ts`)
   covers niche questions with function calling to open the right workflow.

## Stack

Vite · React 19 · TypeScript · TanStack Start (file-based routing) ·
Tailwind v4 · shadcn/ui · Zustand (persisted slices) · `@google/genai` ·
`framer-motion` · `lucide-react` · `sonner`.

## Getting started

```bash
npm install
cp .env.example .env       # optional; fill VITE_GEMINI_API_KEY to enable chat
npm run dev
```

Open the URL Vite prints (typically `http://localhost:3000`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run build` | Production build |
| `npm run preview` | Preview built bundle |

## Layout

```
src/
├── routes/        # File-based TanStack routes (/, /login, /verify, /vault, /tasks, /scan, /settings, /workflow/$id)
├── components/    # AppShell, CivisChat, AccessibilityMenu, VaultUploadCard, etc.
├── components/ui/ # shadcn primitives
├── hooks/         # use-mobile, use-speech-recognition, use-read-aloud
├── lib/           # cn(), error capture, demo seed
├── store/         # Zustand slices: auth, vault, tasks, settings, accessibility, chatUi
├── services/      # govApiMock (static catalog) + geminiChat (streaming AI)
└── styles.css     # Design tokens, Senior Mode, high-contrast, dyslexic font
```

## Privacy posture

- No Civis backend. Everything is in-browser.
- `useVault` slice (`civis-vault` in `localStorage`) never crosses the
  network. The chat session reads it client-side and masks the CNP before
  building its system instruction (see `services/geminiChat.ts`).
- The scan UX is animation-only; no OCR runs and no document leaves the
  device.

## Source provenance

| Asset | Origin |
|---|---|
| Design tokens, glassmorphism nav, scan animation, a11y CSS | `civic-agent-alex` (V3) |
| Zustand persisted slices, mock 2FA, Local Vault | `civic-agent-alex` (V3) |
| Gemini chat with streaming + function calling + Google grounding | `civic-agent-alex` (V3) |
| `govApiMock.ts` workflow catalog | `civic-agent-alex` (V3) |
| Step-level Romanian explanations | will be enriched from `civic-agent-buian` `flows-catalog.ts` |
