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

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import DiffCanvasControls from '../DiffCanvasControls'

const { mockFitView, mockUseNodesInitialized, storeSize } = vi.hoisted(() => ({
  mockFitView: vi.fn(),
  mockUseNodesInitialized: vi.fn(() => true),
  storeSize: { width: 800, height: 600 },
}))

vi.mock('@xyflow/react', () => ({
  Controls: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="controls">{children}</div>
  ),
  useReactFlow: () => ({
    fitView: mockFitView,
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    getNodes: () => [{ id: 'n1' }],
  }),
  useUpdateNodeInternals: () => vi.fn(),
  useNodesInitialized: () => mockUseNodesInitialized(),
  useStore: (selector: (state: { width: number; height: number }) => number) =>
    selector({ width: storeSize.width, height: storeSize.height }),
}))

vi.mock('../CanvasControlButton', () => ({
  default: ({ title }: { title: string }) => <button type="button">{title}</button>,
}))

beforeEach(() => {
  mockFitView.mockClear()
  mockUseNodesInitialized.mockReturnValue(true)
  storeSize.width = 800
  storeSize.height = 600
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('DiffCanvasControls', () => {
  it('fits the view when the popup is active and the store has a size', () => {
    vi.useFakeTimers()
    render(<DiffCanvasControls isActive />)

    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.15, maxZoom: 1 })
    vi.advanceTimersByTime(150)
    expect(mockFitView).toHaveBeenCalledTimes(2)
    expect(mockFitView).toHaveBeenLastCalledWith({ padding: 0.15, maxZoom: 1 })
  })

  it('does not fit the view while inactive', () => {
    render(<DiffCanvasControls isActive={false} />)
    expect(mockFitView).not.toHaveBeenCalled()
  })
})
