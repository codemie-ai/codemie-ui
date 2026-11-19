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

import { describe, it, expect, vi } from 'vitest'

import {
  decodeArtifactId,
  getArtifactFile,
  getArtifactLink,
  hasSeamRenderedLink,
} from '../artifactLink'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'https://api.example.com',
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/utils/api', async () => {
  const actual = await vi.importActual<typeof import('@/utils/api')>('@/utils/api')
  return { ...actual, default: mockApi }
})

const linkToken = (href: string) => ({ type: 'link', raw: '', href, text: 'Download' } as any)

const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'

/**
 * Builds a file id the way the back end does — `StringSerializer.serialize` over
 * `[mime_type, owner, name]`, i.e. base64 of a `<len>~<value>` triple (file_object.py:147).
 */
const encodedId = (name: string, mimeType = 'text/csv', owner = UUID) => {
  const part = (value: string) => `${value.length}~${value}`
  const payload = `${part(mimeType)}${part(owner)}${part(name)}`
  return btoa(String.fromCharCode(...new TextEncoder().encode(payload)))
}

describe('getArtifactLink', () => {
  it('shows the decoded original file name, not the encoded segment', () => {
    const fileId = encodedId('report.csv')

    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))).toMatchObject({
      fileId,
      fileName: 'report.csv',
    })
  })

  it('strips the storage uuid prefix from the display name but not from the id', () => {
    const fileId = encodedId(`${UUID}_report.csv`)

    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))).toMatchObject({
      fileId,
      fileName: 'report.csv',
    })
  })

  // D1: the back end now names workspace artifacts `artifacts/<turn-id>/<name>`.
  it('shows only the last path segment of a workspace artifact name', () => {
    const fileId = encodedId('artifacts/abc123/closed_positions_analysis.xlsx')

    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))).toMatchObject({
      fileId,
      fileName: 'closed_positions_analysis.xlsx',
    })
  })

  // The chip exposes the MIME type on its type badge
  it('keeps the decoded MIME type for display', () => {
    const fileId = encodedId('artifacts/t1/report.xlsx', 'application/vnd.ms-excel')

    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))).toEqual({
      fileId,
      fileName: 'report.xlsx',
      mimeType: 'application/vnd.ms-excel',
      isTurnArtifact: false,
    })
  })

  it('keeps a renamed duplicate distinct, each with its own file id', () => {
    const first = encodedId('artifacts/t1/report.csv')
    const second = encodedId('artifacts/t1/report (2).csv')

    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${first}`))).toMatchObject({
      fileId: first,
      fileName: 'report.csv',
    })
    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${second}`))).toMatchObject({
      fileId: second,
      fileName: 'report (2).csv',
    })
  })

  it('returns no chip for a workspace path with no file name', () => {
    const fileId = encodedId('artifacts/t1/')

    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))).toBeNull()
  })

  it('accepts an id carrying the base64 alphabet characters + / and =', () => {
    // `resumé …` forces multi-byte bytes, which is how `+` and `/` reach a real id
    const fileId = encodedId('a+b/c résumé (1).xlsx', 'application/vnd.ms-excel')
    expect(fileId).toMatch(/[+/=]/)

    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))?.fileName).toBe(
      'c résumé (1).xlsx'
    )
  })

  it('returns no chip, and does not throw, for an undecodable segment', () => {
    const token = linkToken('https://api.example.com/v1/files/not-a-valid-payload')

    expect(() => getArtifactLink(token)).not.toThrow()
    expect(getArtifactLink(token)).toBeNull()
  })

  it('returns the raw segment as fileId, byte-identical, never a decoded value', () => {
    const fileId = encodedId('report.csv')
    const result = getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))

    expect(result?.fileId).toBe(fileId)
    expect(result?.fileId).not.toContain('report.csv')
    expect(result?.fileId).not.toContain('text/csv')
  })

  it('returns null for a non-artifact href', () => {
    expect(getArtifactLink(linkToken('https://elsewhere.com/x'))).toBeNull()
  })

  it('returns null for a non-link token', () => {
    expect(getArtifactLink({ type: 'text', raw: '[Download](sandbo' } as any)).toBeNull()
  })

  it('returns null for a link token with no href', () => {
    expect(getArtifactLink({ type: 'link', raw: '' } as any)).toBeNull()
  })

  it('sanitizes the display name of an accepted file id', () => {
    const result = getArtifactLink(
      linkToken(`https://api.example.com/v1/files/${encodedId('../../etc/passwd')}`)
    )

    expect(result?.fileName).not.toMatch(/[/\\]/)
    expect(result?.fileName.startsWith('.')).toBe(false)
  })

  // Criterion 9: the value concatenated into the authenticated download URL, not just the
  // display name, must reject anything that could redirect the request to another API path.
  it('returns null for a traversal-shaped file id', () => {
    const result = getArtifactLink(
      linkToken('https://api.example.com/v1/files/x/../../v1/users/me')
    )

    expect(result).toBeNull()
  })

  // `/` is a base64 character and can no longer be rejected wholesale, so traversal and an
  // absolute path must be rejected explicitly — otherwise widening the alphabet reopens CR-001.
  it.each([
    ['../etc/passwd', 'a bare traversal'],
    ['..%2Fetc', 'an encoded traversal'],
    ['/v1/users/me', 'an absolute path'],
    ['a\\..\\b', 'a backslash traversal'],
  ])('returns null for %s (%s), even though / is now a legal character', (fileId) => {
    expect(getArtifactLink(linkToken(`https://api.example.com/v1/files/${fileId}`))).toBeNull()
  })

  it('returns null for an encoded traversal file id', () => {
    const result = getArtifactLink(
      linkToken('https://api.example.com/v1/files/x_%2F..%2Fetc%2Fpasswd')
    )

    expect(result).toBeNull()
  })

  it('returns null for a file id carrying a control character', () => {
    expect(getArtifactLink(linkToken('https://api.example.com/v1/files/a\u0000b.csv'))).toBeNull()
  })

  it('returns null for a file id carrying a query string', () => {
    expect(getArtifactLink(linkToken('https://api.example.com/v1/files/abc?token=evil'))).toBeNull()
  })

  it('returns null when the segment after the files prefix is empty', () => {
    expect(getArtifactLink(linkToken('https://api.example.com/v1/files/'))).toBeNull()
  })

  it('does not throw on a malformed percent escape', () => {
    expect(() =>
      getArtifactLink(linkToken('https://api.example.com/v1/files/x_%E0%A4a'))
    ).not.toThrow()
  })

  it('renders no chip for a segment that is not an encoded payload', () => {
    // Every artifact URL the back end emits is an encoded triple (artifact_storage.py:67),
    // so a plain name here means the link is not an artifact we can name or download.
    expect(getArtifactLink(linkToken('https://api.example.com/v1/files/report.csv'))).toBeNull()
  })

  it('keeps a share_token grant on the file id and decodes the name from the bare token', () => {
    const fileId = encodedId('report.csv')
    const href = `https://api.example.com/v1/files/${fileId}?share_token=AbC123`

    expect(getArtifactLink(linkToken(href))).toMatchObject({
      fileId: `${fileId}?share_token=AbC123`,
      fileName: 'report.csv',
    })
  })

  it('strips the storage uuid from the name only when a share_token grant is present', () => {
    const fileId = encodedId(`${UUID}_report.csv`)
    const href = `https://api.example.com/v1/files/${fileId}?share_token=AbC123`

    expect(getArtifactLink(linkToken(href))).toMatchObject({
      fileId: `${fileId}?share_token=AbC123`,
      fileName: 'report.csv',
    })
  })

  it.each([
    '?share_token=',
    '?share_token=a&x=1',
    '?x=1&share_token=a',
    '?share_token=a%2F',
    '?share_token=a+b',
    '?share_token=a#f',
    '?',
    '?SHARE_TOKEN=a',
    '?share_token=a?b',
  ])('returns null for a valid id with the query %s', (suffix) => {
    const href = `https://api.example.com/v1/files/${encodedId('report.csv')}${suffix}`

    expect(getArtifactLink(linkToken(href))).toBeNull()
  })

  it.each(['../etc', '...', 'a\\b', 'not-a-valid-payload', 'x_%E0%A4a'])(
    'returns null for the unsafe bare token %s even with a valid share_token',
    (bareId) => {
      const href = `https://api.example.com/v1/files/${bareId}?share_token=abc`

      expect(getArtifactLink(linkToken(href))).toBeNull()
    }
  )
})

describe('hasSeamRenderedLink', () => {
  it('is true only when a child token is a link the seam renders itself', () => {
    expect(
      hasSeamRenderedLink({
        type: 'paragraph',
        raw: '',
        tokens: [linkToken(`https://api.example.com/v1/files/${encodedId('b.csv')}`)],
      } as any)
    ).toBe(true)

    expect(
      hasSeamRenderedLink({
        type: 'paragraph',
        raw: '',
        tokens: [linkToken('https://x.com/y')],
      } as any)
    ).toBe(false)

    expect(hasSeamRenderedLink({ type: 'paragraph', raw: '' } as any)).toBe(false)
  })

  it('is true for a paragraph holding a disarmed link', () => {
    expect(
      hasSeamRenderedLink({
        type: 'paragraph',
        raw: '',
        tokens: [linkToken('filesystem:/tmp/x.xlsx')],
      } as any)
    ).toBe(true)
  })

  it('accepts a single non-array child token', () => {
    expect(
      hasSeamRenderedLink({
        type: 'paragraph',
        raw: '',
        tokens: linkToken(`https://api.example.com/v1/files/${encodedId('b.csv')}`),
      } as any)
    ).toBe(true)
  })
})

/** Like `encodedId`, but `len` counts code points, as the back end's Python `len()` does */
const codePointId = (parts: string[]) => {
  const payload = parts.map((p) => `${[...p].length}~${p}`).join('')
  return btoa(String.fromCharCode(...new TextEncoder().encode(payload)))
}

describe('decodeArtifactId', () => {
  it('decodes a new-format token', () => {
    expect(
      decodeArtifactId(encodedId('artifacts/t1/report.csv', 'text/csv', 'workspace-w1'))
    ).toEqual(['text/csv', 'workspace-w1', 'artifacts/t1/report.csv'])
  })

  it('accepts a name with an emoji', () => {
    expect(decodeArtifactId(codePointId(['text/csv', UUID, '📊 report.csv']))?.[2]).toBe(
      '📊 report.csv'
    )
  })

  it('accepts a legacy three-part token', () => {
    expect(decodeArtifactId(btoa('text/csv_owner1_report.csv'))).toEqual([
      'text/csv',
      'owner1',
      'report.csv',
    ])
  })

  it.each([
    [
      '53fea99f positions',
      'MTN+dGV4dC94bWFnbWVkaWF0YWZsZXMvZGVtbzIvc2FtcGxlZGlyL3NvbWUvdGVzdF9zYW1wbGVkaXIvc2FtcGxlZmlsZXMvY2xvc2VkX3Bvc2l0aW9uc19hbmFseXNpcy54bHN4',
    ],
    [
      'd605145e csv, length off by two',
      'MTN+dGV4dC94LXB5dGhvbjQ2fndvcmtzcGFjZS04NjYyZDRjYi0zNGNlLTRmNzEtYWNmYi01YzhiZDQ4ZTY2YjM3NH5hcnRpZmFjdHMvYjFjMzdiNjMtODQ0YS00ZmY3LWJiYTgtOTMxMDhjOTAxZjhhL2Nsb3NlZF9wb3NpdGlvbnNfYW5hbHlzaXMuY3N2',
    ],
    ['8956ef43 truncated with ...', 'NjV+YXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZm...'],
    ['mid-way legacy fallback', btoa('8~text/csvowner_x_report.csv')],
    ['two parts', btoa('8~text/csv6~owner1')],
    ['four parts', btoa('8~text/csv6~owner11~a1~b')],
    ['short final segment', btoa('8~text/csv6~owner120~report.csv')],
    ['legacy with four parts', btoa('text/csv_owner_my_report.csv')],
    // atob tolerates missing padding; Python's b64decode raises, so the back end answers 400
    ['padding stripped', btoa('8~text/csv6~owner110~report.csv').replace(/=+$/, '')],
    // the back end slices at len(str(int('08'))) + 1, one short of the head the UI reads
    ['length with a leading zero', btoa('08~text/csv6~owner110~report.csv')],
  ])('refuses %s', (_, id) => expect(decodeArtifactId(id)).toBeNull())
})

describe('getArtifactFile isTurnArtifact', () => {
  it('is true for a workspace owner and an artifacts/ name', () => {
    expect(
      getArtifactFile(encodedId('artifacts/t1/a.csv', 'text/csv', 'workspace-w1'))?.isTurnArtifact
    ).toBe(true)
  })

  it.each([
    ['user-owned legacy', encodedId(`${UUID}_a.csv`)],
    ['workspace file outside artifacts/', encodedId('charts/a.png', 'image/png', 'workspace-w1')],
    ['artifacts/ name under a non-workspace owner', encodedId('artifacts/t1/a.csv')],
  ])('is false for %s', (_, id) => expect(getArtifactFile(id)?.isTurnArtifact).toBe(false))

  it('returns null for a malformed token', () => {
    expect(getArtifactFile(btoa('8~text/csv6~owner1'))).toBeNull()
  })
})
