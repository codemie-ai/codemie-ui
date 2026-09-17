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

import { render, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'

import HtmlPreviewPopup from '../HtmlPreviewPopup'

const FORBIDDEN_TOKENS = [
  'allow-same-origin',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-forms',
  'allow-modals',
  'allow-downloads',
]

afterEach(cleanup)

describe('HtmlPreviewPopup sandboxing', () => {
  it('sets sandbox to exactly allow-scripts', () => {
    render(<HtmlPreviewPopup isVisible html="<p>hi</p>" onHide={() => {}} />)
    const iframe = document.body.querySelector('iframe')
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  })

  it('excludes every forbidden sandbox token', () => {
    render(<HtmlPreviewPopup isVisible html="<p>hi</p>" onHide={() => {}} />)
    const tokens =
      document.body.querySelector('iframe')?.getAttribute('sandbox')?.split(/\s+/) ?? []
    FORBIDDEN_TOKENS.forEach((forbidden) => expect(tokens).not.toContain(forbidden))
  })

  it('keeps the same sandbox attribute after refresh', () => {
    render(<HtmlPreviewPopup isVisible html="<p>hi</p>" onHide={() => {}} />)
    const refreshButton = document.body.querySelectorAll('button')[0]
    fireEvent.click(refreshButton)
    const iframe = document.body.querySelector('iframe')
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts')
  })

  it('still renders the preview iframe with the given html as srcdoc', () => {
    render(<HtmlPreviewPopup isVisible html="<p>hi</p>" onHide={() => {}} />)
    expect(document.body.querySelector('iframe')).toBeInTheDocument()
  })
})
