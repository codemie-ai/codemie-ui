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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import {
  entityDetailFixture,
  entityDetailSimilarFixture,
  entityDetailWithVerdictFixture,
  entityPromptFixture,
} from '@/test-utils/fixtures/marketplace'
import type { AuditConfigResponse } from '@/types/generated/marketplaceManagement'

import AssistantDetailsDrawer from '../AssistantDetailsDrawer'

const mockAuditConfig: AuditConfigResponse = {
  gates: {} as AuditConfigResponse['gates'],
  similarity: {
    thresholds: { report_threshold: 0.5, optional: 0.7, critical: 0.9 },
  } as unknown as AuditConfigResponse['similarity'],
  usage_tiers: {} as AuditConfigResponse['usage_tiers'],
  verification: {} as AuditConfigResponse['verification'],
}

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: unknown) => store }
})

const apiGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => apiGet(...args),
    post: vi.fn().mockResolvedValue({ json: async () => ({}) }),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

/**
 * `GET /entities/{kind}/{eid}` is an `EntityReviewDetail` projection, not an
 * `Assistant` (EXECUTION-PLAN 8.1). The drawer used to hand that payload to
 * `AssistantDetailsEmbedded` behind `as unknown as Assistant`, a component
 * built for the 54-column dump — so the reviewer's drawer rendered mostly
 * empty. Every assertion below names one thing the reviewer needs in order to
 * decide, and each of them is a key the projection really emits.
 */
const routeFor = (id: string): string => `v1/marketplace-management/entities/assistants/${id}`

// PENDING_REVIEW with no CRITICAL findings → shows Publish, Reject
const pendingNoCriticalFixture = { ...entityDetailFixture, gate_findings: [] }

const rejectedDetailFixture = {
  ...entityDetailFixture,
  marketplace_status: 'REJECTED',
  is_verified: false,
  marketplace_decision_reason: 'Policy violation',
}

const approvedVerifiedFixture = {
  ...entityDetailFixture,
  marketplace_status: 'APPROVED',
  is_verified: true,
}

const respondWith = (body: unknown) => ({ json: async () => body })

describe('AssistantDetailsDrawer over the EntityReviewDetail projection', () => {
  beforeEach(() => {
    apiGet.mockReset()
    marketplaceManagementStore.assessments = {}
    marketplaceManagementStore.entityKind = 'ASSISTANT'
  })

  const renderDrawer = async (
    detail = entityDetailFixture,
    props: Partial<{ isCleanupQueue: boolean }> = {}
  ) => {
    apiGet.mockImplementation((url: string) => {
      if (url.endsWith('/prompt')) return Promise.resolve(respondWith(entityPromptFixture))
      return Promise.resolve(respondWith(detail))
    })
    const view = render(
      <AssistantDetailsDrawer assistantId={detail.id!} onClose={() => {}} {...props} />
    )
    // In the cleanup queue the default tab is 'Audit results'; navigate to
    // 'Assistant details' first so review-name becomes visible (EPMCDME-15352).
    if (props.isCleanupQueue) {
      await waitFor(() =>
        expect(screen.getByRole('tab', { name: /assistant details/i })).toBeInTheDocument()
      )
      await userEvent.click(screen.getByRole('tab', { name: /assistant details/i }))
    }
    await waitFor(() => expect(screen.getByTestId('review-name')).toBeInTheDocument())
    return view
  }

  it('shows the identity the reviewer decides on: name, description, categories', async () => {
    await renderDrawer()

    expect(screen.getByTestId('review-name')).toHaveTextContent(entityDetailFixture.name)
    expect(screen.getByTestId('review-description')).toHaveTextContent(
      entityDetailFixture.description
    )
    entityDetailFixture.categories.forEach((c) => {
      expect(screen.getByTestId('review-categories')).toHaveTextContent(c)
    })
  })

  it('shows who submitted it and when', async () => {
    await renderDrawer()

    expect(screen.getByTestId('review-submitted-by')).toHaveTextContent(
      entityDetailFixture.submitted_by!
    )
    // A real timestamp, not the em-dash the pending table shows for a null.
    const submittedAt = screen.getByTestId('review-submitted-at')
    expect(submittedAt.textContent).not.toBe('—')
    expect(submittedAt).toHaveAttribute('data-value', entityDetailFixture.marketplace_submitted_at!)
    expect(screen.getByTestId('review-status')).toHaveTextContent(
      entityDetailFixture.marketplace_status!
    )
  })

  it('shows every gate finding with its rule, severity and message, plus the counts', async () => {
    await renderDrawer()

    expect(entityDetailFixture.gate_findings.length).toBeGreaterThan(0)
    entityDetailFixture.gate_findings.forEach((f) => {
      const el = screen.getByTestId(`review-gate-finding-${f.rule}`)
      // The raw severity, not its display label — the reviewer's decision is
      // driven by CRITICAL vs OPTIONAL, and that must survive a restyle.
      expect(el).toHaveAttribute('data-severity', f.severity)
      expect(el).toHaveTextContent(f.message)
    })
    expect(screen.getByTestId('review-critical-count')).toHaveTextContent(
      String(entityDetailFixture.critical_count)
    )
    expect(screen.getByTestId('review-optional-count')).toHaveTextContent(
      String(entityDetailFixture.optional_count)
    )
  })

  it('shows capability as the names and counts the projection allows', async () => {
    await renderDrawer()

    expect(entityDetailFixture.toolkit_names.length).toBeGreaterThan(0)
    entityDetailFixture.toolkit_names.forEach((t) => {
      expect(screen.getByTestId('review-toolkits')).toHaveTextContent(t)
    })
    expect(entityDetailFixture.mcp_server_names.length).toBeGreaterThan(0)
    entityDetailFixture.mcp_server_names.forEach((m) => {
      expect(screen.getByTestId('review-mcp-servers')).toHaveTextContent(m)
    })
    expect(screen.getByTestId('review-prompt-length')).toHaveTextContent(
      String(entityDetailFixture.system_prompt_length)
    )
  })

  it('names the closest similar entity rather than only showing its id', async () => {
    // A reviewer deciding "is this a duplicate?" acts on WHICH assistant it
    // matched. The panel used to render a bare UUID because SimilarPair
    // carried no name; the API now sends b_name.
    await renderDrawer(entityDetailSimilarFixture)

    const similar = entityDetailSimilarFixture.top_similar!
    const el = screen.getByTestId('review-top-similar')

    expect(el).toHaveTextContent(similar.b_name!)
    expect(el).toHaveTextContent(`${Math.round(similar.combined * 100)}% similar`)
  })

  it('does not surface backend internals in the closest-match panel', async () => {
    // `reason` is a lookup identifier (`es_knn`) and the signal map repeats the
    // combined score. Both read as leaked internals; they stay on data-
    // attributes for the e2e suite instead.
    await renderDrawer(entityDetailSimilarFixture)

    const el = screen.getByTestId('review-top-similar')

    expect(el).not.toHaveTextContent('es_knn')
    expect(el).not.toHaveTextContent(/cosine/i)
    expect(el).toHaveAttribute('data-match-reason')
  })

  it('fetches the system prompt on demand — it is not in the default payload', async () => {
    await renderDrawer()

    // Nothing has asked for the prompt yet: 8.1's whole point is that reading
    // it is a separate, separately audited call.
    expect(apiGet.mock.calls.map((c) => c[0])).not.toContain(
      `${routeFor(entityDetailFixture.id!)}/prompt`
    )
    expect(screen.queryByTestId('review-system-prompt')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('review-show-prompt'))

    await waitFor(() =>
      expect(screen.getByTestId('review-system-prompt')).toHaveTextContent(
        entityPromptFixture.system_prompt.slice(0, 60)
      )
    )
    expect(apiGet.mock.calls.map((c) => c[0])).toContain(
      `${routeFor(entityDetailFixture.id!)}/prompt`
    )
  })

  describe('closest match opens the assistant', () => {
    it('links the matched name to the assistant page', async () => {
      // Deciding "is this a duplicate?" means looking at what it matched.
      // Copying a UUID out of the drawer into a search box is not a review flow.
      await renderDrawer(entityDetailSimilarFixture)

      const link = screen.getByTestId('review-top-similar-link')
      const similar = entityDetailSimilarFixture.top_similar!

      expect(link.getAttribute('href')).toContain(`/assistants/${similar.b_id}`)
      expect(link).toHaveTextContent(similar.b_name!)
    })

    it('opens in a new tab so the reviewer keeps their place in the queue', async () => {
      await renderDrawer(entityDetailSimilarFixture)

      const link = screen.getByTestId('review-top-similar-link')

      expect(link).toHaveAttribute('target', '_blank')
      // Without this, the opened page can reach back through window.opener.
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    })

    it('uses getAssistantLink with slug and project when b_slug and b_project are non-null', async () => {
      const fixtureWithSlug = {
        ...entityDetailSimilarFixture,
        top_similar: {
          ...entityDetailSimilarFixture.top_similar!,
          b_slug: 'test-slug',
          b_project: 'test-project',
        },
      }
      await renderDrawer(fixtureWithSlug as typeof entityDetailSimilarFixture)

      const link = screen.getByTestId('review-top-similar-link')
      expect(link.getAttribute('href')).toMatch(/\/assistants\/test-project\/test-slug$/)
    })

    it('falls back to the GUID URL when b_slug or b_project is null', async () => {
      // entityDetailSimilarFixture has b_name set but no b_slug/b_project (null/undefined)
      await renderDrawer(entityDetailSimilarFixture)

      const link = screen.getByTestId('review-top-similar-link')
      const similar = entityDetailSimilarFixture.top_similar!
      expect(link.getAttribute('href')).toContain(`/assistants/${similar.b_id}`)
    })

    it('renders a deleted-assistant notice instead of a link when b_name is null', async () => {
      const deletedFixture = {
        ...entityDetailSimilarFixture,
        top_similar: {
          ...entityDetailSimilarFixture.top_similar!,
          b_name: null,
        },
      }
      await renderDrawer(deletedFixture as typeof entityDetailSimilarFixture)

      // No link rendered
      expect(screen.queryByTestId('review-top-similar-link')).not.toBeInTheDocument()
      // Deleted notice rendered with b_id text
      const deleted = screen.getByTestId('review-top-similar-deleted')
      expect(deleted).toBeInTheDocument()
      expect(deleted.textContent).toContain(entityDetailSimilarFixture.top_similar!.b_id)
      expect(deleted.textContent).toContain('this assistant no longer exists')
    })
  })

  describe('force-publish override attribution', () => {
    it('renders who overrode, the notice, and each bypassed finding with SeverityChip', async () => {
      await renderDrawer({
        ...entityDetailFixture,
        marketplace_decided_by: 'admin@example.com',
        overridden_by: 'admin@example.com',
        override_notice: 'Approved by exception',
        bypassed_gate_findings: [
          { rule: 'description_length', severity: 'CRITICAL', message: 'Description too short' },
        ],
      })
      expect(screen.getByTestId('review-overridden-by')).toHaveTextContent('admin@example.com')
      expect(screen.getByTestId('review-override-notice')).toHaveTextContent(
        'Approved by exception'
      )
      expect(screen.getByTestId('review-bypassed-finding-description_length')).toBeInTheDocument()
    })

    it('shows an empty state when the override waived nothing', async () => {
      await renderDrawer({
        ...entityDetailFixture,
        overridden_by: 'admin@example.com',
        bypassed_gate_findings: [],
      })
      expect(screen.getByText('No bypassed CRITICAL findings.')).toBeInTheDocument()
    })

    it('says the findings are unknown, not empty, when the gates were unavailable', async () => {
      await renderDrawer({
        ...entityDetailFixture,
        overridden_by: 'admin@example.com',
        bypassed_gate_findings: [],
        bypassed_gate_findings_unavailable: true,
      })
      expect(screen.getByTestId('review-bypassed-findings')).toHaveTextContent(
        'could not be evaluated'
      )
      expect(screen.queryByText('No bypassed CRITICAL findings.')).not.toBeInTheDocument()
    })

    it('renders no override block for an entity that was never force-published', async () => {
      await renderDrawer(entityDetailFixture)
      expect(screen.queryByTestId('review-override')).not.toBeInTheDocument()
    })
  })

  it('renders marketplace_decision_reason on decided entities', async () => {
    await renderDrawer({
      ...entityDetailFixture,
      marketplace_decided_by: 'admin@example.com',
      marketplace_decision_reason: 'approved after review',
    })
    expect(screen.getByTestId('review-decision-reason')).toHaveTextContent('approved after review')
  })

  describe('Decision section (EPMCDME-15056)', () => {
    it('renders the Decision section with verdict label and detail in the cleanup queue', async () => {
      await renderDrawer(entityDetailWithVerdictFixture, { isCleanupQueue: true })

      expect(screen.getByTestId('review-verdict-kind')).toBeInTheDocument()
      // verdictKindLabel('CANDIDATE_FOR_CLEANUP') === 'Cleanup'
      expect(screen.getByTestId('review-verdict-kind')).toHaveTextContent('Cleanup')
      // decision_detail is shown in its own field
      expect(screen.getByTestId('review-decision-detail')).toHaveTextContent(
        'Near-duplicate of Foo Bot (42u vs 3u)'
      )
    })

    it('does not render the Decision section when verdict_kind is absent', async () => {
      // entityDetailFixture carries no verdict fields — the section must be hidden.
      await renderDrawer(entityDetailFixture, { isCleanupQueue: true })

      expect(screen.queryByTestId('review-verdict-kind')).not.toBeInTheDocument()
      expect(screen.queryByTestId('review-decision-detail')).not.toBeInTheDocument()
    })

    it('does not render the Decision section outside the cleanup queue even when verdict_kind is set', async () => {
      await renderDrawer(entityDetailWithVerdictFixture)

      expect(screen.queryByTestId('review-verdict-kind')).not.toBeInTheDocument()
      expect(screen.queryByTestId('review-decision-detail')).not.toBeInTheDocument()
    })
  })

  describe('moderation actions', () => {
    const setupDrawer = async (detail = entityDetailFixture, onActionSuccess = vi.fn()) => {
      apiGet.mockImplementation((url: string) => {
        if (url.endsWith('/prompt')) return Promise.resolve(respondWith(entityPromptFixture))
        return Promise.resolve(respondWith(detail))
      })
      render(
        <AssistantDetailsDrawer
          assistantId={detail.id!}
          onClose={vi.fn()}
          onActionSuccess={onActionSuccess}
        />
      )
      await waitFor(() => expect(screen.getByTestId('review-name')).toBeInTheDocument())
      return { onActionSuccess }
    }

    it('shows Publish and Reject but no Withdraw button for PENDING_REVIEW with no CRITICAL findings', async () => {
      await setupDrawer(pendingNoCriticalFixture)
      expect(screen.getByTestId('drawer-approve-button')).toBeInTheDocument()
      expect(screen.getByTestId('drawer-reject-button')).toBeInTheDocument()
      expect(screen.queryByTestId('drawer-withdraw-button')).not.toBeInTheDocument()
    })

    it('hides action buttons when marketplace_status is APPROVED and is_verified is true', async () => {
      await setupDrawer(approvedVerifiedFixture)
      expect(screen.queryByTestId('drawer-approve-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('drawer-reject-button')).not.toBeInTheDocument()
    })

    it('hides action buttons when marketplace_status is null', async () => {
      await setupDrawer({ ...entityDetailFixture, marketplace_status: null })
      expect(screen.queryByTestId('drawer-approve-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('drawer-reject-button')).not.toBeInTheDocument()
    })

    it('approve: confirmation modal appears; confirming calls store and fires onActionSuccess', async () => {
      const { onActionSuccess } = await setupDrawer(pendingNoCriticalFixture)
      await userEvent.click(screen.getByTestId('drawer-approve-button'))
      expect(screen.getByTestId('drawer-approve-confirm')).toBeInTheDocument()
      await userEvent.click(screen.getByTestId('drawer-approve-confirm'))
      await waitFor(() => expect(onActionSuccess).toHaveBeenCalledTimes(1))
    })

    it('reject: submit disabled until reason within bounds; confirming fires onActionSuccess', async () => {
      const { onActionSuccess } = await setupDrawer()
      await userEvent.click(screen.getByTestId('drawer-reject-button'))
      const submit = screen.getByTestId('drawer-reject-submit')
      expect(submit).toBeDisabled()
      // A single atomic change event, not per-keystroke userEvent.type — the
      // latter proved flaky against this popup's re-render behaviour,
      // truncating the typed value mid-way and leaving submit disabled.
      fireEvent.change(screen.getByTestId('drawer-reject-reason'), {
        target: { value: 'This assistant does not meet the quality bar for the marketplace.' },
      })
      expect(submit).not.toBeDisabled()
      await userEvent.click(submit)
      await waitFor(() => expect(onActionSuccess).toHaveBeenCalledTimes(1))
    })

    it('REJECTED fixture: Force-publish button appears', async () => {
      await setupDrawer(rejectedDetailFixture)
      expect(screen.getByTestId('drawer-force-publish-button')).toBeInTheDocument()
      expect(screen.queryByTestId('drawer-approve-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('drawer-reject-button')).not.toBeInTheDocument()
    })

    it('APPROVED + is_verified fixture: no action buttons appear', async () => {
      await setupDrawer(approvedVerifiedFixture)
      expect(screen.queryByTestId('drawer-approve-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('drawer-reject-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('drawer-force-publish-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('drawer-withdraw-button')).not.toBeInTheDocument()
    })

    it('force-publish popup: submit disabled when reason is under 20 characters', async () => {
      await setupDrawer(rejectedDetailFixture)
      await userEvent.click(screen.getByTestId('drawer-force-publish-button'))
      const submit = screen.getByTestId('drawer-force-publish-submit')
      expect(submit).toBeDisabled()
      await userEvent.type(screen.getByTestId('drawer-force-publish-reason'), 'short')
      expect(submit).toBeDisabled()
    })
  })
})

describe('AssistantDetailsDrawer tabbed layout (EPMCDME-15352)', () => {
  beforeEach(() => {
    apiGet.mockReset()
    marketplaceManagementStore.assessments = {}
    marketplaceManagementStore.entityKind = 'ASSISTANT'
  })

  const setupTabTest = (
    detail = entityDetailWithVerdictFixture,
    props: Partial<Parameters<typeof AssistantDetailsDrawer>[0]> = {}
  ) => {
    apiGet.mockImplementation((url: string) => {
      if (url.endsWith('/prompt')) return Promise.resolve({ json: async () => entityPromptFixture })
      return Promise.resolve({ json: async () => detail })
    })
    render(<AssistantDetailsDrawer assistantId={detail.id!} onClose={() => {}} {...props} />)
  }

  it('renders 3 tabs and Audit results is default when isCleanupQueue=true', async () => {
    setupTabTest(entityDetailWithVerdictFixture, {
      isCleanupQueue: true,
      auditConfig: mockAuditConfig,
    })
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /audit results/i })).toBeInTheDocument()
    )
    expect(screen.getByRole('tab', { name: /assistant details/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /ai assessment/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /audit results/i })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('renders 2 tabs with no Audit results tab when isCleanupQueue=false', async () => {
    setupTabTest(entityDetailFixture)
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /assistant details/i })).toBeInTheDocument()
    )
    expect(screen.queryByRole('tab', { name: /audit results/i })).not.toBeInTheDocument()
  })
})
