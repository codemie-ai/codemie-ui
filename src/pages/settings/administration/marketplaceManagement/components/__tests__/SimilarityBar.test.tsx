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

import SimilarityBar from '../SimilarityBar'

const thresholds = { critical: 0.9, optional: 0.7 }

describe('SimilarityBar', () => {
  it('uses failed color when score is at or above the critical threshold', () => {
    render(<SimilarityBar topSimilarScore={0.95} thresholds={thresholds} />)
    expect(screen.getByTestId('similarity-bar-fill')).toHaveClass('bg-failed-secondary')
  })

  it('uses warning color when score is between optional and critical thresholds', () => {
    render(<SimilarityBar topSimilarScore={0.8} thresholds={thresholds} />)
    expect(screen.getByTestId('similarity-bar-fill')).toHaveClass('bg-aborted-primary')
  })

  it('uses success color when score is below the optional threshold', () => {
    render(<SimilarityBar topSimilarScore={0.5} thresholds={thresholds} />)
    expect(screen.getByTestId('similarity-bar-fill')).toHaveClass('bg-success-primary')
  })

  it('shows a placeholder when thresholds is null', () => {
    render(<SimilarityBar topSimilarScore={0.8} thresholds={null} />)
    expect(screen.getByTestId('similarity-bar-placeholder')).toBeInTheDocument()
    expect(screen.queryByTestId('similarity-bar-fill')).not.toBeInTheDocument()
  })

  it('shows an empty bar (no fill) when topSimilarScore is null but thresholds are present', () => {
    render(<SimilarityBar topSimilarScore={null} thresholds={thresholds} />)
    expect(screen.queryByTestId('similarity-bar-placeholder')).not.toBeInTheDocument()
    expect(screen.queryByTestId('similarity-bar-fill')).not.toBeInTheDocument()
  })

  it('shows a placeholder when both props are null', () => {
    render(<SimilarityBar topSimilarScore={null} thresholds={null} />)
    expect(screen.getByTestId('similarity-bar-placeholder')).toBeInTheDocument()
  })

  it('clamps the fill width to 100% for a score above 1', () => {
    render(<SimilarityBar topSimilarScore={1.5} thresholds={thresholds} />)
    const fill = screen.getByTestId('similarity-bar-fill')
    expect(fill).toHaveStyle({ width: '100%' })
  })
})
