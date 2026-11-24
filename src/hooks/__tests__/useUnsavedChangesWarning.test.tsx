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
import { ReactNode, useContext } from 'react'
import { describe, expect, it } from 'vitest'

import {
  UnsavedChangesContext,
  UnsavedChangesProvider,
  useUnsavedChanges,
} from '../useUnsavedChangesWarning'

const wrapper = ({ children }: { children: ReactNode }) => (
  <UnsavedChangesProvider>{children}</UnsavedChangesProvider>
)

const setup = (initial: { text: string }) => {
  const live = { current: initial }
  const getCurrentValues = () => live.current
  const hook = renderHook(
    () => {
      const api = useUnsavedChanges({ formId: 'test-form', getCurrentValues })
      const ctx = useContext(UnsavedChangesContext)!
      return { api, ctx }
    },
    { wrapper }
  )
  return { live, hook }
}

describe('useUnsavedChanges - resetBaseline', () => {
  it('is clean after resetBaseline with the current values', () => {
    const { live, hook } = setup({ text: 'a' })
    live.current = { text: 'b' }
    expect(hook.result.current.ctx.checkHasUnsavedChanges()).toBe(true)

    act(() => hook.result.current.api.resetBaseline({ text: 'b' }))

    expect(hook.result.current.ctx.checkHasUnsavedChanges()).toBe(false)
  })

  it('keeps an edit made after the baselined payload as dirty', () => {
    const { live, hook } = setup({ text: 'a' })
    live.current = { text: 'sent' }

    act(() => hook.result.current.api.resetBaseline({ text: 'sent' }))
    live.current = { text: 'edited while saving' }
    hook.rerender()

    expect(hook.result.current.ctx.checkHasUnsavedChanges()).toBe(true)
  })

  it('does not alias the object passed to resetBaseline', () => {
    const { live, hook } = setup({ text: 'a' })
    const sent = { text: 'sent' }
    live.current = sent
    act(() => hook.result.current.api.resetBaseline(sent))

    sent.text = 'mutated'
    live.current = { text: 'sent' }
    hook.rerender()

    expect(hook.result.current.ctx.checkHasUnsavedChanges()).toBe(false)
  })
})
