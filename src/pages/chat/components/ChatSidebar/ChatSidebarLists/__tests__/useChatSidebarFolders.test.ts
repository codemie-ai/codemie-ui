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

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChatListItem } from '@/types/entity/conversation'

import { useChatSidebarFolders } from '../useChatSidebarFolders'

const createChat = (overrides: Partial<ChatListItem>): ChatListItem => ({
  id: 'chat',
  name: 'Chat',
  folder: 'Release workflows',
  pinned: false,
  date: '2026-07-29T08:00:00.000Z',
  assistantIds: [],
  initialAssistantId: null,
  initialWorkflowId: 'workflow-a',
  isGroup: false,
  isWorkflow: true,
  assistantNames: [''],
  ...overrides,
})

describe('useChatSidebarFolders — folderKinds workflow override (EPMCDME-15012)', () => {
  it('classifies a workflow-only folder as workflow instead of custom', () => {
    const foldersToChatsMap = {
      'custom:Release workflows': [createChat({ id: 'run-1' })],
    }

    const { result } = renderHook(() =>
      useChatSidebarFolders({ chatFolders: [], foldersToChatsMap })
    )

    expect(result.current.folderKinds['custom:Release workflows']).toBe('workflow')
  })

  it('keeps a folder mixing a workflow chat with a regular chat classified as custom', () => {
    const foldersToChatsMap = {
      'custom:Release workflows': [
        createChat({ id: 'run-1' }),
        createChat({ id: 'regular', isWorkflow: false, initialWorkflowId: null }),
      ],
    }

    const { result } = renderHook(() =>
      useChatSidebarFolders({ chatFolders: [], foldersToChatsMap })
    )

    expect(result.current.folderKinds['custom:Release workflows']).toBe('custom')
  })
})

describe('useChatSidebarFolders — folder sort grouping (EPMCDME-15165)', () => {
  it('ranks a folder holding chats above a freshly created empty folder', () => {
    const chatFolders = [
      { name: 'Folder A', updateDate: '2026-08-01T09:00:00.000Z' } as never,
      { name: 'Folder B', updateDate: '2026-07-01T09:00:00.000Z' } as never,
    ]
    const foldersToChatsMap = {
      'custom:Folder B': [createChat({ id: 'chat-1', updateDate: '2026-07-01T09:00:00.000Z' })],
    }

    const { result } = renderHook(() => useChatSidebarFolders({ chatFolders, foldersToChatsMap }))

    expect(result.current.folders).toEqual(['custom:Folder B', 'custom:Folder A'])
  })
})

describe('useChatSidebarFolders — agent-named duplicate folders (EPMCDME-16623)', () => {
  const run = (names: string[], foldersToChatsMap: Record<string, ChatListItem[]>) =>
    renderHook(() =>
      useChatSidebarFolders({
        chatFolders: names.map((name) => ({ name } as never)),
        foldersToChatsMap,
      })
    ).result.current.folders

  it.each([
    ['codex', 'codex'],
    ['gemini', 'gemini'],
    ['copilot-cli', 'copilot_cli'],
    ['opencode', 'opencode'],
    ['pi', 'pi'],
    ['kimi', 'kimi'],
  ])('shows only import:%s when registered folder is empty', (name, kind) => {
    const folders = run([name], { [`import:${kind}`]: [createChat({ id: 'a' })] })
    expect(folders).toEqual([`import:${kind}`])
  })

  it('drops an empty registered agent-named folder', () => {
    expect(run(['gemini'], {})).toEqual([])
  })

  it('hides Gemini and Copilot_CLI when empty', () => {
    expect(run(['Gemini', 'Copilot_CLI'], {})).toEqual([])
  })

  it('keeps custom:gemini when it holds chats', () => {
    const folders = run(['gemini'], { 'custom:gemini': [createChat({ id: 'a' })] })
    expect(folders).toContain('custom:gemini')
  })

  it('keeps an empty non-agent folder', () => {
    expect(run(['my-folder'], {})).toEqual(['custom:my-folder'])
  })
})
