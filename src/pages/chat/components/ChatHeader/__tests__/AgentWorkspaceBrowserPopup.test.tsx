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

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AgentWorkspaceFile } from '@/types/entity/agentWorkspace'

import AgentWorkspaceBrowserPopup from '../AgentWorkspaceBrowserPopup'

const { mockAgentWorkspaceStore } = vi.hoisted(() => ({
  mockAgentWorkspaceStore: {
    workspace: null,
    files: [] as AgentWorkspaceFile[],
    selectedFilePath: null,
    selectedFile: null,
    selectedFilePreviewUrl: null,
    isWorkspaceLoading: false,
    isFilesLoading: false,
    isPreviewLoading: false,
    isDownloading: false,
    error: null,
    openForConversation: vi.fn(),
    selectFile: vi.fn(),
    downloadSelectedFile: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/agentWorkspace', () => ({
  agentWorkspaceStore: mockAgentWorkspaceStore,
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, header, children }: any) =>
    visible ? (
      <div>
        <div>{header}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/Spinner/Spinner', () => ({
  default: () => <div>Loading</div>,
}))

describe('AgentWorkspaceBrowserPopup', () => {
  // AC7: Browse files lists workspace artifacts by their full workspace path.
  it('lists an artifact under its full workspace path', () => {
    mockAgentWorkspaceStore.files = [{ path: 'artifacts/t1/report.csv' } as AgentWorkspaceFile]

    render(<AgentWorkspaceBrowserPopup visible conversationId="chat-123" onHide={vi.fn()} />)

    expect(
      within(screen.getByTestId('workspace-file-list')).getByText('artifacts/t1/report.csv')
    ).toBeInTheDocument()
  })
})
