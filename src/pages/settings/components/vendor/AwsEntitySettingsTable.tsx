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

import { FC, ReactNode, useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import AssistantSvg from '@/assets/icons/assistant-alt.svg?react'
import AwsSvg from '@/assets/icons/aws.svg?react'
import CogSvg from '@/assets/icons/cog.svg?react'
import DataSourceSvg from '@/assets/icons/datasource.svg?react'
import GuardrailSvg from '@/assets/icons/guardrail.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import Button from '@/components/Button'
import Hint from '@/components/Hint'
import Link from '@/components/Link'
import Table from '@/components/Table'
import Tooltip from '@/components/Tooltip'
import { DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { awsVendorStore } from '@/store/vendor'
import { VendorEntityType, VendorOriginType, VendorSetting } from '@/types/entity/vendor'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'

interface Props {
  originType: VendorOriginType
  entityType: VendorEntityType
}

interface UIConfig {
  [key: string]: {
    plural: string
    single: string
    icon: ReactNode
  }
}

const ENTITY_UI_CONFIG: UIConfig = {
  [VendorEntityType.assistant]: {
    plural: 'agents',
    single: 'agent',
    icon: <AssistantSvg />,
  },
  [VendorEntityType.knowledgebases]: {
    plural: 'knowledge bases',
    single: 'knowledge base',
    icon: <DataSourceSvg />,
  },
  [VendorEntityType.workflows]: {
    plural: 'flows',
    single: 'flow',
    icon: <WorkflowSvg />,
  },
  [VendorEntityType.guardrails]: {
    plural: 'guardrails',
    single: 'guardrail',
    icon: <GuardrailSvg />,
  },
}

const VendorEntitiesTableCell = ({
  item,
  type,
}: {
  item: VendorSetting
  type: VendorEntityType
}) => {
  // Handle error state
  if (item.invalid && item.error) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-failed-secondary">
          <span>Connection Error</span>
          <span
            data-pr-tooltip={item.error}
            data-pr-position="right"
            className="target-tooltip cursor-pointer"
          >
            <InfoSvg className="w-4 h-4 text-failed-secondary" />
          </span>
        </div>
      </div>
    )
  }

  // Handle empty state (no entities available)
  if (item.entities.length === 0) {
    const emptyMessage =
      item.invalid === false
        ? `No ${ENTITY_UI_CONFIG[type].plural} found`
        : `No ${ENTITY_UI_CONFIG[type].plural} available`

    const hintMessage =
      item.invalid === false
        ? `This AWS integration is working correctly, but no ${ENTITY_UI_CONFIG[type].plural} were found in your AWS Bedrock environment.`
        : `${ENTITY_UI_CONFIG[type].plural} for this project can only be created in AWS Bedrock.`

    return (
      <div className="flex items-center gap-1">
        <span className="text-text-quaternary">{emptyMessage}</span>
        <Hint hint={hintMessage} />
      </div>
    )
  }

  // Handle normal state with entities
  return (
    <div className="flex gap-4 items-center">
      {item.entities.slice(0, 3).map((name: string) => (
        <div className="flex items-center border rounded-md px-2 border-border-structural" key={name}>
          {ENTITY_UI_CONFIG[type].icon}
          <span className="ml-2">{name}</span>
        </div>
      ))}
      {item.entities.length > 3 && (
        <span className="ml-[-4px] border rounded-md px-2 h-6 flex items-center border-border-structural">
          ...
        </span>
      )}
    </div>
  )
}

const AwsEntitySettingsTable: FC<Props> = ({ originType, entityType }) => {
  const router = useVueRouter()
  const { vendorSettings, vendorSettingsPagination, loading } = useSnapshot(
    awsVendorStore
  ) as typeof awsVendorStore

  // Use the specific loading state for settings
  const isLoading = useMemo(() => loading.settings, [loading.settings])

  const onPaginationUpdate = (page: number, perPage?: number) => {
    awsVendorStore.getVendorSettings(originType, entityType, page, perPage || 10)
  }

  const tableColumns: ColumnDefinition[] = [
    {
      key: 'project',
      label: 'Project Name',
      sortable: false,
      type: DefinitionTypes.String,
    },
    {
      key: 'status',
      label: 'Bedrock ' + ENTITY_UI_CONFIG[entityType].plural,
      sortable: false,
      type: DefinitionTypes.Custom,
    },
    {
      key: 'setting_name',
      label: 'Integrations',
      sortable: false,
      type: DefinitionTypes.String,
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      type: DefinitionTypes.Custom,
    },
  ]

  const customTableColumns = {
    status: (item: VendorSetting) => <VendorEntitiesTableCell item={item} type={entityType} />,
    actions: (item: VendorSetting) => {
      const isDisabled = item.entities.length === 0 || (item.invalid && item.error)

      let tooltipContent: string | undefined
      if (item.invalid && item.error) {
        tooltipContent = 'Cannot manage due to connection error'
      } else if (item.entities.length === 0) {
        tooltipContent = `No ${ENTITY_UI_CONFIG[entityType].plural} to manage`
      }

      return (
        <div className="flex items-center gap-2">
          <Button
            disabled={!!isDisabled}
            onClick={() => {
              router.push({
                path: router.currentRoute.value.path + '/' + item.setting_id,
              })
            }}
          >
            <CogSvg />
            Manage
          </Button>
          {tooltipContent && isDisabled && (
            <span
              data-pr-tooltip={tooltipContent}
              data-pr-position="left"
              className="target-tooltip cursor-pointer"
            >
              <InfoSvg className="w-4 h-4 text-text-quaternary" />
            </span>
          )}
        </div>
      )
    },
  }

  const goToIntegrations = () => {
    router.push({
      name: 'integrations',
    })
  }

  useEffect(() => {
    awsVendorStore.getVendorSettings(originType, entityType, 0, vendorSettingsPagination.perPage)
  }, [originType, entityType])

  return (
    <div>
      {!(!isLoading && !vendorSettings.length) && (
        <Table
          items={vendorSettings}
          columnDefinitions={tableColumns}
          pagination={vendorSettingsPagination}
          onPaginationChange={onPaginationUpdate}
          customRenderColumns={customTableColumns}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
          loading={isLoading}
          idPath="setting_id"
        />
      )}
      {!isLoading && !vendorSettings.length && (
        <div className="w-full flex flex-col items-center mt-40">
          <AwsSvg className="h-16 w-16" />
          <div className="text-center text-text-primary mt-3 text-sm">
            No AWS integrations found
          </div>
          <div className="text-center text-text-quaternary mt-8 w-[467px] text-sm">
            To import data from AWS Bedrock, first set up an AWS integration in your workspace
            settings. Go to <Link target="_self" onClick={goToIntegrations} label="Integrations" />{' '}
            and connect your AWS account to continue.
          </div>
        </div>
      )}
      <Tooltip target=".target-tooltip" showDelay={200} />
    </div>
  )
}

export default AwsEntitySettingsTable
