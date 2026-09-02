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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { A2uiErrorBoundary } from '@/a2ui/fallback'

const Boom = ({ explode }: { explode: boolean }) => {
  if (explode) throw new Error('render blew up')
  return <div data-testid="surface-ok">surface</div>
}

describe('A2uiErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('renders the notice instead of crashing the message', () => {
    render(
      <A2uiErrorBoundary resetKey="v1">
        <Boom explode />
      </A2uiErrorBoundary>
    )
    expect(screen.getByTestId('a2ui-surface-error')).toBeInTheDocument()
  })

  // A surface caught mid-stream (an intermediate, not-yet-complete envelope set)
  // must recover once the envelopes change, instead of staying latched forever.
  it('resets when the reset key changes', () => {
    const { rerender } = render(
      <A2uiErrorBoundary resetKey="v1">
        <Boom explode />
      </A2uiErrorBoundary>
    )
    expect(screen.getByTestId('a2ui-surface-error')).toBeInTheDocument()

    rerender(
      <A2uiErrorBoundary resetKey="v2">
        <Boom explode={false} />
      </A2uiErrorBoundary>
    )

    expect(screen.queryByTestId('a2ui-surface-error')).not.toBeInTheDocument()
    expect(screen.getByTestId('surface-ok')).toBeInTheDocument()
  })

  it('stays latched while the reset key is unchanged', () => {
    const { rerender } = render(
      <A2uiErrorBoundary resetKey="v1">
        <Boom explode />
      </A2uiErrorBoundary>
    )
    rerender(
      <A2uiErrorBoundary resetKey="v1">
        <Boom explode={false} />
      </A2uiErrorBoundary>
    )
    expect(screen.getByTestId('a2ui-surface-error')).toBeInTheDocument()
  })
})
