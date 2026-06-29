#!/usr/bin/env node
/**
 * Cross-platform secrets detection using Gitleaks.
 * Supports Docker, Podman (including Colima, OrbStack, Podman Machine), and Apple Containers.
 * Works on Windows, macOS, and Linux.
 *
 * Usage:
 *   node scripts/validate-secrets.mjs    # scan working directory
 */

import { spawn, spawnSync } from 'child_process'
import { existsSync } from 'fs'
import { platform } from 'os'
import { delimiter, resolve } from 'path'

const GITLEAKS_IMAGE = 'ghcr.io/gitleaks/gitleaks:v8.30.1'
const isWindows = platform() === 'win32'
const projectPath = resolve(process.cwd())
const configPath = resolve(projectPath, '.gitleaks.toml')
const hasConfig = existsSync(configPath)

function ensureKnownEnginePaths() {
  if (isWindows) return

  const pathEntries = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  const candidatePaths = [
    '/opt/podman/bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/Applications/Docker.app/Contents/Resources/bin',
  ]

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath) && !pathEntries.includes(candidatePath)) {
      pathEntries.push(candidatePath)
    }
  }

  process.env.PATH = pathEntries.join(delimiter)
}

function resolveCommand(cmd) {
  const command = isWindows ? 'where' : 'which'
  const result = spawnSync(command, [cmd], { stdio: 'pipe', shell: false })
  if (result.status !== 0) return null
  return result.stdout.toString().trim().split('\n')[0].trim()
}

function commandExists(cmd) {
  return resolveCommand(cmd) !== null
}

function daemonRunning(engine) {
  const bin = resolveCommand(engine)
  if (!bin) return false
  return spawnSync(bin, ['info'], { stdio: 'ignore', shell: false }).status === 0
}

function appleContainersRunning() {
  if (platform() !== 'darwin') return false
  const bin = resolveCommand('container')
  if (!bin) return false
  return spawnSync(bin, ['system', 'status'], { stdio: 'ignore', shell: false }).status === 0
}

function detectEngine() {
  for (const engine of ['docker', 'podman']) {
    if (commandExists(engine) && daemonRunning(engine)) return engine
  }
  if (appleContainersRunning()) return 'container'
  for (const engine of ['docker', 'podman']) {
    if (commandExists(engine)) return engine
  }
  return null
}

function hintForStoppedDaemon(engine) {
  if (engine === 'docker') {
    if (commandExists('colima')) return "Run 'colima start' to enable secrets detection locally"
    if (commandExists('orbstack')) return 'Start OrbStack to enable secrets detection locally'
  }
  if (engine === 'podman') {
    return "Run 'podman machine start' to enable secrets detection locally"
  }
  return 'Start your container engine to enable secrets detection locally'
}

ensureKnownEnginePaths()

const engine = detectEngine()

if (!engine) {
  console.log('No container engine found - skipping secrets detection')
  console.log('Install Docker, Podman, or Apple Containers to enable local secrets scanning')
  process.exit(1)
}

const engineBin = resolveCommand(engine)
const engineRunning = engine === 'container' ? appleContainersRunning() : daemonRunning(engine)
if (!engineRunning || !engineBin) {
  const engineLabel =
    engine === 'container' ? 'Apple Containers' : engine.charAt(0).toUpperCase() + engine.slice(1)
  console.error(`${engineLabel} daemon is not running`)
  console.error(hintForStoppedDaemon(engine))
  process.exit(1)
}

const args = [
  'run',
  '--rm',
  '-v',
  `${projectPath}:/workspace`,
  GITLEAKS_IMAGE,
  'dir',
  '--no-banner',
  '--verbose',
]

if (hasConfig) {
  args.push('--config=/workspace/.gitleaks.toml')
}

args.push('/workspace')

console.log('Checking for secrets with Gitleaks...')

const gitleaks = spawn(engineBin, args, {
  stdio: 'inherit',
  shell: isWindows,
})

gitleaks.on('close', (code) => {
  if (code !== 0) {
    console.error('Secrets detected! Please remove sensitive data before committing.')
  }
  process.exit(code)
})

gitleaks.on('error', (err) => {
  console.error('Failed to run Gitleaks via', engine, err.message)
  process.exit(1)
})
