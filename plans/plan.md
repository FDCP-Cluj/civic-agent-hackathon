---
name: Location-First Institution Lookup
overview: Ensure all `find_institution` actions prioritize current geolocation for nearby Google Places results, then fall back to profile locality when location is unavailable or denied.
todos:
  - id: location-first-behavior
    content: Use geolocation first for institution search, then profile locality fallback.
    status: pending
  - id: workflow-coverage-check
    content: Confirm behavior applies consistently for all workflows using `find_institution`.
    status: pending
  - id: validation
    content: Validate geolocation, profile fallback, manual city override, and no-key fallback behavior.
    status: pending
isProject: false
---

# Location-First Institution Lookup

## Goal
- Use live user coordinates by default for every `find_institution` action.
- If the user does not share location, automatically use locality parsed from profile address.
- Keep manual city override and generic Google Maps fallback available.

## Files
- `src/components/workflow/step-action-button.tsx`
- `src/services/findInstitution.ts`
- `src/services/govApiMock.ts`

## Behavior Contract
- Geolocation success: query is biased around current coordinates.
- Geolocation denied/unavailable/timeout: query uses profile locality (if available).
- Missing profile locality: query falls back to generic institution search.
- Missing Maps connector keys or connector failure: show deterministic Google Maps search fallback.

## Validation Checklist
- Geolocation allowed returns nearby institutions.
- Geolocation denied falls back to profile city/locality.
- Empty profile address still allows manual city search in dialog.
- Connector-disabled environment still returns a working Maps URL fallback.
