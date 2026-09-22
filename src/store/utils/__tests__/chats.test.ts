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

import { describe, expect, it } from 'vitest'

import { transformChatListItemDTO } from '@/store/utils/chats'

const baseDTO = {
  id: 'chat-1',
  name: 'Test Chat',
  folder: null,
  pinned: false,
  date: '2026-01-01T00:00:00Z',
  assistant_ids: [],
  initial_assistant_id: null,
  workflow_id: null,
  is_workflow_conversation: false,
  assistant_icon: null,
  assistant_names: [],
}

describe('transformChatListItemDTO', () => {
  describe('importSource field mapping', () => {
    it('maps a valid import_source value to importSource', () => {
      const result = transformChatListItemDTO({ ...baseDTO, import_source: 'claude_desktop' })
      expect(result.importSource).toBe('claude_desktop')
    })

    it('maps null import_source to null', () => {
      const result = transformChatListItemDTO({ ...baseDTO, import_source: null })
      expect(result.importSource).toBeNull()
    })

    it('maps undefined import_source to null', () => {
      const result = transformChatListItemDTO({ ...baseDTO })
      expect(result.importSource).toBeNull()
    })

    it('maps an unknown import_source string to null', () => {
      const result = transformChatListItemDTO({ ...baseDTO, import_source: 'unknown_source' })
      expect(result.importSource).toBeNull()
      expect(result.isImported).toBe(true)
    })

    it('does not mark a conversation without import_source as imported', () => {
      const result = transformChatListItemDTO({ ...baseDTO, import_source: null })
      expect(result.isImported).toBe(false)
    })

    it('maps all known ImportSourceKind values correctly', () => {
      const knownSources = [
        'claude_desktop',
        'claude_cli',
        'claude_code',
        'codex',
        'gemini',
        'copilot_cli',
        'opencode',
        'pi',
      ] as const
      for (const source of knownSources) {
        const result = transformChatListItemDTO({ ...baseDTO, import_source: source })
        expect(result.importSource).toBe(source)
      }
    })
  })

  describe('iconUrl resolution with importSource', () => {
    it('uses assistant_icon over import display icon', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        import_source: 'claude_desktop',
        assistant_icon: 'https://example.com/icon.png',
      })
      expect(result.iconUrl).toBe('https://example.com/icon.png')
    })

    it('falls back to import display icon when no assistant_icon', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        import_source: 'claude_desktop',
        assistant_icon: null,
      })
      expect(result.iconUrl).toBeTruthy()
      expect(result.iconUrl).not.toBeNull()
    })

    it('resolves icon via legacy folder name when import_source is null', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        import_source: null,
        folder: 'Claude imports',
        assistant_icon: null,
      })
      expect(result.iconUrl).toBeTruthy()
    })
  })

  describe('assistantNames resolution with importSource', () => {
    it('uses import display name when no assistant_names and import_source is set', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        import_source: 'claude_desktop',
        assistant_names: [],
        assistant_icon: null,
      })
      expect(result.assistantNames).toHaveLength(1)
      expect(result.assistantNames?.[0]).toBeTruthy()
    })

    it('prefers assistant_names over import display name', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        import_source: 'claude_desktop',
        assistant_names: ['My Assistant'],
      })
      expect(result.assistantNames).toEqual(['My Assistant'])
    })
  })

  describe('import_source does not bleed into importSource from folder', () => {
    it('does not set importSource from legacy folder name', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        import_source: null,
        folder: 'Claude imports',
      })
      expect(result.importSource).toBeNull()
    })
  })

  describe('initialWorkflowId resolution (EPMCDME-15012)', () => {
    it('uses workflow_id when present', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        is_workflow_conversation: true,
        initial_assistant_id: 'workflow-a',
        workflow_id: 'workflow-a',
      })
      expect(result.initialWorkflowId).toBe('workflow-a')
    })

    it('falls back to initial_assistant_id when workflow_id is missing on a workflow chat (POST /v1/conversations response shape)', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        is_workflow_conversation: true,
        initial_assistant_id: 'workflow-a',
        workflow_id: undefined,
      })
      expect(result.initialWorkflowId).toBe('workflow-a')
    })

    it('stays null when initial_assistant_id is also missing on a workflow chat', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        is_workflow_conversation: true,
        initial_assistant_id: null,
        workflow_id: undefined,
      })
      expect(result.initialWorkflowId).toBeNull()
    })

    it('does not fall back to initial_assistant_id for a non-workflow chat', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        is_workflow_conversation: false,
        initial_assistant_id: 'assistant-a',
        workflow_id: undefined,
      })
      expect(result.initialWorkflowId).toBeNull()
    })
  })

  describe('isLegacyAssistantFolder: folder cleared when folder === name of initial_assistant_id', () => {
    it('clears folder when initial_assistant_id is at index 0 and folder matches name', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        folder: 'Assistant A',
        initial_assistant_id: 'assistant-a',
        assistant_ids: ['assistant-a'],
        assistant_names: ['Assistant A'],
      })
      expect(result.folder).toBeNull()
    })

    it('clears folder when initial_assistant_id is at index 1 and folder matches name at index 1', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        folder: 'Assistant B',
        initial_assistant_id: 'assistant-b',
        assistant_ids: ['assistant-a', 'assistant-b'],
        assistant_names: ['Assistant A', 'Assistant B'],
      })
      expect(result.folder).toBeNull()
    })

    it('keeps folder when folder matches name at index 0 but initial_assistant_id is at a different index', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        folder: 'Assistant A',
        initial_assistant_id: 'assistant-b',
        assistant_ids: ['assistant-a', 'assistant-b'],
        assistant_names: ['Assistant A', 'Assistant B'],
      })
      expect(result.folder).toBe('Assistant A')
    })

    it('keeps folder when it does not match the name of initial_assistant_id', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        folder: 'My Custom Folder',
        initial_assistant_id: 'assistant-a',
        assistant_ids: ['assistant-a'],
        assistant_names: ['Assistant A'],
      })
      expect(result.folder).toBe('My Custom Folder')
    })

    it('keeps folder when initial_assistant_id is not in assistant_ids', () => {
      const result = transformChatListItemDTO({
        ...baseDTO,
        folder: 'Assistant A',
        initial_assistant_id: 'assistant-x',
        assistant_ids: ['assistant-a'],
        assistant_names: ['Assistant A'],
      })
      expect(result.folder).toBe('Assistant A')
    })
  })
})
