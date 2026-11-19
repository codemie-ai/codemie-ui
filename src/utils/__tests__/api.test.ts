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
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, MockInstance } from 'vitest'

import api, {
  artifactFileName,
  parseContentDispositionFilename,
  sanitizeFileName,
  stripUuidPrefix,
  formatErrorMessage,
} from '@/utils/api'
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

describe('formatErrorMessage', () => {
  it('formats message with string details and help', () => {
    const result = formatErrorMessage({
      error: {
        message: 'Invalid skill bundle',
        details: 'Skill bundle zip must contain exactly one SKILL.md file',
        help: 'Add a single SKILL.md file with YAML frontmatter to the root of the bundle',
      },
    })
    expect(result).toBe(
      'Invalid skill bundle<br> Skill bundle zip must contain exactly one SKILL.md file<br><i>Add a single SKILL.md file with YAML frontmatter to the root of the bundle</i>'
    )
  })

  it('stringifies object details', () => {
    const result = formatErrorMessage({
      error: { message: 'Validation error', details: { field: 'name', issue: 'required' } },
    })
    expect(result).toBe('Validation error<br> {"field":"name","issue":"required"}')
  })

  it('shows no "null" when the backend sends details: null', () => {
    const result = formatErrorMessage({
      error: {
        message: 'Not allowed',
        details: null as unknown as undefined,
        help: null as unknown as undefined,
      },
    })
    expect(result).toBe('Not allowed')
  })

  it('strips existing <br> tags from details', () => {
    const result = formatErrorMessage({
      error: { message: 'Error', details: 'line one<br>line two' },
    })
    expect(result).toBe('Error<br> line oneline two')
  })

  it('omits help when includeHelp is false', () => {
    const result = formatErrorMessage(
      { error: { message: 'Error', details: 'some detail', help: 'help text' } },
      false
    )
    expect(result).toBe('Error<br> some detail')
  })

  it('returns DEFAULT_ERROR_MESSAGE for malformed body', () => {
    const result = formatErrorMessage({} as any)
    expect(result).toBe('Oops! Something went wrong')
  })

  it('omits the details line when details is null', () => {
    const result = formatErrorMessage({
      error: { message: 'Personal integrations cannot be used', details: null, help: null },
    })
    expect(result).toBe('Personal integrations cannot be used')
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
  const mockFetchResponse = (headers: Record<string, string> = {}) => {
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
    // downloadFileStream now constructs the blob itself so it can carry the response
    // Content-Type, so the stub hands back bytes rather than a pre-made Blob instance.
    vi.spyOn(global, 'Response').mockImplementation(function () {
      return { arrayBuffer: () => Promise.resolve(new ArrayBuffer(3)) } as any
    })
  }

  // The identity assertions below became content assertions when the blob stopped being
  // supplied by the caller; `saveAs` receives an equivalent blob, not the same object.
  const expectSavedAs = (saveAsSpy: MockInstance<typeof fileSaver.saveAs>, name: string) => {
    expect(saveAsSpy).toHaveBeenCalledTimes(1)
    const [blob, fileName] = saveAsSpy.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(fileName).toBe(name)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls saveAs with the provided fileName', async () => {
    mockFetchResponse()
    const saveAsSpy = vi.spyOn(fileSaver, 'saveAs')

    await api.downloadFileStream('v1/files/123', undefined, 'report.pdf')

    expectSavedAs(saveAsSpy, 'report.pdf')
  })

  it('calls saveAs with filename from content-disposition when no fileName provided', async () => {
    mockFetchResponse({ 'content-disposition': 'attachment; filename="export.csv"' })
    const saveAsSpy = vi.spyOn(fileSaver, 'saveAs')

    await api.downloadFileStream('v1/files/123')

    expectSavedAs(saveAsSpy, 'export.csv')
  })

  it('calls saveAs with default name when no fileName and no content-disposition', async () => {
    mockFetchResponse()
    const saveAsSpy = vi.spyOn(fileSaver, 'saveAs')

    await api.downloadFileStream('v1/files/123')

    expectSavedAs(saveAsSpy, 'download')
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
    mockFetchResponse()
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')

    await api.downloadFileStream('v1/files/123', undefined, 'file.pdf')

    expect(appendChildSpy).not.toHaveBeenCalled()
  })

  it('calls onSuccessHeaders with the response headers on success', async () => {
    mockFetchResponse({ 'x-workspace-skipped-count': '2' })
    const onSuccessHeaders = vi.fn()

    await api.downloadFileStream('v1/files/123', undefined, 'report.pdf', onSuccessHeaders)

    expect(onSuccessHeaders).toHaveBeenCalledTimes(1)
    expect(onSuccessHeaders.mock.calls[0][0].get('x-workspace-skipped-count')).toBe('2')
  })

  it('does not call onSuccessHeaders when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'Not found' } }),
    })
    const onSuccessHeaders = vi.fn()

    await api.downloadFileStream('v1/files/123', undefined, undefined, onSuccessHeaders)

    expect(onSuccessHeaders).not.toHaveBeenCalled()
  })
})

describe('makeRequest URL building', () => {
  // The unit setup replaces api.get/post with mocks, so load the real class instance.
  let realApi: typeof api
  let originalBase: string
  const originalFetch = global.fetch

  beforeAll(async () => {
    const actual = await vi.importActual<typeof import('@/utils/api')>('@/utils/api')
    realApi = actual.default
    originalBase = realApi.BASE_URL
  })

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({}),
    })
  })

  afterEach(() => {
    realApi.BASE_URL = originalBase
    global.fetch = originalFetch
  })

  const fetchedUrl = () => (global.fetch as any).mock.calls[0][0]

  it.each([
    ['/api', 'v1/x'],
    ['/api', '/v1/x'],
    ['/api/', 'v1/x'],
    ['/api/', '/v1/x'],
  ])('joins base %s and url %s without duplicated slash', async (base, url) => {
    realApi.BASE_URL = base
    await realApi.get(url)
    expect(fetchedUrl()).toBe('/api/v1/x')
  })

  it.each(['v1/x', '/v1/x'])('appends query params after joined url %s', async (url) => {
    realApi.BASE_URL = '/api'
    await realApi.get(url, { params: { a: 1, b: ['x', 'y'] } })
    expect(fetchedUrl()).toBe('/api/v1/x?a=1&b=x&b=y')
  })

  it('shares the join across verbs (post)', async () => {
    realApi.BASE_URL = '/api/'
    await realApi.post('/v1/x', { k: 1 })
    expect(fetchedUrl()).toBe('/api/v1/x')
  })
})

describe('stream error handling', () => {
  const failedResponse = (status: number, text: string) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      body: {
        getReader: () => ({ read: async () => ({ value: new TextEncoder().encode(text) }) }),
      },
      headers: { get: () => null },
    })
  }
  let realApi: typeof api
  beforeAll(async () => {
    const actual = await vi.importActual<typeof import('@/utils/api')>('@/utils/api')
    realApi = actual.default
  })
  const catchStream = async (...args: any[]) => {
    return (realApi.stream as any)(...args).then(
      () => undefined,
      (e: any) => e
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toasts and attaches status for a JSON error body by default', async () => {
    failedResponse(409, JSON.stringify({ error: { message: 'boom' } }))
    const thrown = await catchStream('v1/x', {})
    expect(thrown).toMatchObject({ error: { message: 'boom' }, status: 409 })
    expect(toaster.error).toHaveBeenCalledWith('Failed to generate answer')
  })

  it('does not toast for a JSON error body when errorToast is false', async () => {
    failedResponse(409, JSON.stringify({ error: { message: 'boom' } }))
    const thrown = await catchStream('v1/x', {}, null, 'POST', { errorToast: false })
    expect(thrown.status).toBe(409)
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('toasts and attaches status for a non-JSON error body by default', async () => {
    failedResponse(502, '<html>bad gateway</html>')
    const thrown = await catchStream('v1/x', {})
    expect(thrown.status).toBe(502)
    expect(toaster.error).toHaveBeenCalledWith('Failed to generate answer')
  })

  it('does not toast for a non-JSON error body when errorToast is false', async () => {
    failedResponse(502, '<html>bad gateway</html>')
    const thrown = await catchStream('v1/x', {}, null, 'POST', { errorToast: false })
    expect(thrown.status).toBe(502)
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it.each([
    ['string', '"boom"', 'boom'],
    ['number', '42', 42],
    ['null', 'null', null],
  ])('throws a primitive %s JSON error body unchanged', async (_kind, text, expected) => {
    failedResponse(500, text)
    const thrown = await catchStream('v1/x', {})
    expect(thrown).toBe(expected)
  })
})

describe('stripUuidPrefix', () => {
  const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'

  it('removes a leading storage uuid prefix', () => {
    expect(stripUuidPrefix(`${UUID}_sample_spreadsheet.xlsx`)).toBe('sample_spreadsheet.xlsx')
  })

  it('is case-insensitive', () => {
    expect(stripUuidPrefix(`${UUID.toUpperCase()}_report.csv`)).toBe('report.csv')
  })

  it('leaves a name without a uuid prefix unchanged', () => {
    expect(stripUuidPrefix('report.csv')).toBe('report.csv')
  })

  it('leaves a uuid in the middle of a name unchanged', () => {
    expect(stripUuidPrefix(`my_${UUID}_x.txt`)).toBe(`my_${UUID}_x.txt`)
  })

  it('keeps the original when stripping would empty the name', () => {
    expect(stripUuidPrefix(`${UUID}_`)).toBe(`${UUID}_`)
  })
})

describe('artifactFileName', () => {
  const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'

  it.each([
    ['artifacts/t1/closed_positions_analysis.xlsx', 'closed_positions_analysis.xlsx'],
    ['artifacts/t1/report (2).csv', 'report (2).csv'],
    [`${UUID}_report.csv`, 'report.csv'],
    [`artifacts/t1/${UUID}_x.csv`, 'x.csv'],
    ['artifacts/t1/a\\b.txt', 'a_b.txt'],
    ['artifacts/t1/f\x00.txt', 'f_.txt'],
  ])('names %j as %j', (name, expected) => {
    expect(artifactFileName(name)).toBe(expected)
  })

  it.each([['artifacts/t1/'], ['a/..'], ['a/.'], [''], [undefined]])(
    'returns undefined for %j',
    (name) => {
      expect(artifactFileName(name)).toBeUndefined()
    }
  )
})
