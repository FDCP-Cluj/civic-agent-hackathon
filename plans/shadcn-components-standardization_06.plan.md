---
name: Shadcn Components Standardization
overview: Standardize shared UI implementation on shadcn primitives across the app, starting with replacing the current sidebar implementation with the shadcn sidebar component.
todos:
  - id: sidebar-shadcn-migration
    content: Replace custom dashboard sidebar implementation with shadcn sidebar primitives and keep existing nav destinations/active states.
    status: pending
  - id: shell-compatibility-check
    content: Ensure app shell layout and mobile behavior stay consistent after sidebar migration.
    status: pending
  - id: validation-pass
    content: Run typecheck/lint and smoke-check navigation behavior after migration.
    status: pending
isProject: false
---

# Shadcn Components Standardization Plan

## Objective
- Use shadcn components as the default UI baseline for shared surfaces.
- Start with sidebar migration as the first concrete step.

## Phase 1 (Now)
- Replace current sidebar with shadcn sidebar (`src/components/ui/sidebar.tsx` primitives).
- Preserve:
  - current route map,
  - active-link highlighting,
  - existing desktop/mobile shell behavior.

## Next Phases (After Sidebar)
- Audit remaining custom surfaces (cards, section blocks, nav affordances) and align to shadcn patterns.
- Reduce duplicate bespoke styling where shadcn primitives already exist.

## Acceptance Criteria
- Sidebar renders through shadcn sidebar primitives.
- Navigation behavior is unchanged for end users.
- Typecheck/lint pass.
