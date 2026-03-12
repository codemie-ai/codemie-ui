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

import React, { useMemo } from 'react'

type TextBlockProps = {
  text?: string
  className?: string
}

const TextBlock: React.FC<TextBlockProps> = ({ text = '', className }) => {
  const segments = useMemo(
    () => (text ? text.split(/\\n|\n/).filter((line) => line.length) : []),
    [text]
  )

  return (
    <p className={className}>
      {segments.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </p>
  )
}

export default TextBlock
