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

import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { getTestableCredentialTypes, isDeprecatedCredentialType } from '@/utils/settings'

import OAuthTestAction from './OAuthTestAction'
import TestIntegration from './TestIntegration'

type Props = {
  credentialType: string
  credentialValues: Record<string, string>
  settingId: string
  onSave: () => void
}

const EditIntegrationActions = ({ credentialType, credentialValues, settingId, onSave }: Props) => {
  if (isDeprecatedCredentialType(credentialType)) return null
  const lowered = credentialType.toLowerCase()
  return (
    <>
      {getTestableCredentialTypes().includes(lowered) && (
        <TestIntegration
          credentialType={lowered}
          credentialValues={credentialValues}
          settingId={settingId}
          label="Test"
        />
      )}
      <OAuthTestAction credentialType={lowered} credentialValues={credentialValues} />
      <Button type={ButtonType.PRIMARY} onClick={onSave}>
        Save
      </Button>
    </>
  )
}

export default EditIntegrationActions
