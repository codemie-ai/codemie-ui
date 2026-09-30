# Code review — 2026-08-28-fix-EPMCDME-8574-bug (2026-08-28)

**approve** · confidence: low · 0 blocking · 0 deferred · 1 filtered as noise
Coverage: blind — n/a (compact profile) · edge-case ✓ · verification-gap — n/a (compact profile) · acceptance — n/a (no spec)  (1/1 lenses ran)

> No spec/story present; acceptance not checked. All three patch findings from the initial request-changes verdict were resolved before approval.

## Resolved findings

- `src/pages/help/components/HelpItem.tsx` — [CR-001: fragile] CSS class name sanitization: colons stripped via `uid.replace(/:/g, '')`, 'help-item-' prefix guarantees valid identifier — **resolved**
- `src/pages/help/components/HelpItem.tsx` — [CR-002: tooltip] `data-pr-tooltip` omitted entirely on non-truncated cards via conditional spread — **resolved**
- `src/pages/help/components/HelpItem.tsx` — [CR-003: infra] overflow clipping resolved by placing `<Tooltip>` as a DOM sibling outside `<Link>` (fragment wrapper) rather than `appendTo={document.body}` — **resolved**

## Key addition beyond review scope

`event="both"` was added to the `<Tooltip>` instance — the PrimeReact prop that fires the tooltip on keyboard focus as well as hover. This is the direct mechanism delivering the accessibility requirement.

## Checked and clean

standards — n/a (not in profile) · 1 dismissed as noise
