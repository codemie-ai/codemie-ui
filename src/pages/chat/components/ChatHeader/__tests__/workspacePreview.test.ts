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

import { describe, expect, it } from 'vitest'

import {
  buildTextPreview,
  canPreviewAsImage,
  formatFileSize,
  formatJson,
  getImagePreviewSrc,
  getPathExtension,
  getPreviewKind,
  PreviewKind,
  splitFrontMatter,
} from '../workspacePreview'

describe('getPathExtension', () => {
  it('returns the lower-cased text after the last dot of the file name', () => {
    expect(getPathExtension('src/App.TSX')).toBe('tsx')
    expect(getPathExtension('dir.v2/notes')).toBe('notes')
  })

  it('returns the whole name for names without an extension and dotfiles', () => {
    expect(getPathExtension('infra/Dockerfile')).toBe('dockerfile')
    expect(getPathExtension('app/.env')).toBe('env')
  })
})

describe('getPreviewKind', () => {
  it('detects markdown regardless of case', () => {
    expect(getPreviewKind('a.MD')).toBe(PreviewKind.MARKDOWN)
    expect(getPreviewKind('docs/readme.markdown')).toBe(PreviewKind.MARKDOWN)
  })

  it('detects json and text', () => {
    expect(getPreviewKind('a.json')).toBe(PreviewKind.JSON)
    expect(getPreviewKind('x.tsx')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('x.html')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('x.yml')).toBe(PreviewKind.TEXT)
  })

  it('previews every code block extension plus logs and diffs as text', () => {
    // Extensions, not language names: ruby -> rb, kotlin -> kt
    expect(getPreviewKind('script.rb')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('Main.kt')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('script.ruby')).toBeNull()
    expect(getPreviewKind('main.go')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('query.SQL')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('pyproject.toml')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('run.log')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('change.diff')).toBe(PreviewKind.TEXT)
  })

  it('previews code block names without an extension and dotfiles as text', () => {
    expect(getPreviewKind('infra/Dockerfile')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('Makefile')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('.gitignore')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('.htaccess')).toBe(PreviewKind.TEXT)
    expect(getPreviewKind('app/.env')).toBe(PreviewKind.TEXT)
  })

  it('returns null for unknown extensions, names and dotfiles', () => {
    expect(getPreviewKind('a.bin')).toBeNull()
    expect(getPreviewKind('README')).toBeNull()
    expect(getPreviewKind('.bashrc')).toBeNull()
    expect(getPreviewKind('Dockerfile.dev')).toBeNull()
    expect(getPreviewKind('.env.local')).toBeNull()
  })
})

describe('splitFrontMatter', () => {
  it('splits front matter', () => {
    expect(splitFrontMatter('---\nk: v\n---\n# T')).toEqual({ frontMatter: 'k: v', body: '# T' })
  })

  it('splits CRLF front matter', () => {
    expect(splitFrontMatter('---\r\nk: v\r\n---\r\n# T')).toEqual({
      frontMatter: 'k: v',
      body: '# T',
    })
  })

  it('splits empty front matter', () => {
    expect(splitFrontMatter('---\n---\n# T')).toEqual({ frontMatter: '', body: '# T' })
  })

  it('splits BOM-prefixed front matter', () => {
    expect(splitFrontMatter('\uFEFF---\nk: v\n---\n# T')).toEqual({
      frontMatter: 'k: v',
      body: '# T',
    })
  })

  it('treats unclosed front matter as body', () => {
    const text = '---\nk: v\n# T'
    expect(splitFrontMatter(text)).toEqual({ frontMatter: null, body: text })
  })

  it('ignores --- in the middle of the file', () => {
    const text = '# T\n---\nk: v\n---\nx'
    expect(splitFrontMatter(text)).toEqual({ frontMatter: null, body: text })
  })
})

describe('formatJson', () => {
  it('pretty prints with 2 spaces', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(formatJson('{"a":\r\n1}')).toBe('{\n  "a": 1\n}')
  })

  it('keeps original text when big integers would lose precision', () => {
    const text = '{"id":12345678901234567890}'
    expect(formatJson(text)).toBe(text)
    expect(formatJson('{"s":"12345678901234567890","n":1}')).toBe(
      '{\n  "s": "12345678901234567890",\n  "n": 1\n}'
    )
  })

  it('returns invalid json unchanged', () => {
    expect(formatJson('{bad')).toBe('{bad')
  })
})

describe('buildTextPreview', () => {
  it('returns null without a kind or text content', () => {
    expect(buildTextPreview(null, 'text')).toBeNull()
    expect(buildTextPreview(PreviewKind.TEXT, null)).toBeNull()
    expect(buildTextPreview(PreviewKind.TEXT, undefined)).toBeNull()
  })

  it('splits front matter for markdown', () => {
    expect(buildTextPreview(PreviewKind.MARKDOWN, '---\na: 1\n---\n# Title')).toEqual({
      kind: PreviewKind.MARKDOWN,
      frontMatter: 'a: 1',
      body: '# Title',
    })
  })

  it('pretty-prints json and keeps text as is', () => {
    expect(buildTextPreview(PreviewKind.JSON, '{"a":1}')).toEqual({
      kind: PreviewKind.JSON,
      frontMatter: null,
      body: '{\n  "a": 1\n}',
    })
    expect(buildTextPreview(PreviewKind.TEXT, 'plain')).toEqual({
      kind: PreviewKind.TEXT,
      frontMatter: null,
      body: 'plain',
    })
  })
})

describe('canPreviewAsImage', () => {
  it('is false without a path or data', () => {
    expect(canPreviewAsImage({ path: null, hasData: true, mimeType: 'image/png' })).toBe(false)
    expect(canPreviewAsImage({ path: 'a.png', hasData: false, mimeType: 'image/png' })).toBe(false)
  })

  it('accepts an image mime type whatever the extension', () => {
    expect(canPreviewAsImage({ path: 'a.dat', hasData: true, mimeType: 'IMAGE/PNG' })).toBe(true)
  })

  it('falls back to the extension, case-insensitively', () => {
    expect(canPreviewAsImage({ path: 'dir/A.JPG', hasData: true, mimeType: null })).toBe(true)
    expect(canPreviewAsImage({ path: 'a.txt', hasData: true, mimeType: 'text/plain' })).toBe(false)
  })
})

describe('getImagePreviewSrc', () => {
  it('returns data urls untouched', () => {
    const content = 'data:image/png;base64,AAAA'

    expect(getImagePreviewSrc({ path: 'a.png', content, isBinary: true })).toBe(content)
  })

  it('builds a base64 url for binary content and strips whitespace', () => {
    expect(
      getImagePreviewSrc({ path: 'a.png', content: 'AA BB\nCC', mimeType: null, isBinary: true })
    ).toBe('data:image/png;base64,AABBCC')
  })

  it('prefers the reported image mime type over the extension', () => {
    expect(
      getImagePreviewSrc({ path: 'a.png', content: 'AAAA', mimeType: 'image/webp', isBinary: true })
    ).toBe('data:image/webp;base64,AAAA')
  })

  it('url-encodes text svg instead of base64', () => {
    expect(
      getImagePreviewSrc({
        path: 'a.svg',
        content: '<svg a="1"/>',
        mimeType: null,
        isBinary: false,
      })
    ).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg a="1"/>')}`)
  })

  it('uses a generic image type for an unknown extension', () => {
    expect(
      getImagePreviewSrc({ path: 'a.xyz', content: 'AAAA', mimeType: null, isBinary: true })
    ).toBe('data:image/*;base64,AAAA')
  })
})

describe('formatFileSize', () => {
  it('reports an unknown size', () => {
    expect(formatFileSize(undefined)).toBe('Unknown size')
  })

  it('formats bytes, including zero', () => {
    expect(formatFileSize(0)).toBe('0 bytes')
    expect(formatFileSize(1234)).toBe(`${(1234).toLocaleString()} bytes`)
  })
})
