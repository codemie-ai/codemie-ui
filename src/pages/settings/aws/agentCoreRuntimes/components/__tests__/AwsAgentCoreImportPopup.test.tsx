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

import { render, screen, waitFor } from '@testing-library/react'
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
        <button onClick={onHide} data-testid="popup-close">
          Close
        </button>
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

const DEFAULT_HISTORY = {
  history_path: 'messages',
  role_path: 'role',
  message_path: 'content',
  user_role: 'user',
  assistant_role: 'assistant',
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

  it('shows reasoning fields after expanding the section in non-streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const expandBtn = screen.getByRole('button', { name: /thought extraction/i })
    await userEvent.click(expandBtn)

    await waitFor(() => {
      expect(screen.getByText('Thought Text Path')).toBeInTheDocument()
      expect(screen.queryByText('Thought Active Path')).not.toBeInTheDocument()
      expect(screen.getByText('Thought Name Path')).toBeInTheDocument()
      expect(screen.getByText('Thought Args Path')).toBeInTheDocument()
    })
  })

  it('shows Thought Array Path field in non-streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await waitFor(() => {
      expect(screen.getByText('Thought Array Path')).toBeInTheDocument()
    })
  })

  it('does not show Thought Array Path field in streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    await userEvent.click(screen.getByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await waitFor(() => {
      expect(screen.queryByText('Thought Array Path')).not.toBeInTheDocument()
    })
  })

  // --- validation: non-streaming requires bodyTextPath ---

  it('shows error when Response Text Path is empty on submit in non-streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.clear(screen.getByPlaceholderText('output'))
    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(screen.getByText('Response text path is required')).toBeInTheDocument()
    })
    expect(awsVendorStore.importAgentCoreEndpoint).not.toHaveBeenCalled()
  })

  // --- validation: streaming requires chunkTextPath ---

  it('shows error when Chunk Text Path is empty on submit in streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('switch'))
    await userEvent.clear(screen.getByPlaceholderText('delta'))
    await userEvent.click(screen.getByRole('button', { name: /install/i }))

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
    await userEvent.clear(bodyPathInput)
    await userEvent.type(bodyPathInput, 'result.answer')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'message', history: DEFAULT_HISTORY },
          response: { streaming: false, body: { text_path: 'result.answer' } },
        }),
        'runtime-abc:my-endpoint',
        'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
      )
    })
  })

  it('includes request.message_path in JSON when filled', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const msgPathInput = screen.getByPlaceholderText('message')
    await userEvent.clear(msgPathInput)
    await userEvent.type(msgPathInput, 'input.query')

    const bodyPathInput = screen.getByPlaceholderText('output')
    await userEvent.clear(bodyPathInput)
    await userEvent.type(bodyPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'input.query', history: DEFAULT_HISTORY },
          response: { streaming: false, body: { text_path: 'output' } },
        }),
        'runtime-abc:my-endpoint',
        'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
      )
    })
  })

  // --- serialization: streaming ---

  it('calls importAgentCoreEndpoint with correct streaming JSON on submit', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('switch'))

    const chunkPathInput = screen.getByPlaceholderText('delta')
    await userEvent.clear(chunkPathInput)
    await userEvent.type(chunkPathInput, 'choices.0.text')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'message', history: DEFAULT_HISTORY },
          response: { streaming: true, chunk: { text_path: 'choices.0.text' } },
        }),
        'runtime-abc:my-endpoint',
        'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
      )
    })
  })

  // --- serialization: reasoning included when filled ---

  it('includes reasoning in JSON when text_path is filled', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const bodyPathInput = screen.getByPlaceholderText('output')
    await userEvent.clear(bodyPathInput)
    await userEvent.type(bodyPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await userEvent.clear(screen.getByPlaceholderText('thoughts'))
    await userEvent.type(screen.getByPlaceholderText('thoughts'), 'array_path')
    await userEvent.type(screen.getByPlaceholderText('thinking'), 'thought_content')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'message', history: DEFAULT_HISTORY },
          response: {
            streaming: false,
            body: {
              text_path: 'output',
              reasoning: { text_path: 'thought_content', thoughts_path: 'array_path' },
            },
          },
        }),
        'runtime-abc:my-endpoint',
        'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
      )
    })
  })

  it('shows error when thoughts_path is empty but text_path is filled in non-streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await userEvent.clear(screen.getByPlaceholderText('thoughts'))
    await userEvent.type(screen.getByPlaceholderText('thinking'), 'text')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(screen.getByText('Thought array path is required')).toBeInTheDocument()
    })
    expect(awsVendorStore.importAgentCoreEndpoint).not.toHaveBeenCalled()
  })

  it('does not require thoughts_path when text_path is filled in streaming mode', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('switch'))

    const chunkPathInput = screen.getByPlaceholderText('delta')
    await userEvent.clear(chunkPathInput)
    await userEvent.type(chunkPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await userEvent.type(screen.getByPlaceholderText('thinking'), 'text')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(screen.queryByText('Thought array path is required')).not.toBeInTheDocument()
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalled()
    })
  })

  it('includes thoughts_path in reasoning when filled in non-streaming mode', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    const bodyPathInput = screen.getByPlaceholderText('output')
    await userEvent.clear(bodyPathInput)
    await userEvent.type(bodyPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await userEvent.clear(screen.getByPlaceholderText('thoughts'))
    await userEvent.type(screen.getByPlaceholderText('thoughts'), 'items')
    await userEvent.type(screen.getByPlaceholderText('thinking'), 'text')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'message', history: DEFAULT_HISTORY },
          response: {
            streaming: false,
            body: {
              text_path: 'output',
              reasoning: { text_path: 'text', thoughts_path: 'items' },
            },
          },
        }),
        'runtime-abc:my-endpoint',
        'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
      )
    })
  })

  it('pre-fills thoughts_path when parsing existing configuration JSON', async () => {
    const endpointWithReasoning: VendorAgentCoreEndpoint = {
      ...mockEndpoint,
      configurationJson: JSON.stringify({
        request: { message_path: 'input' },
        response: {
          streaming: false,
          body: {
            text_path: 'output',
            reasoning: { thoughts_path: 'items', text_path: 'text' },
          },
        },
      }),
    }
    render(<AwsAgentCoreImportPopup {...defaultProps} endpoint={endpointWithReasoning} />)

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('thoughts')).toHaveValue('items')
    })
  })

  it('includes active_path in reasoning when both text_path and active_path are filled in streaming mode', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('switch'))

    const chunkPathInput = screen.getByPlaceholderText('delta')
    await userEvent.clear(chunkPathInput)
    await userEvent.type(chunkPathInput, 'output')

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))
    await userEvent.type(screen.getByPlaceholderText('thinking'), 'thought_content')
    await userEvent.type(screen.getByPlaceholderText('in_progress'), 'is_active')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'message', history: DEFAULT_HISTORY },
          response: {
            streaming: true,
            chunk: {
              text_path: 'output',
              reasoning: {
                text_path: 'thought_content',
                thoughts_path: 'thoughts',
                active_path: 'is_active',
              },
            },
          },
        }),
        'runtime-abc:my-endpoint',
        'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
      )
    })
  })

  it('does not render Thought Active Path in non-streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))

    expect(screen.queryByText('Thought Active Path')).not.toBeInTheDocument()
  })

  it('renders Thought Active Path in streaming mode', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('switch'))
    await userEvent.click(screen.getByRole('button', { name: /thought extraction/i }))

    await waitFor(() => {
      expect(screen.getByText('Thought Active Path')).toBeInTheDocument()
    })
  })

  // --- history section ---

  it('does not show history fields until section is expanded', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.queryByText('History Path')).not.toBeInTheDocument()
  })

  it('shows history fields after expanding the History section', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /history/i }))

    await waitFor(() => {
      expect(screen.getByText('History Path')).toBeInTheDocument()
      expect(screen.getByText('Role Path')).toBeInTheDocument()
      expect(screen.getByText('User Role')).toBeInTheDocument()
      expect(screen.getByText('Assistant Role')).toBeInTheDocument()
    })
  })

  it('pre-fills history role fields with reasonable defaults', async () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /history/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('role')).toHaveValue('role')
      expect(screen.getByPlaceholderText('content')).toHaveValue('content')
      expect(screen.getByPlaceholderText('user')).toHaveValue('user')
      expect(screen.getByPlaceholderText('assistant')).toHaveValue('assistant')
    })
  })

  it('omits history from JSON when history_path is empty', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /history/i }))
    await userEvent.clear(screen.getByPlaceholderText('messages'))

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      const call = vi.mocked(awsVendorStore.importAgentCoreEndpoint).mock.calls[0]
      const json = JSON.parse(call[3])
      expect(json.request?.history).toBeUndefined()
    })
  })

  it('includes history in JSON when history_path is filled', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    render(<AwsAgentCoreImportPopup {...defaultProps} />)

    await userEvent.click(screen.getByRole('button', { name: /history/i }))
    await userEvent.clear(screen.getByPlaceholderText('messages'))
    await userEvent.type(screen.getByPlaceholderText('messages'), 'messages')

    await userEvent.click(screen.getByRole('button', { name: /install/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: {
            message_path: 'message',
            history: {
              history_path: 'messages',
              role_path: 'role',
              message_path: 'content',
              user_role: 'user',
              assistant_role: 'assistant',
            },
          },
          response: { streaming: false, body: { text_path: 'response' } },
        }),
        'runtime-abc:my-endpoint',
        'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
      )
    })
  })

  it('pre-fills history fields from configurationJson', async () => {
    const endpointWithHistory: VendorAgentCoreEndpoint = {
      ...mockEndpoint,
      configurationJson: JSON.stringify({
        request: {
          message_path: 'query',
          history: {
            history_path: 'messages',
            role_path: 'role',
            message_path: 'content',
            user_role: 'human',
            assistant_role: 'ai',
          },
        },
        response: { streaming: false, body: { text_path: 'output' } },
      }),
    }

    render(<AwsAgentCoreImportPopup {...defaultProps} endpoint={endpointWithHistory} />)

    await userEvent.click(screen.getByRole('button', { name: /history/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('messages')).toHaveValue('messages')
      expect(screen.getByPlaceholderText('user')).toHaveValue('human')
      expect(screen.getByPlaceholderText('assistant')).toHaveValue('ai')
    })
  })

  // --- streaming toggle: inherit paths when toggling ---

  it('populates Response Text Path with Chunk Text Path value when streaming is toggled off', async () => {
    const endpointWithStreaming: VendorAgentCoreEndpoint = {
      ...mockEndpoint,
      configurationJson: JSON.stringify({
        request: { message_path: 'message' },
        response: { streaming: true, chunk: { text_path: 'choices.0.delta' } },
      }),
    }

    render(<AwsAgentCoreImportPopup {...defaultProps} endpoint={endpointWithStreaming} />)

    const streamingToggle = screen.getByRole('switch')
    await userEvent.click(streamingToggle)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('output')).toHaveValue('choices.0.delta')
    })
  })

  it('saves with inherited Response Text Path after streaming is toggled off', async () => {
    vi.mocked(awsVendorStore.importAgentCoreEndpoint).mockResolvedValue(undefined)
    const endpointWithStreaming: VendorAgentCoreEndpoint = {
      ...mockEndpoint,
      configurationJson: JSON.stringify({
        request: { message_path: 'message' },
        response: { streaming: true, chunk: { text_path: 'choices.0.delta' } },
      }),
    }

    render(
      <AwsAgentCoreImportPopup
        {...defaultProps}
        mode="configure"
        endpoint={endpointWithStreaming}
      />
    )

    await userEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('output')).toHaveValue('choices.0.delta')
    })

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(awsVendorStore.importAgentCoreEndpoint).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint',
        JSON.stringify({
          request: { message_path: 'message', history: DEFAULT_HISTORY },
          response: { streaming: false, body: { text_path: 'choices.0.delta' } },
        }),
        expect.any(String),
        expect.any(String)
      )
    })
  })

  it('populates Chunk Text Path with Response Text Path value when streaming is toggled on', async () => {
    const endpointWithBody: VendorAgentCoreEndpoint = {
      ...mockEndpoint,
      configurationJson: JSON.stringify({
        request: { message_path: 'message' },
        response: { streaming: false, body: { text_path: 'result.answer' } },
      }),
    }

    render(<AwsAgentCoreImportPopup {...defaultProps} endpoint={endpointWithBody} />)

    const streamingToggle = screen.getByRole('switch')
    await userEvent.click(streamingToggle)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('delta')).toHaveValue('result.answer')
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

    // Falls back to defaults for unrecognised format
    expect(screen.getByText('Response Text Path')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('output')).toHaveValue('response')
  })

  // --- assistant name / description pre-fill ---

  it('pre-fills assistant name and description from runtimeId and endpoint name', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} />)
    expect(screen.getByPlaceholderText('My AgentCore Assistant')).toHaveValue(
      'runtime-abc:my-endpoint'
    )
    expect(screen.getByPlaceholderText('Describe what this assistant does')).toHaveValue(
      'AgentCore Runtime: runtime-abc, Endpoint: my-endpoint'
    )
  })

  // --- mode prop ---

  it('shows Reinstall header and button when mode is reinstall', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} mode="reinstall" />)
    expect(screen.getByTestId('popup-header')).toHaveTextContent('Reinstall endpoint')
    expect(screen.getByRole('button', { name: /reinstall/i })).toBeInTheDocument()
  })

  it('shows Configure header and Save button when mode is configure', () => {
    render(<AwsAgentCoreImportPopup {...defaultProps} mode="configure" />)
    expect(screen.getByTestId('popup-header')).toHaveTextContent('Configure endpoint')
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  // --- callbacks ---

  it('calls onHide when Cancel is clicked', async () => {
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
