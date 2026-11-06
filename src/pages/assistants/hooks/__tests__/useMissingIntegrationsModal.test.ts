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

import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, type Mock } from 'vitest'

import { SubmitResponse, useMissingIntegrationsModal } from '../useMissingIntegrationsModal'

type Submit = (values: unknown, skipValidation?: boolean) => Promise<SubmitResponse>

const validation = {
  has_missing_integrations: true,
  missing_by_credential_type: [],
  sub_assistants_missing: [],
  message: 'missing',
}

// Drives the hook into the state the modal buttons act on: validation came back with
// missing integrations, so the pending values are held until Save / Skip is clicked.
const setup = async (onSubmit: Mock<Submit>) => {
  const onError = vi.fn()
  const onSuccess = vi.fn()
  const hook = renderHook(() => useMissingIntegrationsModal({ onSubmit, onSuccess, onError }))
  onSubmit.mockResolvedValueOnce({ validation })
  await act(async () => {
    await hook.result.current.handleSubmit({ name: 'a' })
  })
  return { hook, onError, onSuccess }
}

describe('useMissingIntegrationsModal — modal save paths', () => {
  it('reports the backend error when Skip fails', async () => {
    const onSubmit = vi.fn<Submit>()
    const { hook, onError, onSuccess } = await setup(onSubmit)
    onSubmit.mockResolvedValueOnce({
      error: 'Failed<br> details',
      message: 'Failed. details',
    })

    await act(async () => {
      await hook.result.current.handleSkipValidation()
    })

    expect(onError).toHaveBeenCalledWith('Failed<br> details', 'Failed. details')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('reports the error when Save with integrations fails', async () => {
    const onSubmit = vi.fn<Submit>()
    const { hook, onError, onSuccess } = await setup(onSubmit)
    onSubmit.mockResolvedValueOnce({
      error: 'Failed<br> details',
      message: 'Failed. details',
    })

    await act(async () => {
      await hook.result.current.handleSaveWithValidation({})
    })

    expect(onError).toHaveBeenCalledWith('Failed<br> details', 'Failed. details')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('does not report an error when Skip succeeds', async () => {
    const onSubmit = vi.fn<Submit>()
    const { hook, onError, onSuccess } = await setup(onSubmit)
    onSubmit.mockResolvedValueOnce({})

    await act(async () => {
      await hook.result.current.handleSkipValidation()
    })

    expect(onError).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })
})
