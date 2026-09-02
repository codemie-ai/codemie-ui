# Spec: Migrate interactive chat elements from the custom protocol to A2UI

**Ticket:** EPMCDME-13910 (sub-tasks: EPMCDME-13911 — React 19 prerequisite, EPMCDME-13912 — migration)
**Status:** Draft for validation · 2026-08-04
**Repositories:** codemie (backend), codemie-ui (frontend) — atomic delivery, two MRs under one ticket
**Replaces:** the custom interactive protocol introduced in EPMCDME-13259

---

## 1. Overview

Interactive chat elements (buttons, text fields, date pickers, radio buttons, checkboxes)
currently run on a custom protocol: fixed-schema JSON payloads in the NDJSON stream with a
mirrored element registry on both sides. This spec defines the target behavior after
migrating to **A2UI (Google)** — a public generative-UI protocol — targeting **protocol
v0.9.1** with envelopes kept ready for the v1.0 renames.

Guiding principle: **standard protocol machinery, reused visual components, thin glue.**
The A2UI SDKs own the wire format, data binding, prompt generation and schema validation;
the visual controls are the existing product component library; our code is limited to
declarative bindings, transport multiplexing, server-side semantic validation, and product
UX states.

### Goals

1. Remove the custom protocol vocabulary entirely (models, validation rules, mirrored
   types, handlers) in favor of the A2UI Basic Catalog.
2. Preserve the user-facing behavior of interactive elements (states, re-answer,
   fallbacks) — the migration is invisible to end users except for newly available
   components.
3. Carry the assistant's interactive switch across to the new flag.

### Non-goals (out of scope)

- **Migrating stored conversation history.** Interactive elements recorded under the old
  protocol are not converted; those conversations are considered invalid. They still open
  — see §2.8 for what "invalid" does and does not mean.

- A2A exposure of interactivity (architecture prepared, not built).
- Full runtime capabilities negotiation (only the minimal declaration ships — see §5).
- Per-assistant catalog subsets (dynamic catalogs remain a documented reserve).
- Suspend/resume execution models (LangGraph `interrupt()`); turn-based is preserved.
- v1.0 RPC features (`callFunction`/`actionResponse`, live surface updates).
- Prompt-first emission mode (phase-two experiment).

## 2. Target behavior

### 2.1 Emission and agent behavior

- The `request_user_input` tool remains the single origin of interactive UI. It builds
  Basic Catalog components and emits A2UI envelopes (`createSurface`,
  `updateComponents`, `updateDataModel`; v0.9 semantics) as a dedicated NDJSON chunk
  type (`{"a2ui": <envelope>}`) within the streaming chat response.
- Emitting a surface ends the agent's turn: `return_direct` semantics, exactly one LLM
  call per interactive turn. The contract holds in both agent runtimes (LangGraph
  `create_react_agent` — default; classic `AgentExecutor` for react LLMs).
- A surface that fails validation is never emitted, and the refusal goes back to the agent
  with the validator's reason so it can correct its own surface — up to three attempts in
  one turn. The normalizations above only cover mistakes we have already seen; everything
  else used to be fatal on the first try, because `create_react_agent` decides to end the
  turn from the *name* of the return_direct tool, captured when the graph is built, and a
  name cannot tell a rejected call from an accepted one. So on the graph runtime the tool
  drops `return_direct` and ends the turn itself with `Command(goto=END)` once a surface is
  accepted, which leaves a refusal an ordinary tool error the agent can act on. The classic
  `AgentExecutor` understands no such control flow: there the flag stays on and the
  behaviour is unchanged, without the retry.
- When the attempts run out — or on the runtime that has none — the tool streams a short
  plain-text notice telling the user the form could not be built, because the turn ends
  either way and the assistant message would otherwise be empty. The notice does not depend
  on how the surface failed: the arguments are agent-authored, so a shape nobody anticipated
  raises whatever it raises. It is shown once, at the end, and never between attempts: a
  user about to be shown the corrected form should not first be apologised to for a form
  they never saw.
- The tool refuses a surface the user could not answer: at least one `Button` carrying
  an `action.event.name` must be **reachable from `root`**. An orphan component is legal
  A2UI and passes catalog validation, but renders nowhere; a `Modal` trigger does not
  count, since its click opens the dialog instead of submitting.
- A property the catalog does not define is **dropped, and the surface is still emitted**.
  Losing the whole form is not an acceptable outcome: the user gets nothing, while what
  they needed — the fields and the submit control — was expressible all along. What
  reaches the client is exactly the catalog's vocabulary, so the rule is conformance, not
  repair: the form renders, minus behaviour the renderer could never have performed.
  Assistant instructions that ask for more (e.g. "show tier-gated options disabled")
  cannot be satisfied by a Basic Catalog surface at all; the dropped paths are logged so
  operators can see what authors keep reaching for, and the product answer is a custom
  catalog (out of scope). A component the catalog does not define is still refused — the
  rule removes properties, it never invents support.
- **A property that gates a choice is the exception: the choice goes, not the gate.**
  Dropping the property is meaning-preserving for a hint or a description, and
  meaning-*reversing* for a gate — the option comes back selectable, and since the stored
  surface no longer records the gate, the server finds the value among those the surface
  offered and confirms the answer as legitimate. Removing the option keeps what the agent
  expressed while what reaches the client stays exactly the catalog's vocabulary. If that
  empties the list, the surface is refused for the same reason a form without a submit
  control is: the user is being asked a question they have no way to answer.
- **A `checks` rule that does not validate costs its own hint, not the form.** `checks`
  are the only recursive part of the catalog — an expression grammar — and the one place
  models reliably go wrong; a survey of 34 components was refused whole because one field
  tried to express "required only if department is Other" and recursed. Since they are UX
  only and the server re-validates every answer regardless, the offending component loses
  its checks and the surface ships. Only that component: every other field keeps its hint,
  and dropping all of them is the fallback for a surface no single removal fixes. What this
  costs is real and worth naming — a `required` expressed only through a dropped check is
  enforced nowhere, since the server validates the values it receives, not their presence.
- **A Modal's trigger is given the action the catalog demands of it.** `action` is
  required on every `Button`, including one whose only job is to open a dialog, and models
  leave it out — which discarded the whole surface over a property that carries no
  behaviour. The value is supplied instead of demanded: the renderer suppresses a trigger's
  dispatch, and the intake does not accept a trigger's action name as an answer, so nothing
  about what the user can do changes.
- **A component nested inside another component's property is lifted back to the top.**
  Models lose track of the array they are writing and continue the surface inside the last
  property they opened — a whole card, its Column and its fields, found inside a TextField's
  `checks` while the layout still named them. That refuses the surface twice over: the
  property stops matching its schema, and the layout references components that do not
  exist. Recovering them is not a guess. The catalog never nests a component inline —
  children are named by id, as strings — so an object carrying both an id and a catalog
  component name is misplaced by definition, and the surface already says where it belongs.
- **A `data_model` keyed BY the binding path is rewritten into the object that path
  addresses.** A field binds with `value: {"path": "/full_name"}`, so keying the seed
  `/full_name` is a fair reading of "the path it binds to" — and one the prompt used to
  invite. The intake reads the model as a tree and binds nothing under such a key, so every
  answer was then dropped as unanswerable: a filled form came back empty. Only keys with a
  leading slash are rewritten, which is not legal in a plain key, and a plain key already
  present wins over the pointer form.
- **A single top-level component is renamed to `root`.** The catalog anchors a surface at
  that id, and models routinely name the container after its purpose (`review_root`),
  which would discard a layout that is otherwise complete. A component referenced by
  nobody IS the top of the tree, so when there is exactly one the rename changes no
  structure and nothing can point at the old id. With several orphans the tree is
  genuinely ambiguous, picking one would be inventing a layout, and the surface is
  refused. This is the one place the tool rewrites what the agent authored.
- **A seeded `data_model` key the surface binds nothing under is dropped.** The intake
  refuses such a key and the client echoes the whole stored data model back on every
  submit, so emitting one would strand the user on a form that can never be sent, with no
  retry able to clear it. Both sides therefore apply the same rule, from the same binding
  depth constant.
- Validation errors name the offending component: the properties the catalog does not
  define for it (paths resolved from the catalog schema, including nested objects such as
  a `ChoicePicker` option) **and the required properties it is missing**. Both halves are
  needed — pruning removes the undefined property before validation runs, so without
  naming what is required the error would name nothing at all. The SDK reports a component
  failure as a `oneOf` miss across every wire-message type, so those irrelevant branches
  are filtered out.
- A bare id string in the `components` argument that merely repeats a component declared
  in the same list is dropped during argument parsing: it carries no meaning (children
  are named in their parent's own field), and rejecting it would cost the user a turn
  before the tool runs. A string naming no declared component still fails.
- Wire-level message names are declared in exactly one module per side
  (`core/a2ui/envelopes.py`; `a2ui/config.ts`) and nothing else spells them out, so the
  v1.0 rename has one site rather than several (v1.0-readiness). A test enforces it on the
  backend. Envelope assembly stays in the adapter; reading them back goes through the same
  vocabulary module, which sits below both the adapter and the catalog so neither import
  creates a cycle.

### 2.2 Gating

The tool is registered and the interactive prompt section injected only when ALL hold:

1. the assistant's interactive switch is on (plain boolean after migration — see §2.8);
2. the execution path is streaming (`thread_generator` present);
3. the platform `interactiveElements` flag is enabled;
4. the request declares the active catalog in `a2ui_supported_catalogs` (see §5).

When any condition fails, the agent has no tool and no prompt section, and naturally
falls back to asking in plain text. Intake is intentionally NOT gated by the platform
flag (in-flight answers must keep working).

### 2.3 Catalog

- One static catalog: the full **Basic Catalog (18 components)** under its official
  `catalogId` taken from SDK constants (nothing self-hosted). Prompt section and
  validation schemas are generated from it by the SDK on the backend.
- **Nothing about components is described in our own words.** The prompt section is
  assembled from the SDK's catalog description (schemas included) plus two things the
  catalog cannot state: what the tool does, and how this backend transports a surface
  (components go in the tool argument; the server builds the wire messages). Restating
  component rules in prose would create a second spec that drifts from the catalog the
  renderer and validator actually use — the cost this migration exists to remove.
- **One worked example is carried as well, and it earns its place.** It is a single valid
  surface — a text field bound to the data model, a check, a submit button — validated by
  the test suite so a broken one cannot ship. It was removed once as redundant with the
  schemas, and the next surface came back with every input carrying a literal `value`
  instead of a `{"path": ...}` binding: schema-valid, and dead, because nothing writes back
  to a literal. Measured on one assistant within three hours, 13 of 13 inputs were bound
  with the example and 0 of 13 without it. The schema says `value` accepts either form;
  only the example shows which one an input needs.
- Following A2UI's own tool-based integration, the schema stays in the system prompt and
  the tool's argument description points at it by the delimiters the SDK emits
  (`---BEGIN A2UI JSON SCHEMA---` / `---END A2UI JSON SCHEMA---`). That pointer is the
  binding between tool and contract, so a test asserts the block it names is really
  present: a stale pointer silently leaves the model to find the schema on its own.
- Published catalogs are immutable: a changed composition or protocol version means a
  new `catalogId`; persisted history must remain resolvable forever.

### 2.4 Rendering (frontend)

- The official `@a2ui/react` (v0_9 path) + `@a2ui/web_core` own protocol machinery:
  envelope processing, surface state, two-way data binding, `checks` evaluation.
- **The catalog's own components draw the surface.** `@a2ui/react` ships an
  implementation of every component it publishes, and using them is the point: the fewer
  of the catalog we re-implement, the less there is to drift from it. Six are ours, each
  for a stated reason — the three media components and `Icon` (agent-authored URLs must
  not be fetched without consent, and the artwork is ours), `Button` (a Modal trigger must
  open the dialog, not submit), and `DateTimeInput` (the product's picker). The registry
  records which and why.
- The catalog components are dressed in the product's design tokens through CSS custom
  properties: the catalog's own cascade to twelve base ones, which are mapped to the theme
  variables the app already publishes, so light and dark follow the product with no
  duplication. Layout is supplied alongside them because the published `@a2ui/react` build
  ships its component stylesheet as CSS modules whose class maps are empty — nothing
  carries the classes its own CSS targets. That styling is written against the markup of a
  pinned version and is re-checked on an SDK upgrade; the alternative is re-implementing
  eighteen components to get spacing back.
- Where the catalog renderer and the catalog disagree, the envelopes are normalized before
  it sees them, never patched in a component: `ChoicePicker.variant` defaults to
  single-choice, a scalar seed becomes the one-element array a selection is, and an empty
  text input holds `""`. These are the same rules the server enforces on the answer, so
  the two halves cannot disagree about what a value means.
- Two catalog properties the SDK's components do not implement are supplied by us:
  `accessibility` (as ARIA, applied from outside any implementation) and
  `validationRegexp` (which blocks submission). Three gaps are accepted and pinned by
  tests instead: a `number` variant submits its text, `validationRegexp` shows no
  field-level message, and the dialog carries no `role="dialog"`.
- Media components (`Image`, `Video`, `AudioPlayer`, `Icon`) render only sanitized
  agent-authored URLs; a disallowed URL renders a safe placeholder and fires no network
  request. Sanitization is centralized in the media binding.
- A well-formed media URL is still agent-authored, i.e. attacker-controlled under prompt
  injection, and the app has neither a CSP nor a trusted-domain registry. Rendering it
  immediately would make the browser request an attacker-chosen host from the user's IP
  with data encoded in the URL, with no user action at all. The element is therefore
  mounted only after the user clicks a consent control naming the target host, and the
  request carries no referrer. Residual risk: a user who clicks still discloses their IP.
  Closing that fully needs a server-side media proxy or a domain allowlist (not built).
- Media that fails to load degrades to the same placeholder. Agent-authored URLs are
  frequently wrong (an invented 404, or a video page such as a YouTube watch link, which
  a plain `<video>` can never play), and a browser's broken-media icon explains nothing.
- `Modal`: the component renders its own `trigger`, and a click on that trigger opens the
  dialog instead of dispatching. The catalog requires every `Button` to declare an
  `action`, so a trigger carries one it must not send: dispatching would submit the
  surface and end the turn before the dialog could be seen. Controls inside the dialog
  content submit normally.
- An unknown component or malformed surface degrades to a text placeholder without
  breaking the conversation (centralized fallback, ErrorBoundary pattern).
- Client-side `checks` (`required`, `regex`, `length`, `numeric`, `email`) and date
  `min`/`max` show field-level errors and block submission until valid. Client checks are
  UX only — never a security boundary. Since no catalog component renders a failed check
  as an inline error on the button, a refused submit says so explicitly rather than
  leaving the control looking dead.
- **The message and the disabled button come from one evaluation.** Whether a field is
  satisfied decides both, so they are computed by the same code: a component prints the
  message of the rule it currently fails, and the surface refuses to submit while any rule
  fails. Two evaluations would eventually disagree, and the shape that takes is a form that
  will not submit and will not say why.
- **A component whose renderer swallows the message gets one anyway.** The SDK prints
  `validationErrors` for its TextField and CheckBox and ignores it in ChoicePicker and
  Slider, so a required choice blocked submission silently. Those two are wrapped, and the
  wrapper subscribes to the data model so the message clears the moment the field is
  filled in.
- **ChoicePicker normalizes what it was seeded with, and writes the result back.** A
  selection is a string array per the catalog, but a re-rendered form arrives carrying the
  agent's own seed values, and those come back as scalars (`"country": "Other"`). The
  scalar is read as the single selection it means; selections matching no rendered option
  are dropped; and a single-choice picker keeps at most one, the same cap the server
  enforces. The normalized shape is written back to the data model, because otherwise an
  untouched field submits the seed and the server refuses the whole answer with nothing
  the user can do but re-pick. The comparison that decides whether a write is needed is by
  content, not length — same-length-but-different is exactly the case a length check waves
  through, and it produced a form that showed one selection while submitting two.
- **Every property the backend advertises has an observable effect.** `accessibility`
  becomes ARIA attributes — on the control itself for inputs and buttons, and on a
  role-carrying wrapper otherwise, since `aria-label` on a bare element is not announced.
  `weight` becomes `flex-grow`, applied only when declared so surfaces that omit it render
  unchanged. `displayStyle` selects the catalog's `chips` presentation, whose selected
  state is carried by fill *and* a check mark rather than by colour alone. See §3 for why
  ignoring any of them is not an option.
- An empty text input holds `""` in the data model rather than nothing. Checks are
  evaluated against that model and the SDK's `regex` function runs `test(value)`, where an
  absent value stringifies to `"undefined"` — so a pattern written to accept empty
  (`^$|...`) could never match, and an **optional** field showed an error the user had no
  way to clear. The number variant is excluded: there, empty genuinely means "no number
  yet", and it writes a real number once filled.

### 2.5 Answer flow and UX states

- A button click sends the A2UI `action` envelope, and the surface's data model as the
  separate `a2uiDataModel` request field, as a **regular chat request** — no dedicated
  endpoint, no resume. The model is read from the surface rather than requested through
  the catalog's `sendDataModel` flag, which would have to be set on every surface for the
  same result. An optimistic user chip appears immediately; on server error the turn rolls
  back with a toast and the form becomes editable again.
- Surface states: *active* (latest turn, unanswered), *submitted* (read-only, prior
  answers prefilled, pressed button marked), *stale* (unanswered, not the latest turn —
  disabled), *busy* (generation in progress — not interactive).
- Free-text input remains available while a surface is active (text fallback).
- Re-answer: Edit on the assistant message unlocks the form; a new submit replaces the
  turn; the latest answer survives reload. In multi-assistant conversations the answer
  is attributed to the assistant that issued the surface.

### 2.6 Server-side validation and security

- Every answer is re-validated server-side. Not with `A2uiValidator`: the SDK ships no
  client-to-server schema for 0.9.1 and its model pins `version` to `v0.9`, so the answer
  envelope is checked structurally against the documented wire contract — a maintained
  allow-list of envelope and action keys, rejecting anything else — and then semantically
  against the surface the server stored. `A2uiValidator` covers emission only. The
  allow-list is what has to be revisited at v1.0, so it is named here rather than implied.
  The semantic and anti-tampering checks are — values within declared options,
  length/size caps, date ranges, selection caps, no extra keys, payload size cap,
  double-answer protection (strict history-index re-answer path excepted), ownership
  check returning 403 before any surface-existence disclosure.
- The `action` envelope carries no `catalogId`; the server resolves the catalog from
  its own stored surface record — client input is never trusted for catalog identity.
- `validationRegexp` is **not** evaluated server-side. The pattern is authored by the same
  untrusted agent as the surface, so running it on the server would mean compiling
  attacker-chosen regular expressions — a denial-of-service class bought for a formatting
  rule. It is enforced by the renderer instead, where it blocks submission alongside
  `checks`, and where the blast radius of a pathological pattern is the one tab that
  authored surface is displayed in — no worse than the catalog's own `regex` check
  function, which the SDK already evaluates there. A badly formatted string is not a
  security problem; the length cap, option membership, selection caps, date bounds,
  unknown-key rejection and the payload cap all remain.
- **Every component that can bind a value is checked**, and there are exactly five:
  `CheckBox`, `ChoicePicker`, `DateTimeInput`, `Slider`, `TextField`. A bound key whose
  component is none of them is refused rather than waved through — it is either a forged
  answer or a catalog addition nobody taught the intake about, and both are safer refused
  than replayed into the prompt unchecked.
- A date bound is not skipped when the submitted value is a different temporal kind. The
  value side is client-controlled, so a bare time-of-day answer to a date-bounded field —
  which parses cleanly and compares with neither end of the range — is a refusal, not an
  authoring quirk to ignore.
- A data model submitted without its matching action is refused (422). The pair is what
  identifies which surface is being answered; a model alone binds to nothing.
- Answer types follow the component that declared the binding: a `TextField` of variant
  `number` submits a real number, so intake accepts numeric values there (booleans
  excluded, since `bool` is an `int` in Python) while every other variant stays a string.
- Answering in the chat box instead of the form is an ordinary turn, not an error: it
  carries no action, nothing is validated, and the surface stays unanswered — it must not
  be consumed as an answer, which would make the form unanswerable and could slip a
  duplicate past the once-only guard.
- Legacy response kinds (`action`/`choice`/`form` of the old protocol) are removed;
  intake accepts the single A2UI `action` shape (+ free text) with dispatch designed to
  be extensible for future answer types/consumers.

### 2.7 History, persistence and LLM continuity

- Envelopes are persisted raw (versioned, self-contained) in the JSONB conversation
  history; conversation reload replays them through the renderer, restoring all surface
  states without server-side session state.
- For the LLM, request and answer are materialized into history text (replacing the
  current `materialize_*` helpers); the agent's next turn continues coherently —
  turn-based, no resume endpoint.

### 2.8 Data migration

- Assistant flag: `assistants.interactive_features` migrates to a plain boolean
  (`null` → off, any group enabled → on); the three-group granularity is removed; the
  switch UI is unchanged.
- **Conversation history is not migrated.** Interactive elements recorded under the old
  protocol are not converted to A2UI surfaces: those conversations are considered invalid,
  and the requirement was dropped from this change.
- "Invalid" means the element is gone, not that the conversation is. A user scrolling back
  through their own history must not meet an error because of a message shape the product
  no longer supports, so an old record still loads — its text is intact, and the fields
  that carried the old element are simply not part of the model any more. The history list
  is re-serialized whole on every turn, so a conversation that receives a new message
  clears its own legacy payload. Pinned by tests.

## 3. Configuration and BE/FE synchronization

- **Backend config**: one module — `codemie/core/a2ui/config.py`, the mirror of the
  frontend's `a2ui/config.ts`. Every version, identity and limit this backend names lives
  there: `A2UI_VERSION` (which schema assets to load), `WIRE_VERSION` and the accepted
  answer versions, `CATALOG_ID`, the four message-kind names, the closed key set of an
  action envelope, and the six size limits. The SDK is loaded there too, since the catalog
  id is derived from it rather than written out. It imports nothing of ours, so everything
  else in the package can depend on it without a cycle.
- `client_supports_catalog(declared)` lives there as well, because the same question is
  asked in two places — whether to register the tool, and whether to append the catalog
  section to the prompt — and those two must never answer differently.
- Component schemas come from the pinned `a2ui-agent-sdk`. There is no enabled-subset
  mechanism: the backend advertises the whole Basic Catalog, because the catalog id it
  declares is a promise about which catalog, not which part of it. A client declares what
  it can draw in `a2uiSupportedCatalogs`; the backend serves exactly one catalog, so that
  list is a membership test and never a choice — extra entries are ignored, and an id that
  differs in case or version segment is a different catalog.
- **Frontend config**: `SUPPORTED_COMPONENTS` and the catalog id are written out in
  `a2ui/config.ts`, and the registry is built from them — deliberately that direction, so
  the manifest generator can read the list without pulling in React or a DOM. The registry
  test asserts the two stay identical, so the invariant holds even though the derivation
  runs the other way. `npm run a2ui:manifest` emits `a2ui-manifest.json` (catalogId,
  protocol version, component list, **the properties each component accepts**, and a
  composition hash that nothing currently reads).
- **Invariant**: `catalog components (BE) ⊆ registry (FE)`, same catalogId, pinned SDK
  versions on both sides.
- **Keeping the two halves in step is a manual step, and this is it.** After any change to
  the components or properties the renderer implements:

  1. `npm run a2ui:manifest` in `codemie-ui` — regenerates `src/a2ui/a2ui-manifest.json`.
     A frontend test fails if this was skipped, so a stale commit is caught there.
  2. **Copy that file over `codemie/src/codemie/core/a2ui/a2ui-manifest.json`** and commit
     it with the change. Same file name on both sides, deliberately: the copy is made by
     hand, and an identical name is what makes "is this the same file?" answerable at a
     glance and by a plain diff.

- **How it is guarded, and how far that goes.** A backend pytest compares the vendored copy
  against the catalog the backend advertises — `catalogId`, then component by component,
  then property by property, reading the live schemas from the backend SDK. That check is
  real and runs in CI. What it compares against, however, is the *snapshot*: a second test
  verifies the copy is current, but it **skips** unless both repositories are checked out
  side by side, so in CI it never runs. The consequence to keep in mind: if step 2 is
  forgotten, the backend keeps advertising against an outdated snapshot and stays green —
  a component the frontend has dropped would still be offered to the model. No hash is
  compared anywhere; `compositionHash` is generated and read by nobody.

- The manual step is what a follow-up should remove: pulling the manifest in backend CI
  from the frontend's build artifact (or an npm package) would delete the copy, and with it
  the test that cannot run.
- The invariant is checked **property by property**, not only by component name. The two
  halves reach the catalog through independently versioned packages (`a2ui-agent-sdk` and
  `@a2ui/web_core`), so one side can carry a property the other has never heard of. A
  frontend-only property is inert, since the model is only ever told what the backend
  catalog contains (currently one such case: `List.listStyle`).
- **What that gate does and does not prove.** Both property lists are derived from the two
  pinned SDK packages, so the gate detects package drift between the halves — it does not
  certify that a renderer implements a property. That second guarantee is held by
  behavioural tests instead: every property the backend advertises has an observable
  effect in the renderer, and the four that once had none (`accessibility`, `weight`,
  `displayStyle`, `validationRegexp`) are pinned by tests of their own. The rule is that a
  property the model is told about must do something, since the model cannot know which
  parts of the catalog this client honours.
- **Rollout order** for catalog changes: frontend first (a superset is valid), backend
  enables second.

## 4. Wire format summary

- Chunk: `{"a2ui": {"version": "v0.9.1", "<messageType>": {...}}}` — the wire version is
  the patch version, while the catalog id carries the `v0_9` spec family — one envelope per
  NDJSON line, ordering guaranteed by the existing stream.
- Agent → client: `createSurface {surfaceId, catalogId, ...}`, `updateComponents`,
  `updateDataModel`.
- Client → agent (inside the chat request): `action {name, surfaceId,
  sourceComponentId, context}` + data model; plus the request-level field
  `a2ui_supported_catalogs: [<catalogId>]`.

## 5. Catalog capability declaration (minimal handshake)

Every chat request from an A2UI-capable client declares the catalog id(s) it can render
(derived from the binding registry). The backend treats this as a binary gate (§2.2,
condition 4): no declaration or unknown id → no emission for that turn. This protects
the atomic-release window (stale open tabs run the old SPA) and makes non-A2UI clients
(IDE chat inherits the request model) degrade to plain text by construction. No dynamic
catalog assembly is performed; the field lays the wire format for full negotiation later.

## 6. Rollout and rollback

- Atomic joint BE+FE release; no transition flag; one emission path and one storage
  format at any time.
- Staging acceptance (full e2e via the SDK test harness + contract tests) is mandatory
  **before** the production data migration.
- Rollback = release rollback. There is no history conversion to reverse: nothing was
  converted, so nothing has to be undone — which is the main thing dropping the migration
  bought.
- Removal: after the switch, all old-protocol code is deleted on both sides
  (`core/interactive.py` protocol parts, `InteractiveElements/*`, mirrored types, dead
  code); `.ai-run/guides` and repo docs are updated. With no history migration there is no
  conversion module to keep, and nothing on the backend reads the old shape. One deliberate
  exception remains on the frontend: `readInteractiveEnabled` still falls back to the
  legacy `interactive_features` when the new boolean is absent, because a cached or
  exported assistant would otherwise silently save its switch off. The backend column is
  already dropped, so the fallback can only fire on such stale payloads; it is removed once
  cached assistants have aged out.

## 7. Acceptance criteria

Canonical, numbered acceptance criteria (AC-A1…AC-H2, eight groups: emission, rendering,
client validation, answer flow, server security, history, migration, release/regression)
are maintained in **EPMCDME-13910** and are not duplicated here to avoid divergence.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Pre-1.0 protocol evolution (v0.8→v0.9 precedent was fully breaking) | Target v0.9.1; adapter isolation on both sides; versioned envelopes in storage |
| React 19 peer requirement of `@a2ui/react` | Prerequisite sub-task EPMCDME-13911 (starts with a dependency-compatibility spike) |
| No LangChain/LangGraph integration in the Python SDK | Thin glue (LangChain `BaseTool` → SDK validator → NDJSON); one tool covers both runtimes |
| Spec provides no server-side security validation | Semantic/anti-tampering intake checks ported as is; media URL sanitization added |
| Atomic release without a transition flag | Rollback is a release rollback alone; no history was converted, so there is nothing to undo |
| SDK version drift (`a2ui-agent-sdk` / `@a2ui/web_core`) | Pinned versions; BE↔FE envelope contract tests; schema-hash check in CI |

## 9. Future extensions (documented, not built)

A2A exposure (official A2UI extension over the existing A2A handler); full capabilities
negotiation (composition fingerprint → effective catalog intersection via SDK dynamic
catalogs); graceful degradation policy for unknown components (layout → children flat,
input → generic control by bound value type, media → never auto-render); per-assistant
catalog subsets; custom catalogs beyond Basic; v1.0 upgrade (rename mapping in adapters,
RPC layer for live in-turn updates); prompt-first emission.
