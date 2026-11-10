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

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { usePlatformApplications } from '@/pages/applications/usePlatformApplications'
import { AppType, type Application } from '@/types/entity/application'

vi.mock('valtio', () => ({ useSnapshot: (value: unknown) => value }))

const boundary = vi.hoisted(() => ({
  push: vi.fn(),
  toastError: vi.fn(),
  platform: { applications: [], fetchApplications: vi.fn() },
}))
vi.mock('@/store/applications', () => ({ applicationsStore: boundary.platform }))
vi.mock('@/utils/toaster', () => ({ default: { error: boundary.toastError } }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: boundary.push }) }))

const app = (type: AppType): Application => ({
  id: 'configured-app',
  slug: 'configured-visual',
  type,
  entry: 'https://platform.example.test/entry',
  name: 'Configured visual',
  description: '',
  arguments: {},
})
beforeEach(() => {
  vi.clearAllMocks()
  boundary.platform.fetchApplications.mockResolvedValue([])
})
afterEach(() => vi.restoreAllMocks())

it('opens configured links in a separate window without opener or referrer', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const { result } = renderHook(usePlatformApplications)
  act(() => result.current.open(app(AppType.LINK)))
  expect(open).toHaveBeenCalledExactlyOnceWith(
    'https://platform.example.test/entry',
    '_blank',
    'noopener,noreferrer'
  )
  expect(boundary.push).not.toHaveBeenCalled()
})

it('preserves the configured iframe route and slug', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const { result } = renderHook(usePlatformApplications)
  act(() => result.current.open(app(AppType.IFRAME)))
  expect(boundary.push).toHaveBeenCalledExactlyOnceWith({
    name: 'application-iframe',
    params: { slug: 'configured-visual' },
  })
  expect(open).not.toHaveBeenCalled()
})

it('preserves the configured module federation route and slug', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const { result } = renderHook(usePlatformApplications)
  act(() => result.current.open(app(AppType.MODULE)))
  expect(boundary.push).toHaveBeenCalledExactlyOnceWith({
    name: 'application-federation',
    params: { slug: 'configured-visual' },
  })
  expect(open).not.toHaveBeenCalled()
})

it('reports an unknown application type instead of loading it as a module', () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const { result } = renderHook(usePlatformApplications)
  act(() => result.current.open(app('widget' as AppType)))
  expect(boundary.toastError).toHaveBeenCalledExactlyOnceWith(
    'Unsupported application type: widget'
  )
  expect(boundary.push).not.toHaveBeenCalled()
  expect(open).not.toHaveBeenCalled()
})

it('loads the configured applications once', () => {
  renderHook(usePlatformApplications)
  expect(boundary.platform.fetchApplications).toHaveBeenCalledTimes(1)
})
