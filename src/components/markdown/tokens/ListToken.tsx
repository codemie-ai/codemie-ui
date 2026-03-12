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

import React from 'react'

import MarkdownTokens from '@/components/markdown/MarkdownTokens'

import { MarkdownListTokenItem, MarkdownToken } from '../Markdown.utils'

type ListTokenProps = {
  token: MarkdownToken
}

const ListItem = ({ item }: { item: MarkdownListTokenItem }) => (
  <li>
    {item.task ? (
      <div className="flex items-start gap-2">
        <input type="checkbox" className="mr-1" checked={item.checked} disabled />
        <div className="flex-1">
          <MarkdownTokens tokens={item.tokens} />
        </div>
      </div>
    ) : (
      <MarkdownTokens tokens={item.tokens} />
    )}
  </li>
)

const ListToken: React.FC<ListTokenProps> = ({ token }) => {
  const { ordered, start } = token

  if (ordered)
    return (
      <ol start={start} className="my-2">
        {token?.items?.map((item, i) => (
          <ListItem key={i} item={item} />
        ))}
      </ol>
    )

  return (
    <ul className="my-2">
      {token?.items?.map((item, i) => (
        <ListItem key={i} item={item} />
      ))}
    </ul>
  )
}

export default ListToken
