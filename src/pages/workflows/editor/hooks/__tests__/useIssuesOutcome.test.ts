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

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useIssuesOutcome } from '../useIssuesOutcome'

const renderOutcome = () => {
  const form = {
    openIssuesPanel: vi.fn(),
    closeIssuesPanel: vi.fn(),
    clearAllResolvedFields: vi.fn(),
  }
  const setIssues = vi.fn()
  const { result } = renderHook(() =>
    useIssuesOutcome({ formRef: { current: form }, outcomeKey: 'wf-1', setIssues })
  )
  return { ...result.current, form, setIssues }
}

describe('useIssuesOutcome beginSave', () => {
  it('clears the previous findings and closes the Issues panel', () => {
    const { beginSave, form, setIssues } = renderOutcome()

    beginSave()

    // An open panel with no issues would read "No issues found" while the save runs or after it fails.
    expect(setIssues).toHaveBeenCalledWith(null)
    expect(form.closeIssuesPanel).toHaveBeenCalled()
    expect(form.openIssuesPanel).not.toHaveBeenCalled()
  })
})
