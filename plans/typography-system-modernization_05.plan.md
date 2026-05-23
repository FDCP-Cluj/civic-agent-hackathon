---
name: Typography System Modernization
overview: Raise typography quality to industry standards with a better default font stack (e.g. Nunito), larger readable base sizing, maintained dyslexia option, and preserved senior-mode scaling.
todos:
  - id: font-system-audit
    content: Audit current font usage, text-size scale, and readability issues across routes/components.
    status: pending
  - id: base-font-rollout
    content: Introduce a modern default font stack and standardize global text scale/line-height tokens.
    status: pending
  - id: accessibility-font-preserve
    content: Keep dyslexia-focused font mode and ensure it overrides the new base font safely.
    status: pending
  - id: senior-scaling-hardening
    content: Ensure senior mode still increases typography globally and consistently after new font scale changes.
    status: pending
  - id: typography-validation
    content: Validate readability and consistency across key pages in normal, dyslexic, and senior modes.
    status: pending
isProject: false
---

# Typography System Modernization Plan

## Objective
- Upgrade global typography for readability and consistency.
- Use a stronger default font baseline (Nunito-class style), while preserving accessibility features.

## Target Files
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/styles.css`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/styles.css)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/accessibility-menu.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/accessibility-menu.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/app-shell.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/app-shell.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/routes/index.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/routes/index.tsx)

## Short Execution Plan
1. Define a typography token baseline:
   - base font family (Nunito or equivalent),
   - text size ramp (`xs` through display),
   - line-height and letter-spacing defaults.
2. Centralize typography in global CSS/Tailwind-friendly classes so route components inherit consistent sizing.
3. Keep accessibility guarantees:
   - dyslexia mode continues using Atkinson Hyperlegible,
   - senior mode continues applying larger readable scaling globally.
4. Tune high-traffic pages and shared components to remove undersized text patterns.
5. Validate normal mode + dyslexia mode + senior mode for visual and functional consistency.

## Acceptance Criteria
- Base typography is visibly more readable across the app.
- Small-text overuse is reduced, especially on dashboard/workflow surfaces.
- Dyslexia and senior modes continue to work correctly.
