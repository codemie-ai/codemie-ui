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

import { describe, expect, it } from 'vitest'

import { normalizeToCatalog } from '@/a2ui/envelopes'
import type { A2uiEnvelope } from '@/a2ui/types'

const surface = (variant?: string): A2uiEnvelope[] =>
  [
    { updateComponents: { surfaceId: 's', components: [
      { id: 'p', component: 'ChoicePicker', value: { path: '/plan' },
        options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }],
        ...(variant ? { variant } : {}) },
    ] } },
    { updateDataModel: { surfaceId: 's', path: '/', value: { plan: 'a' } } },
  ] as unknown as A2uiEnvelope[]

describe('normalizeToCatalog', () => {
  it('makes an omitted variant explicit, per the catalog default', () => {
    const out = normalizeToCatalog(surface()) as never as Record<string, never>[]
    expect((out[0] as never as { updateComponents: { components: { variant: string }[] } })
      .updateComponents.components[0].variant).toBe('mutuallyExclusive')
  })
  it('coerces a scalar seed into the one-element array the catalog mandates', () => {
    const out = normalizeToCatalog(surface()) as never as { updateDataModel?: { value: unknown } }[]
    expect(out[1].updateDataModel!.value).toEqual({ plan: ['a'] })
  })
  it('caps a multi-value seed on a single-choice picker', () => {
    const env = surface()
    ;(env[1] as never as { updateDataModel: { value: unknown } }).updateDataModel.value = { plan: ['a', 'b'] }
    const out = normalizeToCatalog(env) as never as { updateDataModel?: { value: unknown } }[]
    expect(out[1].updateDataModel!.value).toEqual({ plan: ['a'] })
  })
  it('leaves a multi-select picker alone', () => {
    const env = surface('multipleSelection')
    ;(env[1] as never as { updateDataModel: { value: unknown } }).updateDataModel.value = { plan: ['a', 'b'] }
    const out = normalizeToCatalog(env) as never as { updateDataModel?: { value: unknown } }[]
    expect(out[1].updateDataModel!.value).toEqual({ plan: ['a', 'b'] })
  })
})

describe('a binding path is a pointer, not a key', () => {
  const nested = (seed: unknown) =>
    [
      { updateComponents: { surfaceId: 's', components: [
        { id: 'f', component: 'TextField', label: 'Name', value: { path: '/profile/name' } },
      ] } },
      { updateDataModel: { surfaceId: 's', path: '/', value: seed } },
    ] as unknown as A2uiEnvelope[]

  it('seeds a nested path into the branch it names', () => {
    // Flattening it wrote the literal key "profile/name", which neither the SDK's data
    // model nor the server binds — so the server refused every submit and the form could
    // never be sent. Nested paths are supported server-side (MAX_BINDING_DEPTH).
    const out = normalizeToCatalog(nested({})) as never as { updateDataModel?: { value: unknown } }[]
    expect(out[1].updateDataModel!.value).toEqual({ profile: { name: '' } })
  })

  it('leaves an already-filled nested branch alone', () => {
    const out = normalizeToCatalog(nested({ profile: { name: 'Bob' } })) as never as {
      updateDataModel?: { value: unknown }
    }[]
    expect(out[1].updateDataModel!.value).toEqual({ profile: { name: 'Bob' } })
  })

  it('coerces a nested choice seed too', () => {
    const env = [
      { updateComponents: { surfaceId: 's', components: [
        { id: 'p', component: 'ChoicePicker', value: { path: '/cfg/plan' },
          options: [{ label: 'Free', value: 'free' }] },
      ] } },
      { updateDataModel: { surfaceId: 's', path: '/', value: { cfg: { plan: 'free' } } } },
    ] as unknown as A2uiEnvelope[]
    const out = normalizeToCatalog(env) as never as { updateDataModel?: { value: unknown } }[]
    expect(out[1].updateDataModel!.value).toEqual({ cfg: { plan: ['free'] } })
  })
})

describe('one message, several surfaces', () => {
  it('seeds each surface only from its own bindings', () => {
    // Sharing one set of paths across the message put each surface's key into the other's
    // data model; the server binds neither and refused both, permanently.
    const env = [
      { updateComponents: { surfaceId: 'A', components: [
        { id: 'a', component: 'TextField', value: { path: '/alpha' } } ] } },
      { updateDataModel: { surfaceId: 'A', path: '/', value: { alpha: 'x' } } },
      { updateComponents: { surfaceId: 'B', components: [
        { id: 'b', component: 'TextField', value: { path: '/beta' } } ] } },
      { updateDataModel: { surfaceId: 'B', path: '/', value: { beta: 'y' } } },
    ] as unknown as A2uiEnvelope[]
    const out = normalizeToCatalog(env) as never as { updateDataModel?: { surfaceId: string; value: unknown } }[]
    const models = out.filter((e) => e.updateDataModel).map((e) => e.updateDataModel!)
    expect(models.find((m) => m.surfaceId === 'A')!.value).toEqual({ alpha: 'x' })
    expect(models.find((m) => m.surfaceId === 'B')!.value).toEqual({ beta: 'y' })
  })

  it('appends a data model for every surface that needs one', () => {
    const env = [
      { updateComponents: { surfaceId: 'A', components: [
        { id: 'a', component: 'TextField', value: { path: '/alpha' } } ] } },
      { updateComponents: { surfaceId: 'B', components: [
        { id: 'b', component: 'TextField', value: { path: '/beta' } } ] } },
    ] as unknown as A2uiEnvelope[]
    const out = normalizeToCatalog(env) as never as { updateDataModel?: { surfaceId: string; value: unknown } }[]
    const models = out.filter((e) => e.updateDataModel).map((e) => e.updateDataModel!)
    expect(models).toHaveLength(2)
    expect(models.find((m) => m.surfaceId === 'A')!.value).toEqual({ alpha: '' })
    expect(models.find((m) => m.surfaceId === 'B')!.value).toEqual({ beta: '' })
  })
})

describe('a selection may only hold what the picker offers', () => {
  const picker = (seed: unknown, variant = 'multipleSelection') =>
    [
      { updateComponents: { surfaceId: 's', components: [
        { id: 'm', component: 'ChoicePicker', variant, value: { path: '/mods' },
          options: [{ label: 'SSO', value: 'sso' }, { label: 'API', value: 'api' }] },
      ] } },
      { updateDataModel: { surfaceId: 's', path: '/', value: { mods: seed } } },
    ] as unknown as A2uiEnvelope[]

  it('drops a value the surface never offered', () => {
    // The picker cannot render it, so no interaction removes it — and the server refuses
    // the whole answer with "has values the surface never offered".
    const out = normalizeToCatalog(picker(['sso', 'legacy_vpn'])) as never as {
      updateDataModel?: { value: unknown }
    }[]
    expect(out[1].updateDataModel!.value).toEqual({ mods: ['sso'] })
  })

  it('drops duplicates', () => {
    const out = normalizeToCatalog(picker(['sso', 'sso', 'api'])) as never as {
      updateDataModel?: { value: unknown }
    }[]
    expect(out[1].updateDataModel!.value).toEqual({ mods: ['sso', 'api'] })
  })

  it('leaves a valid selection untouched', () => {
    const out = normalizeToCatalog(picker(['sso', 'api'])) as never as {
      updateDataModel?: { value: unknown }
    }[]
    expect(out[1].updateDataModel!.value).toEqual({ mods: ['sso', 'api'] })
  })
})
