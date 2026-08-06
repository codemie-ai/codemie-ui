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

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CHAT_CONFIG_DEFAULT_WIDTH } from '../chatConfigWidth'
import { useChatConfigResize } from '../useChatConfigResize'

import type { PanelImperativeHandle, PanelSize } from 'react-resizable-panels'

const makeMockPanel = (): PanelImperativeHandle =>
  ({
    collapse: vi.fn(),
    expand: vi.fn(),
    resize: vi.fn(),
    isCollapsed: vi.fn().mockReturnValue(false),
    isExpanded: vi.fn().mockReturnValue(true),
    getSize: vi.fn().mockReturnValue({ inPixels: 384, percentage: 25, sizeStyle: '384px' }),
    getId: vi.fn().mockReturnValue('chat-config'),
  } as unknown as PanelImperativeHandle)

describe('useChatConfigResize', () => {
  let mockOnClose: ReturnType<typeof vi.fn>
  let mockOnOpen: ReturnType<typeof vi.fn>
  let mockPanel: PanelImperativeHandle

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnClose = vi.fn()
    mockOnOpen = vi.fn()
    mockPanel = makeMockPanel()
  })

  it('handleResize calls onClose when panel collapses to 0px while visible', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: true, onClose: mockOnClose, onOpen: mockOnOpen })
    )

    act(() => {
      result.current.handleResize({
        inPixels: 0,
        percentage: 0,
        sizeStyle: '0px',
      } as unknown as PanelSize)
    })

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('handleResize does NOT call onClose for non-zero width when panel is visible', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: true, onClose: mockOnClose, onOpen: mockOnOpen })
    )

    act(() => {
      result.current.handleResize({
        inPixels: 500,
        percentage: 35,
        sizeStyle: '500px',
      } as unknown as PanelSize)
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('handleResize calls onOpen when panel expands from collapsed state', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: false, onClose: mockOnClose, onOpen: mockOnOpen })
    )

    act(() => {
      result.current.handleResize({
        inPixels: 300,
        percentage: 20,
        sizeStyle: '300px',
      } as unknown as PanelSize)
    })

    expect(mockOnOpen).toHaveBeenCalledOnce()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('handleResize does NOT call onOpen when panel is already visible', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: true, onClose: mockOnClose, onOpen: mockOnOpen })
    )

    act(() => {
      result.current.handleResize({
        inPixels: 500,
        percentage: 35,
        sizeStyle: '500px',
      } as unknown as PanelSize)
    })

    expect(mockOnOpen).not.toHaveBeenCalled()
  })

  it('handleResize is a no-op when panel is already collapsed (inPixels=0, isConfigVisible=false)', () => {
    const { result } = renderHook(() =>
      useChatConfigResize({ isConfigVisible: false, onClose: mockOnClose, onOpen: mockOnOpen })
    )

    act(() => {
      result.current.handleResize({
        inPixels: 0,
        percentage: 0,
        sizeStyle: '0px',
      } as unknown as PanelSize)
    })

    expect(mockOnClose).not.toHaveBeenCalled()
    expect(mockOnOpen).not.toHaveBeenCalled()
  })

  it('resizes panel to DEFAULT_WIDTH when isConfigVisible changes to true and panel is collapsed', () => {
    vi.mocked(mockPanel.isCollapsed).mockReturnValue(true)

    const { result, rerender } = renderHook(
      ({ isVisible }: { isVisible: boolean }) =>
        useChatConfigResize({
          isConfigVisible: isVisible,
          onClose: mockOnClose,
          onOpen: mockOnOpen,
        }),
      { initialProps: { isVisible: false } }
    )

    result.current.panelRef.current = mockPanel

    act(() => {
      rerender({ isVisible: true })
    })

    expect(mockPanel.resize).toHaveBeenCalledWith(CHAT_CONFIG_DEFAULT_WIDTH)
  })

  it('collapses panel when isConfigVisible changes to false and panel is expanded', () => {
    vi.mocked(mockPanel.isCollapsed).mockReturnValue(false)

    const { result, rerender } = renderHook(
      ({ isVisible }: { isVisible: boolean }) =>
        useChatConfigResize({
          isConfigVisible: isVisible,
          onClose: mockOnClose,
          onOpen: mockOnOpen,
        }),
      { initialProps: { isVisible: true } }
    )

    result.current.panelRef.current = mockPanel

    act(() => {
      rerender({ isVisible: false })
    })

    expect(mockPanel.collapse).toHaveBeenCalled()
  })

  it('does not resize an already-expanded panel when isConfigVisible becomes true', () => {
    vi.mocked(mockPanel.isCollapsed).mockReturnValue(false)

    const { result, rerender } = renderHook(
      ({ isVisible }: { isVisible: boolean }) =>
        useChatConfigResize({
          isConfigVisible: isVisible,
          onClose: mockOnClose,
          onOpen: mockOnOpen,
        }),
      { initialProps: { isVisible: false } }
    )

    result.current.panelRef.current = mockPanel

    act(() => {
      rerender({ isVisible: true })
    })

    expect(mockPanel.resize).not.toHaveBeenCalled()
    expect(mockPanel.expand).not.toHaveBeenCalled()
  })

  it('does not collapse an already-collapsed panel when isConfigVisible becomes false', () => {
    vi.mocked(mockPanel.isCollapsed).mockReturnValue(true)

    const { result, rerender } = renderHook(
      ({ isVisible }: { isVisible: boolean }) =>
        useChatConfigResize({
          isConfigVisible: isVisible,
          onClose: mockOnClose,
          onOpen: mockOnOpen,
        }),
      { initialProps: { isVisible: true } }
    )

    result.current.panelRef.current = mockPanel

    act(() => {
      rerender({ isVisible: false })
    })

    expect(mockPanel.collapse).not.toHaveBeenCalled()
  })
})
