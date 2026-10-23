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

import { FC, useCallback, useEffect, useState } from 'react'

import Button from '@/components/Button'
import Checker from '@/components/Checker'
import Popup from '@/components/Popup'
import { ButtonType, CHECKER_STATUSES, CheckerStatus } from '@/constants'
import { MCP_SETTINGS_TYPE } from '@/constants/settings'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import IntegrationSelector from '@/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelector'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { settingsStore } from '@/store/settings'
import { userStore } from '@/store/user'
import { MCPConfig } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

interface MCPTestIntegrationModalProps {
  visible: boolean
  server: Pick<MCPConfig, 'id' | 'name' | 'required_env_vars'>
  status: CheckerStatus
  onHide: () => void
  onTest: (settingsId: string) => void
}

const MCPTestIntegrationModal: FC<MCPTestIntegrationModalProps> = ({
  visible,
  server,
  status,
  onHide,
  onTest,
}) => {
  const [project, setProject] = useState('')
  const [mcpSettings, setMcpSettings] = useState<Setting[]>([])
  const [selected, setSelected] = useState<Setting | undefined>(undefined)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setHint(null)
    userStore
      .getDefaultProject()
      .then((name) => setProject(name ?? ''))
      .catch(() => setProject(''))
    settingsStore
      .indexSettings()
      .then((all) => setMcpSettings(all?.mcp ?? []))
      .catch(() => setMcpSettings([]))
  }, [visible])

  const refreshAndPreselectNew = useCallback(async (createdId?: string) => {
    const all = await settingsStore.indexSettings()
    const list = all?.mcp ?? []
    setMcpSettings(list)
    const newItem = createdId && list.find((item) => item.id === createdId)
    if (newItem) setSelected(newItem)
  }, [])

  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    selectedCredentialValues,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  } = useNewIntegrationPopup(refreshAndPreselectNew)

  const requiredVars = server.required_env_vars?.filter((v) => v.required) ?? []

  const handleAddSettingClick = useCallback(() => {
    const requiredVarKeys = Object.fromEntries(requiredVars.map((v) => [v.name, '']))
    showNewIntegrationPopup(project, MCP_SETTINGS_TYPE, requiredVarKeys)
  }, [project, requiredVars, showNewIntegrationPopup])

  const handleCheck = useCallback(() => {
    if (!selected) {
      setHint('Select an integration to run the test')
      return
    }
    setHint(null)
    onTest(selected.id)
  }, [selected, onTest])

  const isInProgress = status === CHECKER_STATUSES.IN_PROGRESS

  return (
    <>
      <Popup
        visible={visible}
        onHide={onHide}
        header="Integration required"
        footerContent={
          <div className="flex justify-end gap-4">
            <Button variant={ButtonType.SECONDARY} onClick={onHide}>
              Close
            </Button>
            <Checker label="Test Integration" status={status} onCheck={handleCheck} />
          </div>
        }
        limitWidth
        bodyClassName="pb-4"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary">
            An integration with the secrets for the following variables is needed to run the
            connection test:
          </p>
          <ul className="text-xs text-text-secondary list-disc pl-4">
            {requiredVars.map((v) => (
              <li key={v.name}>{v.name}</li>
            ))}
          </ul>

          <IntegrationSelector
            value={selected}
            settingsDefinitions={mcpSettings}
            addButtonLabel="Add Environment Variables"
            onChange={setSelected}
            onAddSettingClick={handleAddSettingClick}
            disabled={isInProgress}
          />

          {hint && <p className="text-xs text-failed-secondary break-words">{hint}</p>}
        </div>
      </Popup>

      <NewIntegrationPopup
        visible={showNewIntegration}
        onHide={hideNewIntegrationPopup}
        onSuccess={onIntegrationSuccess}
        project={selectedProject}
        credentialType={selectedCredentialType}
        credentialValues={selectedCredentialValues}
      />
    </>
  )
}

export default MCPTestIntegrationModal
