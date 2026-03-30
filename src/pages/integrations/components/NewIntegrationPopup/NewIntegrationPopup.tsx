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

import { useState, useRef } from 'react'

import Popup from '@/components/Popup'
import { userSettingsStore } from '@/store/userSettings'
import toaster from '@/utils/toaster'

import SettingsForm, { SettingsFormRef } from '../SettingsForm/SettingsForm'

interface NewIntegrationPopupProps {
  visible: boolean
  onHide: () => void
  onSuccess: () => void | Promise<void>
  project?: string
  credentialType?: string
}

const NewIntegrationPopup: React.FC<NewIntegrationPopupProps> = ({
  visible,
  onHide,
  onSuccess,
  project,
  credentialType,
}) => {
  const formRef = useRef<SettingsFormRef>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createUserSetting = async (values: Record<string, unknown>) => {
    setIsSubmitting(true)
    try {
      await userSettingsStore.createUserSetting(values)
      toaster.info('Integration created successfully')
      await onSuccess()
      onHide()
    } catch (error) {
      toaster.error('Failed to create integration')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = () => {
    formRef.current?.submit()
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header="Create User Integration"
      submitText="Save"
      onSubmit={handleSubmit}
      submitDisabled={isSubmitting}
      bodyClassName="show-scroll !px-0 !pb-0"
      hideFooter={false}
      withBorderBottom={false}
      className="!w-[600px]"
    >
      <div className="px-4">
        <SettingsForm
          ref={formRef}
          onSubmit={createUserSetting}
          credentialType={credentialType}
          projectName={project}
          disableProject={true}
          disableType={true}
          hideActions={true}
          shouldAutofocusInput={true}
        />
      </div>
    </Popup>
  )
}

export default NewIntegrationPopup
