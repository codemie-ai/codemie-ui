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

/**
 * The marketplace-management response types must be GENERATED from the
 * backend's OpenAPI document, not hand-maintained.
 *
 * The hand-written `src/types/entity/marketplaceManagement.ts` declared
 * `cleanup_reasons?` optional on the Overview payload while the backend
 * (post 4.1) marks it required — which is exactly how F-06 stayed invisible
 * to the compiler: every read was guarded, so an endpoint that stopped
 * emitting the field looked identical to one that emitted it empty.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { OverviewResponse } from '@/types/generated/marketplaceManagement'

const repoRoot = path.resolve(__dirname, '../../../..')
const generatedTs = path.join(repoRoot, 'src/types/generated/marketplaceManagement.ts')
const generatedSpec = path.join(repoRoot, 'src/types/generated/marketplaceManagement.openapi.json')
const handWritten = path.join(repoRoot, 'src/types/entity/marketplaceManagement.ts')

/** Keys of `T` that are NOT optional. */
type RequiredKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? never : K
}[keyof T]

// Compile-time half of the assertion: `npx tsc --noEmit` fails if
// `cleanup_reasons` ever goes back to being optional on the generated type.
const CLEANUP_REASONS_IS_REQUIRED: 'cleanup_reasons' extends RequiredKeys<OverviewResponse>
  ? true
  : never = true

/** Slice the body of `<name>: {` ... matching `}` out of the generated source. */
function schemaBlock(source: string, name: string): string {
  const start = source.indexOf(`${name}: {`)
  if (start === -1) throw new Error(`schema ${name} not found in generated types`)
  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error(`unbalanced braces for schema ${name}`)
}

describe('generated marketplace-management types', () => {
  it('the hand-maintained type file is gone', () => {
    expect(existsSync(handWritten)).toBe(false)
  })

  it('generates types and the spec snapshot they came from', () => {
    expect(existsSync(generatedTs)).toBe(true)
    expect(existsSync(generatedSpec)).toBe(true)
  })

  it('marks OverviewResponse.cleanup_reasons required in the captured spec', () => {
    const spec = JSON.parse(readFileSync(generatedSpec, 'utf8'))
    expect(spec.components.schemas.OverviewResponse.required).toContain('cleanup_reasons')
  })

  it('emits OverviewResponse.cleanup_reasons as a required property', () => {
    const block = schemaBlock(readFileSync(generatedTs, 'utf8'), 'OverviewResponse')
    expect(block).toMatch(/\n\s+cleanup_reasons:/)
    expect(block).not.toMatch(/cleanup_reasons\?:/)
    expect(CLEANUP_REASONS_IS_REQUIRED).toBe(true)
  })

  it('carries the do-not-edit banner so nobody hand-patches it back', () => {
    expect(readFileSync(generatedTs, 'utf8')).toContain('DO NOT EDIT')
  })
})
