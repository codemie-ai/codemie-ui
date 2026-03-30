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

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import Textarea from '@/components/form/Textarea'

interface DescriptionFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  isAIGenerated: boolean
  name?: string
}

const DescriptionField = ({
  value,
  onChange,
  onBlur,
  error,
  isAIGenerated,
  name,
}: DescriptionFieldProps) => (
  <Textarea
    label="Description:"
    placeholder="Description*"
    rows={5}
    className="font-mono text-sm leading-relaxed py-2 px-3 h-24"
    rootClass="mt-2"
    name={name}
    error={error}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
  >
    {isAIGenerated && (
      <div className="absolute top-10 right-4">
        <AIFieldSvg />
      </div>
    )}
  </Textarea>
)

export default DescriptionField
