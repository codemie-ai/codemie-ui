# Dynamic Banner Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three static banner customer-config components with a single `banner` component declared for runtime editing, so a Platform Admin can change the chat banner from Administration without a redeploy.

**Architecture:** The dynamic customer-configuration mechanism resolves a component by laying a JSON override row from `dynamic_config` over the YAML component and filtering by `enabled`. Making a component dynamic means appending one `SettingDeclaration` to the `DECLARATIONS` tuple — the key is derived, the admin UI is generic, and no endpoint, schema or migration changes. This plan therefore adds a declaration plus a YAML component on the backend, removes the three legacy components, and points the frontend banner at the single new component id.

**Tech Stack:** Backend — Python, FastAPI, SQLModel, pytest, httpx `AsyncClient`. Frontend — React, TypeScript, valtio, primereact, vitest, @testing-library/react.

**Spec:** `docs/superpowers/tasks/2026-09-02-epmcdme-14649-dynamic-banner-config/spec.md`

## Global Constraints

- Two repositories, both already on branch `feature/EPMCDME-14649-dynamic-banner-config`: backend `/Users/evgeniikvasiuk/Projects/codemie/codemie`, frontend `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui`.
- Backend tasks (1–3) land before frontend tasks (4–5): the frontend consumes the `banner` component id the backend introduces.
- Commit subject format: `EPMCDME-14649: <Description>` — ticket id first, short subject, no multi-paragraph body.
- Never mention ticket ids, internal URLs, or company names inside source files. The ticket lives in the branch name and commit subject only.
- New component id is `banner`. Its fields are `enabled`, `message`, `linkLabel`, `linkRoute`.
- The legacy component ids `bannerMessage`, `bannerLinkLabel`, `bannerLinkRoute` are removed everywhere, with no fallback.
- Code comments: at most one short line where a decision is genuinely non-obvious. Rationale belongs in the MR description, not the source.
- Backend quality gates: `make ruff`, `make build`, `make license-check`, `make gitleaks`, `make test`.
- Frontend quality gates: `npm ci` first, then lint, typecheck, license-check, `secrets:check`, `test:unit`, integration.
- Every new file carries the Apache 2.0 licence header used by its neighbours in the same repository.

---

### Task 1: Declare the `banner` component and replace the legacy YAML entries

**Files:**
- Modify: `config/customer/customer-config.yaml:251-264` (backend)
- Modify: `src/codemie/service/customer_config_declarations.py:108-131` (backend)
- Test: `tests/codemie/service/test_customer_config_declarations.py`
- Test: `tests/codemie/service/test_customer_config_service.py`

**Interfaces:**
- Consumes: `SettingDeclaration`, `FieldDeclaration`, `FieldType`, `Markup`, `build_key` from `codemie.service.customer_config_declarations`.
- Produces: module-level `BANNER: SettingDeclaration` with `component_id="banner"` and fields `enabled` (switch), `message` (textarea), `linkLabel` (input), `linkRoute` (input); `DECLARATIONS` becomes `(CHAT_DISCLAIMER, BANNER)`. Derived key: `CUSTOMER_CONFIG__BANNER`. Later tasks rely on the field names exactly as spelled here.

**Test-first: yes** — assert the `banner` declaration exists with its four declared fields and that the YAML ships a `banner` component and no legacy banner components; both fail before the declaration and the YAML entry exist.

- [ ] **Step 1: Write the failing tests**

Append to `tests/codemie/service/test_customer_config_declarations.py`:

```python
def test_banner_is_declared_with_its_four_fields():
    declaration = by_component_id("banner")

    assert declaration is not None
    assert declaration.key == "CUSTOMER_CONFIG__BANNER"
    assert [field.name for field in declaration.fields] == [
        "enabled",
        "message",
        "linkLabel",
        "linkRoute",
    ]


def test_banner_link_route_is_constrained_to_a_relative_path():
    declaration = by_component_id("banner")
    link_route = next(field for field in declaration.fields if field.name == "linkRoute")

    assert link_route.type is FieldType.INPUT
    assert link_route.pattern == r"^/[^\s]*$"
    assert link_route.pattern_message


def test_banner_message_is_plain_text_with_a_length_limit():
    declaration = by_component_id("banner")
    message = next(field for field in declaration.fields if field.name == "message")

    assert message.type is FieldType.TEXTAREA
    assert message.markup is Markup.PLAIN
    assert message.max_length == 1000
```

Append to `tests/codemie/service/test_customer_config_service.py`:

```python
def test_banner_default_is_declared_disabled_and_empty():
    """The deployment default must exist in YAML, so a reset has something to fall back to."""
    from codemie.configs.customer_config import customer_config as real_config

    component = next((c for c in real_config.components if c.id == "banner"), None)

    assert component is not None
    assert component.settings.enabled is False
    assert getattr(component.settings, "message", None) == ""
    assert getattr(component.settings, "linkLabel", None) == ""
    assert getattr(component.settings, "linkRoute", None) == ""


def test_legacy_banner_components_are_gone():
    """The three-component shape is removed, not kept as a fallback."""
    from codemie.configs.customer_config import customer_config as real_config

    ids = {c.id for c in real_config.components}

    assert ids.isdisjoint({"bannerMessage", "bannerLinkLabel", "bannerLinkRoute"})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
cd /Users/evgeniikvasiuk/Projects/codemie/codemie
poetry run pytest tests/codemie/service/test_customer_config_declarations.py -k banner -v
poetry run pytest tests/codemie/service/test_customer_config_service.py -k banner -v
```
Expected: FAIL — `by_component_id("banner")` returns `None` (`AssertionError: assert None is not None`), and the YAML assertions fail because the component does not exist while the legacy ids do.

- [ ] **Step 3: Replace the legacy YAML components**

In `config/customer/customer-config.yaml`, delete lines 251-264 (the `bannerMessage`, `bannerLinkLabel` and `bannerLinkRoute` entries) and put this in their place, keeping it directly after `chatDisclaimer`:

```yaml
  - id: "banner"
    settings:
      enabled: false
      message: ""
      linkLabel: ""
      linkRoute: ""
```

- [ ] **Step 4: Add the declaration**

In `src/codemie/service/customer_config_declarations.py`, after the `CHAT_DISCLAIMER` declaration:

```python
BANNER = SettingDeclaration(
    component_id="banner",
    label="Banner",
    description="Notice shown across the top of the application for every user.",
    fields=[
        FieldDeclaration(
            name="enabled",
            type=FieldType.SWITCH,
            label="Show banner",
        ),
        FieldDeclaration(
            name="message",
            type=FieldType.TEXTAREA,
            label="Banner message",
            description="Plain text. Line breaks are preserved where the banner is shown.",
            max_length=1000,
        ),
        FieldDeclaration(
            name="linkLabel",
            type=FieldType.INPUT,
            label="Link label",
            description="Shown after the message. The link appears only when both link fields are filled in.",
            max_length=100,
        ),
        FieldDeclaration(
            name="linkRoute",
            type=FieldType.INPUT,
            label="Link target",
            description="Path inside the application, starting with a slash.",
            max_length=200,
            pattern=r"^/[^\s]*$",
            pattern_message="Link target must be a path inside the application, such as /settings/profile",
        ),
    ],
)
```

Then extend the registry tuple:

```python
DECLARATIONS: tuple[SettingDeclaration, ...] = (CHAT_DISCLAIMER, BANNER)
```

`markup` is left at its `Markup.PLAIN` default for every text field, which is what the banner renders.

- [ ] **Step 5: Run the tests to verify they pass**

Run:
```bash
poetry run pytest tests/codemie/service/test_customer_config_declarations.py tests/codemie/service/test_customer_config_service.py -v
```
Expected: PASS, including the pre-existing declaration and service tests.

- [ ] **Step 6: Replace the legacy ids used as examples in existing tests**

`tests/codemie/service/test_customer_config_declarations.py:35` and `:45` use `bannerMessage` and `bannerLinkRoute` purely as camelCase examples for key derivation. Keep the camelCase coverage but stop naming removed components:

At line 35, replace the parametrize entry
```python
        ("bannerMessage", "CUSTOMER_CONFIG__BANNER_MESSAGE"),
```
with
```python
        ("mcpAuthTimeoutSeconds", "CUSTOMER_CONFIG__MCP_AUTH_TIMEOUT_SECONDS"),
```

At line 45, replace
```python
    ["chatDisclaimer", "features:webSearch", "applications:test-mate", "bannerLinkRoute"],
```
with
```python
    ["chatDisclaimer", "features:webSearch", "applications:test-mate", "banner"],
```

- [ ] **Step 7: Run the full customer-config suite**

Run:
```bash
poetry run pytest tests/codemie/service/test_customer_config_declarations.py tests/codemie/service/test_customer_config_service.py tests/codemie/service/test_customer_config_validation.py tests/codemie/service/test_customer_config_audit.py tests/codemie/configs/test_customer_config.py -v
```
Expected: PASS. Confirm no test output still references a legacy banner id.

- [ ] **Step 8: Commit**

```bash
git add config/customer/customer-config.yaml src/codemie/service/customer_config_declarations.py tests/codemie/service/test_customer_config_declarations.py tests/codemie/service/test_customer_config_service.py
git commit -m "EPMCDME-14649: Replace three banner config components with one declared banner"
```

---

### Task 2: Cover banner validation of a saved override

**Files:**
- Test: `tests/codemie/service/test_customer_config_validation.py` (backend)

**Interfaces:**
- Consumes: `BANNER` from Task 1; `validate_and_sanitize` from `codemie.service.customer_config_service`; `ExtendedHTTPException` from `codemie.core.exceptions`.
- Produces: nothing consumed by later tasks.

**Test-first: yes** — the validation rules themselves already exist generically; these tests fail today only because the `banner` declaration does not exist, and they are what proves the declaration's constraints are the ones the spec requires.

The `pattern`, `max_length` and undeclared-field checks are already implemented in `_validate_text` and `_reject_undeclared_fields`. This task adds no production code: it pins the declaration's constraints so a later edit to the declaration cannot silently widen what an administrator may store in an unauthenticated, link-bearing surface.

- [ ] **Step 1: Write the failing tests**

Append to `tests/codemie/service/test_customer_config_validation.py`, matching the import style already used in that file:

```python
def _banner_payload(**overrides) -> dict:
    payload = {"enabled": True, "message": "Scheduled maintenance", "linkLabel": "", "linkRoute": ""}
    payload.update(overrides)
    return payload


def test_banner_accepts_a_relative_link_route():
    declaration = by_component_id("banner")

    result = validate_and_sanitize(declaration, _banner_payload(linkLabel="Details", linkRoute="/settings/profile"))

    assert result["linkRoute"] == "/settings/profile"


@pytest.mark.parametrize(
    "link_route",
    ["https://example.com/news", "javascript:alert(1)", "//example.com", "settings/profile"],
)
def test_banner_rejects_a_link_route_that_is_not_an_application_path(link_route):
    declaration = by_component_id("banner")

    with pytest.raises(ExtendedHTTPException) as error:
        validate_and_sanitize(declaration, _banner_payload(linkLabel="Details", linkRoute=link_route))

    assert error.value.code == 400


def test_banner_rejects_a_message_over_its_limit():
    declaration = by_component_id("banner")

    with pytest.raises(ExtendedHTTPException) as error:
        validate_and_sanitize(declaration, _banner_payload(message="x" * 1001))

    assert error.value.code == 400


def test_banner_rejects_an_undeclared_field():
    declaration = by_component_id("banner")

    with pytest.raises(ExtendedHTTPException) as error:
        validate_and_sanitize(declaration, _banner_payload(severity="warn"))

    assert error.value.code == 400
```

Add `by_component_id` to the existing import from `codemie.service.customer_config_declarations` in that file if it is not already imported.

- [ ] **Step 2: Run the tests to verify they pass**

Run:
```bash
poetry run pytest tests/codemie/service/test_customer_config_validation.py -k banner -v
```
Expected: PASS on Task 1's declaration. If any case fails, the declaration's `pattern` or `max_length` is wrong — fix the declaration, not the test.

- [ ] **Step 3: Commit**

```bash
git add tests/codemie/service/test_customer_config_validation.py
git commit -m "EPMCDME-14649: Cover banner override validation"
```

---

### Task 3: Add router coverage for the customer-config declarations endpoints

**Files:**
- Create: `tests/codemie/rest_api/routers/test_customer_config.py` (backend)

**Interfaces:**
- Consumes: `router` from `codemie.rest_api.routers.customer_config`; `authenticate` and `require_customer_config_write` from `codemie.rest_api.security.authentication`.
- Produces: nothing consumed by later tasks.

**Test-first: yes** — no router-level test exists for `/v1/config` or `/v1/config/declarations` today, so the 403 guard and the public payload shape are unverified end to end; each test below fails if the guard or the route is removed.

The backend testing guide requires negative auth and validation cases for routers. This closes that gap on the surface this ticket extends. Follow the `AsyncClient` + `ASGITransport` pattern from `tests/codemie/rest_api/routers/test_common.py`.

- [ ] **Step 1: Write the failing tests**

Create `tests/codemie/rest_api/routers/test_customer_config.py` with the Apache 2.0 header used by its neighbours, then:

```python
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from codemie.rest_api.routers.customer_config import router
from codemie.rest_api.security.authentication import authenticate, require_customer_config_write


def _app(*, authorised: bool) -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[authenticate] = lambda: None

    if authorised:
        app.dependency_overrides[require_customer_config_write] = lambda: None

    return app


@pytest.mark.asyncio
async def test_public_config_needs_no_authentication():
    with patch(
        "codemie.rest_api.routers.customer_config.resolve_components",
        AsyncMock(return_value=[]),
    ):
        async with AsyncClient(transport=ASGITransport(app=_app(authorised=False)), base_url="http://test") as client:
            response = await client.get("/v1/config")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_declarations_are_listed_for_an_authorised_caller():
    declarations = [
        {
            "component_id": "banner",
            "label": "Banner",
            "description": None,
            "overridden": False,
            "value": {"enabled": False, "message": "", "linkLabel": "", "linkRoute": ""},
            "fields": [],
        }
    ]

    with patch(
        "codemie.rest_api.routers.customer_config.list_settings",
        AsyncMock(return_value=declarations),
    ):
        async with AsyncClient(transport=ASGITransport(app=_app(authorised=True)), base_url="http://test") as client:
            response = await client.get("/v1/config/declarations")

    assert response.status_code == 200
    assert response.json()[0]["component_id"] == "banner"


@pytest.mark.asyncio
async def test_declarations_are_denied_without_configuration_write_permission():
    async with AsyncClient(transport=ASGITransport(app=_app(authorised=False)), base_url="http://test") as client:
        response = await client.get("/v1/config/declarations")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_saving_a_setting_returns_the_stored_settings():
    stored = {"enabled": True, "message": "Maintenance", "linkLabel": "", "linkRoute": ""}

    with patch(
        "codemie.rest_api.routers.customer_config.save_setting",
        AsyncMock(return_value=stored),
    ) as save:
        async with AsyncClient(transport=ASGITransport(app=_app(authorised=True)), base_url="http://test") as client:
            response = await client.put("/v1/config/declarations/banner", json={"settings": stored})

    assert response.status_code == 200
    assert response.json() == {"component_id": "banner", "settings": stored}
    assert save.await_args.args[0] == "banner"


@pytest.mark.asyncio
async def test_saving_a_setting_is_denied_without_configuration_write_permission():
    async with AsyncClient(transport=ASGITransport(app=_app(authorised=False)), base_url="http://test") as client:
        response = await client.put("/v1/config/declarations/banner", json={"settings": {}})

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_resetting_a_setting_returns_no_content():
    with patch(
        "codemie.rest_api.routers.customer_config.reset_setting",
        AsyncMock(return_value=None),
    ) as reset:
        async with AsyncClient(transport=ASGITransport(app=_app(authorised=True)), base_url="http://test") as client:
            response = await client.delete("/v1/config/declarations/banner")

    assert response.status_code == 204
    assert reset.await_args.args[0] == "banner"


@pytest.mark.asyncio
async def test_resetting_a_setting_is_denied_without_configuration_write_permission():
    async with AsyncClient(transport=ASGITransport(app=_app(authorised=False)), base_url="http://test") as client:
        response = await client.delete("/v1/config/declarations/banner")

    assert response.status_code == 403
```

- [ ] **Step 2: Run the tests**

Run:
```bash
poetry run pytest tests/codemie/rest_api/routers/test_customer_config.py -v
```
Expected: PASS. If the 403 cases return 200, the real `require_customer_config_write` is not reached — check that only `authenticate` is overridden in the unauthorised app. If they return 500, the guard reads `request.state.user`, which the override must supply; in that case override `authenticate` with a dependency that sets `request.state.user` to a non-admin user object exposing `is_admin_or_maintainer = False` and `id`.

- [ ] **Step 3: Commit**

```bash
git add tests/codemie/rest_api/routers/test_customer_config.py
git commit -m "EPMCDME-14649: Add router coverage for customer config declarations"
```

---

### Task 4: Point the banner at the single `banner` component

**Files:**
- Modify: `src/constants/configKeys.ts:19-26` (frontend)
- Modify: `src/store/appInfo.ts:67-69,159-169` (frontend)
- Modify: `src/types/entity/configuration.ts:18-33` (frontend)
- Modify: `src/components/appLevel/Banner.tsx:32-36,39-62,64-67` (frontend)
- Modify: `src/pages/settings/administration/__tests__/CustomerConfigurationPage.test.tsx:202,209,214` (frontend)
- Test: `src/components/appLevel/__tests__/Banner.test.tsx` (frontend, rewritten)

**Interfaces:**
- Consumes: `CONFIG_KEYS.BANNER` (`'banner'`); `getConfigItemSettings` from `@/utils/settings`; `useSnapshot` from `valtio`; the backend `banner` component from Task 1.
- Produces: a `Banner` component reading `{ enabled, message, linkLabel, linkRoute }` from one config item. `appInfoStore` no longer exposes `getBannerMessage`, `getBannerLinkLabel` or `getBannerLinkRoute`.

**Test-first: yes** — the rewritten `Banner.test.tsx` drives the store through `appInfoStore.configs` instead of three mocked getters, and fails against the current component because it still calls getters that the test no longer provides.

Reading the snapshot rather than the raw valtio proxy is part of the deliverable, not a refactor: the component currently re-renders only because `App.tsx` subscribes to `isConfigFetched`, so configuration changes are picked up by accident.

- [ ] **Step 1: Rewrite the failing test**

Replace the mock block and `setBanner` helper at `src/components/appLevel/__tests__/Banner.test.tsx:24-35` with a store-shaped fixture, leaving every existing test case body unchanged:

```tsx
vi.mock('@/store/appInfo', () => ({
  appInfoStore: { configs: [] },
}))

const setBanner = (config: { message?: string; linkLabel?: string; linkRoute?: string }) => {
  appInfoStore.configs = [
    {
      id: 'banner',
      settings: {
        enabled: true,
        message: config.message ?? '',
        linkLabel: config.linkLabel ?? '',
        linkRoute: config.linkRoute ?? '',
      },
    },
  ]
}
```

Then add two cases the current suite does not cover — the link, and the disabled component:

```tsx
describe('banner link', () => {
  it('renders the link when both label and route are set', () => {
    setBanner({ message: 'Read the notice', linkLabel: 'Details', linkRoute: '/settings/profile' })
    renderWithRouter()

    const link = screen.getByRole('link', { name: 'Details' })
    expect(link).toHaveAttribute('href', '/settings/profile')
  })

  it('renders no link when only one of the two link fields is set', () => {
    setBanner({ message: 'Read the notice', linkLabel: 'Details' })
    renderWithRouter()

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('disabled banner', () => {
  it('shows nothing when the component is disabled', () => {
    appInfoStore.configs = [
      { id: 'banner', settings: { enabled: false, message: 'Hidden', linkLabel: '', linkRoute: '' } },
    ]
    const { container } = renderWithRouter()

    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
  })
})
```

Every case that currently calls `render(<Banner />)` directly must call `renderWithRouter()` instead, because the component can now render a `Link`.

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd /Users/evgeniikvasiuk/Projects/codemie/codemie-ui
npx vitest run src/components/appLevel/__tests__/Banner.test.tsx
```
Expected: FAIL — `appInfoStore.getBannerMessage is not a function`.

- [ ] **Step 3: Replace the config keys**

In `src/constants/configKeys.ts`, delete the three legacy entries and add one:

```ts
export const CONFIG_KEYS = {
  IDP_PROVIDER: 'idpProvider',
  MCP_AUTH_ORIGIN: 'mcpAuthOrigin',
  MCP_AUTH_TIMEOUT_SECONDS: 'mcpAuthTimeoutSeconds',
  BANNER: 'banner',
  CHAT_DISCLAIMER: 'chatDisclaimer',
} as const
```

- [ ] **Step 4: Remove the three store getters**

In `src/store/appInfo.ts`, delete the three interface members at lines 67-69:

```ts
  getBannerMessage: () => string
  getBannerLinkLabel: () => string
  getBannerLinkRoute: () => string
```

and delete their implementations at lines 159-169 (`getBannerMessage`, `getBannerLinkLabel`, `getBannerLinkRoute`). Nothing replaces them — the component reads the config item directly, as `ChatDisclaimer` does.

- [ ] **Step 5: Declare the banner fields on the config item type**

`ConfigItem['settings']` is a fixed set of optional fields (`src/types/entity/configuration.ts:18-33`) and currently has `text?` for the disclaimer but nothing for the banner, so reading `settings.message` would not typecheck. Add the three fields after `text?: string`:

```ts
    text?: string
    message?: string
    linkLabel?: string
    linkRoute?: string
    content?: string
```

- [ ] **Step 6: Read the single component in the banner**

In `src/components/appLevel/Banner.tsx`, add the imports:

```tsx
import { useSnapshot } from 'valtio'

import { CONFIG_KEYS } from '@/constants/configKeys'
import { getConfigItemSettings } from '@/utils/settings'
```

Replace the three getter calls at lines 33-36 with:

```tsx
  const messages = useRef<Messages>(null)
  // read through the snapshot: valtio only re-renders for properties touched during render
  const { configs } = useSnapshot(appInfoStore)
  const settings = getConfigItemSettings(configs, CONFIG_KEYS.BANNER)
  const bannerMessage = settings?.enabled ? (settings.message ?? '') : ''
  const bannerLinkLabel = settings?.enabled ? (settings.linkLabel ?? '') : ''
  const bannerLinkRoute = settings?.enabled ? (settings.linkRoute ?? '') : ''
```

The rest of the component — the `useEffect`, the `localStorage` key, `handleRemove`, and the `Messages` markup — is unchanged. The three local names are kept so the existing effect and its dependency array need no edit.

- [ ] **Step 7: Run the test to verify it passes**

Run:
```bash
npx vitest run src/components/appLevel/__tests__/Banner.test.tsx
```
Expected: PASS, all cases including the two new link cases and the disabled case.

- [ ] **Step 8: Stop using a removed id in the administration fixtures**

In `src/pages/settings/administration/__tests__/CustomerConfigurationPage.test.tsx`, replace `'bannerMessage'` with `'banner'` at lines 202, 209 and 214. These fixtures use the id only as a second declaration alongside `chatDisclaimer`.

- [ ] **Step 9: Verify nothing references the removed ids**

Run:
```bash
grep -rn "bannerMessage\|bannerLinkLabel\|bannerLinkRoute\|getBanner" src/
```
Expected: no output.

- [ ] **Step 10: Run the unit suite and typecheck**

Run:
```bash
npx vitest run src/components/appLevel src/pages/settings/administration src/store
npm run typecheck
```
Expected: PASS with no type errors.

- [ ] **Step 11: Commit**

```bash
git add src/constants/configKeys.ts src/store/appInfo.ts src/components/appLevel/Banner.tsx src/components/appLevel/__tests__/Banner.test.tsx src/pages/settings/administration/__tests__/CustomerConfigurationPage.test.tsx
git commit -m "EPMCDME-14649: Read the banner from a single config component"
```

---

### Task 5: Prove the banner follows a configuration change without a reload

**Files:**
- Create: `src/components/appLevel/__tests__/Banner.integration.test.tsx` (frontend)

**Interfaces:**
- Consumes: the real `appInfoStore` proxy and the `Banner` component from Task 4.
- Produces: nothing consumed by later tasks.

**Test-first: yes** — the test renders `Banner` with an empty store, then assigns `appInfoStore.configs` and expects the banner to appear; it fails against any implementation that reads the raw proxy instead of a snapshot.

The unit suite mocks the store without reactivity and so cannot catch a component that subscribes to nothing. This mirrors `src/pages/chat/components/ChatDisclaimer/__tests__/ChatDisclaimer.integration.test.tsx`, which exists for exactly that reason and has no banner counterpart today.

- [ ] **Step 1: Write the failing test**

Create `src/components/appLevel/__tests__/Banner.integration.test.tsx` with the Apache 2.0 header used by its neighbours, then:

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import Banner from '../Banner'

const renderBanner = () =>
  render(
    <MemoryRouter>
      <Banner />
    </MemoryRouter>
  )

// The unit suite mocks the store without reactivity, which cannot catch a component that
// subscribes to nothing. This suite runs against the real proxy.
describe('Banner reactivity', () => {
  beforeEach(() => {
    appInfoStore.configs = []
    localStorage.clear()
  })

  afterEach(cleanup)

  it('appears when the config arrives after the first paint', async () => {
    const { container } = renderBanner()
    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()

    appInfoStore.configs = [
      {
        id: 'banner',
        settings: { enabled: true, message: 'Scheduled maintenance', linkLabel: '', linkRoute: '' },
      },
    ]

    await waitFor(() => expect(screen.getByText('Scheduled maintenance')).toBeInTheDocument())
  })

  it('follows a later refetch without a reload', async () => {
    appInfoStore.configs = [
      { id: 'banner', settings: { enabled: true, message: 'First notice', linkLabel: '', linkRoute: '' } },
    ]
    renderBanner()
    await waitFor(() => expect(screen.getByText('First notice')).toBeInTheDocument())

    appInfoStore.configs = [
      { id: 'banner', settings: { enabled: true, message: 'Second notice', linkLabel: '', linkRoute: '' } },
    ]

    await waitFor(() => expect(screen.getByText('Second notice')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run the test**

Run:
```bash
cd /Users/evgeniikvasiuk/Projects/codemie/codemie-ui
npx vitest run src/components/appLevel/__tests__/Banner.integration.test.tsx
```
Expected: PASS on Task 4's snapshot-based implementation. If it fails, the component is not subscribed to `configs` — that is the defect this test exists to catch, so fix `Banner.tsx`, not the test.

Note on the second case: the banner is appended through the `Messages` imperative API, so the first notice may remain on screen alongside the second. Assert only that the second notice appears; do not assert the first is gone.

- [ ] **Step 3: Run the full frontend gates**

Run:
```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
```
Expected: PASS. Run `npm ci` first — the guides note that gate results are not trustworthy without it.

- [ ] **Step 4: Commit**

```bash
git add src/components/appLevel/__tests__/Banner.integration.test.tsx
git commit -m "EPMCDME-14649: Cover banner reactivity to config changes"
```

---

### Task 6: Run the backend quality gates

**Files:** none modified — this task verifies Tasks 1–3.

**Interfaces:**
- Consumes: the backend changes from Tasks 1–3.
- Produces: the `make test-harness` output the merge-request description must carry.

**Test-first: no** — this is a verification task with no new behaviour.

- [ ] **Step 1: Run the gates in order**

Run:
```bash
cd /Users/evgeniikvasiuk/Projects/codemie/codemie
make ruff
make build
make license-check
make gitleaks
make test
```
Expected: each gate passes. For `make gitleaks`, check the scanned byte count in the output — a run reporting roughly zero scanned bytes has not actually scanned anything and its "no leaks found" verdict means nothing.

- [ ] **Step 2: Capture the test-harness output**

Run:
```bash
make test-harness > /tmp/test-harness.txt 2>&1; tail -40 /tmp/test-harness.txt
```
Keep the output — the merge-request description must contain it verbatim under a `## Test harness` section, or the compliance bot fails its checks.

- [ ] **Step 3: Confirm no legacy id survives in the backend**

Run:
```bash
grep -rn "bannerMessage\|bannerLinkLabel\|bannerLinkRoute" --include="*.py" --include="*.yaml" --include="*.yml" . | grep -v "/docs/superpowers/"
```
Expected: no output.
