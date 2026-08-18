# Guide index

Routes only. Find the row that matches the task and open that one file. `AGENTS.md` at the
repository root is the entry point above this.

## Gates, tickets and MRs

| Condition | Read |
|---|---|
| You need the exact gate commands and their skip policy | [`quality-gates.md`](quality-gates.md) |
| You need the ticket prefix, tracker, or MR target branch | [`project.md`](project.md) |
| You are about to branch, commit, or open an MR | [`standards/git-workflow.md`](standards/git-workflow.md) |

## Security

One entry point; it routes onward.

| Condition | Read |
|---|---|
| A scanner or CVE ticket names this repo, or you are about to touch a version pin | [`security/README.md`](security/README.md) |
| You are writing code that renders HTML, redirects, reads config, or handles a secret | [`development/security-patterns.md`](development/security-patterns.md) |

## Writing code

| Condition | Read |
|---|---|
| Deciding which directory a new file belongs in | [`development/code-organization.md`](development/code-organization.md) |
| Deciding where a change belongs in the system | [`architecture/architecture.md`](architecture/architecture.md) |
| Adding or changing a route | [`architecture/routing-patterns.md`](architecture/routing-patterns.md) |
| Building a new component | [`components/component-patterns.md`](components/component-patterns.md) |
| Placing a component in the tree | [`components/component-organization.md`](components/component-organization.md) |
| Looking for something that already exists before writing it | [`components/reusable-components.md`](components/reusable-components.md) |
| Calling the backend | [`development/api-integration.md`](development/api-integration.md) |
| Adding or reading shared state | [`patterns/state-management.md`](patterns/state-management.md) |
| Extracting logic into a hook | [`patterns/custom-hooks.md`](patterns/custom-hooks.md) |
| Building a form | [`patterns/form-patterns.md`](patterns/form-patterns.md) |
| Building a modal or popup | [`patterns/modal-patterns.md`](patterns/modal-patterns.md) |
| Adding a constant or a magic value | [`development/constants-usage.md`](development/constants-usage.md) |
| Handling or surfacing an error | [`development/error-handling-patterns.md`](development/error-handling-patterns.md) |
| A render is slow or a list is large | [`development/performance-patterns.md`](development/performance-patterns.md) |
| Changing the workflow editor | [`development/workflow-editor-patterns.md`](development/workflow-editor-patterns.md) |
| Restructuring existing code rather than adding to it | [`development/refactoring-patterns.md`](development/refactoring-patterns.md) |

## Styling and accessibility

| Condition | Read |
|---|---|
| Writing Tailwind classes or touching visual style | [`styling/styling-guide.md`](styling/styling-guide.md) |
| The change must work in both themes, or touches a custom appearance | [`styling/theme-management.md`](styling/theme-management.md) |
| Adding an interactive element, a heading, or an icon-only control | [`patterns/accessibility-patterns.md`](patterns/accessibility-patterns.md) |

## Tests

| Condition | Read |
|---|---|
| Writing a unit or integration test | [`testing/testing-patterns.md`](testing/testing-patterns.md) |
| Deciding which layer should cover a behaviour, or what the external harness covers | [`testing/qa-strategy.md`](testing/qa-strategy.md) |
| Looking for what is currently untested | [`testing/qa-strategy.md`](testing/qa-strategy.md) § Finding what is untested |

## Onboarding content

| Condition | Read |
|---|---|
| Authoring an in-product onboarding flow | [`onboarding/flow-creation-guide.md`](onboarding/flow-creation-guide.md) |
