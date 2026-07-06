# Google Docs OAuth 2.0 Frontend Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Google Docs datasource service-account auth with a per-user OAuth 2.0 popup flow, backed by a generic `useOAuth` hook and `OAuthSignInButton` component.

**Architecture:** A generic `useOAuth` hook (at `src/hooks/`) delegates all polling to the existing `usePolling` hook — two instances in parallel: one for status (2 s) and one for popup-close detection (500 ms). `OAuthSignInButton` (at `src/components/`) renders the four visual states. `IndexTypeGoogle` wires them together and synchronises two RHF boolean fields (`googleOAuthCompleted`, `googleOAuthPending`) that gate form submission via Yup.

**Tech Stack:** React, React Hook Form + Yup, Valtio store, `usePolling` (existing), Vitest + Testing Library

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/types/entity/dataSource.ts` | Add `OAuthProvider` enum + new response interfaces + `google_oauth` field on `DataSourceDetailsResponse` |
| Modify | `src/store/dataSources.ts` | Add `initiateGoogleDocsOAuth()` and `getGoogleDocsOAuthStatus()` |
| Create | `src/hooks/useOAuth.ts` | Generic provider-agnostic popup-poll OAuth hook |
| Create | `src/components/OAuthSignInButton/OAuthSignInButton.tsx` | Sign-in button with 4 visual states |
| Modify | `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts` | Add `googleOAuthCompleted` + `googleOAuthPending` to schema and defaults |
| Modify | `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeGoogle.tsx` | Replace service-account InfoBox with OAuth section |
| Modify | `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` | Remove `!index` guard; pass `initialStatus`/`initialUserEmail` to Google section |
| Create | `src/pages/dataSources/__tests__/DataSourceCreatePage.google-oauth.integration.test.tsx` | Integration tests for the full OAuth create flow |

---

## Task 1 — Extend `dataSource.ts` types

**Files:**
- Modify: `src/types/entity/dataSource.ts`

- [ ] **Step 1: Add `OAuthProvider` enum and new interfaces after `OAuthStatus`**

  Open `src/types/entity/dataSource.ts`. After the existing `OAuthStatus` enum (line ~27), add:

  ```ts
  export enum OAuthProvider {
    GOOGLE = 'Google',
  }

  export interface GoogleDocsOAuthInitiateResponse {
    auth_url: string
    state: string
  }

  export interface GoogleDocsOAuthStatusResponse {
    status: 'pending' | 'success' | 'error'
    user_email?: string
    message?: string
  }
  ```

- [ ] **Step 2: Add `google_oauth` to `DataSourceDetailsResponse`**

  In the same file, find `google_doc_link: string` (~line 154) and add directly after it:

  ```ts
  google_oauth?: {
    status: 'connected' | 'expired' | 'not_connected'
    user_email?: string
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/types/entity/dataSource.ts
  git commit -m "EPMCDME-13222: Add OAuthProvider enum and GoogleDocs OAuth types"
  ```

---

## Task 2 — Add store methods

**Files:**
- Modify: `src/store/dataSources.ts`

- [ ] **Step 1: Add import for new types at the top of the file**

  Find the existing import block from `@/types/entity/dataSource` (line ~22–26) and add `GoogleDocsOAuthInitiateResponse` and `GoogleDocsOAuthStatusResponse`:

  ```ts
  import {
    DataProvider,
    DatasetResponse,
    DataSourceDetailsResponse,
    GoogleDocsOAuthInitiateResponse,
    GoogleDocsOAuthStatusResponse,
    SharePointDeviceCodeInitiateResponse,
    SharePointDeviceCodePollResponse,
    SharePointOAuthInitiateResponse,
    SharePointOAuthStatusResponse,
  } from '@/types/entity/dataSource'
  ```

- [ ] **Step 2: Add store methods after `createKBIndexGoogleDoc`**

  Find `createKBIndexGoogleDoc` (~line 510) and add these two methods directly after its closing `},`:

  ```ts
  async initiateGoogleDocsOAuth(): Promise<GoogleDocsOAuthInitiateResponse> {
    const response = await api.post('v1/google-docs/oauth/initiate', {})
    return response.json()
  },

  async getGoogleDocsOAuthStatus(state: string): Promise<GoogleDocsOAuthStatusResponse> {
    const response = await api.get(`v1/google-docs/oauth/status/${state}`, {
      skipErrorHandling: true,
    })
    return response.json()
  },
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/store/dataSources.ts
  git commit -m "EPMCDME-13222: Add initiateGoogleDocsOAuth and getGoogleDocsOAuthStatus store methods"
  ```

---

## Task 3 — Create `useOAuth` hook (TDD)

**Test-first: yes — write failing test, then implement**

**Files:**
- Create: `src/hooks/useOAuth.ts`
- Create: `src/hooks/__tests__/useOAuth.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `src/hooks/__tests__/useOAuth.test.ts`:

  ```ts
  // Copyright 2026 EPAM Systems, Inc. ("EPAM")
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.
  //

  import { renderHook, act } from '@testing-library/react'
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

  import { OAuthStatus } from '@/types/entity/dataSource'

  import { useOAuth } from '../useOAuth'

  describe('useOAuth', () => {
    const mockInitiate = vi.fn()
    const mockGetStatus = vi.fn()
    let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      vi.useFakeTimers()
      mockPopup = { closed: false, close: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window)
      mockInitiate.mockResolvedValue({ auth_url: 'https://accounts.google.com/auth', state: 'state-abc' })
      mockGetStatus.mockResolvedValue({ status: 'pending' })
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    it('starts in IDLE state', () => {
      const { result } = renderHook(() =>
        useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus })
      )
      expect(result.current.status).toBe(OAuthStatus.IDLE)
      expect(result.current.userEmail).toBe('')
      expect(result.current.error).toBe('')
    })

    it('moves to WAITING after handleSignIn opens the popup', async () => {
      const { result } = renderHook(() =>
        useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus })
      )
      await act(async () => { await result.current.handleSignIn() })
      expect(result.current.status).toBe(OAuthStatus.WAITING)
      expect(window.open).toHaveBeenCalledWith(
        'https://accounts.google.com/auth',
        '_blank',
        'width=600,height=700'
      )
    })

    it('moves to SUCCESS when status poll returns success', async () => {
      mockGetStatus.mockResolvedValue({ status: 'success', user_email: 'user@example.com' })
      const { result } = renderHook(() =>
        useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus, pollInterval: 100 })
      )
      await act(async () => { await result.current.handleSignIn() })
      await act(async () => { await vi.advanceTimersByTimeAsync(150) })
      expect(result.current.status).toBe(OAuthStatus.SUCCESS)
      expect(result.current.userEmail).toBe('user@example.com')
    })

    it('moves to ERROR when status poll returns error', async () => {
      mockGetStatus.mockResolvedValue({ status: 'error', message: 'Access denied' })
      const { result } = renderHook(() =>
        useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus, pollInterval: 100 })
      )
      await act(async () => { await result.current.handleSignIn() })
      await act(async () => { await vi.advanceTimersByTimeAsync(150) })
      expect(result.current.status).toBe(OAuthStatus.ERROR)
      expect(result.current.error).toBe('Access denied')
    })

    it('cancel() from WAITING reverts to IDLE', async () => {
      const { result } = renderHook(() =>
        useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus })
      )
      await act(async () => { await result.current.handleSignIn() })
      act(() => { result.current.cancel() })
      expect(result.current.status).toBe(OAuthStatus.IDLE)
    })

    it('initialises to SUCCESS from initialStatus prop', () => {
      const { result } = renderHook(() =>
        useOAuth({
          initiate: mockInitiate,
          getStatus: mockGetStatus,
          initialStatus: OAuthStatus.SUCCESS,
          initialUserEmail: 'existing@example.com',
        })
      )
      expect(result.current.status).toBe(OAuthStatus.SUCCESS)
      expect(result.current.userEmail).toBe('existing@example.com')
    })

    it('handleReauthenticate() reverts to original email on failure', async () => {
      mockGetStatus.mockResolvedValue({ status: 'error', message: 'Denied' })
      const { result } = renderHook(() =>
        useOAuth({
          initiate: mockInitiate,
          getStatus: mockGetStatus,
          pollInterval: 100,
          initialStatus: OAuthStatus.SUCCESS,
          initialUserEmail: 'original@example.com',
        })
      )
      await act(async () => { await result.current.handleReauthenticate() })
      await act(async () => { await vi.advanceTimersByTimeAsync(150) })
      expect(result.current.status).toBe(OAuthStatus.SUCCESS)
      expect(result.current.userEmail).toBe('original@example.com')
    })

    it('detects popup closure and calls cancel()', async () => {
      const { result } = renderHook(() =>
        useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus, pollInterval: 2000 })
      )
      await act(async () => { await result.current.handleSignIn() })
      mockPopup.closed = true
      await act(async () => { await vi.advanceTimersByTimeAsync(600) })
      expect(result.current.status).toBe(OAuthStatus.IDLE)
    })

    it('shows popup-blocked error when window.open returns null', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const { result } = renderHook(() =>
        useOAuth({ initiate: mockInitiate, getStatus: mockGetStatus })
      )
      await act(async () => { await result.current.handleSignIn() })
      expect(result.current.status).toBe(OAuthStatus.ERROR)
      expect(result.current.error).toMatch(/pop-up blocked/i)
    })
  })
  ```

- [ ] **Step 2: Run test — expect it to fail with "Cannot find module"**

  ```bash
  npx vitest run src/hooks/__tests__/useOAuth.test.ts
  ```

  Expected: FAIL — `Cannot find module '../useOAuth'`

- [ ] **Step 3: Create `src/hooks/useOAuth.ts`**

  ```ts
  // Copyright 2026 EPAM Systems, Inc. ("EPAM")
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.
  //

  import { useState, useRef, useCallback } from 'react'

  import { usePolling } from '@/hooks/usePolling'
  import { OAuthStatus } from '@/types/entity/dataSource'

  interface UseOAuthOptions {
    initiate: () => Promise<{ auth_url: string; state: string }>
    getStatus: (state: string) => Promise<{ status: string; user_email?: string; message?: string }>
    pollInterval?: number
    initialStatus?: OAuthStatus
    initialUserEmail?: string
  }

  interface UseOAuthReturn {
    status: OAuthStatus
    userEmail: string
    error: string
    handleSignIn: () => Promise<void>
    handleReauthenticate: () => Promise<void>
    cancel: () => void
  }

  export const useOAuth = ({
    initiate,
    getStatus,
    pollInterval = 2000,
    initialStatus = OAuthStatus.IDLE,
    initialUserEmail = '',
  }: UseOAuthOptions): UseOAuthReturn => {
    const [status, setStatus] = useState<OAuthStatus>(initialStatus)
    const [userEmail, setUserEmail] = useState<string>(initialUserEmail)
    const [error, setError] = useState<string>('')
    const [isPolling, setIsPolling] = useState(false)

    const popupRef = useRef<Window | null>(null)
    const stateRef = useRef<string | null>(null)
    const reauthModeRef = useRef(false)
    const previousEmailRef = useRef('')

    const cancel = useCallback(() => {
      setIsPolling(false)
      popupRef.current?.close()
      popupRef.current = null
      if (reauthModeRef.current) {
        setStatus(OAuthStatus.SUCCESS)
        setUserEmail(previousEmailRef.current)
        setError('')
      } else {
        setStatus(OAuthStatus.IDLE)
        setError('')
      }
    }, [])

    const startFlow = useCallback(
      async (reauth: boolean) => {
        setError('')
        try {
          const { auth_url, state } = await initiate()
          stateRef.current = state
          reauthModeRef.current = reauth

          const popup = window.open(auth_url, '_blank', 'width=600,height=700')
          if (!popup) {
            setStatus(OAuthStatus.ERROR)
            setError('Pop-up blocked — please allow pop-ups for this site.')
            return
          }
          popupRef.current = popup
          setStatus(OAuthStatus.WAITING)
          setIsPolling(true)
        } catch (err: unknown) {
          setStatus(OAuthStatus.ERROR)
          setError(
            err instanceof Error ? err.message : 'Unable to connect — please try again.'
          )
        }
      },
      [initiate]
    )

    const handleSignIn = useCallback(async () => {
      await startFlow(false)
    }, [startFlow])

    const handleReauthenticate = useCallback(async () => {
      previousEmailRef.current = userEmail
      await startFlow(true)
    }, [startFlow, userEmail])

    // Status polling — 2 s (or pollInterval)
    usePolling({
      fetchFn: useCallback(async () => {
        const state = stateRef.current
        if (!state) return
        const result = await getStatus(state)
        if (result.status === 'success') {
          setUserEmail(result.user_email ?? '')
          setStatus(OAuthStatus.SUCCESS)
          setError('')
          setIsPolling(false)
          popupRef.current = null
        } else if (result.status === 'error') {
          const msg = result.message ?? 'Authorization failed — please try again.'
          if (reauthModeRef.current) {
            setStatus(OAuthStatus.SUCCESS)
            setUserEmail(previousEmailRef.current)
          } else {
            setStatus(OAuthStatus.ERROR)
            setError(msg)
          }
          setIsPolling(false)
          popupRef.current = null
        }
      }, [getStatus]),
      enabled: isPolling,
      interval: pollInterval,
    })

    // Popup-close detection — 500 ms
    usePolling({
      fetchFn: useCallback(async () => {
        if (popupRef.current?.closed) {
          cancel()
        }
      }, [cancel]),
      enabled: isPolling,
      interval: 500,
    })

    return { status, userEmail, error, handleSignIn, handleReauthenticate, cancel }
  }
  ```

- [ ] **Step 4: Run tests — expect all to pass**

  ```bash
  npx vitest run src/hooks/__tests__/useOAuth.test.ts
  ```

  Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/hooks/useOAuth.ts src/hooks/__tests__/useOAuth.test.ts
  git commit -m "EPMCDME-13222: Add useOAuth hook with usePolling-based status and popup detection"
  ```

---

## Task 4 — Create `OAuthSignInButton` component (TDD)

**Test-first: yes**

**Files:**
- Create: `src/components/OAuthSignInButton/OAuthSignInButton.tsx`
- Create: `src/components/OAuthSignInButton/__tests__/OAuthSignInButton.test.tsx`

- [ ] **Step 1: Write the failing test**

  Create `src/components/OAuthSignInButton/__tests__/OAuthSignInButton.test.tsx`:

  ```tsx
  // Copyright 2026 EPAM Systems, Inc. ("EPAM")
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.
  //

  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { describe, it, expect, vi } from 'vitest'

  import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

  import OAuthSignInButton from '../OAuthSignInButton'

  describe('OAuthSignInButton', () => {
    const defaultProps = {
      provider: OAuthProvider.GOOGLE,
      onSignIn: vi.fn(),
      onReauthenticate: vi.fn(),
      onCancel: vi.fn(),
    }

    it('IDLE: renders "Connect with Google" button', () => {
      render(<OAuthSignInButton {...defaultProps} status={OAuthStatus.IDLE} />)
      expect(screen.getByRole('button', { name: /connect with google/i })).toBeInTheDocument()
    })

    it('IDLE: calls onSignIn when button is clicked', async () => {
      const onSignIn = vi.fn()
      render(<OAuthSignInButton {...defaultProps} status={OAuthStatus.IDLE} onSignIn={onSignIn} />)
      await userEvent.click(screen.getByRole('button', { name: /connect with google/i }))
      expect(onSignIn).toHaveBeenCalledOnce()
    })

    it('WAITING: shows waiting message and Cancel button', () => {
      render(<OAuthSignInButton {...defaultProps} status={OAuthStatus.WAITING} />)
      expect(screen.getByText(/waiting for authorization/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('WAITING: Cancel button calls onCancel', async () => {
      const onCancel = vi.fn()
      render(<OAuthSignInButton {...defaultProps} status={OAuthStatus.WAITING} onCancel={onCancel} />)
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('SUCCESS: shows email and Re-authenticate button', () => {
      render(
        <OAuthSignInButton
          {...defaultProps}
          status={OAuthStatus.SUCCESS}
          userEmail="user@example.com"
        />
      )
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /re-authenticate/i })).toBeInTheDocument()
    })

    it('SUCCESS: Re-authenticate button calls onReauthenticate', async () => {
      const onReauthenticate = vi.fn()
      render(
        <OAuthSignInButton
          {...defaultProps}
          status={OAuthStatus.SUCCESS}
          userEmail="user@example.com"
          onReauthenticate={onReauthenticate}
        />
      )
      await userEvent.click(screen.getByRole('button', { name: /re-authenticate/i }))
      expect(onReauthenticate).toHaveBeenCalledOnce()
    })

    it('ERROR: shows error message and Try again button', () => {
      render(
        <OAuthSignInButton
          {...defaultProps}
          status={OAuthStatus.ERROR}
          error="Pop-up blocked — please allow pop-ups for this site."
        />
      )
      expect(screen.getByText(/pop-up blocked/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('ERROR: Try again calls onSignIn', async () => {
      const onSignIn = vi.fn()
      render(
        <OAuthSignInButton
          {...defaultProps}
          status={OAuthStatus.ERROR}
          error="Something went wrong"
          onSignIn={onSignIn}
        />
      )
      await userEvent.click(screen.getByRole('button', { name: /try again/i }))
      expect(onSignIn).toHaveBeenCalledOnce()
    })
  })
  ```

- [ ] **Step 2: Run test — expect failure**

  ```bash
  npx vitest run src/components/OAuthSignInButton/__tests__/OAuthSignInButton.test.tsx
  ```

  Expected: FAIL — `Cannot find module '../OAuthSignInButton'`

- [ ] **Step 3: Create `src/components/OAuthSignInButton/OAuthSignInButton.tsx`**

  ```tsx
  // Copyright 2026 EPAM Systems, Inc. ("EPAM")
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.
  //

  import { FC } from 'react'

  import Button from '@/components/Button'
  import { ButtonSize, ButtonType } from '@/constants'
  import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

  interface OAuthSignInButtonProps {
    provider: OAuthProvider
    status: OAuthStatus
    onSignIn: () => void
    onReauthenticate: () => void
    onCancel: () => void
    userEmail?: string
    error?: string
  }

  const OAuthSignInButton: FC<OAuthSignInButtonProps> = ({
    provider,
    status,
    onSignIn,
    onReauthenticate,
    onCancel,
    userEmail,
    error,
  }) => {
    if (status === OAuthStatus.SUCCESS) {
      return (
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-xs text-text-success">
            Connected as: <strong>{userEmail}</strong>
          </p>
          <Button
            type={ButtonType.SECONDARY}
            size={ButtonSize.SMALL}
            onClick={onReauthenticate}
            className="py-4 px-10 w-fit"
          >
            Re-authenticate
          </Button>
        </div>
      )
    }

    if (status === OAuthStatus.WAITING) {
      return (
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-xs text-text-secondary">Waiting for authorization…</p>
          <Button
            type={ButtonType.TERTIARY}
            size={ButtonSize.SMALL}
            onClick={onCancel}
            className="w-fit"
          >
            Cancel
          </Button>
        </div>
      )
    }

    return (
      <div className="mb-4 flex flex-col gap-2">
        {status === OAuthStatus.ERROR && error && (
          <p className="text-sm text-failed-secondary">{error}</p>
        )}
        <Button
          type={ButtonType.PRIMARY}
          size={ButtonSize.SMALL}
          onClick={onSignIn}
          className="py-4 px-10 w-fit"
        >
          {status === OAuthStatus.ERROR ? 'Try again' : `Connect with ${provider}`}
        </Button>
      </div>
    )
  }

  export default OAuthSignInButton
  ```

- [ ] **Step 4: Run tests — expect all to pass**

  ```bash
  npx vitest run src/components/OAuthSignInButton/__tests__/OAuthSignInButton.test.tsx
  ```

  Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/OAuthSignInButton/
  git commit -m "EPMCDME-13222: Add OAuthSignInButton component"
  ```

---

## Task 5 — Update Yup schema and form defaults

**Test-first: yes — schema validation tests**

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts`

- [ ] **Step 1: Write failing schema test**

  Check if a schema test file exists:
  ```bash
  ls src/pages/dataSources/components/DataSourceForm/hooks/__tests__/ 2>/dev/null || echo "no tests dir"
  ```

  If absent, create `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/googleOAuthSchema.test.ts`:

  ```ts
  // Copyright 2026 EPAM Systems, Inc. ("EPAM")
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.
  //

  import { describe, it, expect } from 'vitest'
  import * as Yup from 'yup'

  import { INDEX_TYPES } from '@/constants/dataSources'

  // We test the schema fragment in isolation without importing the full hook
  const googleOAuthSchema = Yup.object({
    indexType: Yup.string().required(),
    isEditing: Yup.boolean().required(),
    googleOAuthCompleted: Yup.boolean().when(['indexType', 'isEditing'], {
      is: (indexType: string, isEditing: boolean) =>
        indexType === INDEX_TYPES.GOOGLE && isEditing === false,
      then: (schema) => schema.oneOf([true], 'Please connect your Google account before saving'),
      otherwise: (schema) => schema.notRequired(),
    }),
    googleOAuthPending: Yup.boolean().when('indexType', {
      is: (indexType: string) => indexType === INDEX_TYPES.GOOGLE,
      then: (schema) =>
        schema.oneOf([false], 'Google authorization is in progress — please wait.'),
      otherwise: (schema) => schema.notRequired(),
    }),
  })

  describe('Google OAuth Yup schema fields', () => {
    it('blocks submit in create mode when googleOAuthCompleted is false', async () => {
      await expect(
        googleOAuthSchema.validate({
          indexType: INDEX_TYPES.GOOGLE,
          isEditing: false,
          googleOAuthCompleted: false,
          googleOAuthPending: false,
        })
      ).rejects.toThrow('Please connect your Google account before saving')
    })

    it('allows submit in create mode when googleOAuthCompleted is true', async () => {
      await expect(
        googleOAuthSchema.validate({
          indexType: INDEX_TYPES.GOOGLE,
          isEditing: false,
          googleOAuthCompleted: true,
          googleOAuthPending: false,
        })
      ).resolves.toBeDefined()
    })

    it('allows submit in edit mode even when googleOAuthCompleted is false', async () => {
      await expect(
        googleOAuthSchema.validate({
          indexType: INDEX_TYPES.GOOGLE,
          isEditing: true,
          googleOAuthCompleted: false,
          googleOAuthPending: false,
        })
      ).resolves.toBeDefined()
    })

    it('blocks submit during WAITING regardless of isEditing', async () => {
      await expect(
        googleOAuthSchema.validate({
          indexType: INDEX_TYPES.GOOGLE,
          isEditing: true,
          googleOAuthCompleted: true,
          googleOAuthPending: true,
        })
      ).rejects.toThrow('Google authorization is in progress')
    })

    it('ignores both fields for non-Google index types', async () => {
      await expect(
        googleOAuthSchema.validate({
          indexType: INDEX_TYPES.GIT,
          isEditing: false,
          googleOAuthCompleted: false,
          googleOAuthPending: true,
        })
      ).resolves.toBeDefined()
    })
  })
  ```

- [ ] **Step 2: Run test — expect it to pass immediately** (schema is isolated, no imports from the hook yet)

  ```bash
  npx vitest run "src/pages/dataSources/components/DataSourceForm/hooks/__tests__/googleOAuthSchema.test.ts"
  ```

  Expected: 5 tests PASS (this validates the schema logic before wiring it in)

- [ ] **Step 3: Add fields to `useEditPopupForm.ts` Yup schema**

  Find the `googleDoc` Yup entry (~line 79) and add these two entries after `sharepointFilesFilter` (~line 130):

  ```ts
  googleOAuthCompleted: Yup.boolean().when(['indexType', 'isEditing'], {
    is: (indexType: string, isEditing: boolean) =>
      indexType === INDEX_TYPES.GOOGLE && isEditing === false,
    then: (schema) => schema.oneOf([true], 'Please connect your Google account before saving'),
    otherwise: (schema) => schema.notRequired(),
  }),

  googleOAuthPending: Yup.boolean().when('indexType', {
    is: (indexType: string) => indexType === INDEX_TYPES.GOOGLE,
    then: (schema) =>
      schema.oneOf([false], 'Google authorization is in progress — please wait.'),
    otherwise: (schema) => schema.notRequired(),
  }),
  ```

- [ ] **Step 4: Add fields to `defaultValues` in `useForm`**

  Find `sharepointFilesFilter: '',` in the `defaultValues` object (~line 363) and add after it:

  ```ts
  googleOAuthCompleted: false,
  googleOAuthPending: false,
  ```

- [ ] **Step 5: Add TypeScript fields to `FormValues` type**

  Find where `sharepointAccessToken` and `sharepointFilesFilter` are declared in the `FormValues` type (search for `FormValues` in the same file or an adjacent types file). Add:

  ```ts
  googleOAuthCompleted: boolean
  googleOAuthPending: boolean
  ```

- [ ] **Step 6: Run existing datasource form tests to verify no regression**

  ```bash
  npx vitest run src/pages/dataSources/
  ```

  Expected: existing tests PASS

- [ ] **Step 7: Commit**

  ```bash
  git add src/pages/dataSources/components/DataSourceForm/hooks/
  git commit -m "EPMCDME-13222: Add googleOAuthCompleted and googleOAuthPending Yup fields"
  ```

---

## Task 6 — Update `IndexTypeGoogle.tsx`

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeGoogle.tsx`

- [ ] **Step 1: Replace the file contents**

  ```tsx
  // Copyright 2026 EPAM Systems, Inc. ("EPAM")
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.
  //

  import { FC, useEffect } from 'react'
  import { Controller, UseFormSetValue } from 'react-hook-form'

  import OAuthSignInButton from '@/components/OAuthSignInButton/OAuthSignInButton'
  import FormAutocomplete from '@/components/form/FormAutocomplete'
  import InfoBox from '@/components/form/InfoBox'
  import Input from '@/components/form/Input'
  import Link from '@/components/Link'
  import { useOAuth } from '@/hooks/useOAuth'
  import { dataSourceStore } from '@/store/dataSources'
  import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

  interface Props {
    control: any
    errors: any
    setValue: UseFormSetValue<any>
    googleDocsGuideEnabled: boolean
    googleDocsGuideConfig: any
    embeddingModels: any[]
    initialStatus?: OAuthStatus
    initialUserEmail?: string
  }

  const IndexTypeGoogle: FC<Props> = ({
    errors,
    control,
    setValue,
    googleDocsGuideConfig,
    googleDocsGuideEnabled,
    embeddingModels,
    initialStatus,
    initialUserEmail,
  }) => {
    const { status, userEmail, error, handleSignIn, handleReauthenticate, cancel } = useOAuth({
      initiate: dataSourceStore.initiateGoogleDocsOAuth.bind(dataSourceStore),
      getStatus: dataSourceStore.getGoogleDocsOAuthStatus.bind(dataSourceStore),
      initialStatus,
      initialUserEmail,
    })

    // Initialise form fields from initialStatus (edit mode pre-population)
    useEffect(() => {
      if (initialStatus === OAuthStatus.SUCCESS) {
        setValue('googleOAuthCompleted', true)
      }
    }, []) // intentionally run once on mount

    // Keep form fields in sync with OAuth status
    useEffect(() => {
      setValue('googleOAuthPending', status === OAuthStatus.WAITING)
      if (status === OAuthStatus.SUCCESS) setValue('googleOAuthCompleted', true)
      if (status === OAuthStatus.ERROR || status === OAuthStatus.IDLE)
        setValue('googleOAuthCompleted', false)
    }, [status, setValue])

    return (
      <div className="mb-4 flex flex-col gap-1" data-onboarding="datasource-google-fields">
        <OAuthSignInButton
          provider={OAuthProvider.GOOGLE}
          status={status}
          userEmail={userEmail}
          error={error}
          onSignIn={handleSignIn}
          onReauthenticate={handleReauthenticate}
          onCancel={cancel}
        />

        <Controller
          name="googleDoc"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="googleDoc"
              name="googleDoc"
              placeholder="Google docs link"
              error={errors.googleDoc?.message}
              className="w-full"
            />
          )}
        />

        <div className="flex flex-col gap-2 mt-2">
          {googleDocsGuideEnabled && (
            <InfoBox
              text={
                <>
                  For detailed formatting instructions, refer to the{' '}
                  <Link url={googleDocsGuideConfig.url} label="Guide" />
                </>
              }
            />
          )}

          <InfoBox
            text={
              <>
                Google documents must follow a specific format for LLM routing:{' '}
                <Link
                  url="https://docs.google.com/document/d/19EXgnFCgJontz0ToCAH6zMGwBTdhi5X97P9JIby4wHs/edit?tab=t.0#heading=h.b01c2ig0adfg"
                  label="View Format Example"
                />
              </>
            }
          />
        </div>

        <FormAutocomplete
          name="embeddingsModel"
          control={control}
          id="embeddingsModel"
          label="Model used for embeddings"
          options={embeddingModels}
          placeholder="Embeddings Model Type"
        />
      </div>
    )
  }

  export default IndexTypeGoogle
  ```

- [ ] **Step 2: Run datasource-related tests**

  ```bash
  npx vitest run src/pages/dataSources/
  ```

  Expected: PASS (no regression in other datasource tests)

- [ ] **Step 3: Commit**

  ```bash
  git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeGoogle.tsx
  git commit -m "EPMCDME-13222: Wire OAuth flow into IndexTypeGoogle"
  ```

---

## Task 7 — Update `DataSourceForm.tsx`

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx`

- [ ] **Step 1: Add `setValue` to the props spread into `IndexTypeField.Google`**

  Find the Google section (~line 444):

  ```tsx
  {!index && field.value === INDEX_TYPES.GOOGLE && (
    <IndexTypeField.Google
      {...{
        errors,
        register,
        control,
        googleDocsGuideConfig,
        googleDocsGuideEnabled,
        embeddingModels,
      }}
    />
  )}
  ```

  Replace with:

  ```tsx
  {field.value === INDEX_TYPES.GOOGLE && (
    <IndexTypeField.Google
      {...{
        errors,
        control,
        setValue,
        googleDocsGuideConfig,
        googleDocsGuideEnabled,
        embeddingModels,
        initialStatus:
          index?.google_oauth?.status === 'connected' ? OAuthStatus.SUCCESS : undefined,
        initialUserEmail: index?.google_oauth?.user_email,
      }}
    />
  )}
  ```

- [ ] **Step 2: Add the `OAuthStatus` import**

  Find the import that brings in types from `@/types/entity/dataSource` (or add a new import):

  ```ts
  import { OAuthStatus } from '@/types/entity/dataSource'
  ```

- [ ] **Step 3: Verify `setValue` is already destructured from `useForm`**

  Search the file for `setValue`. If not already destructured from the form hook, add it where the other form methods are destructured (look for `const { register, control, formState, ... } = useEditPopupForm(...)`). `setValue` should already be there since `IndexTypeSharePoint` uses it — verify before adding.

- [ ] **Step 4: Run datasource tests**

  ```bash
  npx vitest run src/pages/dataSources/
  ```

  Expected: PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx
  git commit -m "EPMCDME-13222: Remove !index guard for Google section, pass OAuth initial state"
  ```

---

## Task 8 — Integration tests

**Test-first: yes — write tests, then verify they pass against the implementation above**

**Files:**
- Create: `src/pages/dataSources/__tests__/DataSourceCreatePage.google-oauth.integration.test.tsx`

- [ ] **Step 1: Find the datasource create page route and required mock shape**

  Run:
  ```bash
  grep -n "data-sources/create\|createKBIndexGoogleDoc\|embeddingsModel\|embedding_model" src/pages/dataSources/DataSourceCreatePage.tsx | head -20
  ```

  This tells you what APIs the create page calls on mount (embedding models, customer config, etc.) — you'll need to mock them all.

- [ ] **Step 2: Create the integration test file**

  ```tsx
  // Copyright 2026 EPAM Systems, Inc. ("EPAM")
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.
  //

  import { screen, waitFor } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

  import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
  import { renderPage, mockAPI } from '@/test-utils/integration'

  describe('DataSourceCreatePage — Google Docs OAuth', () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    let mockPopup: { closed: boolean; close: ReturnType<typeof vi.fn> }

    beforeEach(() => {
      vi.useFakeTimers()
      mockPopup = { closed: false, close: vi.fn() }
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window)

      mockRouterState.currentRoute.value = {
        path: '/data-sources/create',
        name: 'create-data-source',
        params: {},
        query: {},
        hash: '',
      }

      // Mock APIs needed for the page to load
      mockAPI('GET', 'v1/users/me', {
        user_id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_admin: false,
        is_maintainer: false,
        user_type: 'INTERNAL',
        applications: ['test-project'],
      })
      mockAPI('GET', 'v1/models/embeddings', [{ value: 'text-embedding-ada-002', label: 'Ada 002' }])
      mockAPI('GET', 'v1/customer/config', {})
      mockAPI('GET', 'v1/projects', [{ name: 'test-project', display_name: 'Test Project' }])
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    const selectGoogleDocsType = async () => {
      renderPage('/data-sources/create')
      await waitFor(() => expect(screen.getByText(/create data source/i)).toBeInTheDocument())
      // Select Google Docs index type — adjust selector to match actual UI
      const googleOption = await screen.findByRole('option', { name: /google docs/i })
      await user.click(googleOption)
    }

    it('shows Connect with Google button when Google Docs is selected', async () => {
      await selectGoogleDocsType()
      expect(await screen.findByRole('button', { name: /connect with google/i })).toBeInTheDocument()
    })

    it('Submit is disabled before OAuth completes', async () => {
      await selectGoogleDocsType()
      const submitBtn = screen.getByRole('button', { name: /create/i })
      expect(submitBtn).toBeDisabled()
    })

    it('full success flow: OAuth completes → submit enabled → form submits', async () => {
      mockAPI('POST', 'v1/google-docs/oauth/initiate', {
        auth_url: 'https://accounts.google.com/auth',
        state: 'test-state-123',
      })
      mockAPI('GET', 'v1/google-docs/oauth/status/test-state-123', {
        status: 'success',
        user_email: 'user@example.com',
      })
      mockAPI('POST', 'v1/index/knowledge_base/google', { id: 'new-ds-1' })

      await selectGoogleDocsType()

      await user.click(screen.getByRole('button', { name: /connect with google/i }))

      // Waiting state
      expect(await screen.findByText(/waiting for authorization/i)).toBeInTheDocument()

      // Advance past poll interval
      await vi.advanceTimersByTimeAsync(2500)

      // Success state
      await waitFor(() => expect(screen.getByText('user@example.com')).toBeInTheDocument())

      // Fill required fields
      await user.type(screen.getByPlaceholderText(/google docs link/i), 'https://docs.google.com/document/d/test')
      await user.type(screen.getByLabelText(/name/i), 'My Google Datasource')

      const submitBtn = screen.getByRole('button', { name: /create/i })
      expect(submitBtn).not.toBeDisabled()
    })

    it('error flow: backend returns error → error message shown, submit still disabled', async () => {
      mockAPI('POST', 'v1/google-docs/oauth/initiate', {
        auth_url: 'https://accounts.google.com/auth',
        state: 'test-state-err',
      })
      mockAPI('GET', 'v1/google-docs/oauth/status/test-state-err', {
        status: 'error',
        message: 'Access denied by Google',
      })

      await selectGoogleDocsType()

      await user.click(screen.getByRole('button', { name: /connect with google/i }))
      await vi.advanceTimersByTimeAsync(2500)

      await waitFor(() =>
        expect(screen.getByText(/access denied by google/i)).toBeInTheDocument()
      )
      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    })

    it('popup blocked: shows pop-up blocked error', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      mockAPI('POST', 'v1/google-docs/oauth/initiate', {
        auth_url: 'https://accounts.google.com/auth',
        state: 'state-blocked',
      })

      await selectGoogleDocsType()
      await user.click(screen.getByRole('button', { name: /connect with google/i }))

      await waitFor(() =>
        expect(screen.getByText(/pop-up blocked/i)).toBeInTheDocument()
      )
    })

    it('popup closed by user: reverts to IDLE', async () => {
      mockAPI('POST', 'v1/google-docs/oauth/initiate', {
        auth_url: 'https://accounts.google.com/auth',
        state: 'test-state-close',
      })
      mockAPI('GET', 'v1/google-docs/oauth/status/test-state-close', { status: 'pending' })

      await selectGoogleDocsType()
      await user.click(screen.getByRole('button', { name: /connect with google/i }))

      await waitFor(() => expect(screen.getByText(/waiting for authorization/i)).toBeInTheDocument())

      // Simulate popup close
      mockPopup.closed = true
      await vi.advanceTimersByTimeAsync(600)

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /connect with google/i })).toBeInTheDocument()
      )
    })
  })
  ```

- [ ] **Step 3: Run the integration tests**

  ```bash
  npx vitest run "src/pages/dataSources/__tests__/DataSourceCreatePage.google-oauth.integration.test.tsx"
  ```

  Expected: tests PASS. If any fail due to missing API mocks for page initialisation, check step 1's grep output and add the missing `mockAPI` calls.

- [ ] **Step 4: Run full test suite to verify no regressions**

  ```bash
  npx vitest run
  ```

  Expected: all tests PASS

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/dataSources/__tests__/DataSourceCreatePage.google-oauth.integration.test.tsx
  git commit -m "EPMCDME-13222: Add Google Docs OAuth integration tests"
  ```

---

## Self-Review Checklist

- [x] **FR-1 OAuth UI** — covered by Task 6 (`IndexTypeGoogle` with `OAuthSignInButton`)
- [x] **FR-2 OAuth Initiation** — Task 3 (`useOAuth.handleSignIn`) + Task 2 (store method)
- [x] **FR-3 Status Polling** — Task 3 (`usePolling` instances in `useOAuth`)
- [x] **FR-4 Form Submission Guard** — Task 5 (`googleOAuthCompleted` + `googleOAuthPending` Yup fields)
- [x] **FR-5 Generic `useOAuth`** — Task 3
- [x] **FR-6 Generic `OAuthSignInButton`** — Task 4
- [x] **FR-7 Store Methods** — Task 2
- [x] **FR-8 Edit Mode** — Task 7 (remove `!index` guard, pass `initialStatus`/`initialUserEmail`)
- [x] **FR-9 Remove service-account InfoBox** — Task 6 (replaced in `IndexTypeGoogle`)
- [x] **OAuthProvider enum** — Task 1
- [x] **`google_oauth` in `DataSourceDetailsResponse`** — Task 1
- [x] **Re-auth reverts to original email on failure** — Task 3 (`handleReauthenticate` + `cancel` with `reauthModeRef`)
- [x] **Popup detection via `usePolling`** — Task 3 (second `usePolling` instance, 500 ms)
- [x] **No raw `setInterval` in `useOAuth`** — all timers via `usePolling`
- [x] **Integration tests** — Task 8
- [x] **Type consistency** — `OAuthStatus` from `@/types/entity/dataSource` throughout; `OAuthProvider.GOOGLE` in `OAuthSignInButton`; `handleSignIn`/`handleReauthenticate`/`cancel` match between hook and component

---

Plan saved. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session using `executing-plans`

Which approach?
