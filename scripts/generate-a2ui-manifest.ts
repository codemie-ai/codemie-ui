/**
 * Regenerates the committed A2UI renderer manifest snapshot.
 *
 *   npm run a2ui:manifest
 *
 * The backend contract test reads `src/a2ui/a2ui-manifest.json` as a plain file
 * (it cannot execute the frontend) and asserts that its own enabled components
 * are a subset of ours and that the catalog ids match. `manifest.ts` and the
 * modules it imports are deliberately DOM-free, so this runs under vite-node
 * without a browser environment or a production build.
 *
 * `src/a2ui/__tests__/manifest.test.ts` fails when the file is stale — it never
 * rewrites it, regeneration is always an explicit step.
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getManifest } from '../src/a2ui/manifest'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(projectRoot, 'src/a2ui/a2ui-manifest.json')

writeFileSync(outputPath, `${JSON.stringify(getManifest(), null, 2)}\n`, 'utf-8')

console.log(`A2UI manifest written to ${outputPath}`)
// The backend cannot execute this repository, so it keeps a copy of this file under the
// same name and its contract test reads that. Nothing automates the copy yet, so the
// reminder goes where the person already is.
console.log(
  'Next: copy it over codemie/src/codemie/core/a2ui/a2ui-manifest.json and commit both,\n' +
    '      or the backend will keep checking itself against an outdated snapshot.'
)
