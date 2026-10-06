# Technical Research

**Task**: chat message feedback icons theming
**Generated**: 2026-09-30
**Research path**: filesystem

Note: the `mcp__codegraph__search` tool is not in this agent's toolset, so research used direct Bash/Read. It was kept narrow on purpose because the caller asked for that, and it did not dispatch five Explore threads.

---

## 1. Original Context

EPMCDME-14840 (MR !1952) — address reviewer feedback from Andriy Lukashchuk on tailwind.config.ts:378: "Let's use the existing color token - adding a new one is too much for this and it will not work with theming engine. tl;dr - I suggest we just fill the icon when the feedback is sent." Change: (1) remove the `feedback` token added to `text.accent` in tailwind.config.ts (commit bdeda4e53); (2) in src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx: liked → ThumbUpFilledSvg (@/assets/icons/thumb-up-filled.svg?react) with existing `text-text-accent`; not liked → ThumbUpSvg; disliked → ThumbUpFilledSvg rotated 180° (`rotate-180`) with existing `text-failed-secondary`; not disliked → ThumbDownSvg — mirroring src/pages/skills/components/SkillCard.tsx (~114-136); (3) keep tooltip typo fix yout→your. Tests: selected state renders filled icon (like and dislike), unselected renders outline, no new token remains. Test runner: vitest.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/MessageFeedbackActions.tsx`: the target component. It currently imports only `ThumbDownSvg` and `ThumbUpSvg`, and both `ChatMessageAction`s get a fixed `icon`:
  - like, line ~167–172: `icon={ThumbUpSvg}` and `iconClassName={cn('h-4', isLiked && 'text-text-accent-feedback')}`
  - dislike: `icon={ThumbDownSvg}` and `iconClassName={cn('h-4', isDisliked && 'text-failed-secondary')}`. The label already says `'Click to remove your negative feedback'`, so the typo fix is already in place and must be kept.
  - `isLiked = mark === messageFeedbackMark.correct` and `isDisliked = mark === messageFeedbackMark.wrong`. `mark` is local state that starts from `message.userMark?.mark` and updates optimistically on submit.
- `src/pages/chat/components/ChatHistory/ChatMessageAction.tsx`: the `icon` prop is typed `FC<SVGProps<SVGSVGElement>>`. It renders `<Icon className={cn('w-3.5 h-3.5', iconClassName)} />` directly as the only child of the `<button>` (or `<a>` when `href` is set). The wrapper adds no transform; the button classes are only `opacity-80 transition size-5 min-w-5 flex justify-center items-center …`. So `iconClassName` reaches the `<svg>` root as-is (SVGR spreads props onto `<svg>`), and `rotate-180` in `iconClassName` rotates the svg itself. `cn` is the twMerge helper, so `h-4` overrides `h-3.5`.
- `src/pages/skills/components/SkillCard.tsx:114-136` is the pattern to mirror:
  - `isLiked ? <ThumbUpFilledSvg className="w-3 h-3" /> : <ThumbUpSvg className="w-3 h-3" />`
  - `isDisliked ? <ThumbUpFilledSvg className="transform rotate-180 flex self-center w-3 h-3" /> : <ThumbDownSvg className="w-3 h-3" />`
  - There is no `thumb-down-filled.svg`. A filled dislike icon is the rotated filled thumb-up. `thumb-up-filled.svg` is also used by AssistantCard, AssistantDetailsActions, KataDetailView and AIKatasContent.
- Icons in `src/assets/icons/`: `thumb-up.svg`, `thumb-up-filled.svg` and `thumb-down.svg`. All three are 18x18, have one `<path fill="currentColor">` and `fill="none"` on the root, so color comes from `text-*` classes. The filled variant is the outline path without its inner cut-out subpath.
- `tailwind.config.ts:373-379`: `text.accent = { DEFAULT: [neutral 50, blue 400], hover, status, 'status-hover', feedback: [blue 300, blue 400] }`. Commit `bdeda4e53` added the `feedback` line and nothing else (1 file, +1 line). Each array is `[dark, light]`, so `text-text-accent` resolves to neutral-50 (near white) in dark theme. That explains the original ticket: the selected state was not visible against the default icon color in dark theme. The reviewer's fix is to make the state visible through the shape (filled) instead of through the color.

### Architecture and Layers Affected

- UI/component layer only. It touches 1 component (`MessageFeedbackActions.tsx`), 1 config file (`tailwind.config.ts`, one line removed) and 1 test file. No store, API or type changes.

### Integration Points

- `ChatMessageAction` is shared by other chat message actions. It needs no change, because `icon` already accepts any SVGR component and can be chosen conditionally per render.
- Grep for `accent-feedback` across `*.ts/*.tsx/*.css/*.scss/*.js` (excluding node_modules) finds exactly one reference: `MessageFeedbackActions.tsx:170`. After the change, nothing references the token, so removing it from tailwind is safe.

### Patterns and Conventions

- SVG icons are imported as `@/assets/icons/<name>.svg?react` (the `vite-plugin-svgr` plugin, `svgr()` in `vite.config.ts` with default options).
- State classes use `cn(base, cond && 'class')`.
- Every file starts with the Apache 2.0 license header.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/styling-guide.md` and `.ai-run/guides/styling/theme-management.md` cover theme tokens. These are relevant to the reviewer's point that ad-hoc tokens do not fit the theming engine.
- `.ai-run/guides/testing/testing-patterns.md` and `.ai-run/guides/testing/qa-strategy.md` cover test conventions.

### Architectural Decisions

- Reviewer decision on MR !1952: do not add new color tokens for a single-component state. Use existing tokens and show the state through the filled icon shape.

### Derived Conventions

- The like/dislike selected state is shown by swapping in the filled icon (SkillCard). Dislike is the filled thumb-up plus `rotate-180`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatHistory/ChatAiMessage/MessageFeedbackActions/__tests__/MessageFeedbackActions.test.tsx` has 4 tests: the like and dislike submit payload (`response: ''`) and the error/revert paths. It finds buttons by accessible name (`getByRole('button', { name: 'Like this response' })`, and so on). None of them checks icons or classes. It does not mock SVG imports, so real SVGR components render.
- `src/pages/chat/components/ChatHistory/__tests__/ChatMessageAction.test.tsx` uses `MockIcon = () => <svg data-testid="mock-icon" />`, which ignores props. It checks that the icon renders, the click works, and `type="button"`. It does not check that className is forwarded.
- `src/pages/skills/components/__tests__/SkillCard.test.tsx` has no assertions about filled or outline icons.

### Testing Framework and Patterns

- Vitest workspace `vitest.workspace.ts`. The `unit` project uses jsdom, includes `**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)`, and has setupFiles `./src/setupTests` and `./src/setupTests.unit`. It `extends: './vite.config.ts'`, so the real `svgr()` plugin is active in tests and `?react` imports render real `<svg><path d="…"/></svg>`. The setup files contain no global SVG mock (grep for `svg` found nothing).
- There are two established ways to tell icons apart:
  1. Per-file `vi.mock('@/assets/icons/<name>.svg?react', () => ({ default: (props: any) => <svg data-testid="<name>-icon" {...props} /> }))`. `SidebarToggle.test.tsx:49` uses this and then asserts `toHaveClass('rotate-180')` on the testid (lines 101-110). Spreading `{...props}` is required so that `className` (and with it `rotate-180` and the color classes) reaches the mocked svg. `Popup.test.tsx:22` shows the no-props variant, which would not work for class assertions.
  2. Without mocks, compare the rendered `path` `d` attribute. The filled and outline paths differ: the outline starts `M8.42285 0.811035` and the filled one starts `M8.42285 0.811768`. This is fragile, and approach 1 is preferred.
- The recommended test uses approach 1. Mock `thumb-up.svg?react`, `thumb-up-filled.svg?react` and `thumb-down.svg?react`, each with a distinct testid and `{...props}`. Render with `message.userMark = { mark: 'correct' }` or `{ mark: 'wrong' }`, using the `messageFeedbackMark` constants from `@/types/entity/conversation`. For each button, `within(button)` should find the expected testid. For dislike, check `toHaveClass('rotate-180', 'text-failed-secondary')`. For like, check `toHaveClass('text-text-accent')` and `not.toHaveClass('text-text-accent-feedback')`.
- The no-token check can be a grep during verification, or a test that reads `tailwind.config.ts` (`fs.readFileSync`) and asserts it does not contain `feedback:` inside `text.accent`. The grep is the simpler option. A class assertion alone only proves the component no longer uses the class, not that the config line is gone.

### Coverage Gaps

- No test covers the icon or color for the selected and unselected states before this change. These are new tests.
- The existing `beforeEach` sets `message` without `userMark`. A selected-state test needs its own message object with `userMark`. It can also reach the liked state by clicking Like with `submitFeedback` resolved, because the `appInfo` configs mock is `[]`, so the like form is disabled and the like is submitted directly.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
- `tailwind.config.ts`: themeTokens `text.accent`. Remove the line `feedback: [c['blue']['300'], c['blue']['400']],` (line ~378).
- `vite.config.ts`: `svgr()` with default options, inherited by the vitest workspace.

### Feature Flags and Deployment Concerns
- `CONFIG_LIKE_FORM_KEY` (via `isConfigItemEnabled`) decides whether clicking Like opens a comment popup or submits directly. It does not affect the icon logic.
- Commands (from package.json):
  - `npm run test:unit` (`vitest run --project unit`), or target the file with `npx vitest run --project unit <path>`
  - `npm run lint` (eslint)
  - `npm run typecheck` (`tsc --noEmit`)
  - `npm run sonar-local`
  - Per memory: prefix test and sonar commands with `LC_ALL=en_US.UTF-8`, because a `uk_UA` locale breaks some suites.

---

## 6. Risk Indicators

- **Icon mock must forward props**: a `vi.mock` of `?react` that drops `{...props}` gives a test that passes without checking the classes (see the `Popup.test.tsx` style). Check the test by mutation, for example by temporarily using `ThumbUpSvg` for the liked state and confirming the test fails.
- **Mocking all three SVGs changes other tests in the same file**: the existing tests find buttons by accessible name, not by icon, so they are unaffected. Mocks are hoisted and apply to the whole file.
- **`rotate-180` without `transform`**: SkillCard uses `transform rotate-180`. The repo uses Tailwind 3.4.17 (package.json:135), where `rotate-*` works without `transform`. Keeping `transform` to mirror SkillCard is harmless.
- **Class order and twMerge**: `cn('h-4', …)` merges with `w-3.5 h-3.5` in ChatMessageAction. Adding `rotate-180` does not conflict.
- **Dark theme color**: in dark theme, `text-text-accent` is neutral-50 (near white), so the liked icon is filled but not colored. This is by design (reviewer intent). The planner should not reintroduce a color token.
- **Leftover token**: `text-text-accent-feedback` has exactly one reference, and removing the tailwind line must happen in the same change. A grep over `src/` and `tailwind.config.ts` should return 0 matches after the change.
- **Local locale**: `LANG=uk_UA` breaks 4 test files and sonar-local unless `LC_ALL=en_US.UTF-8` is set.

---

## 7. Summary for Complexity Assessment

This is a small change in the UI layer. It touches 3 files: `MessageFeedbackActions.tsx` (conditional icon choice plus a new `ThumbUpFilledSvg` import), `tailwind.config.ts` (remove one line from commit bdeda4e53) and `MessageFeedbackActions.test.tsx` (new selected/unselected icon tests). Stores, API, types and shared components stay the same. `ChatMessageAction` already passes `iconClassName` directly to the SVGR `<svg>` root and has no wrapper transform, so `rotate-180` and the color classes work as they do in SkillCard.

The change adds nothing new. It copies the existing pattern in `src/pages/skills/components/SkillCard.tsx:114-136` (filled thumb-up for liked, filled thumb-up with `rotate-180` for disliked) and uses only existing tokens (`text-text-accent`, `text-failed-secondary`). The tooltip typo fix is already on the branch (commit 6a2045d1b).

The component has 4 behavioral tests, but none covers icons. The new tests should follow the `SidebarToggle.test.tsx` approach: `vi.mock` each `?react` SVG with a testid and `{...props}`, then assert the testid and classes. The main risk is a test that passes because the mock drops props, so it should be checked by mutation. Overall complexity is low (a trivial or small route).
