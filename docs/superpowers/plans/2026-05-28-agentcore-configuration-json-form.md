# AgentCore ConfigurationJson Structured Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw JSON textarea in `AwsAgentCoreImportPopup` with a structured form that exposes all `AgentCoreEndpointConfigurationJson` fields with labels, hints, and mode-aware validation.

**Architecture:** Three-file change — add `AgentCoreEndpointConfigurationJson` type interfaces to `vendor.ts`, extract field rendering into a new `ConfigurationJsonForm` component, and rewrite `AwsAgentCoreImportPopup` with nested `FormValues`, a streaming toggle, conditional validation, and serialization. Pre-fill is handled by resetting the form when `endpoint` changes.

**Tech Stack:** React 18, TypeScript, react-hook-form v7, Yup, Tailwind CSS, `@/components/form/Input`, `@/components/form/Switch/Switch`, `@/components/form/Checkbox`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/types/entity/vendor.ts` | Add `AgentCoreEndpointConfigurationJsonReasoning` and `AgentCoreEndpointConfigurationJson` interfaces |
| Create | `src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx` | All structured form fields — message path, streaming toggle, body/chunk paths, collapsible reasoning section |
| Modify | `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx` | Replace textarea with `ConfigurationJsonForm`; nested `FormValues`; Yup schema; serialization; pre-fill from `endpoint.configurationJson` |
| Create | `src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx` | Unit tests for the popup — field rendering, streaming toggle, validation, serialization, pre-fill |

---

## Task 1: Add AgentCoreEndpointConfigurationJson types to vendor.ts

**Files:**
- Modify: `src/types/entity/vendor.ts`

- [ ] **Step 1: Add the interfaces**

Open `src/types/entity/vendor.ts` and add these two interfaces after the `VendorAgentCoreEndpointDetails` interface (around line 63):

```typescript
export interface AgentCoreEndpointConfigurationJsonReasoning {
  text_path: string
  active_path: string
  name_path?: string
  args_path?: string
}

export interface AgentCoreEndpointConfigurationJson {
  request?: {
    message_path?: string
  }
  response: {
    streaming: boolean
    body?: {
      text_path: string
      reasoning?: AgentCoreEndpointConfigurationJsonReasoning
    }
    chunk?: {
      text_path: string
      reasoning?: AgentCoreEndpointConfigurationJsonReasoning
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/types/entity/vendor.ts
git commit -m "EPMCDME-12240: Add AgentCoreEndpointConfigurationJson type interfaces to vendor types"
```

---

## Task 2: Write failing tests for AwsAgentCoreImportPopup

**Files:**
- Create: `src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx`

- [ ] **Step 1: Create the test file**

Create `src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx` with this full content:

```typescript
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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { awsVendorStore } from '@/store/vendor'
import { AgentCoreEndpointStatus, VendorAgentCoreEndpoint } from '@/types/entity/vendor'

import AwsAgentCoreImportPopup from '../AwsAgentCoreImportPopup'

vi.mock('@/store/vendor', () => ({
  awsVendorStore: {
    importAgentCoreEndpoint: vi.fn(),
  },
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, header, onHide, footerContent }: any) =>
    visible ? (
      <div data-testid="popup">
        <div data-testid="popup-header">{header}</div>
        <button onClick={onHide} data-testid="popup-close">Close</button>
        {children}
        <div data-testid="popup-footer">{footerContent}</div>
      </div>
    ) : null,
}))

const mockEndpoint: VendorAgentCoreEndpoint = {
  id: 'ep-id-1',
  name: 'my-endpoint',
  status: AgentCoreEndpointStatus.NOT_PREPARED,
  description: 'Test endpoint',
}

const defaultProps = {
  settingId: 'setting-123',
  runtimeId: 'runtime-abc',
  endpoint: mockEndpoint,
  onHide: vi.fn(),
  onSuccess: vi.fn(),
}

describe('AwsAgentCoreImportPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- visibility ---

  it('does not render when endpoint is null', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} endpoint={null} />)
    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('renders popup when endpoint is provided', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.getByTestId('popup')).toBeInTheDocument()
  })

  it('shows endpoint name in header', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.getByTestId('popup-header')).toHaveTextContent('my-endpoint')
  })

  // --- field rendering (non-streaming mode) ---

  it('renders Message Path field', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.getByText('Message Path')).toBeInTheDocument()
  })

  it('renders Enable Streaming toggle', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.getByText('Enable Streaming')).toBeInTheDocument()
  })

  it('renders Response Text Path field in non-streaming mode by default', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.getByText('Response Text Path')).toBeInTheDocument()
  })

  it('does not render Chunk Text Path in non-streaming mode by default', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.queryByText('Chunk Text Path')).not.toBeInTheDocument()
  })

  // --- streaming toggle switches fields ---

  it('shows Chunk Text Path and hides Response Text Path when streaming is enabled', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const streamingToggle = screen.getByRole('switch')
    await userEvent.click(streamingToggle)

    await waitFor(() => {
      expect(screen.getByText('Chunk Text Path')).toBeInTheDocument()
      expect(screen.queryByText('Response Text Path')).not.toBeInTheDocument()
    })
  })

  it('shows Response Text Path and hides Chunk Text Path when streaming is toggled back off', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const streamingToggle = screen.getByRole('switch')
    await userEvent.click(streamingToggle)
    await userEvent.click(streamingToggle)

    await waitFor(() => {
      expect(screen.getByText('Response Text Path')).toBeInTheDocument()
      expect(screen.queryByText('Chunk Text Path')).not.toBeInTheDocument()
    })
  })

  // --- reasoning section ---

  it('does not show reasoning fields until section is expanded', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.queryByText('Thought Text Path')).not.toBeInTheDocument()
  })

  it('shows reasoning fields after expanding the section', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const expandBtn = screen.getByRole('button', { name: /thought extraction/i })
    await userEvent.click(expandBtn)

    await waitFor(() => {
      expect(screen.getByText('Thought Text Path')).toBeInTheDocument()
      expect(screen.getByText('Thought Active Path')).toBeInTheDocument()
      expect(screen.getByText('Thought Name Path')).toBeInTheDocument()
      expect(screen.getByText('Thought Args Path')).toBeInTheDocument()
    })
  })

  // --- validation: non-streaming requires bodyTextPath ---

  it('shows error when Response Text Path is empty on submit in non-streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const installBtn = screen.getByRole('button', { name: /install/i })
    await userEvent.click(installBtn)

    await waitFor(() => {
      expect(screen.getByText('Response text path is required')).toBeInTheDocument()
    })
    expect(awsVendorStore.importAgentCoreEndpoint).not.toHaveBeenCalled()
  })

  // --- validation: streaming requires chunkTextPath ---

  it('shows error when Chunk Text Path is empty on submit in streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const streamingToggle = screen.getByRole('switch')
    await userEvent.click(streamingToggle)

    const installBtn = screen.getByRole('button', { name: /install/i })
    await userEvent.click(installBtn)

    await waitFor(() => {
      expect(screen.getByText('Chunk text path is required')).toBeInTheDocument()
    })
    expect(awsVendorStore.importAgentCoreEndpoint).not.toHaveBeenCalled()
  })

  // --- serialization: non-streaming ---

  it('calls importAgentCoreEndpoint with correct non-streaming JSON on submit', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const bodyPathInput = screen.getByPlaceholderText('output')
    await userEvent.type(bodyPathInput, 'result.answer')

    const installBtn = screen.getByRole('button', { name: /install/i })
    await userEvent.click(installBtn)

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          response: {
            streaming: false,
            body: { text_path: 'result.answer' },
          },
        })
      )
    })
  })

  it('includes request.message_path in JSON when filled', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const msgPathInput = screen.getByPlaceholderText('message')
    await userEvent.type(msgPathInput, 'input.query')

    const bodyPathInput = screen.getByPlaceholderText('output')
    await userEvent.type(bodyPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'input.query' },
          response: {
            streaming: false,
            body: { text_path: 'output' },
          },
        })
      )
    })
  })

  // --- serialization: streaming ---

  it('calls importAgentCoreEndpoint with correct streaming JSON on submit', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('switch'))

    const chunkPathInput = screen.getByPlaceholderText('delta')
    await userEvent.type(chunkPathInput, 'choices.0.text')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          response: {
            streaming: true,
            chunk: { text_path: 'choices.0.text' },
          },
        })
      )
    })
  })

  // --- serialization: reasoning included when filled ---

  it('includes reasoning in JSON when reasoning fields are filled', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const bodyPathInput = screen.getByPlaceholderText('output')
    await userEvent.type(bodyPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))

    const reasoningTextInput = screen.getByPlaceholderText('thinking')
    await userEvent.type(reasoningTextInput, 'thought_content')

    const reasoningActiveInput = screen.getByPlaceholderText('in_progress')
    await userEvent.type(reasoningActiveInput, 'is_active')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          response: {
            streaming: false,
            body: {
              text_path: 'output',
              reasoning: {
                text_path: 'thought_content',
                active_path: 'is_active',
              },
            },
          },
        })
      )
    })
  })

  // --- pre-fill from configurationJson ---

  it('pre-fills form from structured configurationJson on endpoint', () => {
    const endpointWithConfig: VendorAgentCoreEndpoint = {
      ...mockEndpoint,
      configurationJson: JSON.stringify({
        request: { message_path: 'input' },
        response: {
          streaming: false,
          body: { text_path: 'output' },
        },
      }),
    }

    render(<AwsAgentCoreImportPopup {...defaultProps} endpoint={endpointWithConfig} />)

    expect(screen.getByPlaceholderText('message')).toHaveValue('input')
    expect(screen.getByPlaceholderText('output')).toHaveValue('output')
  })

  it('pre-fills streaming mode from structured configurationJson', () => {
    const endpointWithConfig: VendorAgentCoreEndpoint = {
      ...mockEndpoint,
      configurationJson: JSON.stringify({
        response: {
          streaming: true,
          chunk: { text_path: 'delta' },
        },
      }),
    }

    render(<AwsAgentCoreImportPopup {...defaultProps} endpoint={endpointWithConfig} />)

    expect(screen.getByText('Chunk Text Path')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('delta')).toHaveValue('delta')
  })

  it('uses defaults for legacy configurationJson format', () => {
    const endpointWithLegacy: VendorAgentCoreEndpoint = {
      ...mockEndpoint,
      configurationJson: '{"message": "__QUERY_PLACEHOLDER__"}',
    }

    render(<AwsAgentCoreImportPopup {...defaultProps} endpoint={endpointWithLegacy} />)

    // Still shows non-streaming mode with empty fields
    expect(screen.getByText('Response Text Path')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('output')).toHaveValue('')
  })

  // --- callbacks ---

  it('calls onHide and resets form when Cancel is clicked', async () => {
    const onHide = vi.fn()
    render(<AwsAgentCoreImportPopup {...defaultProps} onHide={onHide} />)

    await userEvent.click(screen.getByTestId('popup-close'))

    expect(onHide).toHaveBeenCalledTimes(1)
  })

  it('calls onSuccess after successful import', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    render(<AwsAgentCoreImportPopup {...defaultProps} onSuccess={onSuccess} />)

    const bodyPathInput = screen.getByPlaceholderText('output')
    await userEvent.type(bodyPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- --reporter=verbose 2>&1 | grep -E "(FAIL|PASS|✓|✗|×|AwsAgentCoreImportPopup)" | head -40`
Expected: Multiple test failures (component doesn't have structured form yet)

---

## Task 3: Create ConfigurationJsonForm component

**Files:**
- Create: `src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx`

- [ ] **Step 1: Create the component file**

Create `src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx`:

```typescript
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

import { FC, useEffect, useState } from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'

import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'

export interface ReasoningFormValues {
  text_path: string
  active_path: string
  name_path: string
  args_path: string
}

export interface ConfigurationFormValues {
  messagePath: string
  streaming: boolean
  bodyTextPath: string
  bodyReasoning: ReasoningFormValues
  chunkTextPath: string
  chunkReasoning: ReasoningFormValues
}

interface Props {
  control: Control<ConfigurationFormValues>
  errors: FieldErrors<ConfigurationFormValues>
  streaming: boolean
}

const ConfigurationJsonForm: FC<Props> = ({ control, errors, streaming }) => {
  const [showReasoning, setShowReasoning] = useState(false)

  useEffect(() => {
    setShowReasoning(false)
  }, [streaming])

  return (
    <div className='flex flex-col gap-4'>
      <Controller
        name='messagePath'
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id='messagePath'
            label='Message Path'
            hint='Dot-notation path for the user query in the request body. Default: message'
            placeholder='message'
            error={errors.messagePath?.message}
          />
        )}
      />

      <Controller
        name='streaming'
        control={control}
        render={({ field }) => (
          <Switch
            id='streaming'
            label='Enable Streaming'
            hint='Toggle between single-response and streaming SSE mode'
            value={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            onBlur={field.onBlur}
          />
        )}
      />

      {!streaming ? (
        <>
          <Controller
            name='bodyTextPath'
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id='bodyTextPath'
                label='Response Text Path'
                hint='Dot-notation path to the answer text in the response body (e.g. output, result.answer)'
                placeholder='output'
                required
                error={errors.bodyTextPath?.message}
              />
            )}
          />

          <div className='flex flex-col gap-2'>
            <button
              type='button'
              className='flex items-center gap-1 text-xs text-text-quaternary hover:text-text-secondary transition w-fit'
              onClick={() => setShowReasoning((v) => !v)}
              aria-expanded={showReasoning}
            >
              <span
                className={`transition-transform ${showReasoning ? 'rotate-90' : ''}`}
                aria-hidden='true'
              >
                ›
              </span>
              Thought Extraction (optional)
            </button>

            {showReasoning && (
              <div className='flex flex-col gap-3 pl-4 border-l border-border-structural'>
                <Controller
                  name='bodyReasoning.text_path'
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id='bodyReasoning.text_path'
                      label='Thought Text Path'
                      hint='Path to the thought/reasoning content'
                      placeholder='thinking'
                      error={errors.bodyReasoning?.text_path?.message}
                    />
                  )}
                />
                <Controller
                  name='bodyReasoning.active_path'
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id='bodyReasoning.active_path'
                      label='Thought Active Path'
                      hint='Boolean path — true = thought in progress, false = closed'
                      placeholder='in_progress'
                      error={errors.bodyReasoning?.active_path?.message}
                    />
                  )}
                />
                <Controller
                  name='bodyReasoning.name_path'
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id='bodyReasoning.name_path'
                      label='Thought Name Path'
                      hint='Path to the thought title/name'
                      placeholder='name'
                      error={errors.bodyReasoning?.name_path?.message}
                    />
                  )}
                />
                <Controller
                  name='bodyReasoning.args_path'
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id='bodyReasoning.args_path'
                      label='Thought Args Path'
                      hint='Path to the thought arguments'
                      placeholder='args'
                      error={errors.bodyReasoning?.args_path?.message}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <Controller
            name='chunkTextPath'
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id='chunkTextPath'
                label='Chunk Text Path'
                hint='Dot-notation path to extract text from each SSE chunk'
                placeholder='delta'
                required
                error={errors.chunkTextPath?.message}
              />
            )}
          />

          <div className='flex flex-col gap-2'>
            <button
              type='button'
              className='flex items-center gap-1 text-xs text-text-quaternary hover:text-text-secondary transition w-fit'
              onClick={() => setShowReasoning((v) => !v)}
              aria-expanded={showReasoning}
            >
              <span
                className={`transition-transform ${showReasoning ? 'rotate-90' : ''}`}
                aria-hidden='true'
              >
                ›
              </span>
              Thought Extraction (optional)
            </button>

            {showReasoning && (
              <div className='flex flex-col gap-3 pl-4 border-l border-border-structural'>
                <Controller
                  name='chunkReasoning.text_path'
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id='chunkReasoning.text_path'
                      label='Thought Text Path'
                      hint='Path to the thought/reasoning content in each chunk'
                      placeholder='thinking'
                      error={errors.chunkReasoning?.text_path?.message}
                    />
                  )}
                />
                <Controller
                  name='chunkReasoning.active_path'
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id='chunkReasoning.active_path'
                      label='Thought Active Path'
                      hint='Boolean path — true = thought in progress, false = closed'
                      placeholder='in_progress'
                      error={errors.chunkReasoning?.active_path?.message}
                    />
                  )}
                />
                <Controller
                  name='chunkReasoning.name_path'
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id='chunkReasoning.name_path'
                      label='Thought Name Path'
                      hint='Path to the thought title/name'
                      placeholder='name'
                      error={errors.chunkReasoning?.name_path?.message}
                    />
                  )}
                />
                <Controller
                  name='chunkReasoning.args_path'
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id='chunkReasoning.args_path'
                      label='Thought Args Path'
                      hint='Path to the thought arguments'
                      placeholder='args'
                      error={errors.chunkReasoning?.args_path?.message}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ConfigurationJsonForm
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: no new errors

---

## Task 4: Rewrite AwsAgentCoreImportPopup

**Files:**
- Modify: `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx`

- [ ] **Step 1: Replace the file content**

Replace the entire content of `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx` with:

```typescript
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

import { yupResolver } from '@hookform/resolvers/yup'
import { FC, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { awsVendorStore } from '@/store/vendor'
import { AgentCoreEndpointConfigurationJson, VendorAgentCoreEndpoint } from '@/types/entity/vendor'

import ConfigurationJsonForm, {
  ConfigurationFormValues,
  ReasoningFormValues,
} from './ConfigurationJsonForm'

const emptyReasoning: ReasoningFormValues = {
  text_path: '',
  active_path: '',
  name_path: '',
  args_path: '',
}

const defaultFormValues: ConfigurationFormValues = {
  messagePath: '',
  streaming: false,
  bodyTextPath: '',
  bodyReasoning: { ...emptyReasoning },
  chunkTextPath: '',
  chunkReasoning: { ...emptyReasoning },
}

function parseConfigurationJson(raw: string | undefined): ConfigurationFormValues {
  if (!raw) return defaultFormValues
  try {
    const parsed = JSON.parse(raw) as AgentCoreEndpointConfigurationJson
    if (!parsed.response) return defaultFormValues
    return {
      messagePath: parsed.request?.message_path ?? '',
      streaming: parsed.response.streaming ?? false,
      bodyTextPath: parsed.response.body?.text_path ?? '',
      bodyReasoning: {
        text_path: parsed.response.body?.reasoning?.text_path ?? '',
        active_path: parsed.response.body?.reasoning?.active_path ?? '',
        name_path: parsed.response.body?.reasoning?.name_path ?? '',
        args_path: parsed.response.body?.reasoning?.args_path ?? '',
      },
      chunkTextPath: parsed.response.chunk?.text_path ?? '',
      chunkReasoning: {
        text_path: parsed.response.chunk?.reasoning?.text_path ?? '',
        active_path: parsed.response.chunk?.reasoning?.active_path ?? '',
        name_path: parsed.response.chunk?.reasoning?.name_path ?? '',
        args_path: parsed.response.chunk?.reasoning?.args_path ?? '',
      },
    }
  } catch {
    return defaultFormValues
  }
}

function buildReasoning(
  r: ReasoningFormValues
): AgentCoreEndpointConfigurationJson['response']['body'] extends { reasoning?: infer R } ? R : never {
  if (!r.text_path && !r.active_path) return undefined as never
  return {
    text_path: r.text_path,
    active_path: r.active_path,
    ...(r.name_path ? { name_path: r.name_path } : {}),
    ...(r.args_path ? { args_path: r.args_path } : {}),
  } as never
}

function serializeToJson(values: ConfigurationFormValues): string {
  const json: AgentCoreEndpointConfigurationJson = {
    response: { streaming: values.streaming },
  }

  if (values.messagePath) {
    json.request = { message_path: values.messagePath }
  }

  if (values.streaming) {
    json.response.chunk = {
      text_path: values.chunkTextPath,
    }
    const reasoning = buildReasoning(values.chunkReasoning)
    if (reasoning) json.response.chunk.reasoning = reasoning
  } else {
    json.response.body = {
      text_path: values.bodyTextPath,
    }
    const reasoning = buildReasoning(values.bodyReasoning)
    if (reasoning) json.response.body.reasoning = reasoning
  }

  return JSON.stringify(json)
}

const reasoningSchema = yup.object({
  text_path: yup.string().default(''),
  active_path: yup.string().default(''),
  name_path: yup.string().default(''),
  args_path: yup.string().default(''),
})

const schema = yup.object({
  messagePath: yup.string().default(''),
  streaming: yup.boolean().required().default(false),
  bodyTextPath: yup.string().when('streaming', {
    is: false,
    then: (s) => s.required('Response text path is required'),
    otherwise: (s) => s.default(''),
  }),
  bodyReasoning: reasoningSchema,
  chunkTextPath: yup.string().when('streaming', {
    is: true,
    then: (s) => s.required('Chunk text path is required'),
    otherwise: (s) => s.default(''),
  }),
  chunkReasoning: reasoningSchema,
})

interface Props {
  settingId: string
  runtimeId: string
  endpoint: VendorAgentCoreEndpoint | null
  onHide: () => void
  onSuccess: () => void
}

const AwsAgentCoreImportPopup: FC<Props> = ({
  settingId,
  runtimeId,
  endpoint,
  onHide,
  onSuccess,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConfigurationFormValues>({
    resolver: yupResolver(schema),
    defaultValues: defaultFormValues,
  })

  const streaming = watch('streaming')

  useEffect(() => {
    reset(parseConfigurationJson(endpoint?.configurationJson))
  }, [endpoint?.configurationJson, reset])

  const handleHide = () => {
    reset(defaultFormValues)
    onHide()
  }

  const onSubmit = async (values: ConfigurationFormValues) => {
    if (!endpoint) return
    await awsVendorStore.importAgentCoreEndpoint(
      settingId,
      runtimeId,
      endpoint.name,
      serializeToJson(values)
    )
    reset(defaultFormValues)
    onSuccess()
  }

  return (
    <Popup
      header={`Install endpoint: ${endpoint?.name ?? ''}`}
      visible={!!endpoint}
      onHide={handleHide}
      footerContent={
        <div className='flex gap-2 justify-end'>
          <Button type='secondary' onClick={handleHide} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type='primary'
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Install
          </Button>
        </div>
      }
      className='w-[600px]'
    >
      <div className='flex flex-col gap-4 pb-2'>
        <ConfigurationJsonForm control={control} errors={errors} streaming={streaming} />
      </div>
    </Popup>
  )
}

export default AwsAgentCoreImportPopup
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no errors

- [ ] **Step 3: Run lint**

Run: `npm run lint 2>&1 | grep -E "(error|warning)" | head -20`
Expected: no errors (auto-fix quotes if needed: `npm run lint:fix`)

---

## Task 5: Run tests and commit

- [ ] **Step 1: Run the new import popup tests**

Run: `npm run test:unit -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|✓|✗|AwsAgentCoreImportPopup)" | head -50`
Expected: All tests in `AwsAgentCoreImportPopup.test.tsx` pass

- [ ] **Step 2: Run all AgentCore tests to check for regressions**

Run: `npm run test:unit -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|agentCore|AgentCore)" | head -30`
Expected: All existing AgentCore tests still pass

- [ ] **Step 3: Run full unit test suite**

Run: `npm run test:unit 2>&1 | tail -20`
Expected: All tests pass, exit code 0

- [ ] **Step 4: Commit**

```bash
git add \
  src/types/entity/vendor.ts \
  src/pages/settings/aws/agentCoreRuntimes/components/ConfigurationJsonForm.tsx \
  src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreImportPopup.tsx \
  src/pages/settings/aws/agentCoreRuntimes/components/__tests__/AwsAgentCoreImportPopup.test.tsx
git commit -m "EPMCDME-12240: Replace configuration JSON textarea with structured form"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Covered in task |
|---|---|
| Add `AgentCoreEndpointConfigurationJson` type with `AgentCoreEndpointConfigurationJsonReasoning` | Task 1 |
| Replace textarea with structured form | Task 4 (using Task 3 component) |
| Streaming toggle switches visible fields | Task 3 (renders `body` vs `chunk` fields conditionally) |
| `request.message_path` field with label + hint | Task 3 |
| `response.body.text_path` required in non-streaming, label + hint | Task 3 + Task 4 schema |
| `response.body.reasoning.*` fields collapsible | Task 3 |
| `response.chunk.text_path` required in streaming, label + hint | Task 3 + Task 4 schema |
| `response.chunk.reasoning.*` fields collapsible | Task 3 |
| Serialize form to `AgentCoreEndpointConfigurationJson` JSON string | Task 4 (`serializeToJson`) |
| Pre-fill from `endpoint.configurationJson` | Task 4 (`parseConfigurationJson` + `useEffect`) |
| Legacy format fallback to defaults | Task 4 (`parseConfigurationJson` checks for `response` key) |
| Remove `IMPORT_INVOCATION_PLACEHOLDER` validation | Task 4 (new schema has no such check) |
| Tests for all above | Task 2 |

### Placeholder Scan

No TBDs, TODOs, or placeholders — all code blocks are complete.

### Type Consistency

- `ConfigurationFormValues` defined in `ConfigurationJsonForm.tsx` and imported in `AwsAgentCoreImportPopup.tsx` ✓
- `ReasoningFormValues` exported from `ConfigurationJsonForm.tsx` and used in `AwsAgentCoreImportPopup.tsx` ✓
- `AgentCoreEndpointConfigurationJson` from `src/types/entity/vendor.ts` used in `AwsAgentCoreImportPopup.tsx` ✓
- `buildReasoning` returns type that matches `AgentCoreEndpointConfigurationJson['response']['body']['reasoning']` ✓

> **Note on `buildReasoning` return type:** The return type uses a conditional type extraction. If this causes TypeScript issues, simplify to returning `AgentCoreEndpointConfigurationJsonReasoning | undefined` directly and cast where needed.
