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

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'
import { awsVendorStore } from '@/store/vendor'
import {
  AgentCoreEndpointStatus,
  VendorAgentCoreEndpoint,
  VendorEntityType,
  VendorOriginType,
} from '@/types/entity/vendor'

import AwsAgentCoreRuntimeDetails from '../AwsAgentCoreRuntimeDetails'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importActual) => ({
  ...(await importActual<typeof import('react-router')>()),
  useNavigate: () => mockNavigate,
}))

vi.mock('@/store/vendor', () => ({
  awsVendorStore: {
    loading: { agentCoreEndpoints: false, details: false },
    agentCoreEndpoints: [],
    agentCoreEndpointsPagination: { nextToken: null, perPage: 12 },
    getVendorEntityDetails: vi.fn(),
    getAgentCoreEndpoints: vi.fn(),
    importAgentCoreEndpoint: vi.fn(),
    deleteAgentCoreEndpoint: vi.fn(),
  },
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    getAssistant: vi.fn(),
  },
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    startNewChat: vi.fn(),
  },
}))

vi.mock('@/pages/settings/components/vendor/AwsEntityDetails', () => ({
  default: ({ entityDetails }: any) => (
    <div data-testid="entity-details">{entityDetails?.name}</div>
  ),
}))

vi.mock('../AwsAgentCoreEndpointDetailsPopup', () => ({
  default: ({ endpointName, onHide }: any) =>
    endpointName ? (
      <div data-testid="endpoint-popup">
        <span>{endpointName}</span>
        <button onClick={onHide} data-testid="popup-hide">
          Close
        </button>
      </div>
    ) : null,
}))

vi.mock('../AwsAgentCoreImportPopup', () => ({
  default: ({ endpoint, onHide }: any) =>
    endpoint ? (
      <div data-testid="import-popup">
        <span>{endpoint.name}</span>
        <button onClick={onHide} data-testid="import-popup-hide">
          Cancel
        </button>
      </div>
    ) : null,
}))

vi.mock('@/components/Spinner', () => ({
  default: ({ inline }: any) => (
    <div data-testid={inline ? 'inline-spinner' : 'spinner'}>Loading...</div>
  ),
}))

const mockRuntime = {
  id: 'runtime-abc',
  name: 'My Runtime',
  status: 'PREPARED',
  description: 'Test runtime',
  version: '2',
  updatedAt: '2026-01-01T00:00:00Z',
}

const mockEndpoints: VendorAgentCoreEndpoint[] = [
  {
    id: 'ep-id-1',
    name: 'endpoint-one',
    status: AgentCoreEndpointStatus.PREPARED,
    description: 'First endpoint',
    liveVersion: '1',
  },
  {
    id: 'ep-id-2',
    name: 'endpoint-two',
    status: AgentCoreEndpointStatus.PREPARED,
    description: 'Second endpoint',
    liveVersion: '3',
    aiRunId: 'ai-run-2',
  },
  {
    id: 'ep-id-3',
    name: 'endpoint-three',
    status: AgentCoreEndpointStatus.NOT_PREPARED,
    description: 'Third endpoint',
  },
  {
    id: 'ep-id-4',
    name: 'endpoint-four',
    status: AgentCoreEndpointStatus.VERSION_DRIFT,
    description: 'Drifted endpoint',
    liveVersion: '2',
    aiRunId: 'ai-run-4',
    configurationJson: '{"message": "__QUERY_PLACEHOLDER__"}',
  },
  {
    id: 'ep-id-5',
    name: 'endpoint-five',
    status: AgentCoreEndpointStatus.DELETED_ON_AWS,
    description: 'Deleted endpoint',
    liveVersion: '1',
    aiRunId: 'ai-run-5',
  },
]

describe('AwsAgentCoreRuntimeDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    Object.assign(awsVendorStore, {
      loading: { agentCoreEndpoints: false, details: false },
      agentCoreEndpoints: [],
      agentCoreEndpointsPagination: { nextToken: null, perPage: 12 },
    })
  })

  it('shows full-page spinner while runtime is loading', () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockImplementation(() => new Promise(() => {}))
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('fetches runtime details with correct params on mount', () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    expect(awsVendorStore.getVendorEntityDetails).toHaveBeenCalledWith(
      VendorOriginType.AWS,
      VendorEntityType.agentcoreRuntimes,
      'setting-123',
      'runtime-abc'
    )
  })

  it('fetches endpoints with correct params on mount', () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    expect(awsVendorStore.getAgentCoreEndpoints).toHaveBeenCalledWith('setting-123', 'runtime-abc')
  })

  it('renders entity details after runtime loads', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByTestId('entity-details')).toHaveTextContent('My Runtime')
    })
  })

  it('shows "No endpoints found" when endpoints list is empty', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByText('No endpoints found')).toBeInTheDocument()
    })
  })

  it('renders endpoint names', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: mockEndpoints })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByText('endpoint-one')).toBeInTheDocument()
      expect(screen.getByText('endpoint-two')).toBeInTheDocument()
    })
  })

  it('shows inline spinner while endpoints are loading with existing rows', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, {
      loading: { agentCoreEndpoints: true, details: false },
      agentCoreEndpoints: mockEndpoints,
    })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByTestId('inline-spinner')).toBeInTheDocument()
    })
  })

  it('shows "Load more" button when pagination nextToken is present', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, {
      agentCoreEndpoints: mockEndpoints,
      agentCoreEndpointsPagination: { nextToken: 'next-page-token', perPage: 12 },
    })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
    })
  })

  it('calls getAgentCoreEndpoints with loadMore=true when "Load more" is clicked', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, {
      agentCoreEndpoints: mockEndpoints,
      agentCoreEndpointsPagination: { nextToken: 'next-page-token', perPage: 12 },
    })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /load more/i })))

    expect(awsVendorStore.getAgentCoreEndpoints).toHaveBeenCalledWith(
      'setting-123',
      'runtime-abc',
      true
    )
  })

  // --- status badges ---

  it('shows Ready badge for PREPARED endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[0]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })
  })

  it('shows Not Ready badge for NOT_PREPARED endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[2]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByText('Not Ready')).toBeInTheDocument()
    })
  })

  it('shows Version Drift badge for VERSION_DRIFT endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[3]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByText('Version Drift')).toBeInTheDocument()
    })
  })

  it('shows Deleted on AWS badge for DELETED_ON_AWS endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[4]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByText('Deleted on AWS')).toBeInTheDocument()
    })
  })

  // --- action buttons ---

  it('shows Install button for non-imported endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[0]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^install$/i })).toBeInTheDocument()
    })
  })

  it('shows Uninstall button for PREPARED+imported endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[1]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /uninstall/i })).toBeInTheDocument()
    })
  })

  it('shows no Install button for NOT_PREPARED endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[2]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument()
    })
  })

  it('shows Reinstall button for VERSION_DRIFT endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[3]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reinstall/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^uninstall$/i })).not.toBeInTheDocument()
    })
  })

  it('opens reinstall popup when Reinstall is clicked', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    vi.mocked(assistantsStore.getAssistant).mockResolvedValue({
      name: 'My Assistant',
      description: 'Desc',
    } as any)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[3]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /reinstall/i })))

    await waitFor(() => {
      expect(screen.getByTestId('import-popup')).toBeInTheDocument()
    })
  })

  it('shows Uninstall but no Details button for DELETED_ON_AWS endpoint', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[4]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /uninstall/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^details$/i })).not.toBeInTheDocument()
    })
  })

  it('shows Chat button for endpoint with aiRunId', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[1]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^chat$/i })).toBeInTheDocument()
    })
  })

  it('starts chat and navigates to /chats when Chat button is clicked', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    vi.mocked(chatsStore.startNewChat).mockResolvedValue(undefined as any)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[1]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /^chat$/i })))

    await waitFor(() => {
      expect(chatsStore.startNewChat).toHaveBeenCalledWith('ai-run-2')
      expect(mockNavigate).toHaveBeenCalledWith('/chats')
    })
  })

  // --- import action ---

  it('opens install popup when Install is clicked', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[0]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /^install$/i })))

    const popup = screen.getByTestId('import-popup')
    expect(within(popup).getByText('endpoint-one')).toBeInTheDocument()
  })

  it('closes install popup when cancel is triggered', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[0]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /^install$/i })))
    expect(screen.getByTestId('import-popup')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('import-popup-hide'))
    expect(screen.queryByTestId('import-popup')).not.toBeInTheDocument()
  })

  // --- delete action ---

  it('calls deleteAgentCoreEndpoint with aiRunId on Uninstall click', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    vi.mocked(awsVendorStore.deleteAgentCoreEndpoint).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[1]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /uninstall/i })))

    expect(awsVendorStore.deleteAgentCoreEndpoint).toHaveBeenCalledWith('ai-run-2')
  })

  it('refetches endpoints after delete', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    vi.mocked(awsVendorStore.deleteAgentCoreEndpoint).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[1]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /uninstall/i })))

    await waitFor(() => {
      expect(awsVendorStore.getAgentCoreEndpoints).toHaveBeenCalledTimes(2)
    })
  })

  // --- details popup ---

  it('opens endpoint popup with endpoint name when Details is clicked', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[1]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /^details$/i })))

    const popup = screen.getByTestId('endpoint-popup')
    expect(within(popup).getByText('endpoint-two')).toBeInTheDocument()
  })

  it('closes endpoint popup when onHide is triggered', async () => {
    vi.mocked(awsVendorStore.getVendorEntityDetails).mockResolvedValue(mockRuntime as any)
    vi.mocked(awsVendorStore.getAgentCoreEndpoints).mockResolvedValue(undefined)
    Object.assign(awsVendorStore, { agentCoreEndpoints: [mockEndpoints[1]] })

    render(<AwsAgentCoreRuntimeDetails settingId="setting-123" entityId="runtime-abc" />)

    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /^details$/i })))
    expect(screen.getByTestId('endpoint-popup')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('popup-hide'))
    expect(screen.queryByTestId('endpoint-popup')).not.toBeInTheDocument()
  })
})
