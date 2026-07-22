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

const KEY = 'postLoginRedirect'

export function savePostLoginRedirect(): void {
  // Strip the Vite BASE_URL prefix so the stored path is in React Router space.
  // BASE_URL is always '/' (root) or '/suffix/' (Vite guarantees trailing slash).
  // navigate() re-adds the basename internally; storing the raw pathname would
  // double-prefix the path on sub-path (VITE_SUFFIX) deployments.
  const base = import.meta.env.BASE_URL.slice(0, -1) // '' or '/codemie'
  const raw = window.location.pathname + window.location.search + window.location.hash
  const routerPath = base && raw.startsWith(base + '/') ? raw.slice(base.length) : raw
  if (routerPath && routerPath !== '/') {
    sessionStorage.setItem(KEY, routerPath)
  }
}

export function consumePostLoginRedirect(): string | null {
  const saved = sessionStorage.getItem(KEY)
  sessionStorage.removeItem(KEY)
  if (!saved) return null
  // Reject protocol-relative and backslash-relative paths (CWE-601 open-redirect defence).
  if (!saved.startsWith('/') || saved.startsWith('//') || saved.startsWith('/\\')) return null
  return saved
}
