# ActeAI — Agent Civic AI

An accessibility-first, local-first AI civic agent that walks Romanian citizens
through state bureaucracy. Built for the Bosch hackathon by synthesizing the
strongest assets of three predecessor prototypes (`civic-agent-alexia`,
`civic-agent-buian`, `civic-agent-alex`).

## Core pillars

1. **Extreme accessibility.** Senior Mode (120% type, larger touch targets),
   high-contrast WCAG-AAA, dyslexic font (Atkinson Hyperlegible), read-aloud
   highlighting, `prefers-reduced-motion`. Mobile-first.
2. **Local-first Vault.** Profile (incl. CNP) and document previews live in
   `localStorage` only. The Gemini chat sees only minimal profile context
   (first name, locality, masked CNP) and never sees document bytes.
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

Open the URL Vite prints (typically `http://localhost:8080`).

Demo login for testing:

- Email: `test@gmail.com`
- Password: any value
- OTP: any 6 digits

## Scripts

| Command             | Purpose                  |
| ------------------- | ------------------------ |
| `npm run dev`       | Vite dev server with HMR |
| `npm run typecheck` | `tsc --noEmit`           |
| `npm run lint`      | ESLint                   |
| `npm run format`    | Prettier                 |
| `npm run build`     | Production build         |
| `npm run preview`   | Preview built bundle     |

## Layout

```
src/
├── routes/        # File-based routes (/, /login, /verify, /vault, /tasks, /scan, /settings, /workflow/$id, PFA/antecontract subroutes)
├── components/    # AppShell, ActeAIChat, AccessibilityMenu, VaultUploadCard, etc.
├── components/ui/ # shadcn primitives
├── hooks/         # use-mobile, use-speech-recognition, use-read-aloud
├── lib/           # cn(), error capture, demo seed
├── store/         # Zustand slices: auth, vault, tasks, settings, accessibility, chatUi
├── services/      # workflows, Gemini chat, ANAF, RAG, OCR, PDF generators
└── styles.css     # Design tokens, Senior Mode, high-contrast, dyslexic font
```

## Privacy posture

- No ActeAI backend. Core vault/workflow features are in-browser; optional
  integrations call Gemini, ANAF, Supabase, EidKit, or Google Maps directly
  from the browser when configured.
- `useVault` slice (`civis-vault` in `localStorage`) never crosses the
  network. The chat session reads a reduced profile snapshot client-side and
  masks the CNP before building its system instruction (see
  `services/geminiChat.ts`).
- Scan/upload runs local Tesseract OCR and document classification in the
  browser. Document bytes do not leave the device.
- Production note: move Gemini and EidKit secret handling behind a server
  proxy before public launch.

## Source provenance

| Asset                                                            | Origin                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| Design tokens, glassmorphism nav, scan animation, a11y CSS       | `civic-agent-alex` (V3)                                      |
| Zustand persisted slices, mock 2FA, Local Vault                  | `civic-agent-alex` (V3)                                      |
| Gemini chat with streaming + function calling + Google grounding | `civic-agent-alex` (V3)                                      |
| `govApiMock.ts` workflow catalog                                 | `civic-agent-alex` (V3)                                      |
| Step-level Romanian explanations                                 | will be enriched from `civic-agent-buian` `flows-catalog.ts` |
