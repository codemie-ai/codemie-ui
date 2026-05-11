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

import { Fragment } from 'react'

/**
 * Highlights the first occurrence of a query string within text (case-insensitive)
 * @param text - The text to search in
 * @param query - The query string to highlight
 * @returns JSX with highlighted query or original text
 */
export const highlightText = (text: string, query: string) => {
  if (!query) return text
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text
  return (
    <Fragment>
      {text.slice(0, index)}
      <span className="text-text-accent-status">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </Fragment>
  )
}
