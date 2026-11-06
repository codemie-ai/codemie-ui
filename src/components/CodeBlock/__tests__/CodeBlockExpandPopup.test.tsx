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

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import CodeBlockExpandPopup from '../CodeBlockExpandPopup'

// The popup header is the ExpandedYamlShell font-mono span; the inner CodeBlock renders its title in a <p>.
const getPopupHeader = () =>
  screen.getByRole('dialog').querySelector<HTMLElement>('span.font-mono')!

describe('CodeBlockExpandPopup', () => {
  it('shows the block title in the header for a non-YAML CodeBlock', () => {
    render(
      <CodeBlockExpandPopup
        isVisible
        onHide={() => {}}
        title="Request body"
        text="{}"
        language="json"
      />
    )
    expect(getPopupHeader()).toHaveTextContent('Request body')
    expect(getPopupHeader()).not.toHaveTextContent('YAML Configuration')
  })

  it('falls back to the uppercased language in the header when there is no title', () => {
    render(<CodeBlockExpandPopup isVisible onHide={() => {}} text="{}" language="json" />)
    expect(getPopupHeader()).toHaveTextContent('JSON')
    expect(getPopupHeader()).not.toHaveTextContent('YAML Configuration')
  })

  it('uses an explicit label over the title and language', () => {
    render(
      <CodeBlockExpandPopup
        isVisible
        onHide={() => {}}
        label="YAML Configuration"
        title="Ignored"
        text="a: 1"
        language="yaml"
      />
    )
    expect(getPopupHeader()).toHaveTextContent('YAML Configuration')
  })

  it.each([false, true])(
    'passes hideDownload to the expanded view (expandWithEditor: %s)',
    (expandWithEditor) => {
      render(
        <CodeBlockExpandPopup
          isVisible
          onHide={() => {}}
          text="const x = 1;"
          language="js"
          expandWithEditor={expandWithEditor}
          hideDownload
        />
      )
      expect(screen.queryByText('Download')).not.toBeInTheDocument()
      expect(screen.getByText('Copy')).toBeInTheDocument()
    }
  )

  it('passes isInExpandPopup to the inner CodeBlock so Download tooltip avoids the close icon', () => {
    const { getByText } = render(
      <CodeBlockExpandPopup isVisible onHide={() => {}} text="const x = 1;" language="js" />
    )
    const downloadBtn = getByText('Download').closest('button')
    expect(downloadBtn).toHaveAttribute('data-tooltip-place', 'bottom')
  })

  it('does not collapse the body top padding to zero', () => {
    render(<CodeBlockExpandPopup isVisible onHide={() => {}} text="const x = 1;" language="js" />)
    // The dialog body is portal-rendered to document.body, so scope the query to the
    // dialog itself rather than the whole document to avoid matching an unrelated node.
    const dialogEl = screen.getByRole('dialog')
    const bodyEl = dialogEl.querySelector('[class*="pt-"]')
    expect(bodyEl).not.toBeNull()
    expect(bodyEl?.className).toMatch(/!pt-2\b/)
    expect(bodyEl?.className).not.toMatch(/!pt-0\b/)
  })
})
