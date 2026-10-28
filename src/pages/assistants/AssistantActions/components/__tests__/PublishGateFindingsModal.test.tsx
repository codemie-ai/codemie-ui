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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import PublishGateFindingsModal, { type PublishGateError } from '../PublishGateFindingsModal'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: { user: { isAdmin: false, isMaintainer: false } as any },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store: any) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store', () => ({
  userStore: mockUserStore,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

const assistant = { id: 'a-1' } as Assistant

const error: PublishGateError = {
  message:
    'Assistant cannot be published: description_length: Description is 26 chars, minimum is 100.',
  help: 'Fix each rule listed in details.gate_findings and publish again.',
  details: {
    failed_rules: ['description_length'],
    gate_findings: [
      {
        rule: 'description_length',
        severity: 'CRITICAL',
        message: 'Description is 26 chars, minimum is 100.',
      },
    ],
  },
}

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof PublishGateFindingsModal>> = {}
) =>
  render(
    <PublishGateFindingsModal
      visible
      assistant={assistant}
      error={error}
      onHide={vi.fn()}
      {...overrides}
    />
  )

describe('PublishGateFindingsModal — Force-Publish', () => {
  beforeEach(() => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false }
  })

  it('does not render a Force-Publish button for a non-admin, non-maintainer viewer', () => {
    renderModal({ onForcePublish: vi.fn() })

    expect(screen.queryByTestId('publish-gate-force-publish')).not.toBeInTheDocument()
  })

  it('does not render a Force-Publish button when no onForcePublish handler is supplied', () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false }

    renderModal()

    expect(screen.queryByTestId('publish-gate-force-publish')).not.toBeInTheDocument()
  })

  it('renders a Force-Publish button for an admin viewer', () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false }

    renderModal({ onForcePublish: vi.fn() })

    expect(screen.getByTestId('publish-gate-force-publish')).toBeInTheDocument()
  })

  it('renders a Force-Publish button for a maintainer viewer', () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: true }

    renderModal({ onForcePublish: vi.fn() })

    expect(screen.getByTestId('publish-gate-force-publish')).toBeInTheDocument()
  })

  it('reveals a reason input on click, with Confirm disabled until 20+ characters', () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false }

    renderModal({ onForcePublish: vi.fn() })

    fireEvent.click(screen.getByTestId('publish-gate-force-publish'))

    const input = screen.getByTestId('publish-gate-force-reason-input')
    const confirm = screen.getByTestId('publish-gate-force-reason-confirm')
    expect(confirm).toBeDisabled()

    fireEvent.change(input, { target: { value: 'too short' } })
    expect(confirm).toBeDisabled()

    fireEvent.change(input, {
      target: { value: 'Reviewed offline, safe to publish ahead of the gate.' },
    })
    expect(confirm).not.toBeDisabled()
  })

  it('calls onForcePublish with the trimmed reason on confirm', () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false }
    const onForcePublish = vi.fn()

    renderModal({ onForcePublish })

    fireEvent.click(screen.getByTestId('publish-gate-force-publish'))
    fireEvent.change(screen.getByTestId('publish-gate-force-reason-input'), {
      target: { value: '  Reviewed offline, safe to publish ahead of the gate.  ' },
    })
    fireEvent.click(screen.getByTestId('publish-gate-force-reason-confirm'))

    expect(onForcePublish).toHaveBeenCalledWith(
      'Reviewed offline, safe to publish ahead of the gate.'
    )
  })

  it('still renders Edit assistant and Cancel for a non-privileged viewer', () => {
    renderModal()

    expect(screen.getByTestId('publish-gate-edit')).toBeInTheDocument()
    expect(screen.getByTestId('publish-gate-cancel')).toBeInTheDocument()
  })
})

describe('PublishGateFindingsModal — header and status banner', () => {
  beforeEach(() => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false }
  })

  it('shows "Assistant Verification Failed" as the default header', () => {
    renderModal()

    expect(
      screen.getByRole('heading', { name: /assistant verification failed/i })
    ).toBeInTheDocument()
  })

  it('does not render the status banner when marketplaceStatus is missing', () => {
    renderModal()

    expect(screen.queryByTestId('publish-gate-status-banner')).not.toBeInTheDocument()
  })

  it('renders an "already in Marketplace" banner when marketplaceStatus is APPROVED', () => {
    renderModal({ marketplaceStatus: 'APPROVED' })

    const banner = screen.getByTestId('publish-gate-status-banner')
    expect(banner).toHaveTextContent(/already in the Marketplace/i)
  })

  it('renders a "pending review" banner when marketplaceStatus is PENDING_REVIEW', () => {
    renderModal({ marketplaceStatus: 'PENDING_REVIEW' })

    const banner = screen.getByTestId('publish-gate-status-banner')
    expect(banner).toHaveTextContent(/pending Marketplace review/i)
  })

  it('does not render the banner for unrelated statuses', () => {
    renderModal({ marketplaceStatus: 'REJECTED' })

    expect(screen.queryByTestId('publish-gate-status-banner')).not.toBeInTheDocument()
  })

  it('renders a "in Draft" banner when marketplaceStatus is DRAFT', () => {
    renderModal({ marketplaceStatus: 'DRAFT' })

    const banner = screen.getByTestId('publish-gate-status-banner')
    expect(banner).toHaveTextContent(/currently in Marketplace Draft/i)
  })

  it('does not render the banner for WITHDRAWN status', () => {
    renderModal({ marketplaceStatus: 'WITHDRAWN' })

    expect(screen.queryByTestId('publish-gate-status-banner')).not.toBeInTheDocument()
  })

  it('honours a caller-provided headerText override', () => {
    renderModal({ headerText: 'Custom header' })

    expect(screen.getByRole('heading', { name: 'Custom header' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /assistant verification failed/i })
    ).not.toBeInTheDocument()
  })

  it('uses role="note" on the banner (static informational content)', () => {
    renderModal({ marketplaceStatus: 'APPROVED' })

    const banner = screen.getByTestId('publish-gate-status-banner')
    expect(banner).toHaveAttribute('role', 'note')
  })

  it('hides the banner while an admin is filling in the Force-Publish reason', () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false }

    renderModal({ marketplaceStatus: 'PENDING_REVIEW', onForcePublish: vi.fn() })
    expect(screen.getByTestId('publish-gate-status-banner')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('publish-gate-force-publish'))

    expect(screen.queryByTestId('publish-gate-status-banner')).not.toBeInTheDocument()
  })

  it('shows a PENDING_REVIEW-aware live-edit description that matches the button copy', () => {
    renderModal({
      marketplaceStatus: 'PENDING_REVIEW',
      onSendForReview: vi.fn(),
      onUnpublishAndEdit: vi.fn(),
      sendForReviewLabel: 'Save and remove from marketplace review queue',
    })

    expect(
      screen.getByText(/save and remove from the review queue to continue editing/i)
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/save and unpublish to continue editing the saved version/i)
    ).not.toBeInTheDocument()
  })

  it('shows the APPROVED live-edit description (save and unpublish) when marketplaceStatus is APPROVED', () => {
    renderModal({
      marketplaceStatus: 'APPROVED',
      onSendForReview: vi.fn(),
      onUnpublishAndEdit: vi.fn(),
    })

    expect(
      screen.getByText(/save and unpublish to continue editing the saved version/i)
    ).toBeInTheDocument()
  })
})
