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

import { describe, it, expect, beforeEach } from 'vitest'

import { sweepOrphanedChatKeys } from '../chatStorageUtils'

const USER = 'user-1'
const OTHER = 'user-2'

beforeEach(() => localStorage.clear())

describe('sweepOrphanedChatKeys', () => {
  describe('empty-value sweep (no validChatIds)', () => {
    it('removes chat-skills key whose value is []', () => {
      localStorage.setItem(`${USER}_chat-skills-chat-1`, '[]')
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-skills-chat-1`)).toBeNull()
    })

    it('keeps chat-skills key whose value is non-empty', () => {
      localStorage.setItem(`${USER}_chat-skills-chat-1`, '[{"value":"skill-a"}]')
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-skills-chat-1`)).not.toBeNull()
    })

    it('removes chat-tools-config key whose both properties are null', () => {
      localStorage.setItem(
        `${USER}_chat-tools-config-chat-1`,
        '{"enableWebSearch":null,"enableCodeInterpreter":null}'
      )
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-tools-config-chat-1`)).toBeNull()
    })

    it('keeps chat-tools-config key when enableWebSearch is non-null', () => {
      localStorage.setItem(
        `${USER}_chat-tools-config-chat-1`,
        '{"enableWebSearch":true,"enableCodeInterpreter":null}'
      )
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-tools-config-chat-1`)).not.toBeNull()
    })

    it('keeps chat-tools-config key when enableCodeInterpreter is non-null', () => {
      localStorage.setItem(
        `${USER}_chat-tools-config-chat-1`,
        '{"enableWebSearch":null,"enableCodeInterpreter":true}'
      )
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_chat-tools-config-chat-1`)).not.toBeNull()
    })

    it('removes empty chat keys belonging to a different user', () => {
      localStorage.setItem(`${OTHER}_chat-skills-chat-1`, '[]')
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${OTHER}_chat-skills-chat-1`)).toBeNull()
    })

    it('removes default tools config belonging to a different user', () => {
      localStorage.setItem(
        `${OTHER}_chat-tools-config-chat-1`,
        '{"enableWebSearch":null,"enableCodeInterpreter":null}'
      )
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${OTHER}_chat-tools-config-chat-1`)).toBeNull()
    })

    it('does not touch unrelated keys for the same user', () => {
      localStorage.setItem(`${USER}_recent_chats`, '["chat-1"]')
      sweepOrphanedChatKeys(USER)
      expect(localStorage.getItem(`${USER}_recent_chats`)).not.toBeNull()
    })
  })

  describe('existence sweep (with validChatIds)', () => {
    it('removes chat-skills key whose chatId is not in validChatIds', () => {
      localStorage.setItem(`${USER}_chat-skills-old-chat`, '[{"value":"skill-a"}]')
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-skills-old-chat`)).toBeNull()
    })

    it('keeps chat-skills key whose chatId is in validChatIds', () => {
      localStorage.setItem(`${USER}_chat-skills-current-chat`, '[{"value":"skill-a"}]')
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-skills-current-chat`)).not.toBeNull()
    })

    it('removes empty-value key even when chatId is in validChatIds', () => {
      localStorage.setItem(`${USER}_chat-skills-current-chat`, '[]')
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-skills-current-chat`)).toBeNull()
    })

    it('removes chat-tools-config key for unknown chatId', () => {
      localStorage.setItem(
        `${USER}_chat-tools-config-old-chat`,
        '{"enableWebSearch":true,"enableCodeInterpreter":null}'
      )
      sweepOrphanedChatKeys(USER, ['current-chat'])
      expect(localStorage.getItem(`${USER}_chat-tools-config-old-chat`)).toBeNull()
    })
  })
})
