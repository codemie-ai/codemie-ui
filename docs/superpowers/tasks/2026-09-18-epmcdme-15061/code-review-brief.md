# Code review — 2026-09-18-epmcdme-15061 (2026-09-18)

**request-changes** · confidence: low · 1 blocking · 2 filtered as noise
Coverage: blind — n/a (compact) · edge-case ✓ · verification-gap — n/a (compact) · acceptance — n/a (no spec)  (1/4 lenses ran)

## Look here first

- `src/components/Hint/Hint.tsx:38` — [infra] inline appendTo arrow creates a new function reference on every render; PrimeReact may re-mount the portal container on each parent re-render, accumulating orphaned DOM nodes in document.body — CR-001

## Checked and clean

standards — n/a (compact profile, no project guide) · 2 candidates dismissed as noise
