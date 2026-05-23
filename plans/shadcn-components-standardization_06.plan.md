---
name: Accessible Decluttered UI Alignment
overview: Align shared UI surfaces with the new homepage design language by reducing visual noise, simplifying color usage, and improving accessibility and readability across core routes.
todos:
  - id: ui-noise-audit
    content: Audit core routes and shared components for noisy visuals (busy colors, heavy shadows, decorative gradients, dense spacing) and list target surfaces for cleanup.
    status: pending
  - id: homepage-language-rollout
    content: Apply homepage-style visual rules to targeted surfaces (calmer palette, fewer decorative effects, cleaner hierarchy, consistent spacing and typography).
    status: pending
  - id: accessibility-readability-validation
    content: Validate contrast, legibility, focus clarity, and responsive behavior after decluttering; run lint/typecheck and smoke-check key flows.
    status: pending
isProject: false
---

# Accessible Decluttered UI Alignment Plan (06)

## Objective
- Bring the entire app UI in line with the new homepage direction: accessible, decluttered, and calm.
- Remove visually busy patterns and standardize clean hierarchy across shared surfaces and route-level layouts.

## Phase 1 (Audit + Prioritization)
- Review high-traffic routes and shared components for:
  - oversaturated accents or mixed color semantics,
  - excessive borders/shadows/gradients,
  - dense spacing and competing visual emphasis,
  - weak readability or low-clarity interaction states.
- Prioritize fixes that improve scanning and usability without reducing feature coverage.

## Phase 2 (Design Language Rollout)
- Apply a consistent low-noise visual style across targeted screens:
  - neutral and purposeful color usage,
  - minimal decorative treatments,
  - stronger content hierarchy with predictable spacing,
  - consistent typography and control affordances.
- Keep interactions explicit and lightweight so important actions stand out.

## Phase 3 (Accessibility + Quality Validation)
- Validate accessibility and readability outcomes:
  - contrast clarity for text and controls,
  - visible focus and interaction cues,
  - readable sizing/spacing on desktop and mobile,
  - consistency with existing accessibility modes.
- Run lint/typecheck and smoke-check key journeys after UI updates.

## Acceptance Criteria
- Core surfaces reflect the same accessible, decluttered visual language as the homepage.
- Busy elements (excessive colors, ornamental effects, crowded composition) are reduced on prioritized pages.
- Readability and interaction clarity improve without feature regressions.
- Lint/typecheck pass and main navigation/task workflows remain stable.
