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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FolderFormPopup from '../FolderFormPopup'

vi.mock('@/assets/icons/cross.svg?react', () => ({
  default: () => <span aria-label="close icon"></span>,
}))

describe('FolderFormPopup — accessibility', () => {
  afterEach(cleanup)

  it('gives the folder-name input the accessible name "Folder name" in create mode', () => {
    render(<FolderFormPopup isVisible onHide={vi.fn()} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAccessibleName('Folder name')
  })

  it('gives the folder-name input the accessible name "Folder name" in edit mode', () => {
    render(<FolderFormPopup isEditing folder="Existing folder" isVisible onHide={vi.fn()} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAccessibleName('Folder name')
  })
})
