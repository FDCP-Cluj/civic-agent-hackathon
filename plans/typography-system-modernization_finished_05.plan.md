---
name: Typography System Modernization
overview: Elevate typography to modern product standards (Apple/GitHub/Shopify-level clarity with accessibility-first behavior inspired by EuansGuide), using a contemporary font system, stronger type scale, and consistent readable rhythm.
todos:
  - id: modern-font-baseline
    content: Replace generic type feel with a modern font baseline and system fallback stack aligned with current industry practices.
    status: completed
  - id: type-scale-rhythm
    content: Define and apply a cleaner typography scale (headings/body/meta), line-height rhythm, and spacing consistency.
    status: completed
  - id: shared-components-typography
    content: Update shared shadcn text-bearing components so typography feels deliberate and cohesive across the app.
    status: completed
  - id: accessibility-modes-preservation
    content: Preserve and verify dyslexia mode and senior mode behavior on top of the new typography system.
    status: completed
  - id: modern-typography-validation
    content: Validate readability, contrast, and hierarchy across key pages in normal, dyslexic, and senior modes.
    status: completed
isProject: false
---

# Typography System Modernization Plan

## Objective

- Make typography feel modern, intentional, and product-grade rather than generic.
- Follow design traits common to high-quality websites (Apple/GitHub/Shopify): clean hierarchy, restrained scale steps, strong readability, reduced tiny text usage.
- Keep accessibility-first behavior (EuansGuide-style mindset): inclusive defaults, dyslexia support, senior readability support.

## Target Files

- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/styles.css`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/styles.css)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/accessibility-menu.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/accessibility-menu.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/app-shell.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/app-shell.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/routes/index.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/routes/index.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/button.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/button.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/card.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/card.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/input.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/input.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/select.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/select.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/textarea.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/textarea.tsx)
- [`/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/label.tsx`](/Users/buiandragos/Documents/faculta/Cluj-Hackathon/civic-agent-hackathon/src/components/ui/label.tsx)

## Short Execution Plan

1. Set a modern baseline font stack (Inter/system-first profile) with robust fallbacks.
2. Define clearer type rhythm:
   - larger, consistent body size defaults,
   - restrained heading scale,
   - improved line-height and spacing density for readability.
3. Apply typography quality pass to shared shadcn components so every page inherits better text behavior.
4. Preserve accessibility guarantees:
   - dyslexia mode still hard-overrides the base stack,
   - senior mode still scales typography globally and keeps tap targets comfortable.
5. Validate across key routes and states (normal + dyslexic + senior).

## Acceptance Criteria

- Typography no longer feels generic; hierarchy and rhythm align with modern product standards.
- Small-text overuse is reduced across dashboard/workflow/forms/navigation.
- Shared components render text consistently and legibly.
- Dyslexia and senior modes continue to work correctly.
