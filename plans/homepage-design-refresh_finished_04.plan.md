---
name: Homepage Design Refresh
overview: Simplify the `/` dashboard visual language to better match `civic-agent-alexia` patterns with calmer colors, clearer hierarchy, and less crowded UI while preserving existing functionality.
todos:
  - id: home-audit
    content: Audit current `/` layout sections and identify noisy visual patterns to reduce.
    status: completed
  - id: home-hierarchy-pass
    content: Rework homepage hierarchy (header, status cards, quick actions) to alexia-like spacing and composition.
    status: completed
  - id: home-color-tone-pass
    content: Reduce saturated accents and busy gradients on `/` while keeping semantic statuses clear.
    status: completed
  - id: home-validation
    content: Validate behavior parity, route actions, and responsive layout after UI simplification.
    status: completed
isProject: false
---

# Homepage Design Refresh Plan

## Objective

- Make `/` visually calmer and easier to scan, aligned with `civic-agent-alexia` design patterns.
- Keep all current dashboard capabilities and interactions unchanged.

## Target Files

- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/routes/index.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/routes/index.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/dashboard/page-header.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/dashboard/page-header.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/styles.css`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/styles.css)

## Short Execution Plan

1. Inventory sections on `/` and classify each as keep/simplify/remove-noise.
2. Apply alexia-like structure: stronger header zone, calmer KPI area, cleaner section rhythm.
3. Reduce visual noise:
   - fewer competing accent colors,
   - fewer gradient-heavy surfaces,
   - stronger neutral card backgrounds.
4. Preserve behavior parity for:
   - workflow launch actions,
   - chat entry points,
   - status indicators.
5. Validate on desktop/mobile and confirm no regression.

## Acceptance Criteria

- Homepage looks less busy and more consistent with alexia patterns.
- Existing `/` interactions remain intact.
- Color usage is calmer while semantic meaning remains clear.
