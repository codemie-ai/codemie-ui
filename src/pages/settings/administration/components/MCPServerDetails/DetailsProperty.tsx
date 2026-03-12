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

interface DetailsPropertyProps {
  label: string
  value?: string | React.ReactNode
  multiline?: boolean
}

const DetailsProperty: React.FC<DetailsPropertyProps> = ({ label, value, multiline = false }) => {
  if (!value) return null

  return (
    <div className="space-y-1">
      <dt className="text-xs text-text-quaternary font-medium">{label}</dt>
      <dd className={`text-sm text-text-primary ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

export default DetailsProperty
