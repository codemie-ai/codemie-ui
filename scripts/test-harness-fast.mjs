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

// Runs the UI sanity suite against a production build served by nginx (compose
// profile `uitest`) instead of the Vite dev server — ~3 min instead of ~17 on
// a typical local setup, with fewer flakes (see EPMCDME-13981).
//
// Flow: build the static-UI image (always-fresh dist; Docker layer caching
// keeps npm ci cached until the lockfile changes) -> swap the container behind
// :5173 -> run the harness -> restore the dev server. The restore runs on
// every exit path, including failures and Ctrl-C, and is unconditional: the
// dev UI is (re)started even if it was not running beforehand, so an aborted
// earlier run cannot leave the workspace without a UI on :5173.
//
// Extra CLI args are passed through to `codemie-test-harness run sanity-ui`,
// e.g.: npm run test-harness:fast -- -k test_chat_configuration
// Worker count: TEST_HARNESS_WORKERS env var (default 8).

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path, { delimiter } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const isWindows = process.platform === 'win32'
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = path.resolve(repoRoot, '..')

// GUI-launched terminals on macOS/Linux often miss the engine's install dir.
// Mirrors ensureKnownEnginePaths in scripts/validate-secrets.mjs, plus
// ~/.local/bin where the standalone uv installer puts uvx.
const ensureKnownToolPaths = () => {
  if (isWindows) return
  const pathEntries = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  const candidates = [
    '/opt/podman/bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/Applications/Docker.app/Contents/Resources/bin',
    path.join(homedir(), '.local', 'bin'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate) && !pathEntries.includes(candidate)) {
      pathEntries.push(candidate)
    }
  }
  process.env.PATH = pathEntries.join(delimiter)
}
ensureKnownToolPaths()

if (!existsSync(path.join(workspaceRoot, 'docker-compose.yaml'))) {
  console.error(
    `docker-compose.yaml not found in ${workspaceRoot} — this script expects the ` +
      'standard workspace layout (all codemie repos as siblings, compose file at the ' +
      'root; see codemie-onboarding/README.md).'
  )
  process.exit(1)
}

const spawnChecked = (cmd, args, options) => {
  const result = spawnSync(cmd, args, options)
  if (result.error) {
    console.error(`✖ could not run "${cmd}": ${result.error.message}`)
    console.error(
      cmd === 'docker'
        ? '  Is the container engine installed and running?'
        : `  Is ${cmd} installed and on PATH?`
    )
  }
  return result
}
const compose = (...args) =>
  spawnChecked('docker', ['compose', ...args], { cwd: workspaceRoot, stdio: 'inherit' })
const composeQuiet = (...args) =>
  spawnChecked('docker', ['compose', ...args], { cwd: workspaceRoot, encoding: 'utf8' })

const workers = process.env.TEST_HARNESS_WORKERS || '8'
if (!/^\d+$/.test(workers)) {
  console.error(`✖ TEST_HARNESS_WORKERS must be a positive integer, got "${workers}"`)
  process.exit(1)
}

// Keep Ctrl-C from terminating the process before the restore below has run.
// While the harness child is in the foreground the signal also reaches it, so
// blocking spawnSync calls return and the normal restore path completes.
let interrupted = false
const onTerminationSignal = (signal) => {
  interrupted = true
  console.error(`\n${signal} received — cleaning up before exit…`)
}
process.on('SIGINT', () => onTerminationSignal('SIGINT'))
process.on('SIGTERM', () => onTerminationSignal('SIGTERM'))

const fail = (label) => {
  throw new Error(label)
}

const devUiWasRunning = (composeQuiet('ps', '--services', '--status', 'running').stdout || '')
  .split(/\r?\n/)
  .includes('codemie-ui')

console.log(
  '▶ Building production UI image (cached layers make this fast when deps are unchanged)…'
)
if (compose('--profile', 'uitest', 'build', 'codemie-ui-static').status !== 0) fail('image build')

let exitCode = 1
try {
  if (devUiWasRunning && compose('stop', 'codemie-ui').status !== 0) fail('stopping dev UI')
  if (compose('--profile', 'uitest', 'up', '-d', 'codemie-ui-static').status !== 0)
    fail('starting static UI')

  // Probe through the /api proxy so a cold backend delays the run instead of
  // failing it — nginx itself serves / from disk within a second.
  process.stdout.write('▶ Waiting for the stack behind http://localhost:5173 ')
  const deadline = Date.now() + 180_000
  let up = false
  while (Date.now() < deadline) {
    // `interrupted` flips inside the signal handler, which static analysis
    // can't see as a loop modification — hence a body check, not a condition.
    if (interrupted) break
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch('http://localhost:5173/api/v1/config', {
        signal: AbortSignal.timeout(3000),
      })
      if (res.status < 500) {
        up = true
        break
      }
    } catch {
      // not up yet
    }
    process.stdout.write('.')
    // eslint-disable-next-line no-await-in-loop
    await sleep(1000)
  }
  if (up) {
    console.log(' up')
  } else {
    console.log(interrupted ? ' interrupted' : ' timed out')
    fail('stack readiness')
  }

  const extra = process.argv.slice(2)
  console.log(`▶ Running sanity-ui with -n ${workers}…`)
  const harness = spawnChecked(
    'uvx',
    // The trailing `--` makes the harness CLI pass everything after it through
    // to pytest (Click otherwise rejects unknown flags like -k).
    ['codemie-test-harness', 'run', 'sanity-ui', '-n', workers, '--', ...extra],
    { cwd: repoRoot, stdio: 'inherit' }
  )
  if (harness.error) fail('running the test harness')
  exitCode = harness.status ?? 1
} catch (err) {
  console.error(`✖ ${err.message} failed`)
  exitCode = 1
} finally {
  console.log('▶ Restoring dev server…')
  const stopped = compose('--profile', 'uitest', 'stop', 'codemie-ui-static')
  const started = compose('up', '-d', 'codemie-ui')
  if (stopped.status !== 0 || started.status !== 0) {
    console.error(
      '⚠ Restore incomplete — check `docker compose ps` and run `docker compose up -d codemie-ui` manually.'
    )
    exitCode = exitCode || 1
  }
}

process.exit(interrupted ? 130 : exitCode)
