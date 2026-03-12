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

import { vi } from 'vitest'

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  currentRoute: { path: '/', name: null, params: {}, query: {}, hash: '' },
  resolve: vi.fn(),
  hasRoute: vi.fn(),
  getRoutes: vi.fn(),
  isActive: vi.fn().mockReturnValue(false),
  setQuery: vi.fn(),
  updateQuery: vi.fn(),
}

export const initVueRouter = vi.fn()

const useVueRouter = vi.fn().mockReturnValue(mockRouter)

export default useVueRouter
