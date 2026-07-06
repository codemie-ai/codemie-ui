# Design: Google Docs OAuth 2.0 Frontend Integration

**Date**: 2026-07-01  
**Ticket**: EPMCDME-13222  
**Run**: 20260701-1634-main  
**Status**: Approved

---

## Goal

Replace the current Google Docs datasource auth model (share document with a shared service account) with a per-user Google OAuth 2.0 popup flow. The frontend initiates authorization, polls for completion, and guards form submission. Backend stores all tokens — the frontend never receives or stores OAuth credentials.

---

## Architecture

Two new files, four modified files. No new library dependencies.

### New files

| File | Purpose |
|---|---|
| `src/hooks/useOAuth.ts` | Generic provider-agnostic popup-poll OAuth hook |
| `src/components/OAuthSignInButton/OAuthSignInButton.tsx` | Generic sign-in button with 4 visual states |

### Modified files

| File | Change |
|---|---|
| `IndexTypeField/IndexTypeGoogle.tsx` | Replace service-account InfoBox with OAuth section |
| `DataSourceForm/hooks/useEditPopupForm.ts` | Add `googleOAuthCompleted` and `googleOAuthPending` boolean fields to Yup schema + form defaults |
| `src/store/dataSources.ts` | Add `initiateGoogleDocsOAuth()` and `getGoogleDocsOAuthStatus()` store methods |
| `DataSourceForm/DataSourceForm.tsx` | Remove `!index` guard for Google section; pass `initialStatus`/`initialUserEmail` props |

---

## Shared Types (`src/hooks/useOAuth.ts`)

```ts
export enum OAuthStatus {
  IDLE = 'idle',
  WAITING = 'waiting',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum OAuthProvider {
  GOOGLE = 'Google',
}
```

---

## `useOAuth` Hook

### Interface

```ts
interface UseOAuthOptions {
  initiate: () => Promise<{ auth_url: string; state: string }>
  getStatus: (state: string) => Promise<{ status: string; user_email?: string; message?: string }>
  pollInterval?: number        // default 2000ms
  initialStatus?: OAuthStatus  // for edit mode pre-population
  initialUserEmail?: string
}

interface UseOAuthReturn {
  status: OAuthStatus
  userEmail: string
  error: string
  handleSignIn: () => Promise<void>          // IDLE / ERROR → WAITING → SUCCESS or ERROR
  handleReauthenticate: () => Promise<void>  // SUCCESS → WAITING → SUCCESS or back to previous SUCCESS
  cancel: () => void                         // WAITING → IDLE or back to previous SUCCESS
}
```

`handleSignIn` and `handleReauthenticate` **do not throw** — all errors are captured and surfaced via `error` state. Callers do not need to `await` or `.catch`.

### Internals

**Both polling concerns** are delegated to `usePolling` (`src/hooks/usePolling.tsx`) — no hand-rolled timers. Two instances share the same `isPolling` flag as their `enabled` prop, so both start and stop together:

```ts
// Status polling — network call every 2s
usePolling({ fetchFn: checkStatus,      enabled: isPolling, interval: pollInterval ?? 2000 })

// Popup-close detection — synchronous DOM check every 500ms
usePolling({ fetchFn: checkPopupClosed, enabled: isPolling, interval: 500 })
```

`checkPopupClosed` is `async () => { if (popupRef.current?.closed) cancel() }` — a valid `fetchFn` that never throws, so `usePolling`'s error-backoff path is never triggered. When `isPolling` flips to `false` (status resolved or `cancel()` called), both instances stop via `enabled`.

**Reauth mode tracking**: the hook tracks whether the current WAITING was initiated from `SUCCESS` (`reauthMode` ref). This determines behavior on failure or cancel:
- `handleSignIn` sets `reauthMode = false`
- `handleReauthenticate` sets `reauthMode = true` and stores the current `userEmail` as `previousEmail` before starting
- `cancel()`: if `reauthMode` → revert to `{ status: SUCCESS, userEmail: previousEmail }`; otherwise → revert to IDLE
- On `status: error` from polling: same recovery logic as `cancel()`

```ts
// handleSignIn flow
async function handleSignIn() {
  reauthModeRef.current = false
  const { auth_url, state } = await initiate()  // errors surfaced to state, not thrown
  stateRef.current = state
  popupRef.current = window.open(auth_url, '_blank', 'width=600,height=700')
  if (!popupRef.current) { /* popup blocked */ return }
  setOAuthStatus(OAuthStatus.WAITING)
  setIsPolling(true)
}

// handleReauthenticate flow
async function handleReauthenticate() {
  reauthModeRef.current = true
  previousEmailRef.current = userEmail   // stash current email
  // same as handleSignIn from here
}

// cancel() / failure recovery
function cancel() {
  setIsPolling(false)
  popupRef.current?.close()
  if (reauthModeRef.current) {
    setOAuthStatus(OAuthStatus.SUCCESS)
    setUserEmail(previousEmailRef.current)
  } else {
    setOAuthStatus(OAuthStatus.IDLE)
  }
}
```

---

## `OAuthSignInButton` Component

```ts
interface OAuthSignInButtonProps {
  provider: OAuthProvider               // enum — only OAuthProvider.GOOGLE for now
  status: OAuthStatus
  onSignIn: () => void                  // IDLE and ERROR state
  onReauthenticate: () => void          // SUCCESS state
  onCancel: () => void                  // WAITING state
  userEmail?: string
  error?: string
}
```

Four visual states:

| Status | Renders |
|---|---|
| IDLE | Primary button "Connect with {provider}" |
| WAITING | Spinner + "Waiting for authorization…" + "Cancel" text button (calls `onCancel`) |
| SUCCESS | Success icon + `userEmail` + "Re-authenticate" secondary button (calls `onReauthenticate`) |
| ERROR | Error text + "Try again" primary button (calls `onSignIn`) |

Uses existing `Button`, spinner, and icon components from the project's component library.

---

## `IndexTypeGoogle` (revised)

Receives two new optional props: `initialStatus?: OAuthStatus` and `initialUserEmail?: string`.

### Hook initialization

```ts
const { status, userEmail, error, handleSignIn, handleReauthenticate, cancel } = useOAuth({
  initiate: dataSourceStore.initiateGoogleDocsOAuth,
  getStatus: dataSourceStore.getGoogleDocsOAuthStatus,
  pollInterval: 2000,
  initialStatus,
  initialUserEmail,
})
```

### Form field synchronization

```ts
// On mount: pre-populate from initialStatus
useEffect(() => {
  if (initialStatus === OAuthStatus.SUCCESS) {
    setValue('googleOAuthCompleted', true)
  }
}, [])  // intentionally run once on mount

// Keep pending flag and completed flag in sync with OAuth status
useEffect(() => {
  setValue('googleOAuthPending', status === OAuthStatus.WAITING)
  if (status === OAuthStatus.SUCCESS) setValue('googleOAuthCompleted', true)
  if (status === OAuthStatus.ERROR || status === OAuthStatus.IDLE) setValue('googleOAuthCompleted', false)
}, [status, setValue])
```

### Layout order

1. `OAuthSignInButton` (auth section)
2. Google doc link input (existing)
3. LLM format guide InfoBox (kept)
4. ~~Service account sharing InfoBox~~ (removed)
5. Embeddings model autocomplete (existing)

---

## Yup Schema Additions (`useEditPopupForm.ts`)

```ts
// Blocks submit during popup waiting — both create and edit mode
googleOAuthPending: Yup.boolean().when('indexType', {
  is: (indexType: string) => indexType === INDEX_TYPES.GOOGLE,
  then: (schema) => schema.oneOf([false], 'Google authorization is in progress — please wait.'),
  otherwise: (schema) => schema.notRequired(),
}),

// Blocks submit in create mode until OAuth completes
googleOAuthCompleted: Yup.boolean().when(['indexType', 'isEditing'], {
  is: (indexType: string, isEditing: boolean) =>
    indexType === INDEX_TYPES.GOOGLE && isEditing === false,
  then: (schema) => schema.oneOf([true], 'Please connect your Google account before saving'),
  otherwise: (schema) => schema.notRequired(),
}),
```

**Form defaults**: both fields default to `false`. `IndexTypeGoogle` calls `setValue('googleOAuthCompleted', true)` on mount when `initialStatus === OAuthStatus.SUCCESS`.

---

## Store Methods (`dataSources.ts`)

```ts
initiateGoogleDocsOAuth(): Promise<{ auth_url: string; state: string }>
  // POST 'v1/google-docs/oauth/initiate'

getGoogleDocsOAuthStatus(state: string): Promise<{ status: string; user_email?: string; message?: string }>
  // GET `v1/google-docs/oauth/status/${state}`
```

Follows the same pattern as `initiateSharePointOAuth` and `getSharePointOAuthStatus`.

---

## `DataSourceForm` changes

1. Remove the `!index &&` guard on the Google section (currently `DataSourceForm.tsx:444`):
   ```tsx
   // Before:  {!index && field.value === INDEX_TYPES.GOOGLE && (
   // After:   {field.value === INDEX_TYPES.GOOGLE && (
   ```
2. Pass `initialStatus` and `initialUserEmail` to `IndexTypeGoogle` from `index.google_oauth`:
   ```tsx
   googleOAuthInitialStatus={
     index?.google_oauth?.status === 'connected' ? OAuthStatus.SUCCESS : undefined
   }
   googleOAuthInitialEmail={index?.google_oauth?.user_email}
   ```
3. Add optional `google_oauth` field to `DataSourceDetailsResponse` in `src/types/entity/dataSource.ts` (~line 154):
   ```ts
   google_oauth?: { status: 'connected' | 'expired' | 'not_connected'; user_email?: string }
   ```

---

## Data Flow

### Create mode

```
User opens Create Datasource → selects Google Docs
IndexTypeGoogle renders: OAuthSignInButton (IDLE), form fields
→ user clicks "Connect with Google" → handleSignIn()
→ POST /v1/google-docs/oauth/initiate (via store method)
→ popup opens; polling starts (usePolling, 2s interval)
→ GET /v1/google-docs/oauth/status/{state} → pending → continue
→ status: success → OAuthStatus.SUCCESS, userEmail set
→ setValue('googleOAuthCompleted', true), setValue('googleOAuthPending', false)
→ form becomes valid → Submit enabled
→ POST /v1/index/knowledge_base/google (no token in payload)
```

### Edit mode — already connected

```
DataSourceForm loads with index.google_oauth.status === 'connected'
→ passes initialStatus=SUCCESS, initialUserEmail to IndexTypeGoogle
→ on mount: setValue('googleOAuthCompleted', true)
→ OAuthSignInButton renders SUCCESS state with email
→ user saves without re-authenticating
```

### Edit mode — re-authenticate

```
OAuthSignInButton (SUCCESS): user clicks "Re-authenticate"
→ handleReauthenticate() — stashes current email, reauthMode = true
→ setValue('googleOAuthPending', true) → submit blocked
→ popup opens; polling starts
  → success: new email, SUCCESS state, googleOAuthPending = false
  → user closes popup: cancel() → revert to SUCCESS + original email
  → error: cancel() → revert to SUCCESS + original email
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Popup blocked | `!popupRef.current` after `window.open` → ERROR "Pop-up blocked — please allow pop-ups for this site." |
| User closes popup (create/first-time) | `popupRef.current.closed` detected → cancel() → IDLE |
| User closes popup (re-authenticate) | `popupRef.current.closed` detected → cancel() → SUCCESS + original email |
| Network error on initiate | ERROR with server message or "Unable to connect to Google — please try again." |
| Network error during polling | `usePolling` handles retry with backoff; no error count needed |
| Backend returns `status: error` | Stop polling; if reauth mode → revert to SUCCESS; otherwise → ERROR with `message` |
| Token expired in edit mode | Backend returns `status: expired` in datasource details → initialize with IDLE so user must re-authenticate |

---

## Testing

### Integration tests for `IndexTypeGoogle`

**File**: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/__tests__/IndexTypeGoogle.integration.test.tsx`

Test cases:
1. **Create — success path**: mock `initiateGoogleDocsOAuth` → mock polling returning `pending` then `success` → verify IDLE → WAITING → SUCCESS states, email shown, submit enabled
2. **Create — error from backend**: mock polling returning `error` → verify ERROR state shown, submit disabled
3. **Create — popup closed**: mock popup close detection → verify IDLE state restored, submit disabled
4. **Edit — pre-connected**: render with `initialStatus=SUCCESS` + email → verify email displayed, submit not blocked, `googleOAuthCompleted` initializes to `true`
5. **Edit — re-authenticate success**: start with SUCCESS, click "Re-authenticate" → flow succeeds → verify new email, submit not blocked
6. **Edit — re-authenticate cancelled**: start with SUCCESS, click "Re-authenticate" → cancel → verify original email restored, SUCCESS state, submit not blocked

### Integration tests for datasource pages

As a side note (no existing coverage here): consider adding `DataSourceCreatePage` and `DataSourceEditPage` integration tests covering:
- Full Google Docs create flow: OAuth → fill form → submit
- Google Docs edit flow: load connected state → re-authenticate → save
- Regression: other datasource types (SharePoint, Confluence) are not affected by this change

These can be a follow-up but are called out here for visibility.

---

## API Contract

Defined in `docs/superpowers/runs/20260701-1634-main/api-contract.md`. All integration tests mock the store methods and run without backend.

- `POST /v1/google-docs/oauth/initiate` → `{ auth_url, state }`
- `GET /v1/google-docs/oauth/status/{state}` → `{ status, user_email?, message? }`

---

## Out of Scope

- Backend token storage, encryption, or OAuth callback handler (EPMCDME-13229)
- Re-index auth popup for Google Docs (follow-up after backend ships)
- Refactoring `useSharePointOAuth` to use `useOAuth`
- Google Drive document browser / picker
