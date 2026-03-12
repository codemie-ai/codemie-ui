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

import AceEditor from '@/components/AceEditor/AceEditor'

interface ProviderFormProps {
  jsonValue: string
  jsonError: string | null
  onJsonChange: (value: string) => void
}

const ProviderForm = ({ jsonValue, jsonError, onJsonChange }: ProviderFormProps) => {
  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="h-[700px]">
        <AceEditor value={jsonValue} onChange={onJsonChange} lang="json" name="provider_json" />
      </div>
      {jsonError && <div className="text-failed-secondary text-sm">{jsonError}</div>}
    </div>
  )
}

export default ProviderForm
