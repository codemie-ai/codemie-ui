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

import { FC } from 'react'

const SkipLink: FC = () => (
  <a
    href="#main-content"
    onClick={(e) => {
      e.preventDefault()
      document.getElementById('main-content')?.focus()
    }}
    className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50
               focus-visible:rounded-lg focus-visible:border focus-visible:border-border-structural focus-visible:bg-surface-base-secondary
               focus-visible:px-4 focus-visible:py-2 focus-visible:shadow-lg focus-visible:text-sm focus-visible:font-medium
               focus-visible:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
  >
    Skip to main content
  </a>
)

export default SkipLink
