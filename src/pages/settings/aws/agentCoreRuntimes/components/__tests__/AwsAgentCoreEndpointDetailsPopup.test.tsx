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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { awsVendorStore } from '@/store/vendor'
import { AgentCoreEndpointStatus } from '@/types/entity/vendor'

import AwsAgentCoreEndpointDetailsPopup from '../AwsAgentCoreEndpointDetailsPopup'

vi.mock('@/store/vendor', () => ({
  awsVendorStore: {
    getAgentCoreEndpointDetails: vi.fn(),
  },
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, header, onHide }: any) =>
    visible ? (
      <div data-testid="popup">
        <div data-testid="popup-header">{header}</div>
        <button onClick={onHide} data-testid="popup-close">
          Close
        </button>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('@/components/details/DetailsCopyField', () => ({
  default: ({ label, value }: any) =>
    value ? (
      <div>
        <span>{label}</span>
        <span>{value}</span>
      </div>
    ) : null,
}))

const mockDetails = {
  id: 'ep-id',
  name: 'my-endpoint',
  status: AgentCoreEndpointStatus.PREPARED,
  description: 'Endpoint description',
  liveVersion: '3',
  targetVersion: '4',
  createdAt: '2026-01-10T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
  agentRuntimeArn: 'arn:aws:bedrock:us-east-1:123:agent-runtime/abc',
  agentRuntimeEndpointArn: 'arn:aws:bedrock:us-east-1:123:agent-runtime/abc/endpoint/def',
  failureReason: null,
}

const defaultProps = {
  settingId: 'setting-123',
  runtimeId: 'runtime-abc',
  endpointName: 'my-endpoint',
  onHide: vi.fn(),
}

describe('AwsAgentCoreEndpointDetailsPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render popup when endpointName is null', () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue(mockDetails as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} endpointName={null} />)

    expect(screen.queryByTestId('popup')).not.toBeInTheDocument()
  })

  it('renders popup when endpointName is provided', () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockImplementation(
      () => new Promise(() => {})
    )

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    expect(screen.getByTestId('popup')).toBeInTheDocument()
  })

  it('shows endpointName as popup header', () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockImplementation(
      () => new Promise(() => {})
    )

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    expect(screen.getByTestId('popup-header')).toHaveTextContent('my-endpoint')
  })

  it('shows spinner while details are loading', () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockImplementation(
      () => new Promise(() => {})
    )

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('fetches details with correct params', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue(mockDetails as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(awsVendorStore.getAgentCoreEndpointDetails).toHaveBeenCalledWith(
        'setting-123',
        'runtime-abc',
        'my-endpoint'
      )
    })
  })

  it('renders endpoint name after load', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue(mockDetails as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('my-endpoint')).toBeInTheDocument()
    })
  })

  it('renders Ready status badge for PREPARED endpoint', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue(mockDetails as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })
  })

  it('renders Not Ready badge for non-PREPARED endpoint', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue({
      ...mockDetails,
      status: AgentCoreEndpointStatus.NOT_PREPARED,
    } as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Not Ready')).toBeInTheDocument()
    })
  })

  it('renders version badges for live and target versions', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue(mockDetails as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('v3')).toBeInTheDocument()
      expect(screen.getByText('v4')).toBeInTheDocument()
    })
  })

  it('renders ARN labels after load', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue(mockDetails as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Agent Runtime ARN')).toBeInTheDocument()
      expect(screen.getByText('Agent Runtime Endpoint ARN')).toBeInTheDocument()
    })
  })

  it('renders ARN values after load', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue(mockDetails as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('arn:aws:bedrock:us-east-1:123:agent-runtime/abc')
      ).toBeInTheDocument()
    })
  })

  it('shows failure reason when present', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue({
      ...mockDetails,
      failureReason: 'Deployment timed out',
    } as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Deployment timed out')).toBeInTheDocument()
    })
  })

  it('does not show Failure Reason label when absent', async () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockResolvedValue(mockDetails as any)

    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} />)

    await waitFor(() => {
      expect(screen.queryByText('Failure Reason')).not.toBeInTheDocument()
    })
  })

  it('calls onHide when popup close is triggered', () => {
    vi.mocked(awsVendorStore.getAgentCoreEndpointDetails).mockImplementation(
      () => new Promise(() => {})
    )

    const onHide = vi.fn()
    render(<AwsAgentCoreEndpointDetailsPopup {...defaultProps} onHide={onHide} />)

    fireEvent.click(screen.getByTestId('popup-close'))

    expect(onHide).toHaveBeenCalledTimes(1)
  })
})
