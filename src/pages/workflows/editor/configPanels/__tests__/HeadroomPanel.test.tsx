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
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HEADROOM_STRATEGY_HELP } from '@/pages/assistants/components/AssistantForm/components/HeadroomConfig'
import { HeadroomScope } from '@/types/entity/assistant'

import HeadroomPanel from '../HeadroomPanel'

const { flag } = vi.hoisted(() => ({ flag: { enabled: true } }))
vi.mock('@/hooks/useFeatureFlags', () => ({ useHeadroomEnabled: () => flag.enabled }))

describe('HeadroomPanel', () => {
  beforeEach(() => {
    flag.enabled = true
  })

  it('shows the built-in defaults when nothing is set', () => {
    render(<HeadroomPanel scope={HeadroomScope.Workflow} value={undefined} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Enable context compression')).not.toBeChecked()
    expect(screen.getByLabelText('Compress user input')).toBeChecked()
    expect(screen.getByLabelText('Compress user input')).toBeDisabled()
    expect(screen.getAllByText('Balanced').length).toBeGreaterThan(0)
    expect(screen.queryByText(/Inherit/)).not.toBeInTheDocument()
  })

  it('setting one field leaves the others unset', () => {
    const onChange = vi.fn()
    render(<HeadroomPanel scope={HeadroomScope.Workflow} value={undefined} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Enable context compression'))
    expect(onChange).toHaveBeenCalledWith({ enabled: true })
  })

  it('enables sub-controls from the workflow value in node scope', () => {
    const onChange = vi.fn()
    render(
      <HeadroomPanel
        scope={HeadroomScope.Node}
        value={undefined}
        inherited={{ enabled: true }}
        onChange={onChange}
      />
    )
    const box = screen.getByLabelText('Compress tool outputs')
    expect(box).not.toBeDisabled()
    fireEvent.click(box)
    expect(onChange).toHaveBeenCalledWith({ compress_tool_outputs: false })
  })

  it('a node setting beats the workflow value', () => {
    render(
      <HeadroomPanel
        scope={HeadroomScope.Node}
        value={{ enabled: false }}
        inherited={{ enabled: true }}
        onChange={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Enable context compression')).not.toBeChecked()
  })

  it('shows strategy descriptions in the dropdown and the set value', () => {
    const onChange = vi.fn()
    const { container } = render(
      <HeadroomPanel scope={HeadroomScope.Workflow} value={{ enabled: true }} onChange={onChange} />
    )
    fireEvent.click(container.querySelector('.p-dropdown') as Element)
    expect(screen.getByText(HEADROOM_STRATEGY_HELP.lossless)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Lossless'))
    expect(onChange).toHaveBeenCalledWith({ enabled: true, strategy: 'lossless' })
  })

  it('resets the block when it has overrides', () => {
    const onChange = vi.fn()
    render(
      <HeadroomPanel scope={HeadroomScope.Node} value={{ enabled: true }} onChange={onChange} />
    )
    fireEvent.click(screen.getByText('Reset to workflow settings'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('hides reset when nothing is set', () => {
    render(<HeadroomPanel scope={HeadroomScope.Node} value={undefined} onChange={vi.fn()} />)
    expect(screen.queryByText('Reset to workflow settings')).not.toBeInTheDocument()
  })

  it('tolerates a null block from a bare `headroom:` YAML key', () => {
    const value = null as unknown as undefined
    expect(() =>
      render(<HeadroomPanel scope={HeadroomScope.Node} value={value} onChange={vi.fn()} />)
    ).not.toThrow()
    expect(screen.getByLabelText('Enable context compression')).not.toBeChecked()
    expect(screen.queryByText('Reset to workflow settings')).not.toBeInTheDocument()
  })

  it('explains sub-assistant behaviour and not-compressed paths', () => {
    render(<HeadroomPanel scope={HeadroomScope.Node} value={undefined} onChange={vi.fn()} />)
    expect(screen.getByText(/Sub-assistants do not inherit/)).toBeInTheDocument()
    expect(screen.getByText(/Not compressed/)).toBeInTheDocument()
  })

  it('renders nothing when the flag is off', () => {
    flag.enabled = false
    const { container } = render(
      <HeadroomPanel scope={HeadroomScope.Workflow} value={undefined} onChange={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
