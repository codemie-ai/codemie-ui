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

import DetailsTag from './DetailsTag'

interface DetailsTagsProps {
  headline: string
  items?: string[]
}

const DetailsTags = ({ headline, items }: DetailsTagsProps) => {
  if (!items) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-quaternary">{headline}</p>
      <div className="flex flex-wrap gap-2 text-wrap break-word">
        {items.map((value) => (
          <DetailsTag key={value} value={value} />
        ))}
      </div>
    </div>
  )
}

export default DetailsTags
