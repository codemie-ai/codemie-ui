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
import { configure } from '@testing-library/react'
import { vi } from 'vitest'

// Integration tests run with --coverage in CI, which adds ~3x per-test overhead.
// Raise the waitFor/findBy timeout to match the overall testTimeout so async assertions
// do not time out before the component has finished fetching and re-rendering.
configure({ asyncUtilTimeout: 15000 })

// Fix: React Router v7 calls new Request(url, { signal: AbortController.signal }) during
// router.navigate(). In jsdom + Node.js 26, jsdom replaces globalThis.AbortController
// with its own class, but globalThis.Request remains Node's native implementation (jsdom
// does not polyfill Request). Node's native Request validates that the signal is
// instanceof the original native AbortSignal (captured by undici at module load time),
// but jsdom's AbortController produces a different AbortSignal subclass that fails the
// check, producing:
//   TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal.
//
// Since globalThis.fetch is fully mocked in integration tests, AbortSignal-based request
// cancellation has no effect on test outcomes. Stripping the signal from Request init
// bypasses the cross-realm instanceof failure without changing any observable test behaviour.
const _OriginalRequest = globalThis.Request as typeof Request | undefined
if (_OriginalRequest) {
  vi.stubGlobal(
    'Request',
    class extends _OriginalRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        const { signal: _signal, ...cleanInit } = (init ?? {}) as RequestInit
        super(input, cleanInit)
      }
    },
  )
}
