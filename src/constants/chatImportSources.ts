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

import chatImportIcon from '@/assets/icons/chat-import.svg'

export interface ChatImportSource {
  /** Human-readable name shown as the avatar tooltip / fallback label. */
  name: string
  /** Icon rendered instead of the generated "?" avatar. */
  iconUrl: string
}

/**
 * Folders created by the CodeMie CLI when it imports conversations from external
 * agents. Such chats reference an assistant that does not exist in the workspace,
 * so without this mapping their messages fall back to a generated "?" avatar.
 *
 * To support another imported source, add an entry here (and its icon asset) —
 * the resolution stays generic, with no per-provider code elsewhere.
 */
const CHAT_IMPORT_SOURCES: Record<string, ChatImportSource> = {
  'claude desktop': { name: 'Claude Desktop', iconUrl: chatImportIcon },
  'claude imports': { name: 'Claude Desktop', iconUrl: chatImportIcon },
  claude: { name: 'Claude Desktop', iconUrl: chatImportIcon },
  'codemie-code': { name: 'Claude Desktop', iconUrl: chatImportIcon },
}

/** Returns the import source for a chat folder, or undefined for regular chats. */
export const getChatImportSource = (folder?: string | null): ChatImportSource | undefined =>
  folder ? CHAT_IMPORT_SOURCES[folder.toLowerCase()] : undefined
