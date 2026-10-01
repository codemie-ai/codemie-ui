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

import { afterEach, describe, expect, it } from 'vitest'

import { isNestedLayerFocused, makeContentBehindInert } from '@/utils/mobileOverlay'

const byId = (id: string) => document.getElementById(id)!

describe('mobileOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('isNestedLayerFocused', () => {
    it('is false while focus is outside dialogs and menus', () => {
      document.body.innerHTML = '<button id="page-button">Page</button>'
      byId('page-button').focus()

      expect(isNestedLayerFocused()).toBe(false)
    })

    it('is true while focus is inside a dialog or a menu', () => {
      document.body.innerHTML = `
        <dialog open><button id="native-dialog-button">In a native dialog</button></dialog>
        <div role="dialog"><button id="dialog-button">In dialog</button></div>
        <ul role="menu"><li><button id="menu-button">In menu</button></li></ul>`

      byId('native-dialog-button').focus()
      expect(isNestedLayerFocused()).toBe(true)

      byId('dialog-button').focus()
      expect(isNestedLayerFocused()).toBe(true)

      byId('menu-button').focus()
      expect(isNestedLayerFocused()).toBe(true)
    })
  })

  describe('makeContentBehindInert', () => {
    const renderShell = () => {
      document.body.innerHTML = `
        <div id="top-bar"></div>
        <div data-app-content>
          <div id="page">
            <aside id="overlay"></aside>
            <main id="page-content"></main>
            <div id="already-inert" inert></div>
          </div>
          <div id="page-sibling"></div>
        </div>`
    }

    it('makes everything the overlay covers inert, and undoes it', () => {
      renderShell()

      const undo = makeContentBehindInert(byId('overlay'))

      expect(byId('page-content')).toHaveAttribute('inert')
      expect(byId('page-sibling')).toHaveAttribute('inert')
      expect(byId('overlay')).not.toHaveAttribute('inert')
      expect(byId('page')).not.toHaveAttribute('inert')
      expect(byId('top-bar')).not.toHaveAttribute('inert')

      undo()

      expect(byId('page-content')).not.toHaveAttribute('inert')
      expect(byId('page-sibling')).not.toHaveAttribute('inert')
      expect(byId('already-inert')).toHaveAttribute('inert')
    })

    it('does nothing outside the app content', () => {
      document.body.innerHTML = '<aside id="overlay"></aside><main id="page-content"></main>'

      makeContentBehindInert(byId('overlay'))()

      expect(byId('page-content')).not.toHaveAttribute('inert')
    })
  })
})
