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

export const redirectHashRoutes = () => {
  const { hash } = window.location
  if (!hash.startsWith('#/')) return

  const [hashPath, hashQuery] = hash.slice(2).split('?')
  // Strip protocol-relative sequences from pathname to prevent open redirect (CWE-601)
  // Remove //domain or /\domain patterns but preserve any legitimate sub-path after
  let { pathname } = window.location
  pathname = pathname.replace(/^\/\/+[^/]*/, '') // Strip //domain or ///domain
  pathname = pathname.replace(/^\/\\[^/]*/, '') // Strip /\domain
  const base = pathname.replace(/\/$/, '')
  const search = hashQuery ? `?${hashQuery}` : window.location.search
  // Strip leading slashes/backslashes from hash path
  const safePath = hashPath.replace(/^[/\\]+/, '')
  window.location.replace(`${base}/${safePath}${search}`)
}
