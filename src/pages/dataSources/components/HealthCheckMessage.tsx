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

interface Props {
  result: {
    error?: {
      message: string
      help?: string
    }
  }
}

export const HealthCheckMessage: FC<Props> = ({ result }) => {
  if (!result.error) return null

  return (
    <div
      className="bg-failed-tertiary border border-border-error text-failed-primary text-sm rounded px-4 py-3 mb-1"
      role="alert"
    >
      <div className="leading-[1.2] flex items-start gap-2">
        <span>{result.error.message}</span>
      </div>
      {result.error.help && <div className="text-md mt-1 italic">{result.error.help}</div>}
    </div>
  )
}
