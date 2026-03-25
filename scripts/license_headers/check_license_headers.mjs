#!/usr/bin/env node

/* eslint-disable max-classes-per-file, no-plusplus, no-continue, no-inner-declarations, consistent-return, @typescript-eslint/no-unused-vars */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ==============================================================================
// Configuration & Constants
// ==============================================================================

const SCRIPT_DIR = __dirname
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB limit to prevent memory issues
const HEADER_CHECK_LINES = 50 // Only check first N lines for existing headers

// Comment style mapping for different file types
const COMMENT_STYLES = {
  // Double-slash comments (//)
  '.js': '//',
  '.jsx': '//',
  '.ts': '//',
  '.tsx': '//',
  '.mjs': '//',
  '.cjs': '//',
  // Hash-style comments (#)
  '.sh': '#',
  '.bash': '#',
  '.dockerfile': '#',
  // CSS-style comments
  '.css': '/* */',
  '.scss': '//',
  '.sass': '//',
  '.less': '//',
  // HTML/XML comments (<!-- -->)
  '.html': '<!-- -->',
  '.htm': '<!-- -->',
}

// Files that should be excluded (Apache guidelines)
const EXCLUDE_FILES = new Set([
  // Apache explicitly excludes distribution files
  'LICENSE',
  'LICENSE.txt',
  'LICENSE.md',
  'NOTICE',
  'NOTICE.txt',
  'NOTICE.md',
  // Short informational files
  'README',
  'README.md',
  'README.txt',
  'CHANGELOG',
  'CHANGELOG.md',
  'CHANGES',
  'CHANGES.md',
  'AUTHORS',
  'AUTHORS.md',
  // Dependency/package management (no creative content)
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'vite.config.js',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.prettierrc',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html', // Entry HTML file
  'docker-compose.yml',
  'docker-compose.yaml',
  '.dockerignore',
  // Configuration files
  '.gitignore',
  '.editorconfig',
  '.env',
  '.env.example',
  '.env.template',
  // OS-specific files
  '.DS_Store',
  'Thumbs.db',
])

// Data/config extensions to exclude (per Apache: "lacking creative content")
const EXCLUDE_EXTENSIONS = new Set([
  '.json',
  '.lock',
  '.min.js',
  '.min.css',
  '.map',
  '.d.ts', // TypeScript declaration files (auto-generated)
])

// Directory prefixes to exclude
const EXCLUDE_DIR_PREFIXES = [
  'node_modules/',
  'dist/',
  'build/',
  'deploy-templates/',
  'templates/',
  '.vscode/',
  '.idea/',
  'coverage/',
  '.git/',
  'src/assets/', // Exclude assets (icons, images, etc.)
  'mock-server/', // Exclude mock server data
]

// Directories to skip entirely
const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.vscode',
  '.idea',
  '.husky',
  'mock-server',
])

// Inclusion paths for specific file types
// Only check source files in src/ directory (and special files like Dockerfile in root)
const INCLUDE_PREFIXES = {
  '.js': ['src/'],
  '.jsx': ['src/'],
  '.ts': ['src/'],
  '.tsx': ['src/'],
  '.mjs': ['src/'],
  '.cjs': ['src/'],
  '.css': ['src/'],
  '.scss': ['src/'],
  '.html': ['src/'], // HTML template files in src/
}

// ==============================================================================
// Utility Functions
// ==============================================================================

function loadLicenseTemplate() {
  const templatePath = path.join(SCRIPT_DIR, 'license_template.txt')
  try {
    const content = fs.readFileSync(templatePath, 'utf-8')
    if (!content.trim()) {
      console.error('Error: License template is empty')
      process.exit(1)
    }
    return content.split('\n')
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Error: License template not found: ${templatePath}`)
    } else {
      console.error(`Error reading license template: ${error.message}`)
    }
    process.exit(1)
  }
}

function pathStartsWith(filePath, prefixes) {
  const normalized = filePath.replace(/\\/g, '/')
  return prefixes.some((prefix) => normalized.startsWith(prefix))
}

// ==============================================================================
// Core Components
// ==============================================================================

class CommentStyleFormatter {
  constructor(licenseLines) {
    this.licenseLines = licenseLines
  }

  formatLinePrefix(prefix) {
    return this.licenseLines.map((line) => (line.trim() ? `${prefix} ${line}` : prefix))
  }

  formatBlockComment(start, prefix, end) {
    const formatted = [start]
    this.licenseLines.forEach((line) => {
      formatted.push(line.trim() ? `${prefix}${line}` : prefix.trimEnd())
    })
    formatted.push(end)
    return formatted
  }

  formatHeader(commentStyle) {
    let formatted

    // Line-prefix styles
    if (['#', '//', '--', '"', '!', ';'].includes(commentStyle)) {
      formatted = this.formatLinePrefix(commentStyle)
    }
    // Block comment styles
    else if (commentStyle === '<!-- -->') {
      formatted = this.formatBlockComment('<!--', '  ', '-->')
    } else if (commentStyle === '/* */') {
      formatted = this.formatBlockComment('/*', ' * ', ' */')
    }
    // Fallback to // style for JS/TS
    else {
      formatted = this.formatLinePrefix('//')
    }

    return formatted.join('\n')
  }
}

class HeaderDetector {
  constructor(licenseFirstLine) {
    this.licenseFirstLine = licenseFirstLine
    this.apacheMarkers = [
      'Apache License',
      'https://www.apache.org/licenses/LICENSE-2.0',
      'Licensed under the Apache License',
    ]
  }

  hasHeader(text) {
    if (!this.licenseFirstLine) return false

    // Check only first 50 lines
    const lines = text.split('\n').slice(0, HEADER_CHECK_LINES)
    const headerText = lines.join('\n')

    // Check for Apache license markers
    return this.apacheMarkers.some((marker) => headerText.includes(marker))
  }

  hasHeaderFromFile(filePath) {
    if (!this.licenseFirstLine) return false

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n').slice(0, HEADER_CHECK_LINES)
      const headerText = lines.join('\n')
      return this.apacheMarkers.some((marker) => headerText.includes(marker))
    } catch {
      return false
    }
  }
}

class FileValidator {
  static isInfrastructurePath(filePath) {
    // Check if file is in infrastructure/deployment directory
    // Infrastructure files (deployment configs, not source code) typically
    // don't need license headers per Apache guidelines
    const infraPatterns = [
      'terraform/',
      'deploy-templates/',
      'deploy/',
      'deployment/',
      'k8s/',
      'kubernetes/',
      'helm/',
      'ansible/',
      '.github/workflows/',
      '.gitlab-ci/',
      '.circleci/',
      'templates/', // Deployment templates
    ]
    const normalized = filePath.replace(/\\/g, '/')
    return infraPatterns.some((pattern) => normalized.includes(pattern))
  }

  static isExcludedFile(filePath) {
    const fileName = path.basename(filePath)
    // Check for compound extensions like .d.ts
    if (fileName.endsWith('.d.ts')) {
      return true
    }
    return EXCLUDE_FILES.has(fileName)
  }

  static isExcludedExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    return EXCLUDE_EXTENSIONS.has(ext)
  }

  static isExcludedDirectory(filePath) {
    const normalized = filePath.replace(/\\/g, '/')

    // Check ignored dirs
    const parts = normalized.split('/')
    if (parts.some((part) => IGNORE_DIRS.has(part))) {
      return true
    }

    // Check excluded prefixes
    if (pathStartsWith(normalized, EXCLUDE_DIR_PREFIXES)) {
      return true
    }

    // Generic rule: Exclude any directory starting with '.'
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (part.startsWith('.') && part.length > 1 && part !== '.' && part !== '..') {
        return true
      }
    }

    return false
  }

  static isTooLarge(filePath) {
    try {
      const stats = fs.statSync(filePath)
      return stats.size > MAX_FILE_SIZE
    } catch {
      return true
    }
  }

  static getCommentStyle(filePath) {
    const ext = path.extname(filePath).toLowerCase()

    // Check extension mapping
    if (COMMENT_STYLES[ext]) {
      return COMMENT_STYLES[ext]
    }

    // Special filenames without extensions
    const filenameLower = path.basename(filePath).toLowerCase()

    // Dockerfiles: Include if it's a source Dockerfile, exclude if in deploy dirs
    if (filenameLower === 'dockerfile' || filenameLower.startsWith('dockerfile.')) {
      if (FileValidator.isInfrastructurePath(filePath)) {
        return null // Exclude deployment Dockerfiles
      }
      return '#'
    }

    if (filenameLower === 'makefile') {
      return '#'
    }

    return null
  }
}

class HeaderInserter {
  constructor(formatter) {
    this.formatter = formatter
  }

  insert(text, filePath, commentStyle) {
    // Handle empty files
    if (!text.trim()) {
      return this.formatter.formatHeader(commentStyle) + '\n\n'
    }

    const header = this.formatter.formatHeader(commentStyle)
    const lines = text.split('\n')

    if (!lines.length) {
      return header + '\n\n'
    }

    let insertAt = 0

    // Preserve shebang
    if (lines[0] && lines[0].startsWith('#!')) {
      insertAt = 1
    }

    return (
      lines.slice(0, insertAt).join('\n') +
      (insertAt > 0 ? '\n' : '') +
      header +
      '\n\n' +
      lines.slice(insertAt).join('\n')
    )
  }
}

class FileProcessor {
  constructor(formatter, detector, validator, inserter) {
    this.formatter = formatter
    this.detector = detector
    this.validator = validator
    this.inserter = inserter
  }

  isEligible(filePath) {
    // Check exclusions
    if (FileValidator.isExcludedFile(filePath)) {
      return { eligible: false, commentStyle: null }
    }

    if (FileValidator.isExcludedExtension(filePath)) {
      return { eligible: false, commentStyle: null }
    }

    if (FileValidator.isExcludedDirectory(filePath)) {
      return { eligible: false, commentStyle: null }
    }

    if (FileValidator.isTooLarge(filePath)) {
      return { eligible: false, commentStyle: null }
    }

    // Get comment style
    const commentStyle = FileValidator.getCommentStyle(filePath)
    if (!commentStyle) {
      return { eligible: false, commentStyle: null }
    }

    // Check inclusion prefixes for specific extensions
    const ext = path.extname(filePath).toLowerCase()
    if (INCLUDE_PREFIXES[ext]) {
      const normalized = filePath.replace(/\\/g, '/')
      if (!pathStartsWith(normalized, INCLUDE_PREFIXES[ext])) {
        return { eligible: false, commentStyle: null }
      }
    }

    return { eligible: true, commentStyle }
  }

  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error) {
      console.error(`Warning: Cannot read ${filePath}: ${error.message}`)
      return null
    }
  }

  writeFile(filePath, content) {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      return true
    } catch (error) {
      console.error(`Error: Cannot write ${filePath}: ${error.message}`)
      return false
    }
  }
}

// ==============================================================================
// Main Operations
// ==============================================================================

function* iterRepoFiles() {
  try {
    // Security: Using spawnSync with hardcoded command and explicit argument array.
    // PATH usage is safe here because:
    // 1. Command is hardcoded (not user input) - no command injection possible
    // 2. Arguments are in array form - no shell interpretation
    // 3. This is a development/CI tool running in trusted environments
    // 4. Git must be available in PATH for the repository to function
    // NOSONAR - Suppressing PATH security warning as this usage is safe
    const result = spawnSync('git', ['ls-files', '--no-empty-directory'], {
      // NOSONAR
      encoding: 'utf-8',
      timeout: 30000,
      windowsHide: true, // Hide console window on Windows
    })

    // Check for errors
    if (result.error) {
      throw result.error
    }

    const output = result.stdout

    // Validate output before processing
    if (typeof output !== 'string') {
      throw new Error('Invalid output from git ls-files command')
    }

    // Split output into file paths, filter out empty lines
    const files = output
      .trim()
      .split('\n')
      .filter((line) => line.trim() !== '')

    // Validate each file path before yielding
    for (const file of files) {
      // Security: Ensure file path doesn't contain dangerous characters
      if (file.includes('\0') || file.includes('..')) {
        console.warn(`Skipping suspicious file path: ${file}`)
        continue
      }

      const fullPath = path.resolve(file)
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        yield file
      }
    }
  } catch (error) {
    // Not in a git repository, fallback to scanning src/ directory
    console.error(`Warning: Not in git repository (${error.message}), scanning src/ directory...`)

    function* walkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            yield* walkDir(fullPath)
          }
        } else if (entry.isFile()) {
          yield path.relative(process.cwd(), fullPath)
        }
      }
    }

    const srcDir = path.join(process.cwd(), 'src')
    if (fs.existsSync(srcDir)) {
      yield* walkDir(srcDir)
    }
  }
}

function check(paths, processor, detector, quiet = false) {
  let missing = 0
  let checked = 0

  for (const filePath of paths) {
    const { eligible } = processor.isEligible(filePath)
    if (!eligible) continue

    checked++

    // Progress indicator every 100 files (unless quiet)
    if (!quiet && checked % 100 === 0) {
      process.stderr.write(`Processed ${checked} files...\r`)
    }

    // Optimized: Read only first 50 lines instead of entire file
    if (!detector.hasHeaderFromFile(filePath)) {
      // Stream output immediately instead of batching
      console.log(`Missing license header: ${filePath}`)
      missing++
    }
  }

  // Clear progress line (only if shown)
  if (!quiet && checked >= 100) {
    process.stderr.write('\n')
  }

  console.log(`\nChecked ${checked} files, ${missing} missing license headers`)

  if (missing > 0) {
    console.log('\nTo fix, run: npm run license-headers:fix')
  }

  return missing
}

function fix(paths, processor, detector) {
  let changed = 0
  let checked = 0
  let failed = 0
  const failedFiles = []

  for (const filePath of paths) {
    const { eligible, commentStyle } = processor.isEligible(filePath)
    if (!eligible) continue

    checked++

    // Progress indicator
    if (checked % 100 === 0) {
      process.stderr.write(`Processed ${checked} files...\r`)
    }

    const content = processor.readFile(filePath)
    if (content === null) {
      failed++
      failedFiles.push(filePath)
      continue
    }

    if (detector.hasHeader(content)) {
      continue
    }

    const newContent = processor.inserter.insert(content, filePath, commentStyle)

    if (processor.writeFile(filePath, newContent)) {
      console.log(`Added license header: ${filePath}`)
      changed++
    } else {
      failed++
      failedFiles.push(filePath)
    }
  }

  // Clear progress line
  if (checked >= 100) {
    process.stderr.write('\n')
  }

  console.log(`\nChecked ${checked} files, added headers to ${changed} files`)

  if (failed > 0) {
    console.log(`\n⚠️  WARNING: ${failed} files failed (read/write errors)`)
    console.log('Failed files:')
    failedFiles.forEach((file) => console.log(`  - ${file}`))
    console.log('\nPlease check file permissions and try again.')
    return 1
  }

  if (changed > 0) {
    console.log('\nPlease review and stage the changes:')
    console.log('  git add <files>')
    console.log('  git commit')
  }

  return 0
}

function parseArgs() {
  const args = process.argv.slice(2)
  const result = {
    mode: 'check', // default mode
    files: [],
    quiet: false,
  }

  for (const arg of args) {
    if (arg === '--check') {
      result.mode = 'check'
    } else if (arg === '--fix') {
      result.mode = 'fix'
    } else if (arg === '--quiet') {
      result.quiet = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Apache License Header Checker for CodeMie UI

Usage:
  node check_license_headers.mjs [options] [files...]

Options:
  --check         Check for missing headers and return non-zero if any found (default)
  --fix           Add headers where missing
  --quiet         Suppress progress output (recommended for CI environments)
  --help, -h      Show this help message

Examples:
  node check_license_headers.mjs --check                    # Check all files (CI mode)
  node check_license_headers.mjs --fix                      # Add headers to all files
  node check_license_headers.mjs --check src/App.tsx        # Check specific file
  node check_license_headers.mjs --fix src/components/      # Fix specific directory

Exit codes:
  --check mode: Returns 1 if any files missing headers, 0 if all have headers
  --fix mode:   Returns 1 if any read/write failures, 0 if all succeeded
      `)
      process.exit(0)
    } else {
      result.files.push(arg)
    }
  }

  return result
}

function* walkDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        yield* walkDirectory(entryPath)
      }
    } else if (entry.isFile()) {
      yield path.relative(process.cwd(), entryPath)
    }
  }
}

function collectSpecificFiles(fileArgs, processor) {
  const projectRoot = process.cwd()
  const files = []
  for (const file of fileArgs) {
    const fullPath = path.resolve(file)
    if (!fullPath.startsWith(projectRoot + path.sep) && fullPath !== projectRoot) {
      console.error(`Error: Path outside project: ${file}`)
      return null
    }
    if (!fs.existsSync(fullPath)) {
      console.error(`Error: File not found: ${file}`)
      return null
    }

    const stats = fs.statSync(fullPath)
    if (stats.isDirectory()) {
      // Recursively get files from directory
      files.push(...Array.from(walkDirectory(fullPath)))
    } else if (stats.isFile()) {
      const relativePath = path.relative(process.cwd(), fullPath)
      const { eligible } = processor.isEligible(relativePath)
      if (!eligible) {
        continue
      }
      files.push(relativePath)
    }
  }
  return files
}

function main() {
  const args = parseArgs()

  // Load license template
  const licenseLines = loadLicenseTemplate()
  const licenseFirstLine = licenseLines[0] || ''

  // Initialize components
  const formatter = new CommentStyleFormatter(licenseLines)
  const detector = new HeaderDetector(licenseFirstLine)
  const inserter = new HeaderInserter(formatter)
  const processor = new FileProcessor(formatter, detector, FileValidator, inserter)

  // Get files to process
  let files
  if (args.files.length > 0) {
    // Process specific files
    files = collectSpecificFiles(args.files, processor)
    if (files === null) {
      return 1
    }
  } else {
    // Get all files in repository
    files = Array.from(iterRepoFiles())
  }

  // Run in fix or check mode
  if (args.mode === 'fix') {
    return fix(files, processor, detector)
  }

  // Default: check mode
  const missing = check(files, processor, detector, args.quiet)
  return missing > 0 ? 1 : 0
}

// Entry point
// Run main if this module is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = main()
  process.exit(exitCode)
}

export {
  main,
  CommentStyleFormatter,
  HeaderDetector,
  HeaderInserter,
  FileValidator,
  FileProcessor,
  parseArgs,
  iterRepoFiles,
  walkDirectory,
  collectSpecificFiles,
  check,
  fix,
}
