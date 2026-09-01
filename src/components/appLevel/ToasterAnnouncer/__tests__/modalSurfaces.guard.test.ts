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

import { readFileSync, readdirSync } from 'fs'
import { join, relative, resolve } from 'path'

import { describe, expect, it } from 'vitest'

/**
 * The live region is hosted by whichever modal is open, and each modal declares itself by rendering
 * <ModalAnnouncerHost />. Nothing discovers modals at runtime any more, so a new modal surface added
 * without that line silently drops every toast raised over it — the regression this ticket fixed.
 *
 * This guard fails on such a surface at build time instead. It reads source text rather than
 * rendering, because the failure it protects against is an omission, which nothing renders.
 */
const SRC = resolve(__dirname, '../../../..')

/** Rendering the region's own machinery is not a modal surface. */
const EXEMPT = ['components/appLevel/ToasterAnnouncer']

/** Markup that scopes assistive tech to itself, and therefore has to host the region. */
const MODAL_MARKERS = [/aria-modal=["'{]/, /from ['"]primereact\/dialog['"]/, /<dialog[\s>]/]

const collectTsx = (dir: string, found: string[] = []): string[] => {
  readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') collectTsx(path, found)

      return
    }

    if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) found.push(path)
  })

  return found
}

describe('modal surfaces host the live region', () => {
  it('every component that opens a modal renders <ModalAnnouncerHost />', () => {
    const offenders = collectTsx(SRC)
      .map((path) => ({ path: relative(SRC, path), source: readFileSync(path, 'utf-8') }))
      .filter(({ path }) => !EXEMPT.some((dir) => path.startsWith(dir)))
      .filter(({ source }) => MODAL_MARKERS.some((marker) => marker.test(source)))
      .filter(({ source }) => !source.includes('ModalAnnouncerHost'))
      .map(({ path }) => path)

    // Named so the failure message says which file to fix, not just that a count changed.
    expect(offenders).toEqual([])
  })

  it('recognises the surfaces that already carry the host', () => {
    // Guards the guard: a marker list that matched nothing would pass the test above vacuously.
    const declaring = collectTsx(SRC)
      .map((path) => ({ path: relative(SRC, path), source: readFileSync(path, 'utf-8') }))
      .filter(({ source }) => MODAL_MARKERS.some((marker) => marker.test(source)))
      .map(({ path }) => path)

    expect(declaring).toContain('components/Popup/Popup.tsx')
    expect(declaring).toContain('components/Navigation/NavigationProfile.tsx')
  })
})
