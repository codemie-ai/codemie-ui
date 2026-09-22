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

import { ChatSidebarLocation } from './chatSidebarListsHelpers'
import { FocusedView } from './focusedChatSidebarHelpers'

export type FocusedNavigationSection = 'pinned' | 'workflow-runs'

interface SectionExpansionActions {
  setPinned: (expanded: boolean) => void
  setRecent: (expanded: boolean) => void
  setWorkflowRuns: (expanded: boolean) => void
  setFolders: (expanded: boolean) => void
}

export const getFocusedView = (
  location?: ChatSidebarLocation,
  targetChatId?: string
): FocusedView => {
  if (location?.section === 'assistant' && location.assistantId) {
    return { type: 'assistant', id: location.assistantId, targetChatId }
  }
  if (location?.section === 'folder' && location.folderName) {
    return { type: 'folder', name: location.folderName, targetChatId }
  }
  return { type: 'root', targetChatId }
}

export const getFocusedNavigationSection = (
  location?: ChatSidebarLocation
): FocusedNavigationSection | null => {
  if (location?.section === 'pinned' || location?.section === 'workflow-runs') {
    return location.section
  }
  return null
}

export const expandSectionForLocation = (
  location: ChatSidebarLocation | undefined,
  actions: SectionExpansionActions
) => {
  switch (location?.section) {
    case 'workflow-runs':
      actions.setRecent(false)
      actions.setWorkflowRuns(true)
      actions.setFolders(false)
      break
    case 'pinned':
      actions.setPinned(true)
      break
    case 'folder':
      actions.setRecent(false)
      actions.setWorkflowRuns(false)
      actions.setFolders(true)
      break
    case 'recent':
      actions.setRecent(true)
      actions.setWorkflowRuns(false)
      actions.setFolders(false)
      break
    default:
      break
  }
}
