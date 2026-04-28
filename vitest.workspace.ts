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

/* eslint-disable import/no-extraneous-dependencies */
import { defineWorkspace, configDefaults } from 'vitest/config'

// Two test projects with separate setup files:
//
//   unit        — mocks Valtio + stores; fast, isolated, no real reactivity
//   integration — real Valtio + real stores + mocked API; tests full Component→Store→API chain
//
// Run all:         vitest run
// Run unit only:   vitest run --project unit
// Run integration: vitest run --project integration

export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit',
      environment: 'jsdom',
      include: ['**/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      exclude: [...configDefaults.exclude, '**/__tests__/**/*.integration.test.*'],
      setupFiles: ['./src/setupTests', './src/setupTests.unit'],
    },
  },
  {
    extends: './vite.config.ts',
    test: {
      name: 'integration',
      environment: 'jsdom',
      include: ['**/__tests__/**/*.integration.test.?(c|m)[jt]s?(x)'],
      setupFiles: ['./src/setupTests'],
    },
  },
])
