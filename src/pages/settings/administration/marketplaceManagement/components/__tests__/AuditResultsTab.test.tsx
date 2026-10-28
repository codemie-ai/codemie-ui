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
import { describe, expect, it } from 'vitest'

import { entityDetailWithVerdictFixture } from '@/test-utils/fixtures/marketplace'
import type { AuditConfigResponse } from '@/types/generated/marketplaceManagement'

import AuditResultsTab from '../AuditResultsTab'

const mockAuditConfig: AuditConfigResponse = {
  gates: {} as AuditConfigResponse['gates'],
  similarity: {
    thresholds: { report_threshold: 0.5, optional: 0.7, critical: 0.9 },
  } as unknown as AuditConfigResponse['similarity'],
  usage_tiers: { hot_percentile: 75, warm_percentile: 50, cold_percentile: 25 },
  verification: {} as AuditConfigResponse['verification'],
}

describe('AuditResultsTab', () => {
  it('renders all 6 audit section headings', () => {
    render(
      <AuditResultsTab detail={entityDetailWithVerdictFixture} auditConfig={mockAuditConfig} />
    )
    const headings = screen.getAllByRole('heading').map((h) => h.textContent?.toLowerCase() ?? '')
    expect(headings.some((h) => h.includes('decision'))).toBe(true)
    expect(headings.some((h) => h.includes('usage'))).toBe(true)
    expect(headings.some((h) => h.includes('similarity'))).toBe(true)
    expect(headings.some((h) => h.includes('core'))).toBe(true)
    expect(headings.some((h) => h.includes('polish'))).toBe(true)
    expect(headings.some((h) => h.includes('default'))).toBe(true)
  })

  it('shows failing indicator for a failing polish check (categories: false)', () => {
    // entityDetailWithVerdictFixture has categories.passed=false
    render(
      <AuditResultsTab detail={entityDetailWithVerdictFixture} auditConfig={mockAuditConfig} />
    )
    const categoriesRow = screen.getByTestId('polish-check-categories')
    expect(categoriesRow).toHaveAttribute('data-passed', 'false')
  })

  it('shows passing indicator for a passing polish check (description: true)', () => {
    render(
      <AuditResultsTab detail={entityDetailWithVerdictFixture} auditConfig={mockAuditConfig} />
    )
    const descriptionRow = screen.getByTestId('polish-check-description')
    expect(descriptionRow).toHaveAttribute('data-passed', 'true')
  })

  it('renders all 4 polish check rows in unavailable state when polish_check_results is null', () => {
    const detailWithoutPolish = { ...entityDetailWithVerdictFixture, polish_check_results: null }
    render(<AuditResultsTab detail={detailWithoutPolish} auditConfig={mockAuditConfig} />)
    expect(screen.getByTestId('polish-check-description')).toHaveAttribute(
      'data-passed',
      'unavailable'
    )
    expect(screen.getByTestId('polish-check-categories')).toHaveAttribute(
      'data-passed',
      'unavailable'
    )
    expect(screen.getByTestId('polish-check-icon')).toHaveAttribute('data-passed', 'unavailable')
    expect(screen.getByTestId('polish-check-starters')).toHaveAttribute(
      'data-passed',
      'unavailable'
    )
  })

  it('renders similarity placeholder when auditConfig is null', () => {
    render(<AuditResultsTab detail={entityDetailWithVerdictFixture} auditConfig={null} />)
    expect(screen.getByTestId('similarity-bar-placeholder')).toBeInTheDocument()
  })

  it('does not crash when gate_findings is an empty array', () => {
    const detailNoFindings = { ...entityDetailWithVerdictFixture, gate_findings: [] }
    render(<AuditResultsTab detail={detailNoFindings} auditConfig={mockAuditConfig} />)
    // All 6 sections still render
    const headings = screen.getAllByRole('heading').map((h) => h.textContent?.toLowerCase() ?? '')
    expect(headings.some((h) => h.includes('core'))).toBe(true)
  })

  describe('Quality rule findings — always-visible badges', () => {
    it('renders all 4 quality gate badges regardless of findings', () => {
      const detailNoFindings = { ...entityDetailWithVerdictFixture, gate_findings: [] }
      render(<AuditResultsTab detail={detailNoFindings} auditConfig={mockAuditConfig} />)
      expect(screen.getByTestId('quality-gate-name_length')).toBeInTheDocument()
      expect(screen.getByTestId('quality-gate-name_not_banned')).toBeInTheDocument()
      expect(screen.getByTestId('quality-gate-at_least_one_category')).toBeInTheDocument()
      expect(screen.getByTestId('quality-gate-no_inline_credentials')).toBeInTheDocument()
    })

    it('shows all 4 gates as passed when gate_findings is empty', () => {
      const detailNoFindings = { ...entityDetailWithVerdictFixture, gate_findings: [] }
      render(<AuditResultsTab detail={detailNoFindings} auditConfig={mockAuditConfig} />)
      expect(screen.getByTestId('quality-gate-name_length')).toHaveAttribute('data-passed', 'true')
      expect(screen.getByTestId('quality-gate-name_not_banned')).toHaveAttribute(
        'data-passed',
        'true'
      )
      expect(screen.getByTestId('quality-gate-at_least_one_category')).toHaveAttribute(
        'data-passed',
        'true'
      )
      expect(screen.getByTestId('quality-gate-no_inline_credentials')).toHaveAttribute(
        'data-passed',
        'true'
      )
    })

    it('marks a gate as failed when a finding is present', () => {
      const detailWithFinding = {
        ...entityDetailWithVerdictFixture,
        gate_findings: [
          ...(entityDetailWithVerdictFixture.gate_findings ?? []),
          {
            rule: 'name_not_banned',
            severity: 'CRITICAL',
            message: "Name 'AI Assistant' matches a banned generic name.",
          },
        ],
      }
      render(<AuditResultsTab detail={detailWithFinding} auditConfig={mockAuditConfig} />)
      expect(screen.getByTestId('quality-gate-name_not_banned')).toHaveAttribute(
        'data-passed',
        'false'
      )
    })

    it('does not crash when gate_findings contains rules outside the constant (e.g. description_not_equal_name)', () => {
      const detailWithOther = {
        ...entityDetailWithVerdictFixture,
        gate_findings: [
          {
            rule: 'description_not_equal_name',
            severity: 'OPTIONAL',
            message: 'Description is identical to name — add substance.',
          },
        ],
      }
      render(<AuditResultsTab detail={detailWithOther} auditConfig={mockAuditConfig} />)
      const headings = screen.getAllByRole('heading').map((h) => h.textContent?.toLowerCase() ?? '')
      expect(headings.some((h) => h.includes('default'))).toBe(true)
    })
  })
})
