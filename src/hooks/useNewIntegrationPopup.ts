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

import { useState, useCallback } from 'react'

import { settingsStore } from '@/store/settings'

interface UseNewIntegrationPopupReturn {
  showNewIntegration: boolean
  selectedCredentialType: string
  selectedProject: string
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  hideNewIntegrationPopup: () => void
  onIntegrationSuccess: () => void
}

export const useNewIntegrationPopup = (onSuccess?: () => void): UseNewIntegrationPopupReturn => {
  const [showNewIntegration, setShowNewIntegration] = useState(false)
  const [selectedCredentialType, setSelectedCredentialType] = useState('')
  const [selectedProject, setSelectedProject] = useState('')

  const showNewIntegrationPopup = useCallback((project: string, credentialType: string) => {
    setSelectedProject(project)
    setSelectedCredentialType(credentialType)
    setShowNewIntegration(true)
  }, [])

  const hideNewIntegrationPopup = useCallback(() => {
    setShowNewIntegration(false)
    setSelectedProject('')
    setSelectedCredentialType('')
  }, [])

  const onIntegrationSuccess = useCallback(() => {
    hideNewIntegrationPopup()
    settingsStore.indexSettings()

    onSuccess?.()
  }, [hideNewIntegrationPopup, onSuccess])

  return {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  }
}
