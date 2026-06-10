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

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

import { redirectHashRoutes } from '@/utils/redirectHashRoutes'

const mockReplace = vi.fn()

function stubLocation(overrides: { hash?: string; pathname?: string; search?: string }) {
  vi.stubGlobal('window', {
    location: {
      hash: overrides.hash ?? '',
      pathname: overrides.pathname ?? '/',
      search: overrides.search ?? '',
      replace: mockReplace,
    },
  })
}

describe('redirectHashRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should call window.location.replace with the correct URL when hash starts with #/', () => {
    // Arrange
    stubLocation({ hash: '#/assistants/123', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/assistants/123')
  })

  it('should NOT call window.location.replace when hash does not start with #/', () => {
    // Arrange
    stubLocation({ hash: '#section', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('should NOT call window.location.replace when hash is empty', () => {
    // Arrange
    stubLocation({ hash: '', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('should extract query params from hash and use them instead of window.location.search', () => {
    // Arrange
    stubLocation({ hash: '#/assistants?tab=chat', pathname: '/', search: '?existing=true' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledWith('/assistants?tab=chat')
  })

  it('should strip trailing slash from pathname in sub-path deployments', () => {
    // Arrange
    stubLocation({ hash: '#/assistants/123', pathname: '/codemie/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledWith('/codemie/assistants/123')
  })

  it('should produce correct URL from root pathname without double slash', () => {
    // Arrange
    stubLocation({ hash: '#/assistants/123', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledWith('/assistants/123')
  })

  it('should fall back to window.location.search when hash has no query params', () => {
    // Arrange
    stubLocation({ hash: '#/assistants', pathname: '/', search: '?token=abc' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledWith('/assistants?token=abc')
  })

  it('should sanitize triple-slash hash to same-origin path at root', () => {
    // Arrange
    stubLocation({ hash: '#///evil.com', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/evil.com')
  })

  it('should sanitize triple-slash hash to same-origin path in sub-path deployment', () => {
    // Arrange
    stubLocation({ hash: '#///evil.com', pathname: '/codemie/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/codemie/evil.com')
  })

  it('should sanitize double-slash hash to same-origin path', () => {
    // Arrange
    stubLocation({ hash: '#//evil.com', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/evil.com')
  })

  it('should sanitize backslash hash variant to same-origin path', () => {
    // Arrange
    stubLocation({ hash: '#/\\evil.com', pathname: '/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/evil.com')
  })

  it('should sanitize protocol-relative pathname at root', () => {
    // Arrange
    stubLocation({ hash: '#/page', pathname: '//evil.com', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/page')
  })

  it('should sanitize protocol-relative pathname with sub-path', () => {
    // Arrange
    stubLocation({ hash: '#/page', pathname: '//evil.com/codemie', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/codemie/page')
  })

  it('should sanitize triple-slash pathname', () => {
    // Arrange
    stubLocation({ hash: '#/page', pathname: '///evil.com', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/page')
  })

  it('should sanitize backslash pathname variant', () => {
    // Arrange
    stubLocation({ hash: '#/page', pathname: '/\\evil.com', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/page')
  })

  it('should preserve legitimate sub-path deployment behavior', () => {
    // Arrange
    stubLocation({ hash: '#/assistants', pathname: '/codemie/', search: '' })

    // Act
    redirectHashRoutes()

    // Assert
    expect(mockReplace).toHaveBeenCalledOnce()
    expect(mockReplace).toHaveBeenCalledWith('/codemie/assistants')
  })
})
