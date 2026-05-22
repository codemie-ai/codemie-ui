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

import * as fileSaver from 'file-saver'
import { describe, it, expect, vi, beforeEach } from 'vitest'


import api, { parseContentDispositionFilename, sanitizeFileName } from '@/utils/api'
import toaster from '@/utils/toaster'

vi.mock('file-saver', () => ({ saveAs: vi.fn() }))

describe('handleError', () => {
  it('should correctly handle an error response', () => {
    const errorBody = {
      message: 'An error occurred',
      details: 'This is the error details',
      help: 'Here is some help',
    }

    api.handleError({ error: errorBody })

    expect(toaster.error).toHaveBeenCalledWith(
      'An error occurred<br> This is the error details<br><i>Here is some help</i>'
    )
  })

  it('does not include help text if includeHelp is false', () => {
    const errorBody = {
      message: 'An error occurred',
      details: 'This is the error details',
      help: 'Here is some help',
    }

    api.handleError({ error: errorBody }, false)

    expect(toaster.error).toHaveBeenCalledWith('An error occurred<br> This is the error details')
  })

  it('shows default error message if error handling fails', () => {
    api.handleError({} as any)

    expect(toaster.error).toHaveBeenCalledWith('Oops! Something went wrong')
  })
})

describe('parseContentDispositionFilename', () => {
  it('should return undefined when header is null', () => {
    expect(parseContentDispositionFilename(null)).toBeUndefined()
  })

  it('should return undefined when header is an empty string', () => {
    expect(parseContentDispositionFilename('')).toBeUndefined()
  })

  it('should return undefined when header has no filename', () => {
    expect(parseContentDispositionFilename('attachment')).toBeUndefined()
  })

  it('should parse a quoted plain filename', () => {
    expect(parseContentDispositionFilename('attachment; filename="report.pdf"')).toBe('report.pdf')
  })

  it('should parse an unquoted plain filename', () => {
    expect(parseContentDispositionFilename('attachment; filename=report.pdf')).toBe('report.pdf')
  })

  it('should decode an RFC 5987 UTF-8 encoded filename (uppercase UTF-8)', () => {
    expect(
      parseContentDispositionFilename("attachment; filename*=UTF-8''%D0%B7%D0%B2%D1%96%D1%82.pdf")
    ).toBe('звіт.pdf')
  })

  it('should decode an RFC 5987 filename with lowercase utf-8 prefix', () => {
    expect(parseContentDispositionFilename("attachment; filename*=utf-8''My%20Report.pdf")).toBe(
      'My Report.pdf'
    )
  })

  it('should prefer RFC 5987 over plain filename when both are present', () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename="fallback.pdf"; filename*=UTF-8\'\'%D0%B7%D0%B2%D1%96%D1%82.pdf'
      )
    ).toBe('звіт.pdf')
  })

  it('should fall back to plain filename when RFC 5987 percent-encoding is invalid', () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename*=UTF-8\'\'%GG.pdf; filename="fallback.pdf"'
      )
    ).toBe('fallback.pdf')
  })
})

describe('sanitizeFileName', () => {
  it('should return undefined when name is undefined', () => {
    expect(sanitizeFileName(undefined)).toBeUndefined()
  })

  it('should return undefined when name is an empty string', () => {
    expect(sanitizeFileName('')).toBeUndefined()
  })

  it('should leave a safe filename unchanged', () => {
    expect(sanitizeFileName('report.pdf')).toBe('report.pdf')
  })

  it('should preserve Cyrillic characters', () => {
    expect(sanitizeFileName('звіт_2024.pdf')).toBe('звіт_2024.pdf')
  })

  it('should preserve spaces and parentheses', () => {
    expect(sanitizeFileName('My Report (Q3).pdf')).toBe('My Report (Q3).pdf')
  })

  it('should replace forward slashes with underscores', () => {
    // Each '/' → '_'; then the leading dots are stripped by the second replace,
    // giving '_.._.._etc_passwd'
    expect(sanitizeFileName('../../../etc/passwd')).toBe('_.._.._etc_passwd')
  })

  it('should replace backslashes with underscores', () => {
    expect(sanitizeFileName('file\\name.pdf')).toBe('file_name.pdf')
  })

  it('should replace null bytes with underscores', () => {
    expect(sanitizeFileName('file\x00name.pdf')).toBe('file_name.pdf')
  })

  it('should replace control characters with underscores', () => {
    expect(sanitizeFileName('file\x1fname.pdf')).toBe('file_name.pdf')
  })

  it('should strip a leading dot', () => {
    expect(sanitizeFileName('.hidden')).toBe('hidden')
  })

  it('should strip leading spaces', () => {
    expect(sanitizeFileName('   spaces.pdf')).toBe('spaces.pdf')
  })

  it('should return undefined when the name becomes empty after sanitization', () => {
    // Leading dots stripped by the second replace, trailing spaces stripped by trim()
    // — the result is an empty string which coerces to undefined via || undefined
    expect(sanitizeFileName('.   ')).toBeUndefined()
  })
})

describe('downloadFileStream', () => {
  const mockBlob = new Blob(['content'], { type: 'application/octet-stream' })

  const mockFetchResponse = (blob: Blob, headers: Record<string, string> = {}) => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.close()
      },
    })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
      headers: { get: (key: string) => headers[key] ?? null },
    })
    vi.spyOn(global, 'Response').mockImplementation(
      () => ({ blob: () => Promise.resolve(blob) } as any)
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls saveAs with the provided fileName', async () => {
    mockFetchResponse(mockBlob)
    const saveAsSpy = vi.spyOn(fileSaver, 'saveAs')

    await api.downloadFileStream('v1/files/123', undefined, 'report.pdf')

    expect(saveAsSpy).toHaveBeenCalledWith(mockBlob, 'report.pdf')
  })

  it('calls saveAs with filename from content-disposition when no fileName provided', async () => {
    mockFetchResponse(mockBlob, { 'content-disposition': 'attachment; filename="export.csv"' })
    const saveAsSpy = vi.spyOn(fileSaver, 'saveAs')

    await api.downloadFileStream('v1/files/123')

    expect(saveAsSpy).toHaveBeenCalledWith(mockBlob, 'export.csv')
  })

  it('calls saveAs with default name when no fileName and no content-disposition', async () => {
    mockFetchResponse(mockBlob)
    const saveAsSpy = vi.spyOn(fileSaver, 'saveAs')

    await api.downloadFileStream('v1/files/123')

    expect(saveAsSpy).toHaveBeenCalledWith(mockBlob, 'download')
  })

  it('does not call saveAs when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Not found' } }),
    })
    const saveAsSpy = vi.spyOn(fileSaver, 'saveAs')

    await api.downloadFileStream('v1/files/123')

    expect(saveAsSpy).not.toHaveBeenCalled()
  })

  it('never calls document.body.appendChild', async () => {
    mockFetchResponse(mockBlob)
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')

    await api.downloadFileStream('v1/files/123', undefined, 'file.pdf')

    expect(appendChildSpy).not.toHaveBeenCalled()
  })
})
