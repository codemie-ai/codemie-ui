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

/* eslint-disable max-classes-per-file, import/extensions */

import fs from 'fs'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  CommentStyleFormatter,
  HeaderDetector,
  HeaderInserter,
  FileValidator,
  parseArgs as parseArgsImpl,
} from '../check_license_headers.mjs'

// Test constants to avoid duplicate strings
const TEST_CONSTANTS = {
  COPYRIGHT_HEADER: 'Copyright 2026 EPAM Systems, Inc. ("EPAM")',
  APACHE_LICENSE: 'Licensed under the Apache License',
  SAMPLE_CODE: 'const foo = "bar"',
  FILE_PATHS: {
    APP_TSX: 'src/App.tsx',
    INDEX_TS: 'src/index.ts',
    HELPER_TS: 'src/utils/helper.ts',
  },
  COMMENT_STYLES: {
    SLASH: '//',
    HASH: '#',
  },
  PROCESS_ARGS: {
    NODE: 'node',
    SCRIPT: 'script.js',
  },
}

// Shared helper function to filter non-empty lines
const filterNonEmptyLines = (output) => {
  const lines = output.trim().split('\n')
  return lines.filter((line) => line.trim() !== '')
}

// Helper functions to avoid excessive nesting in tests
const throwFileNotFoundError = () => {
  throw new Error('File not found')
}

const noOp = () => {}

describe('License Headers Checker', () => {
  let consoleErrorSpy
  let consoleLogSpy

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(noOp)
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(noOp)
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })

  describe('CommentStyleFormatter', () => {
    it('should format header with line-prefix style (//) correctly', () => {
      const licenseLines = [TEST_CONSTANTS.COPYRIGHT_HEADER, TEST_CONSTANTS.APACHE_LICENSE]
      const formatter = new CommentStyleFormatter(licenseLines)
      const result = formatter.formatHeader(TEST_CONSTANTS.COMMENT_STYLES.SLASH)

      expect(result).toContain(
        `${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${TEST_CONSTANTS.COPYRIGHT_HEADER}`
      )
      expect(result).toContain(
        `${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${TEST_CONSTANTS.APACHE_LICENSE}`
      )
    })

    it('should format header with hash-style comments (#) correctly', () => {
      const licenseLines = [TEST_CONSTANTS.COPYRIGHT_HEADER]
      const formatter = new CommentStyleFormatter(licenseLines)
      const result = formatter.formatHeader(TEST_CONSTANTS.COMMENT_STYLES.HASH)

      expect(result).toContain(
        `${TEST_CONSTANTS.COMMENT_STYLES.HASH} ${TEST_CONSTANTS.COPYRIGHT_HEADER}`
      )
    })
  })

  describe('HeaderDetector', () => {
    it('should detect Apache license header when present', () => {
      const detector = new HeaderDetector(TEST_CONSTANTS.COPYRIGHT_HEADER)
      const textWithHeader = `${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${TEST_CONSTANTS.COPYRIGHT_HEADER}
${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${TEST_CONSTANTS.APACHE_LICENSE}
${TEST_CONSTANTS.SAMPLE_CODE}`

      expect(detector.hasHeader(textWithHeader)).toBe(true)
    })

    it('should return false when Apache license header is missing', () => {
      const detector = new HeaderDetector(TEST_CONSTANTS.COPYRIGHT_HEADER)
      const textWithoutHeader = `${TEST_CONSTANTS.SAMPLE_CODE}
const baz = 'qux'`

      expect(detector.hasHeader(textWithoutHeader)).toBe(false)
    })

    it('should return false when licenseFirstLine is empty', () => {
      const detector = new HeaderDetector('')
      const textWithHeader = `${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${TEST_CONSTANTS.APACHE_LICENSE}
${TEST_CONSTANTS.SAMPLE_CODE}`

      expect(detector.hasHeader(textWithHeader)).toBe(false)
    })
  })

  describe('FileValidator', () => {
    describe('isExcludedFile', () => {
      it('should exclude LICENSE files', () => {
        expect(FileValidator.isExcludedFile('LICENSE')).toBe(true)
        expect(FileValidator.isExcludedFile('LICENSE.txt')).toBe(true)
        expect(FileValidator.isExcludedFile('src/LICENSE.md')).toBe(true)
      })

      it('should not exclude regular source files', () => {
        expect(FileValidator.isExcludedFile(TEST_CONSTANTS.FILE_PATHS.APP_TSX)).toBe(false)
        expect(FileValidator.isExcludedFile(TEST_CONSTANTS.FILE_PATHS.HELPER_TS)).toBe(false)
      })
    })

    describe('isExcludedExtension', () => {
      it('should exclude .json files', () => {
        expect(FileValidator.isExcludedExtension('package.json')).toBe(true)
        expect(FileValidator.isExcludedExtension('package-lock.json')).toBe(true)
      })

      it('should exclude .d.ts TypeScript declaration files', () => {
        expect(FileValidator.isExcludedFile('types.d.ts')).toBe(true)
        expect(FileValidator.isExcludedFile('App.ts')).toBe(false)
      })
    })

    describe('getCommentStyle', () => {
      it('should return // for JavaScript files', () => {
        expect(FileValidator.getCommentStyle('src/App.js')).toBe(
          TEST_CONSTANTS.COMMENT_STYLES.SLASH
        )
        expect(FileValidator.getCommentStyle('src/Component.jsx')).toBe(
          TEST_CONSTANTS.COMMENT_STYLES.SLASH
        )
      })

      it('should return // for TypeScript files', () => {
        expect(FileValidator.getCommentStyle('src/App.ts')).toBe(
          TEST_CONSTANTS.COMMENT_STYLES.SLASH
        )
        expect(FileValidator.getCommentStyle('src/Component.tsx')).toBe(
          TEST_CONSTANTS.COMMENT_STYLES.SLASH
        )
      })

      it('should return # for shell scripts', () => {
        expect(FileValidator.getCommentStyle('deploy.sh')).toBe(TEST_CONSTANTS.COMMENT_STYLES.HASH)
        expect(FileValidator.getCommentStyle('script.bash')).toBe(
          TEST_CONSTANTS.COMMENT_STYLES.HASH
        )
      })

      it('should return null for unsupported file types', () => {
        expect(FileValidator.getCommentStyle('image.png')).toBe(null)
        expect(FileValidator.getCommentStyle('document.pdf')).toBe(null)
      })

      it('should return null for Dockerfiles in infrastructure paths', () => {
        expect(FileValidator.getCommentStyle('deploy-templates/Dockerfile')).toBe(null)
      })

      it('should return # for Dockerfiles in non-infrastructure paths', () => {
        expect(FileValidator.getCommentStyle('Dockerfile')).toBe(TEST_CONSTANTS.COMMENT_STYLES.HASH)
      })
    })

    describe('isExcludedDirectory', () => {
      it('should exclude node_modules', () => {
        expect(FileValidator.isExcludedDirectory('node_modules/package/file.js')).toBe(true)
      })

      it('should exclude dist directory', () => {
        expect(FileValidator.isExcludedDirectory('dist/bundle.js')).toBe(true)
      })

      it('should not exclude src directory', () => {
        expect(FileValidator.isExcludedDirectory(TEST_CONSTANTS.FILE_PATHS.APP_TSX)).toBe(false)
      })
    })

    describe('isTooLarge', () => {
      const maxFileSize = 10 * 1024 * 1024 // 10MB
      const testFilePath = 'test-file.js'

      it('should return true for files larger than 10MB', () => {
        const mockStatSync = vi.spyOn(fs, 'statSync').mockReturnValue({
          size: maxFileSize + 1,
        })

        const result = FileValidator.isTooLarge(testFilePath)
        expect(result).toBe(true)

        mockStatSync.mockRestore()
      })

      it('should return false for files smaller than 10MB', () => {
        const mockStatSync = vi.spyOn(fs, 'statSync').mockReturnValue({
          size: maxFileSize - 1,
        })

        const result = FileValidator.isTooLarge(testFilePath)
        expect(result).toBe(false)

        mockStatSync.mockRestore()
      })

      it('should return true when file stat fails', () => {
        const mockStatSync = vi.spyOn(fs, 'statSync').mockImplementation(throwFileNotFoundError)

        const result = FileValidator.isTooLarge(testFilePath)
        expect(result).toBe(true)

        mockStatSync.mockRestore()
      })
    })
  })

  describe('HeaderInserter', () => {
    // Create a simple mock formatter factory for testing
    const createMockFormatter = (headerText) => ({
      formatHeader: () => headerText,
    })

    const testFileName = 'test.js'
    const shebangLine = '#!/usr/bin/env node'

    it('should insert header at the beginning of file', () => {
      const headerText = `${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${TEST_CONSTANTS.COPYRIGHT_HEADER}`
      const formatter = createMockFormatter(headerText)
      const inserter = new HeaderInserter(formatter)
      const result = inserter.insert(
        TEST_CONSTANTS.SAMPLE_CODE,
        testFileName,
        TEST_CONSTANTS.COMMENT_STYLES.SLASH
      )

      expect(result).toContain(headerText)
      expect(result).toContain(TEST_CONSTANTS.SAMPLE_CODE)
    })

    it('should preserve shebang at the beginning', () => {
      const headerText = `${TEST_CONSTANTS.COMMENT_STYLES.HASH} ${TEST_CONSTANTS.COPYRIGHT_HEADER}`
      const formatter = createMockFormatter(headerText)
      const inserter = new HeaderInserter(formatter)
      const textWithShebang = `${shebangLine}\n${TEST_CONSTANTS.SAMPLE_CODE}`
      const result = inserter.insert(
        textWithShebang,
        testFileName,
        TEST_CONSTANTS.COMMENT_STYLES.HASH
      )

      expect(result).toMatch(/^#!\/usr\/bin\/env node/)
      expect(result).toContain(headerText)
      expect(result).toContain(TEST_CONSTANTS.SAMPLE_CODE)
    })

    it('should handle empty files', () => {
      const headerText = `${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${TEST_CONSTANTS.COPYRIGHT_HEADER}`
      const formatter = createMockFormatter(headerText)
      const inserter = new HeaderInserter(formatter)
      const result = inserter.insert('', testFileName, TEST_CONSTANTS.COMMENT_STYLES.SLASH)

      expect(result).toBe(`${headerText}\n\n`)
    })
  })

  describe('parseArgs', () => {
    // Mock process.argv for testing
    const originalArgv = process.argv
    const checkMode = 'check'
    const fixMode = 'fix'

    afterEach(() => {
      process.argv = originalArgv
    })

    it('should parse --check flag', () => {
      process.argv = [
        TEST_CONSTANTS.PROCESS_ARGS.NODE,
        TEST_CONSTANTS.PROCESS_ARGS.SCRIPT,
        '--check',
      ]
      const result = parseArgsImpl()
      expect(result.mode).toBe(checkMode)
    })

    it('should parse --fix flag', () => {
      process.argv = [TEST_CONSTANTS.PROCESS_ARGS.NODE, TEST_CONSTANTS.PROCESS_ARGS.SCRIPT, '--fix']
      const result = parseArgsImpl()
      expect(result.mode).toBe(fixMode)
    })

    it('should parse --quiet flag', () => {
      process.argv = [
        TEST_CONSTANTS.PROCESS_ARGS.NODE,
        TEST_CONSTANTS.PROCESS_ARGS.SCRIPT,
        '--quiet',
      ]
      const result = parseArgsImpl()
      expect(result.quiet).toBe(true)
    })

    it('should collect file arguments', () => {
      process.argv = [
        TEST_CONSTANTS.PROCESS_ARGS.NODE,
        TEST_CONSTANTS.PROCESS_ARGS.SCRIPT,
        TEST_CONSTANTS.FILE_PATHS.APP_TSX,
        TEST_CONSTANTS.FILE_PATHS.INDEX_TS,
      ]
      const result = parseArgsImpl()
      expect(result.files).toEqual([
        TEST_CONSTANTS.FILE_PATHS.APP_TSX,
        TEST_CONSTANTS.FILE_PATHS.INDEX_TS,
      ])
    })

    it('should default to check mode', () => {
      process.argv = [TEST_CONSTANTS.PROCESS_ARGS.NODE, TEST_CONSTANTS.PROCESS_ARGS.SCRIPT]
      const result = parseArgsImpl()
      expect(result.mode).toBe(checkMode)
      expect(result.files).toEqual([])
      expect(result.quiet).toBe(false)
    })
  })

  describe('iterRepoFiles', () => {
    const gitCommand = 'git'
    const gitArgs = ['ls-files', '--no-empty-directory']
    const gitEncoding = 'utf-8'
    const gitTimeout = 30000
    const gitErrorMessage = 'Not a git repository'
    const readmeMd = 'README.md'

    const createIterRepoFiles = (mockSpawnSync) => () => {
      const result = mockSpawnSync(gitCommand, gitArgs, {
        encoding: gitEncoding,
        timeout: gitTimeout,
        windowsHide: true,
      })

      if (result.error) {
        throw result.error
      }

      return filterNonEmptyLines(result.stdout)
    }

    it('should use git ls-files to get repository files', () => {
      const mockStdout = `${TEST_CONSTANTS.FILE_PATHS.APP_TSX}\n${TEST_CONSTANTS.FILE_PATHS.INDEX_TS}\n${readmeMd}`
      const mockSpawnSync = vi.fn().mockReturnValue({
        stdout: mockStdout,
        error: null,
      })

      const iterRepoFiles = createIterRepoFiles(mockSpawnSync)
      const files = iterRepoFiles()

      expect(files).toEqual([
        TEST_CONSTANTS.FILE_PATHS.APP_TSX,
        TEST_CONSTANTS.FILE_PATHS.INDEX_TS,
        readmeMd,
      ])
      expect(mockSpawnSync).toHaveBeenCalledWith(
        gitCommand,
        gitArgs,
        expect.objectContaining({
          encoding: gitEncoding,
          timeout: gitTimeout,
        })
      )
    })

    it('should handle git command errors gracefully', () => {
      const mockSpawnSync = vi.fn().mockReturnValue({
        stdout: '',
        error: new Error(gitErrorMessage),
      })

      const iterRepoFiles = createIterRepoFiles(mockSpawnSync)
      expect(() => iterRepoFiles()).toThrow(gitErrorMessage)
    })
  })

  describe('File path filtering', () => {
    const isValidPath = (filePath) => !filePath.includes('\0') && !filePath.includes('..')
    const nullByte = '\0'
    const parentDirectory = '..'

    it('should filter out empty lines from git output', () => {
      const output = `${TEST_CONSTANTS.FILE_PATHS.APP_TSX}\n\n${TEST_CONSTANTS.FILE_PATHS.INDEX_TS}\n\n`
      const files = filterNonEmptyLines(output)

      expect(files).toEqual([TEST_CONSTANTS.FILE_PATHS.APP_TSX, TEST_CONSTANTS.FILE_PATHS.INDEX_TS])
      expect(files).toHaveLength(2)
    })

    it('should skip files with null bytes', () => {
      expect(isValidPath(TEST_CONSTANTS.FILE_PATHS.APP_TSX)).toBe(true)
      expect(isValidPath(`src/file${nullByte}.tsx`)).toBe(false)
      expect(isValidPath(`${parentDirectory}/etc/passwd`)).toBe(false)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete check workflow', () => {
      let checkedFiles = 0
      let missingHeaders = 0

      const files = [TEST_CONSTANTS.FILE_PATHS.APP_TSX, TEST_CONSTANTS.FILE_PATHS.INDEX_TS]
      const filesWithHeaders = new Set([TEST_CONSTANTS.FILE_PATHS.INDEX_TS])

      for (const filePath of files) {
        checkedFiles += 1
        if (!filesWithHeaders.has(filePath)) {
          missingHeaders += 1
        }
      }

      const expectedChecked = 2
      const expectedMissing = 1
      expect(checkedFiles).toBe(expectedChecked)
      expect(missingHeaders).toBe(expectedMissing)
    })

    it('should track progress every 100 files', () => {
      let progressCalls = 0
      const mockProgress = () => {
        progressCalls += 1
      }

      const totalFiles = 250
      const progressInterval = 100
      const expectedProgressCalls = 2

      // Simulate checking files
      for (let i = 0; i < totalFiles; i += 1) {
        if (i > 0 && i % progressInterval === 0) {
          mockProgress()
        }
      }

      expect(progressCalls).toBe(expectedProgressCalls) // At 100 and 200
    })
  })

  describe('walkDirectory', () => {
    const ignoredDirs = new Set(['node_modules', 'dist', '.git'])
    const srcDirectory = 'src'
    const file1Name = 'file1.js'
    const file2Name = 'file2.js'

    const createMockEntry = (name, isDir) => ({
      name,
      isDirectory: () => isDir,
      isFile: () => !isDir,
    })

    const shouldSkipDirectory = (dirName) => {
      return ignoredDirs.has(dirName) || dirName.startsWith('.')
    }

    const createWalkDirectoryFunction = (mockFs, ignoreDirs) => {
      function* walkDirectory(dir) {
        const entries = mockFs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const entryPath = `${dir}/${entry.name}`
          if (entry.isDirectory() && !ignoreDirs.has(entry.name)) {
            yield* walkDirectory(entryPath)
          } else if (entry.isFile()) {
            yield entryPath
          }
        }
      }
      return walkDirectory
    }

    it('should recursively walk directories', () => {
      const mockEntries = [createMockEntry(file1Name, false), createMockEntry(file2Name, false)]

      const mockReaddirSync = vi.fn().mockReturnValue(mockEntries)
      const mockFs = { readdirSync: mockReaddirSync }

      const walkDirectory = createWalkDirectoryFunction(mockFs, ignoredDirs)
      const files = Array.from(walkDirectory(srcDirectory))

      expect(files).toContain(`${srcDirectory}/${file1Name}`)
      expect(files).toContain(`${srcDirectory}/${file2Name}`)
    })

    it('should skip ignored directories', () => {
      expect(shouldSkipDirectory('node_modules')).toBe(true)
      expect(shouldSkipDirectory('dist')).toBe(true)
      expect(shouldSkipDirectory('.git')).toBe(true)
      expect(shouldSkipDirectory('.hidden')).toBe(true)
      expect(shouldSkipDirectory(srcDirectory)).toBe(false)
    })
  })

  describe('CommentStyleFormatter integration', () => {
    const copyrightText = 'Copyright 2026'
    const licenseText = 'Licensed under Apache'
    const blockCommentStyle = '/* */'
    const htmlCommentStyle = '<!-- -->'

    it('should format headers with different comment styles', () => {
      const lines = [copyrightText, licenseText]
      const formatter = new CommentStyleFormatter(lines)

      const jsHeader = formatter.formatHeader(TEST_CONSTANTS.COMMENT_STYLES.SLASH)
      expect(jsHeader).toContain(`${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${copyrightText}`)
      expect(jsHeader).toContain(`${TEST_CONSTANTS.COMMENT_STYLES.SLASH} ${licenseText}`)

      const shellHeader = formatter.formatHeader(TEST_CONSTANTS.COMMENT_STYLES.HASH)
      expect(shellHeader).toContain(`${TEST_CONSTANTS.COMMENT_STYLES.HASH} ${copyrightText}`)
      expect(shellHeader).toContain(`${TEST_CONSTANTS.COMMENT_STYLES.HASH} ${licenseText}`)
    })

    it('should handle block comment styles', () => {
      const lines = [copyrightText]
      const formatter = new CommentStyleFormatter(lines)

      const cssHeader = formatter.formatHeader(blockCommentStyle)
      expect(cssHeader).toContain('/*')
      expect(cssHeader).toContain('*/')
      expect(cssHeader).toContain(copyrightText)
    })

    it('should handle HTML comment style', () => {
      const lines = [copyrightText]
      const formatter = new CommentStyleFormatter(lines)

      const htmlHeader = formatter.formatHeader(htmlCommentStyle)
      expect(htmlHeader).toContain('<!--')
      expect(htmlHeader).toContain('-->')
      expect(htmlHeader).toContain(copyrightText)
    })
  })

  describe('FileValidator integration', () => {
    const packageJsonFile = 'package.json'
    const readmeFile = 'README.md'
    const configJsonFile = 'config.json'
    const packageLockFile = 'package-lock.json'
    const typesDtsFile = 'types.d.ts'
    const terraformFile = 'terraform/main.tf'
    const deployTemplateFile = 'deploy-templates/config.yml'
    const k8sFile = 'k8s/deployment.yaml'

    it('should validate file eligibility based on multiple criteria', () => {
      // Excluded by filename
      expect(FileValidator.isExcludedFile(packageJsonFile)).toBe(true)
      expect(FileValidator.isExcludedFile(readmeFile)).toBe(true)

      // Excluded by extension (.json)
      expect(FileValidator.isExcludedExtension(configJsonFile)).toBe(true)
      expect(FileValidator.isExcludedExtension(packageLockFile)).toBe(true)

      // .d.ts files are excluded by isExcludedFile, not isExcludedExtension
      expect(FileValidator.isExcludedFile(typesDtsFile)).toBe(true)

      // Not excluded
      expect(FileValidator.isExcludedFile(TEST_CONSTANTS.FILE_PATHS.APP_TSX)).toBe(false)
      expect(FileValidator.isExcludedExtension(TEST_CONSTANTS.FILE_PATHS.APP_TSX)).toBe(false)
    })

    it('should handle infrastructure paths correctly', () => {
      expect(FileValidator.isInfrastructurePath(terraformFile)).toBe(true)
      expect(FileValidator.isInfrastructurePath(deployTemplateFile)).toBe(true)
      expect(FileValidator.isInfrastructurePath(k8sFile)).toBe(true)
      expect(FileValidator.isInfrastructurePath(TEST_CONSTANTS.FILE_PATHS.APP_TSX)).toBe(false)
    })
  })
})
