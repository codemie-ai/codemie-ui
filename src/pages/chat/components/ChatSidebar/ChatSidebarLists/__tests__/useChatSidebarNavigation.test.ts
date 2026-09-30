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

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useChatSidebarNavigation } from '../useChatSidebarNavigation'

const baseParams = (overrides: Partial<Parameters<typeof useChatSidebarNavigation>[0]>) => ({
  ref: { current: null },
  isFocused: false,
  focusedViewModel: {
    pinnedChats: [],
    recentChats: [],
    workflowChats: [],
    groups: [],
    chatLocations: {},
    assistantHistory: new Map(),
  },
  chatLocations: {},
  setFocusedView: vi.fn(),
  setFocusedNavigationSection: vi.fn(),
  setRecentExpanded: vi.fn(),
  setWorkflowRunsExpanded: vi.fn(),
  setFoldersExpanded: vi.fn(),
  setActiveFolder: vi.fn(),
  setDisableAccordionAnimation: vi.fn(),
  revealPinnedChat: vi.fn(),
  ...overrides,
})

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

const nextFrames = (count: number): Promise<void> =>
  count === 0 ? Promise.resolve() : nextFrame().then(() => nextFrames(count - 1))

const flushScrollFrames = async () => {
  // revealChat waits two frames, then runs one step per frame.
  await act(() => nextFrames(6))
}

const rect = (top: number, bottom: number) => ({ top, bottom } as DOMRect)

// Places the element inside a scroll container, below its visible area, so revealChat has to
// scroll it into view.
const mountOutOfView = <T extends HTMLElement>(element: T): T => {
  const container = document.createElement('div')
  container.style.overflowY = 'auto'
  container.getBoundingClientRect = () => rect(0, 100)
  element.getBoundingClientRect = () => rect(200, 230)
  element.scrollIntoView = vi.fn()
  container.appendChild(element)
  document.body.appendChild(container)
  return element
}

describe('useChatSidebarNavigation — revealChat exposed directly on the hook (EPMCDME-15211)', () => {
  it('scrolls the element registered via registerChatElement for the given chat id', async () => {
    const { result } = renderHook(() => useChatSidebarNavigation(baseParams({})))
    const element = mountOutOfView(document.createElement('li'))

    act(() => {
      result.current.registerChatElement('chat-1', element)
    })
    act(() => {
      result.current.revealChat('chat-1')
    })
    await flushScrollFrames()

    expect(element.scrollIntoView).toHaveBeenCalled()
  })

  it("falls back to the chat's own folder element when its row is not registered", async () => {
    const { result } = renderHook(() =>
      useChatSidebarNavigation(
        baseParams({
          chatLocations: { 'chat-1': { section: 'folder', folderName: 'custom:Folder A' } },
        })
      )
    )
    const element = mountOutOfView(document.createElement('div'))

    act(() => {
      result.current.registerFolderElement('custom:Folder A', element)
    })
    act(() => {
      result.current.revealChat('chat-1')
    })
    await flushScrollFrames()

    expect(element.scrollIntoView).toHaveBeenCalled()
  })

  it('does not fall back to an unrelated folder that happens to share the chat id', async () => {
    const { result } = renderHook(() => useChatSidebarNavigation(baseParams({})))
    const element = mountOutOfView(document.createElement('div'))

    act(() => {
      // Registered under a folder key equal to the chat id — must not be treated as the chat's
      // folder without a real chatLocations/focusedViewModel entry saying so.
      result.current.registerFolderElement('chat-1', element)
    })
    act(() => {
      result.current.revealChat('chat-1')
    })
    await flushScrollFrames()

    expect(element.scrollIntoView).not.toHaveBeenCalled()
  })

  it('reports found=true via onComplete once the element resolves (CR-008)', async () => {
    const { result } = renderHook(() => useChatSidebarNavigation(baseParams({})))
    const element = document.createElement('li')
    element.scrollIntoView = vi.fn()
    const onComplete = vi.fn()

    act(() => {
      result.current.registerChatElement('chat-1', element)
    })
    act(() => {
      result.current.revealChat('chat-1', onComplete)
    })
    await flushScrollFrames()

    expect(onComplete).toHaveBeenCalledWith(true)
  })

  it('reports found=false via onComplete when neither the chat nor its folder element is registered (CR-008)', async () => {
    const { result } = renderHook(() => useChatSidebarNavigation(baseParams({})))
    const onComplete = vi.fn()

    act(() => {
      result.current.revealChat('chat-1', onComplete)
    })
    await flushScrollFrames()

    expect(onComplete).toHaveBeenCalledWith(false)
  })

  it('leaves a row that is already in view where it is', async () => {
    const { result } = renderHook(() => useChatSidebarNavigation(baseParams({})))
    const element = mountOutOfView(document.createElement('li'))
    element.getBoundingClientRect = () => rect(10, 40)

    act(() => {
      result.current.registerChatElement('chat-1', element)
    })
    act(() => {
      result.current.revealChat('chat-1')
    })
    await flushScrollFrames()

    expect(element.scrollIntoView).not.toHaveBeenCalled()
  })
})
