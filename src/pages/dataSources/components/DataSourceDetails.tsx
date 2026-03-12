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

import React, { useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import InfoSvg from '@/assets/icons/info.svg?react'
import ReindexSvg from '@/assets/icons/reindex.svg?react'
import SharedNoIcon from '@/assets/icons/shared-no.svg?react'
import SharedYesIcon from '@/assets/icons/shared-yes.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import DetailsSidebar from '@/components/details/DetailsSidebar/DetailsSidebar'
import GuardrailAssignmentsDetails from '@/components/guardrails/GuardrailAssignmentsDetails/GuardrailAssignmentsDetails'
import TabsMenu from '@/components/TabsMenu/TabsMenu'
import Tooltip from '@/components/Tooltip/Tooltip'
import { ButtonType } from '@/constants'
import { INDEX_TYPES, IndexType, REPO_INDEX_TYPE_OPTIONS } from '@/constants/dataSources'
import DataSourceTypeIcon from '@/pages/dataSources/components/DataSourceTypeIcon'
import {
  canFullReindex,
  canIncrementalReindex,
  performIncrementalReindex,
  performFullReindex,
} from '@/pages/dataSources/utils/dataSourceUtils'
import { appInfoStore } from '@/store/appInfo'
import { dataSourceStore } from '@/store/dataSources'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'
import { GuardrailEntity } from '@/types/entity/guardrail'
import { getCronDescription } from '@/utils/cronValidator'
import { humanize, isNumberValue } from '@/utils/helpers'
import { getIndexTypeCode } from '@/utils/indexing'

import DataSourceDetailsProvider from './DataSourceDetails/DetaSourceDetailsProvider'

import type { MenuItem } from 'primereact/menuitem'

interface DataSourceDetailsProps {
  dataSource: DataSourceDetailsResponse
}

enum TabsId {
  extension,
  files,
  data,
}

const SECTIONS_DISABLED: Record<
  'tokens' | 'configuration' | 'processingSummary' | 'processingData',
  IndexType[]
> = {
  tokens: [INDEX_TYPES.PROVIDER],
  configuration: [INDEX_TYPES.PROVIDER, INDEX_TYPES.FILE],
  processingSummary: [INDEX_TYPES.PROVIDER],
  processingData: [INDEX_TYPES.PROVIDER],
}

// Helper function for common getter logic
const getNumericValueOrNA = (value: number | undefined, isBedrock: boolean) =>
  isBedrock ? 'N/A' : value ?? 0

const processingSummaryFields = [
  {
    field: 'total_documents',
    label: 'Total documents:',
    getter: getNumericValueOrNA,
  },
  {
    field: 'current_documents_count',
    label: 'Processed Documents Count:',
    getter: getNumericValueOrNA,
  },
  {
    field: 'chunks_count',
    label: 'Imported Chunks Count:',
    getter: getNumericValueOrNA,
  },
  {
    field: 'skipped_documents',
    label: 'Skipped Documents:',
    getter: getNumericValueOrNA,
  },
  {
    field: 'total_size_kb',
    label: 'Total Size KB:',
    shouldShow: (value: number | undefined) => isNumberValue(value),
    getter: (value: number | undefined, isBedrock: boolean) =>
      isBedrock ? 'N/A' : value?.toFixed(0),
  },
  {
    field: 'average_file_size_bytes',
    label: 'Average File Size B:',
    shouldShow: (value: number | undefined) => isNumberValue(value),
    getter: (value: number | undefined, isBedrock: boolean) =>
      isBedrock ? 'N/A' : value?.toFixed(0),
  },
]

const styles = {
  sectionTitle: 'font-bold text-xs leading-none font-mono text-text-primary mb-3',
  textScroll:
    'overflow-y-scroll max-h-36 pt-1 whitespace-pre-wrap break-words text-xs text-text-quaternary',
  propertyLabel: 'font-mono font-normal text-xs leading-5 text-text-tertiary text-nowrap',
  propertyValue: 'font-mono font-semibold text-xs leading-5 text-text-primary',
  properyTagValue:
    't-mono font-semibold text-xs leading-5 text-text-primary bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg py-0.5 px-2 text-center',
  row: 'flex gap-1 items-center',
  col: 'flex flex-col',
}

const DataSourceDetails: React.FC<DataSourceDetailsProps> = ({ dataSource }) => {
  const indexType = useMemo(
    () => getIndexTypeCode(dataSource?.index_type),
    [dataSource?.index_type]
  ) as IndexType
  const isBedrock = useMemo(() => {
    // Check if index_type contains 'bedrock'
    return !!dataSource?.index_type?.toLowerCase().includes('bedrock')
  }, [dataSource?.index_type, dataSource?.provider_fields])
  const {
    reindexProviderIndex,
    updateKBIndex,
    reIndexKBIndex,
    updateApplicationIndex,
    reindexMarketplace,
  } = useSnapshot(dataSourceStore) as typeof dataSourceStore

  const [isReindexConfirmationVisible, setIsReindexConfirmationVisible] = useState(false)
  const showIncrementalReindexButton = useMemo(
    () => canIncrementalReindex(dataSource),
    [dataSource]
  )
  const showFullReindexButton = useMemo(() => canFullReindex(dataSource), [dataSource])

  const processingSummary = useMemo(() => {
    const processing_info = dataSource?.processing_info || {}
    return {
      ...processing_info,
      chunks_count: dataSource?.current__chunks_state,
      current_documents_count: dataSource?.current_state,
      unique_extensions: processing_info.unique_extensions || [],
    }
  }, [dataSource?.processing_info, dataSource?.current__chunks_state, dataSource?.current_state])

  const tabs = useMemo(() => {
    const tabsList: Array<{ id: TabsId; label: string }> = []
    if (processingSummary.unique_extensions?.length) {
      tabsList.push({ id: TabsId.extension, label: 'Unique Extensions' })
    }
    if (indexType === INDEX_TYPES.GIT) {
      tabsList.push({ id: TabsId.files, label: 'Files Filter' })
    }

    if (indexType && !SECTIONS_DISABLED.processingData.includes(indexType)) {
      tabsList.push({ id: TabsId.data, label: 'Processed Data' })
    }

    return tabsList
  }, [processingSummary, indexType])

  const [activeTabId, setActiveTabId] = useState(tabs.length ? tabs[0].id : '')

  const renderActiveTab = useMemo(() => {
    if (activeTabId === TabsId.extension) {
      return (
        <div className={styles.textScroll}>
          <ul className="overflow-y-visible">
            {processingSummary.unique_extensions.map((extension: string) => (
              <li key={extension}>{extension}</li>
            ))}
          </ul>
        </div>
      )
    }

    if (activeTabId === TabsId.files) {
      return dataSource.files_filter ? (
        <div className={styles.textScroll}>
          <ul className="overflow-y-visible">
            {dataSource.files_filter.split('\n').map((pattern, idx) => (
              <li key={`${pattern}-${idx}`}>{pattern}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.textScroll}>N/A</div>
      )
    }

    if (activeTabId === TabsId.data) {
      return dataSource.processed_files?.length ? (
        <ul className="bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg px-6 py-3 mt-4 max-h-56 overflow-y-auto show-scroll">
          {dataSource.processed_files.flatMap((file: string, idx: number) => {
            if (file.includes('\n')) {
              return file.split('\n').map((line, i) => (
                <li
                  key={idx + '-' + i}
                  className={styles.propertyValue + ' break-words mb-1 list-disc'}
                >
                  {line}
                </li>
              ))
            }
            return (
              <li key={idx} className={styles.propertyValue + ' break-words mb-1 list-disc'}>
                {file}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className={styles.textScroll}>None</div>
      )
    }

    return <div />
  }, [tabs, activeTabId, processingSummary, dataSource])

  const showFullReindexConfirmation = () => {
    setIsReindexConfirmationVisible(true)
  }

  const confirmFullReindex = () => {
    performFullReindex(
      dataSource,
      reIndexKBIndex,
      updateKBIndex,
      updateApplicationIndex,
      reindexProviderIndex,
      reindexMarketplace
    )
    setIsReindexConfirmationVisible(false)
  }

  const confirmIncrementalReindex = () => {
    performIncrementalReindex(dataSource, updateKBIndex, updateApplicationIndex)
  }

  return (
    <div className="flex flex-col max-w-6xl mx-auto py-8 px-6">
      <div className="flex justify-between flex-wrap gap-1 items-center">
        <div className="flex gap-4 items-start">
          <div className="mt-1 p-2 border rounded-full">
            <DataSourceTypeIcon
              type={indexType}
              classNames="text-text-primary [&_path]:fill-current"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-2xl font-semibold font-mono">
              {dataSource.repo_name || dataSource.full_name || 'N/A'}
            </h4>
            <div className="flex gap-4 text-xs text-text-quaternary">
              <p>by {dataSource.created_by?.name || 'N/A'}</p>
              <span>|</span>
              {dataSource.project_space_visible ? (
                <span className="flex items-center gap-1">
                  <SharedYesIcon className="inline w-3 h-3 mr-1 mb-0.5" />
                  Shared with project
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <SharedNoIcon className="inline w-3 h-3 mr-1 mb-0.5" />
                  Not shared
                </span>
              )}
            </div>
          </div>
        </div>

        {(showFullReindexButton || showIncrementalReindexButton) && (
          <div className="flex gap-2 my-3">
            {showIncrementalReindexButton && (
              <Button size="small" variant="secondary" onClick={confirmIncrementalReindex}>
                <ReindexSvg />
                Incremental Re-index
              </Button>
            )}
            {showFullReindexButton && (
              <Button size="small" variant="secondary" onClick={showFullReindexConfirmation}>
                <ReindexSvg />
                Full Re-index
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-center my-6">
        <div className="border-t border-border-structural w-full" />
      </div>

      <div className="flex flex-row gap-9 z-10 max-view-details-bp:flex-col">
        <div className="flex flex-col gap-6 grow min-w-0 max-view-details-bp:order-2">
          <div className="break-all">
            <h5 className="font-bold text-xs mb-2">Description</h5>
            <div className={styles.textScroll}>{dataSource.description || 'None'}</div>
          </div>
          {indexType && !SECTIONS_DISABLED.configuration.includes(indexType) && (
            <div>
              <h5 className={styles.sectionTitle}>Data Source Configuration</h5>
              <div className="flex flex-col gap-2">
                {indexType === INDEX_TYPES.GIT && (
                  <>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Repository Index Type:</span>
                      <span className={styles.propertyValue}>
                        {REPO_INDEX_TYPE_OPTIONS.find((opt) => opt.value === dataSource.index_type)
                          ?.label ||
                          dataSource.index_type ||
                          'N/A'}
                      </span>
                    </div>
                    <div className={styles.col}>
                      <span className={styles.propertyLabel}>Repository link:</span>
                      <span className={styles.propertyValue + ' w-full'}>
                        <DetailsCopyField value={dataSource.link} label="" />
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Branch:</span>
                      <span className={styles.propertyValue}>{dataSource.branch || 'N/A'}</span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Embeddings Model:</span>
                      <span className={styles.propertyValue}>
                        {appInfoStore.findEmbeddingLabel(dataSource.embeddings_model)}
                      </span>
                    </div>
                  </>
                )}
                {indexType === INDEX_TYPES.JIRA && (
                  <div className={styles.row}>
                    <span className={styles.propertyLabel}>JQL expression:</span>
                    <span className={styles.propertyValue}>{dataSource.jira?.jql || 'N/A'}</span>
                  </div>
                )}
                {indexType === INDEX_TYPES.CONFLUENCE && (
                  <div className={styles.row}>
                    <span className={styles.propertyLabel}>CQL expression:</span>
                    <span className={styles.propertyValue}>
                      {dataSource.confluence?.cql || 'N/A'}
                    </span>
                  </div>
                )}
                {indexType === INDEX_TYPES.AZURE_DEVOPS_WIKI && (
                  <>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Wiki Name:</span>
                      <span className={styles.propertyValue}>
                        {dataSource.azure_devops_wiki?.wiki_name || 'All wikis'}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Page Path Query:</span>
                      <span className={styles.propertyValue}>
                        {dataSource.azure_devops_wiki?.wiki_query || '*'}
                      </span>
                    </div>
                  </>
                )}
                {indexType === INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM && (
                  <div className={styles.col}>
                    <span className={styles.propertyLabel}>WIQL Query:</span>
                    <div className={styles.textScroll}>
                      {dataSource.azure_devops_work_item?.wiql_query || 'N/A'}
                    </div>
                  </div>
                )}
                {indexType === INDEX_TYPES.GOOGLE && (
                  <div className="flex flex-col">
                    <span className={styles.propertyLabel}>Google doc link:</span>
                    <span className={styles.propertyValue + ' w-full '}>
                      <DetailsCopyField value={dataSource.google_doc_link} label="" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {indexType && !SECTIONS_DISABLED.processingSummary.includes(indexType) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h5 className={styles.sectionTitle.replace('mb-3', '')}>Processing Summary</h5>
                {isBedrock && (
                  <span
                    data-pr-tooltip="This data presents in Bedrock and cannot be easily calculated here"
                    data-pr-position="right"
                    className="target-tooltip cursor-pointer"
                  >
                    <InfoSvg className="w-4 h-4 text-text-quaternary" />
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {processingSummaryFields.map((fieldConfig) => {
                  const value = processingSummary[fieldConfig.field]
                  if (!fieldConfig.shouldShow || fieldConfig.shouldShow(value)) {
                    return (
                      <div key={fieldConfig.field} className="flex items-center mb-2 text-xs">
                        <div className={styles.propertyLabel + ' w-52 text-left'}>
                          {fieldConfig.label}
                        </div>
                        <span className={styles.properyTagValue}>
                          {fieldConfig.getter
                            ? fieldConfig.getter(value, isBedrock)
                            : value ?? 'N/A'}
                        </span>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          )}

          {indexType === INDEX_TYPES.PROVIDER && (
            <DataSourceDetailsProvider
              providerFields={dataSource.provider_fields}
              titleStyles={styles.sectionTitle}
              propertyLabelStyles={styles.propertyLabel}
              propertyTagStyles={styles.properyTagValue}
            />
          )}

          <div>
            {tabs.length > 1 && (
              <TabsMenu
                activeTabId={activeTabId as string}
                tabs={tabs as unknown as MenuItem[]}
                onTabChange={(tabId) => setActiveTabId(tabId)}
              />
            )}
            {tabs.length === 1 && <h5 className="font-bold text-xs mb-2">{tabs[0].label}</h5>}
            {renderActiveTab}
          </div>
        </div>

        <DetailsSidebar classNames="max-view-details-bp:order-1 max-view-details-bp:min-w-full">
          <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
            <DetailsProperty label="Project" value={dataSource?.project_name} />
            <DetailsProperty label="Data Source Type" value={humanize(indexType)} />
            <DetailsCopyField
              label="Data Source ID"
              value={dataSource.id}
              className="mt-2 uppercase"
            />
          </DetailsSidebarSection>

          {(dataSource.embeddings_model || dataSource.summarization_model) && (
            <DetailsSidebarSection headline="CONFIGURATION">
              {dataSource.embeddings_model && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-text-quaternary">Embeddings model:</p>
                  <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5">
                    {appInfoStore.findEmbeddingLabel(dataSource.embeddings_model)}
                  </div>
                </div>
              )}
              {dataSource.summarization_model && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs text-text-quaternary">Summarization model:</p>
                  <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5">
                    {appInfoStore.findLLMLabel(dataSource.summarization_model)}
                  </div>
                </div>
              )}
            </DetailsSidebarSection>
          )}

          {dataSource.cron_expression &&
            (() => {
              const description = getCronDescription(dataSource.cron_expression)
              const isCustom = description === 'Custom schedule'

              return (
                <DetailsSidebarSection headline="Reindex Type">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-text-tertiary">Schedule:</p>
                      <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5">
                        {description}
                      </div>
                    </div>
                    {isCustom && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-text-tertiary">Cron expression:</p>
                        <code className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5 font-mono text-text-primary">
                          {dataSource.cron_expression}
                        </code>
                      </div>
                    )}
                  </div>
                </DetailsSidebarSection>
              )
            })()}

          {dataSource.tokens_usage && (
            <DetailsSidebarSection headline="USAGE DETAILS">
              <div className="flex flex-row items-center gap-2">
                <p className="text-xs text-text-quaternary">Input tokens used:</p>
                <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5">
                  {dataSource.tokens_usage?.input_tokens}
                </div>
              </div>

              <div className="flex flex-row items-center gap-2">
                <p className="text-xs text-text-quaternary">Output tokens used:</p>
                <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5">
                  {dataSource.tokens_usage?.output_tokens}
                </div>
              </div>

              <div className="flex flex-row gap-2 items-center">
                <p className="text-xs text-text-quaternary">Money spent:</p>
                <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5">
                  ${dataSource.tokens_usage?.money_spent?.toFixed(4) || '0'}
                </div>
              </div>
            </DetailsSidebarSection>
          )}

          {dataSource.project_name && (
            <GuardrailAssignmentsDetails
              project={dataSource.project_name}
              entity={GuardrailEntity.KNOWLEDGEBASE}
              entityId={dataSource.id}
              guardrailAssignments={dataSource.guardrail_assignments || []}
            />
          )}
        </DetailsSidebar>
      </div>

      <Tooltip target=".target-tooltip" />
      <ConfirmationModal
        visible={isReindexConfirmationVisible}
        onCancel={() => setIsReindexConfirmationVisible(false)}
        header="Reindex Data Source?"
        message="Are you sure you want to reindex this data source?"
        confirmText="Confirm"
        onConfirm={confirmFullReindex}
        confirmButtonType={ButtonType.BASE}
      />
    </div>
  )
}

export default DataSourceDetails
