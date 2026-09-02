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

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SUPPORTED_COMPONENTS , A2UI_PROTOCOL_VERSION, CATALOG_ID } from '@/a2ui/config'
import { getManifest } from '@/a2ui/manifest'

// The committed snapshot of the renderer manifest — the very file the backend contract
// test reads, since it cannot execute this repository. Read off disk rather than imported:
// the test compares exact bytes, and a bundler import would hand back parsed JSON or a
// transformed string depending on who is running it.
const committedManifestRaw = readFileSync(resolve(process.cwd(), 'src/a2ui/a2ui-manifest.json'), 'utf-8')

const REGENERATE_HINT = 'a2ui-manifest.json is out of date — run npm run a2ui:manifest'

describe('a2ui manifest', () => {
  it('exposes the canonical catalog id and protocol version', () => {
    const manifest = getManifest()
    expect(manifest.catalogId).toBe(CATALOG_ID)
    expect(manifest.catalogId).toBe(
      'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'
    )
    expect(manifest.protocolVersion).toBe(A2UI_PROTOCOL_VERSION)
    // The backend emits/accepts wire envelopes versioned v0.9.1 (its WIRE_VERSION).
    expect(manifest.protocolVersion).toBe('v0.9.1')
  })

  it('lists the supported components sorted alphabetically', () => {
    const manifest = getManifest()
    expect(manifest.components).toEqual([...SUPPORTED_COMPONENTS].sort())
    expect(manifest.components).toHaveLength(18)
  })

  it('produces a deterministic composition hash', () => {
    const first = getManifest()
    const second = getManifest()
    expect(first.compositionHash).toBe(second.compositionHash)
    expect(first.compositionHash).toMatch(/^[0-9a-f]+$/)
    expect(first.compositionHash.length).toBeGreaterThan(0)
  })

  it('hash depends only on the sorted component composition', () => {
    // Two manifests built from the same registry must agree even across calls —
    // the hash is a pure function of the sorted names.
    const { compositionHash, components } = getManifest()
    expect(getManifest().components).toEqual(components)
    expect(getManifest().compositionHash).toBe(compositionHash)
  })
})

describe('a2ui manifest file contract', () => {
  it('matches the runtime manifest exactly', () => {
    // Fails (never rewrites the file) when the registry changed without regeneration.
    expect(JSON.parse(committedManifestRaw), REGENERATE_HINT).toEqual(getManifest())
  })

  it('is serialized exactly as the generator writes it (stable diffs)', () => {
    expect(committedManifestRaw, REGENERATE_HINT).toBe(
      `${JSON.stringify(getManifest(), null, 2)}\n`
    )
  })
})
