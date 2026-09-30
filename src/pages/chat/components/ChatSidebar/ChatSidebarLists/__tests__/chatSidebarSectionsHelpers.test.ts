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

import { describe, expect, it, vi } from 'vitest'

import { expandSectionForLocation } from '../chatSidebarSectionsHelpers'

const createActions = () => ({
  setPinned: vi.fn(),
  setRecent: vi.fn(),
  setWorkflowRuns: vi.fn(),
  setFolders: vi.fn(),
  setActiveFolder: vi.fn(),
})

describe('expandSectionForLocation — folder resolution clears then opens one folder (EPMCDME-15211)', () => {
  it('calls setActiveFolder(null) then setActiveFolder(folderKey) for a folder location', () => {
    const actions = createActions()

    expandSectionForLocation({ section: 'folder', folderName: 'custom:Folder A' }, actions)

    expect(actions.setFolders).toHaveBeenCalledWith(true)
    expect(actions.setActiveFolder.mock.calls).toEqual([[null], ['custom:Folder A']])
  })

  it('does not leave the first folder key applied after a second call with a different folder', () => {
    const actions = createActions()

    expandSectionForLocation({ section: 'folder', folderName: 'custom:Folder A' }, actions)
    expandSectionForLocation({ section: 'folder', folderName: 'custom:Folder B' }, actions)

    expect(actions.setActiveFolder.mock.calls).toEqual([
      [null],
      ['custom:Folder A'],
      [null],
      ['custom:Folder B'],
    ])
  })
})
