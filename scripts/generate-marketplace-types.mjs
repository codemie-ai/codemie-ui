#!/usr/bin/env node
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

// Generates `src/types/generated/marketplaceManagement.ts` from the backend's
// OpenAPI document, so the marketplace-management admin screens can never
// again disagree with the API about a field name or its optionality (F-47).
//
// Two modes:
//
//   npm run generate:types
//       Regenerates the TypeScript from the spec snapshot committed next to
//       it (`marketplaceManagement.openapi.json`). No network, deterministic,
//       and therefore a no-op in CI:
//           npm run generate:types && git diff --exit-code src/types/generated/
//
//   npm run generate:types:refresh -- [--from <url|file>]
//       Re-reads the spec from a running backend (default
//       http://localhost:8080/openapi.json), rewrites the snapshot, then
//       regenerates. Run this whenever a marketplace-management response model
//       changes; the resulting compile errors are the point.
//
// Only the marketplace-management paths and the component schemas reachable
// from them are kept, so an unrelated backend model does not churn this file.

/* eslint-disable import/no-extraneous-dependencies */
// openapi-typescript and prettier are build-time tooling; both are correctly
// devDependencies (same exemption vitest.workspace.ts takes).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import openapiTS, { astToString } from 'openapi-typescript'
import prettier from 'prettier'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, 'src/types/generated')
const specPath = path.join(outDir, 'marketplaceManagement.openapi.json')
const typesPath = path.join(outDir, 'marketplaceManagement.ts')

const PATH_MARKER = 'marketplace-management'
const DEFAULT_SOURCE = 'http://localhost:8080/openapi.json'

const LICENSE = `// Copyright 2026 EPAM Systems, Inc. ("EPAM")
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
`

const BANNER = `/* eslint-disable */
/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by \`npm run generate:types\` from
 * src/types/generated/marketplaceManagement.openapi.json, which is itself
 * captured from the backend by \`npm run generate:types:refresh\`.
 *
 * Editing this file by hand is how the marketplace-management types drifted
 * from the API in the first place. Change the backend response model, refresh
 * the snapshot, and fix the compile errors instead.
 */
`

function parseArgs(argv) {
  const args = { refresh: false, from: null }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--refresh') args.refresh = true
    else if (argv[i] === '--from') {
      args.from = argv[i + 1]
      args.refresh = true
      i += 1 // NOSONAR — intentionally skip the next token (the --from value)
    } else if (argv[i].startsWith('--from=')) {
      args.from = argv[i].slice('--from='.length)
      args.refresh = true
    }
  }
  return args
}

async function loadSource(from) {
  if (/^https?:\/\//.test(from)) {
    const response = await fetch(from)
    if (!response.ok) throw new Error(`GET ${from} -> ${response.status}`)
    return response.json()
  }
  return JSON.parse(readFileSync(path.resolve(repoRoot, from), 'utf8'))
}

/** Collect every `#/components/schemas/...` name reachable from `node`. */
function collectRefs(node, into) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, into))
    return
  }
  if (!node || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/schemas/')) {
      into.add(value.slice('#/components/schemas/'.length))
    } else {
      collectRefs(value, into)
    }
  }
}

/** Narrow a full OpenAPI document to the marketplace-management surface. */
function filterSpec(full) {
  const paths = Object.fromEntries(
    Object.entries(full.paths ?? {})
      .filter(([route]) => route.includes(PATH_MARKER))
      .sort(([a], [b]) => a.localeCompare(b))
  )
  if (Object.keys(paths).length === 0) {
    throw new Error(`no paths matching "${PATH_MARKER}" in the source document`)
  }

  const allSchemas = full.components?.schemas ?? {}
  const wanted = new Set()
  collectRefs(paths, wanted)
  const queue = [...wanted]
  while (queue.length > 0) {
    const name = queue.pop()
    const schema = allSchemas[name]
    if (!schema) throw new Error(`spec references unknown schema "${name}"`)
    const nested = new Set()
    collectRefs(schema, nested)
    for (const dependency of nested) {
      if (!wanted.has(dependency)) {
        wanted.add(dependency)
        queue.push(dependency)
      }
    }
  }

  const schemas = Object.fromEntries(
    [...wanted].sort((a, b) => a.localeCompare(b)).map((name) => [name, allSchemas[name]])
  )

  return {
    openapi: full.openapi,
    info: {
      title: `${full.info?.title ?? 'API'} - marketplace management`,
      version: full.info?.version ?? '0.0.0',
    },
    paths,
    components: { schemas },
  }
}

/**
 * Convenience aliases so call sites write `OverviewResponse` instead of
 * `components['schemas']['OverviewResponse']`. Generated, not curated: every
 * schema in the snapshot gets one.
 */
function aliasBlock(spec) {
  const names = Object.keys(spec.components.schemas)
  const identifier = (name) => name.replace(/\W/g, '')
  const lines = []
  const emitted = new Set()

  for (const name of names) {
    const alias = identifier(name)
    if (emitted.has(alias)) continue
    emitted.add(alias)
    lines.push(`export type ${alias} = components['schemas']['${name}']`)
  }
  // FastAPI splits a model used in both directions into `X-Input` / `X-Output`.
  // The bare name is the response shape, which is what the UI renders.
  for (const name of names) {
    if (!name.endsWith('-Output')) continue
    const bare = identifier(name.slice(0, -'-Output'.length))
    if (emitted.has(bare) || names.includes(bare)) continue
    emitted.add(bare)
    lines.push(`export type ${bare} = components['schemas']['${name}']`)
  }

  return `\n// --- Convenience aliases -------------------------------------------------\n\n${lines.join(
    '\n'
  )}\n`
}

async function format(source, filepath) {
  const config = await prettier.resolveConfig(filepath)
  return prettier.format(source, { ...config, filepath })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  let spec
  if (args.refresh) {
    const from = args.from ?? DEFAULT_SOURCE
    spec = filterSpec(await loadSource(from))
    mkdirSync(outDir, { recursive: true })
    writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`)
    process.stdout.write(`spec snapshot refreshed from ${from}\n`)
  } else {
    spec = JSON.parse(readFileSync(specPath, 'utf8'))
  }

  const ast = await openapiTS(spec, { alphabetize: false })
  const body = astToString(ast)
  const contents = await format(`${LICENSE}\n${BANNER}\n${body}\n${aliasBlock(spec)}`, typesPath)

  mkdirSync(outDir, { recursive: true })
  writeFileSync(typesPath, contents)
  process.stdout.write(
    `wrote ${path.relative(repoRoot, typesPath)} (${
      Object.keys(spec.components.schemas).length
    } schemas, ${Object.keys(spec.paths).length} paths)\n`
  )
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`)
  process.exitCode = 1
})
