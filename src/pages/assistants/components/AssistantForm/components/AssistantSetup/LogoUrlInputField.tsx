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

import InfoBox from '@/components/form/InfoBox'
import Input from '@/components/form/Input'

interface LogoUrlInputFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  name?: string
}

const LogoUrlInputField = ({ value, onChange, onBlur, error, name }: LogoUrlInputFieldProps) => (
  <div className="flex flex-col gap-1">
    <Input
      label="Or enter image URL directly:"
      placeholder="https://example.com/logo.jpg"
      name={name}
      rootClass="gap-y-1.5"
      error={error}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
    <InfoBox className="opacity-60" iconClassName="mt-0.5">
      Must be JPEG, PNG, SVG and max size 500kb
    </InfoBox>
  </div>
)

export default LogoUrlInputField
