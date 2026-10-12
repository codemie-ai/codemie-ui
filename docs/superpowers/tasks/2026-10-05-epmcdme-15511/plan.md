## Acceptance criteria

- Each card renders at most one external-link icon for an exactly equal, nonempty documentation/source destination.
- Distinct documentation and source destinations remain independently accessible; every rendered link retains the correct href and label.
- The same rule applies across multiple cards, including EPAM Radar, Deprecated EPAM Radar and Stage EPAM Radar.
- Usage/count, Add/Added behavior, tags, badges, other actions and footer/layout alignment remain unchanged.
- Multiple-card verification covers icon counts and destinations; authenticated popup verification confirms the named examples and alignment.

# EPMCDME-15511 MCP link deduplication implementation plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development as directed by the calling flow. No execution-mode decision is made here.

**Goal:** Remove duplicate destination icons without discarding separate documentation/source actions.
**Architecture:** Add an exact-equality guard to file-local `ExternalLinks`, shared by every marketplace card and MCP selection surface. Preserve the existing native anchors and footer structure.
**Tech stack:** Existing React/TypeScript, Tailwind, Vitest unit project and React Testing Library.
**Requirements source:** Inline EPMCDME-15511 requirements; research: `technical-analysis.md` in this directory.

## Global constraints

- No URL normalization, new abstraction, dependency, backend/store/modal changes or unrelated cleanup.
- No manifest/lock-file edits, commits, branches or worktrees.
- Follow `.ai-run/guides/components/component-patterns.md`, `.ai-run/guides/testing/testing-patterns.md`, `.ai-run/guides/quality-gates.md` and `.ai-run/guides/security/verification.md`.
- Run `npm ci` before trusting the focused test or any type-check. Run commands individually; import/setup failures are not a valid red regression. Quote the `Test Files` summary.

## Review focus

- Equal nonempty URLs: keep Documentation only.
- Different URLs, including a trailing-slash difference: retain both, without normalization.
- Home only, source only, undefined/empty fields: render one, one or zero links respectively.
- Multiple named cards: scope assertions to each card; never deduplicate across cards.
- Existing actions and link safety: retain labels, `_blank`, `noopener noreferrer`, count, tags, enabled Add callback and disabled Added.

### Task 1: Deduplicate exact destinations in the shared card renderer

**Test-first: yes — rendering equal nonempty home/source URLs must fail with two links where one Documentation link is expected.**

**Files** (base path: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/`):
- Modify: `MCPMarketplaceCard.tsx:96–124`, specifically the source anchor condition at line 112.
- Create: `__tests__/MCPMarketplaceCard.test.tsx`.
- Reference only: `MCPMarketplaceCard.tsx:173–203` for unchanged footer behavior.

**Interface:** Exercise the default-exported card with typed `MCPConfig`, `onSelect`, `isSelected` and `isAlreadyAdded` props. Keep `ExternalLinks` private; change no exports or callers.

- [ ] Add one colocated unit regression file using existing RTL/Vitest setup and repository license header. Use minimal typed config fixtures and `afterEach(cleanup)`; avoid API/store mocks unless an imported dependency actually requires one. Cover the five review-focus cases, counting anchors rather than SVG paths. Assert titles and exact `getAttribute('href')` values, plus target/rel. Include undefined and empty strings, and a trailing-slash difference.
- [ ] In that same file render the three Radar-named fixture cards together in test-only wrappers and scope queries with `within`. Give each card equal home/source fields and expect one Documentation link per card. These are synthetic fixtures, not evidence of production URL equality. Also assert positive usage count, category/Public/System badges, Add invoking `onSelect(config)`, and disabled Added preserving existing behavior.
- [ ] Run `npm ci`, then separately run `npm run test:unit -- --reporter=verbose src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPMarketplaceCard.test.tsx`. Confirm the equal-destination assertion fails because two anchors render, not because setup fails.
- [ ] Change only the source anchor condition to `sourceUrl && sourceUrl !== homeUrl`. Keep the documentation branch, hrefs, titles, target/rel, SVGs and all layout classes unchanged.
- [ ] Re-run the same focused command; require all cases to pass and inspect the `Test Files` summary. Check the diff stays limited to the renderer guard and focused test file.

## Calling-flow handoff (not additional tasks)

The flow owns whole-suite gates and browser verification. After dependency reinstall, execute applicable gates individually. In authenticated Browse MCP Servers, search `radar`, inspect the three named cards and actual URL fields, open each remaining link, and confirm count/Add/tags and responsive footer alignment. Distinct destinations correctly retain two actions. If named examples have distinct URLs yet still appear wrong, report the mismatch rather than widening deduplication or silently dropping an action. Unit DOM assertions do not prove navigation or visual alignment.

## Negative-constraint check

Task 1 honors every stated exclusion: exact comparison only; distinct actions retained; shared renderer only; no abstraction/dependency or unrelated cleanup; one focused test file, no broad scaffolding; no lock-file edit or git side effect. Gates/browser checks remain flow-owned, not separate implementation tasks. This planning stage runs no tests/type-check and produces only this plan.
