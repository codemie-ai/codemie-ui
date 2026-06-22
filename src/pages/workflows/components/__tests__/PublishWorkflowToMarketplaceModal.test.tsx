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
import { describe, expect, it, vi, beforeEach } from 'vitest'

import toaster from '@/utils/toaster'

import { PublishWorkflowToMarketplaceModal } from '../PublishWorkflowToMarketplaceModal'

const mockValidate = vi.fn()
const mockPublish = vi.fn()

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    validateWorkflowForMarketplace: (...args: any[]) => mockValidate(...args),
    publishWorkflowToMarketplace: (...args: any[]) => mockPublish(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/pages/assistants/components', () => ({
  CategorySelector: ({
    onCategoriesChange,
    error,
  }: {
    onCategoriesChange: (c: string[]) => void
    error?: string
  }) => (
    <div>
      <span>Category Selector</span>
      {error && <span>{error}</span>}
      <button onClick={() => onCategoriesChange(['cat-1'])}>Select Category</button>
    </div>
  ),
  InlineCredentialsContent: ({ credentials }: { credentials: any[] }) => (
    <div data-testid="inline-credentials">Inline Credentials ({credentials.length})</div>
  ),
}))

const defaultProps = {
  workflowId: 'wf-1',
  open: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
}

describe('PublishWorkflowToMarketplaceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidate.mockResolvedValue({
      data: { inline_credentials: [] },
    })
    mockPublish.mockResolvedValue({})
  })

  it('does not render when closed', () => {
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} open={false} />)
    expect(screen.queryByText(/publish to marketplace/i)).not.toBeInTheDocument()
  })

  it('shows spinner while validating', () => {
    mockValidate.mockReturnValue(new Promise(() => {}))
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    expect(screen.getByText(/validating your workflow configuration/i)).toBeInTheDocument()
  })

  it('shows modal content after successful validation', async () => {
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Category Selector')).toBeInTheDocument()
    })
  })

  it('shows inline credentials when validation returns them', async () => {
    mockValidate.mockResolvedValue({
      data: {
        inline_credentials: [{ credential_type: 'api_key', toolkit: 'some-tool', env_vars: [] }],
      },
    })
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('inline-credentials')).toBeInTheDocument()
    })
  })

  it('does not show inline credentials when there are none', async () => {
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.queryByTestId('inline-credentials')).not.toBeInTheDocument()
    })
  })

  it('shows toaster error and closes on validation failure', async () => {
    mockValidate.mockResolvedValue({
      error: { message: 'Workflow is invalid', details: 'Missing node' },
    })
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Workflow is invalid<br>Missing node')
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('shows toaster error and closes on validation network error', async () => {
    mockValidate.mockRejectedValue(new Error('Network error'))
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Failed to validate workflow for publishing')
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('shows category error when publishing without selecting a category', async () => {
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => screen.getByText('Category Selector'))

    fireEvent.click(screen.getByRole('button', { name: /publish/i }))
    expect(await screen.findByText(/please select at least one category/i)).toBeInTheDocument()
  })

  it('publishes successfully after selecting a category', async () => {
    mockPublish.mockResolvedValue({})
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => screen.getByText('Select Category'))

    fireEvent.click(screen.getByText('Select Category'))
    fireEvent.click(screen.getByRole('button', { name: /publish/i }))

    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith('wf-1', ['cat-1'])
      expect(toaster.info).toHaveBeenCalledWith(
        'Workflow has been published to marketplace successfully!'
      )
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('shows toaster error when publish fails', async () => {
    mockPublish.mockResolvedValue({ error: { message: 'Publish failed' } })
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => screen.getByText('Select Category'))

    fireEvent.click(screen.getByText('Select Category'))
    fireEvent.click(screen.getByRole('button', { name: /publish/i }))

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Publish failed')
      expect(defaultProps.onSuccess).not.toHaveBeenCalled()
    })
  })

  it('calls onClose when Cancel is clicked', async () => {
    render(<PublishWorkflowToMarketplaceModal {...defaultProps} />)
    await waitFor(() => screen.getByRole('button', { name: /cancel/i }))

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('pre-populates categories from the categories prop when opening for re-publish', async () => {
    const preSelectedCategories = ['cat-1', 'cat-2']

    render(
      <PublishWorkflowToMarketplaceModal {...defaultProps} categories={preSelectedCategories} />
    )

    await waitFor(() => screen.getByText('Category Selector'))

    // Verify publish works without clicking "Select Category" first
    // (proves pre-population — no need to select manually)
    fireEvent.click(screen.getByRole('button', { name: /publish/i }))

    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith('wf-1', preSelectedCategories)
    })
  })
})
