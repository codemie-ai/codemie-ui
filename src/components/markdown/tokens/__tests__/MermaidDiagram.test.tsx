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

import { render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MermaidDiagram from '../MermaidDiagram'

const { mockUseMermaidEnabled, mockGetMermaidFile } = vi.hoisted(() => ({
  mockUseMermaidEnabled: vi.fn(),
  mockGetMermaidFile: vi.fn().mockResolvedValue('<svg><text>Test Diagram</text></svg>'),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useMermaidEnabled: mockUseMermaidEnabled,
}))

vi.mock('@/store/files', () => ({
  filesStore: {
    getMermaidFile: mockGetMermaidFile,
  },
}))

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/file.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/view.svg?react', () => ({ default: () => <svg /> }))

vi.mock('@/components/ZoomableImage', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}))
vi.mock('@/components/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('@/components/CodeBlock/CodeBlock', () => ({
  default: ({ text }: any) => <div data-testid="code-block">{text}</div>,
}))
vi.mock('../MermaidCodePopup', () => ({ default: () => null }))

vi.mock('dompurify', () => ({
  default: { sanitize: (_input: string) => _input },
}))

vi.mock('@/components/markdown/Markdown.utils', () => ({
  unSanitizeMessage: (s: string) => s,
}))

vi.mock('@/constants', () => ({
  ButtonType: { TERTIARY: 'tertiary' },
  ButtonSize: { MEDIUM: 'medium' },
}))

describe('MermaidDiagram — mermaid feature-flag gating', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetMermaidFile.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not request a render and shows source when Mermaid is unavailable', async () => {
    mockUseMermaidEnabled.mockReturnValue([false, true])

    render(<MermaidDiagram code="graph TD; A-->B" />)

    await act(async () => {
      vi.advanceTimersByTime(350)
      await Promise.resolve()
    })

    expect(mockGetMermaidFile).not.toHaveBeenCalled()
    expect(screen.queryByText('Loading diagram...')).not.toBeInTheDocument()
    expect(screen.getByTestId('code-block')).toBeInTheDocument()
  })

  it('still requests a render when Mermaid is available (regression)', async () => {
    mockUseMermaidEnabled.mockReturnValue([true, true])

    render(<MermaidDiagram code="graph TD; A-->B" />)

    await act(async () => {
      vi.advanceTimersByTime(350)
      await Promise.resolve()
    })

    expect(mockGetMermaidFile).toHaveBeenCalled()
  })
})
