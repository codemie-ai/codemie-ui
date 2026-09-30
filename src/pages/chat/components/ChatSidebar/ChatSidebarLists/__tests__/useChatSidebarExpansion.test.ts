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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatListItem } from '@/types/entity/conversation'

import { ChatSidebarLocation, FocusedChatSidebarViewModel } from '../chatSidebarListsHelpers'
import { useChatSidebarExpansion } from '../useChatSidebarExpansion'

const persistenceMock = vi.hoisted(() => ({
  getPersistedSidebarSections: vi.fn(),
  setPersistedSidebarSection: vi.fn(),
  useResyncPersistedSidebarSections: vi.fn(),
}))
vi.mock('../useChatSidebarSectionPersistence', () => persistenceMock)

const createChat = (overrides: Partial<ChatListItem>): ChatListItem => ({
  id: 'chat',
  name: 'Chat',
  folder: null,
  pinned: false,
  date: '2026-07-29T08:00:00.000Z',
  assistantIds: [],
  initialAssistantId: null,
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
  assistantNames: [''],
  ...overrides,
})

const createFocusedViewModel = (
  chatLocations: Record<string, ChatSidebarLocation>
): FocusedChatSidebarViewModel => ({
  pinnedChats: [],
  recentChats: [],
  workflowChats: [],
  groups: [],
  chatLocations,
  assistantHistory: new Map(),
})

const baseParams = (
  overrides: Partial<Parameters<typeof useChatSidebarExpansion>[0]>
): Parameters<typeof useChatSidebarExpansion>[0] => ({
  currentChat: undefined,
  chatLocations: {},
  isChatsLoading: false,
  isFocused: false,
  setIsPinnedExpanded: vi.fn(),
  sidebarSelectedChatIdRef: { current: undefined },
  setActiveFolder: vi.fn(),
  focusedViewModel: createFocusedViewModel({}),
  setFocusedView: vi.fn(),
  setFocusedNavigationSection: vi.fn(),
  ...overrides,
})

describe('useChatSidebarExpansion — Pinned persistence and section defaults (EPMCDME-15211)', () => {
  beforeEach(() => {
    persistenceMock.getPersistedSidebarSections.mockReset().mockReturnValue({
      pinnedExpanded: true,
      recentAssistantsExpanded: true,
    })
    persistenceMock.setPersistedSidebarSection.mockReset()
  })

  it('starts with Recent collapsed and Folders expanded', () => {
    const { result } = renderHook(() => useChatSidebarExpansion(baseParams({})))

    expect(result.current.isRecentExpanded).toBe(false)
    expect(result.current.isFoldersExpanded).toBe(true)
  })

  it('toggles Recent without persisting it', () => {
    const { result } = renderHook(() => useChatSidebarExpansion(baseParams({})))

    act(() => {
      result.current.handleToggleSection('recent')
    })

    expect(result.current.isRecentExpanded).toBe(true)
    expect(result.current.isFoldersExpanded).toBe(false)
    expect(persistenceMock.setPersistedSidebarSection).not.toHaveBeenCalled()
  })

  it("opens the current chat's folder on the first run when the chat is already resolved", () => {
    const setActiveFolder = vi.fn()
    const { result } = renderHook(() =>
      useChatSidebarExpansion(
        baseParams({
          currentChat: createChat({ id: 'chat-1' }),
          chatLocations: { 'chat-1': { section: 'folder', folderName: 'custom:Folder A' } },
          setActiveFolder,
        })
      )
    )

    expect(result.current.isFoldersExpanded).toBe(true)
    expect(result.current.isRecentExpanded).toBe(false)
    expect(setActiveFolder.mock.calls).toEqual([[null], ['custom:Folder A']])
  })

  it('leaves the sections alone for a chat opened from its own sidebar row', () => {
    const setActiveFolder = vi.fn()
    renderHook(() =>
      useChatSidebarExpansion(
        baseParams({
          currentChat: createChat({ id: 'chat-1' }),
          chatLocations: { 'chat-1': { section: 'folder', folderName: 'custom:Folder A' } },
          sidebarSelectedChatIdRef: { current: 'chat-1' },
          setActiveFolder,
        })
      )
    )

    expect(setActiveFolder).not.toHaveBeenCalled()
  })

  it('persists the updated value when handleToggleSection("pinned") is called', () => {
    const setIsPinnedExpanded = vi.fn()
    const { result } = renderHook(() =>
      useChatSidebarExpansion(baseParams({ setIsPinnedExpanded }))
    )

    act(() => {
      result.current.handleToggleSection('pinned')
    })

    // setIsPinnedExpanded is called with the functional-updater form (not a precomputed boolean)
    // so two synchronous toggles in the same tick each flip the real previous value.
    expect(setIsPinnedExpanded).toHaveBeenCalledTimes(1)
    const updater = setIsPinnedExpanded.mock.calls[0][0] as (value: boolean) => boolean
    expect(updater(true)).toBe(false)
    expect(persistenceMock.setPersistedSidebarSection).toHaveBeenCalledWith({
      pinnedExpanded: false,
    })
  })

  it('handleToggleSection("pinned") flips the real previous value on each call, even when fired twice synchronously', () => {
    const setIsPinnedExpanded = vi.fn()
    const { result } = renderHook(() =>
      useChatSidebarExpansion(baseParams({ setIsPinnedExpanded }))
    )

    act(() => {
      result.current.handleToggleSection('pinned')
      result.current.handleToggleSection('pinned')
    })

    expect(setIsPinnedExpanded).toHaveBeenCalledTimes(2)
    const firstUpdater = setIsPinnedExpanded.mock.calls[0][0] as (value: boolean) => boolean
    const secondUpdater = setIsPinnedExpanded.mock.calls[1][0] as (value: boolean) => boolean
    // Simulates React applying both updaters against the real, evolving previous value.
    const afterFirst = firstUpdater(true)
    const afterSecond = secondUpdater(afterFirst)
    expect(afterFirst).toBe(false)
    expect(afterSecond).toBe(true)
  })
})

describe('useChatSidebarExpansion — Focused view resolves the current chat drilldown (EPMCDME-15211)', () => {
  it('opens the folder drilldown for the resolved chat on mount', () => {
    const currentChat = createChat({ id: 'chat-1' })
    const setFocusedView = vi.fn()
    const setFocusedNavigationSection = vi.fn()
    const focusedViewModel = createFocusedViewModel({
      'chat-1': { section: 'folder', folderName: 'custom:Folder A' },
    })

    renderHook(() =>
      useChatSidebarExpansion(
        baseParams({
          currentChat,
          isFocused: true,
          focusedViewModel,
          setFocusedView,
          setFocusedNavigationSection,
        })
      )
    )

    expect(setFocusedView).toHaveBeenCalledWith({
      type: 'folder',
      name: 'custom:Folder A',
      targetChatId: 'chat-1',
    })
    expect(setFocusedNavigationSection).toHaveBeenCalledWith(null)
  })

  it('does not resolve again on a re-render with the same currentChat.id', () => {
    const currentChat = createChat({ id: 'chat-1' })
    const setFocusedView = vi.fn()
    const setFocusedNavigationSection = vi.fn()
    const focusedViewModel = createFocusedViewModel({
      'chat-1': { section: 'folder', folderName: 'custom:Folder A' },
    })

    const { rerender } = renderHook(
      (props: { isChatsLoading: boolean }) =>
        useChatSidebarExpansion(
          baseParams({
            currentChat,
            isFocused: true,
            focusedViewModel,
            setFocusedView,
            setFocusedNavigationSection,
            isChatsLoading: props.isChatsLoading,
          })
        ),
      { initialProps: { isChatsLoading: false } }
    )

    expect(setFocusedView).toHaveBeenCalledTimes(1)

    rerender({ isChatsLoading: true })

    expect(setFocusedView).toHaveBeenCalledTimes(1)
    expect(setFocusedNavigationSection).toHaveBeenCalledTimes(1)
  })

  it('re-resolves the drilldown when currentChat changes without an isFocused edge (CR-002)', () => {
    const chatOne = createChat({ id: 'chat-1' })
    const chatTwo = createChat({ id: 'chat-2' })
    const setFocusedView = vi.fn()
    const setFocusedNavigationSection = vi.fn()
    const focusedViewModel = createFocusedViewModel({
      'chat-1': { section: 'folder', folderName: 'custom:Folder A' },
      'chat-2': { section: 'folder', folderName: 'custom:Folder B' },
    })

    const { rerender } = renderHook(
      (props: { currentChat: ChatListItem }) =>
        useChatSidebarExpansion(
          baseParams({
            currentChat: props.currentChat,
            isFocused: true,
            focusedViewModel,
            setFocusedView,
            setFocusedNavigationSection,
          })
        ),
      { initialProps: { currentChat: chatOne } }
    )

    expect(setFocusedView).toHaveBeenLastCalledWith({
      type: 'folder',
      name: 'custom:Folder A',
      targetChatId: 'chat-1',
    })

    // isFocused stays true throughout — e.g. a page change that never toggles sidebar mode.
    rerender({ currentChat: chatTwo })

    expect(setFocusedView).toHaveBeenLastCalledWith({
      type: 'folder',
      name: 'custom:Folder B',
      targetChatId: 'chat-2',
    })
  })

  it('retries the drilldown once chatLocations finishes loading instead of locking onto a partial result (CR-003)', () => {
    const currentChat = createChat({ id: 'chat-1' })
    const setFocusedView = vi.fn()
    const setFocusedNavigationSection = vi.fn()
    const incompleteViewModel = createFocusedViewModel({})
    const completeViewModel = createFocusedViewModel({
      'chat-1': { section: 'folder', folderName: 'custom:Folder A' },
    })

    const { rerender } = renderHook(
      (props: { isChatsLoading: boolean; focusedViewModel: FocusedChatSidebarViewModel }) =>
        useChatSidebarExpansion(
          baseParams({
            currentChat,
            isFocused: true,
            focusedViewModel: props.focusedViewModel,
            setFocusedView,
            setFocusedNavigationSection,
            isChatsLoading: props.isChatsLoading,
          })
        ),
      { initialProps: { isChatsLoading: true, focusedViewModel: incompleteViewModel } }
    )

    // chatLocations hasn't loaded this chat yet — nothing is resolved, and nothing locks in.
    expect(setFocusedView).not.toHaveBeenCalled()

    rerender({ isChatsLoading: false, focusedViewModel: completeViewModel })

    expect(setFocusedView).toHaveBeenLastCalledWith({
      type: 'folder',
      name: 'custom:Folder A',
      targetChatId: 'chat-1',
    })

    // Now locked in: a further isChatsLoading flip must not re-resolve.
    const callsAfterLock = setFocusedView.mock.calls.length
    rerender({ isChatsLoading: true, focusedViewModel: completeViewModel })
    expect(setFocusedView.mock.calls.length).toBe(callsAfterLock)
  })

  it('does not lock onto the root view before the chat list fetch has started', () => {
    // isChatsLoading is still false before loading begins, with an empty chatLocations map.
    const currentChat = createChat({ id: 'chat-1' })
    const setFocusedView = vi.fn()

    const { rerender } = renderHook(
      (props: { focusedViewModel: FocusedChatSidebarViewModel }) =>
        useChatSidebarExpansion(
          baseParams({
            currentChat,
            isFocused: true,
            focusedViewModel: props.focusedViewModel,
            setFocusedView,
          })
        ),
      { initialProps: { focusedViewModel: createFocusedViewModel({}) } }
    )

    expect(setFocusedView).not.toHaveBeenCalled()

    rerender({
      focusedViewModel: createFocusedViewModel({
        'chat-1': { section: 'folder', folderName: 'custom:Folder A' },
      }),
    })

    expect(setFocusedView).toHaveBeenLastCalledWith({
      type: 'folder',
      name: 'custom:Folder A',
      targetChatId: 'chat-1',
    })
  })

  it('does not drill down for a chat opened from its own sidebar row', () => {
    const setFocusedView = vi.fn()

    renderHook(() =>
      useChatSidebarExpansion(
        baseParams({
          currentChat: createChat({ id: 'chat-1' }),
          isFocused: true,
          focusedViewModel: createFocusedViewModel({
            'chat-1': { section: 'folder', folderName: 'custom:Folder A' },
          }),
          sidebarSelectedChatIdRef: { current: 'chat-1' },
          setFocusedView,
        })
      )
    )

    expect(setFocusedView).not.toHaveBeenCalled()
  })
})
