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

// eslint-disable-next-line import/no-extraneous-dependencies
import { vi } from 'vitest'

// Shared singleton imported by both setupTests.tsx (to wire the global fetch mock) and
// test-utils/integration.tsx (to expose mockAPI / navigate to test files).
// Module caching guarantees both files get the same Map and vi.fn() instance.

export interface RegistryEntry {
  factory: (body?: unknown) => Response
  params?: Record<string, unknown>
}

export const requestRegistry = new Map<string, RegistryEntry>()

export const navigate = vi.fn()
