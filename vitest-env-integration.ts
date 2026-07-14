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
import { builtinEnvironments } from 'vitest/environments'

import type { Environment } from 'vitest'

// Custom Vitest environment for integration tests.
//
// React Router v7's navigate() creates a Request object with an AbortSignal:
//   new Request(url, { signal: new AbortController().signal })
//
// Node.js's built-in Request (via undici) validates the signal against the
// AbortSignal class that was in globalThis when undici was first loaded.
// JSDOM replaces globalThis.AbortController with its own implementation,
// so the signal created by React Router fails undici's instanceof check.
//
// Fix: capture the native Node.js AbortController/AbortSignal before JSDOM
// overrides them, then restore them after JSDOM setup completes.

const integrationEnvironment: Environment = {
  name: 'jsdom-integration',
  transformMode: 'web',
  async setup(global: any, options: any) {
    const NativeAbortController = global.AbortController
    const NativeAbortSignal = global.AbortSignal

    const { teardown } = await builtinEnvironments.jsdom.setup(global, options)

    global.AbortController = NativeAbortController
    global.AbortSignal = NativeAbortSignal

    return { teardown }
  },
}

export default integrationEnvironment
