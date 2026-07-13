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

import React, { useCallback, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
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
import {
  INDEX_TYPES,
  INDEX_TYPE_CHUNK_SUMMARY,
  INDEX_TYPE_SUMMARY,
  IndexType,
  REPO_INDEX_TYPE_OPTIONS,
  SHAREPOINT_AUTH_TYPES,
} from '@/constants/dataSources'
import { DATASOURCES } from '@/constants/routes'
import { useProjectDisplayNames } from '@/hooks/useProjectDisplayNames'
import { useVueRouter } from '@/hooks/useVueRouter'
import DataSourceTypeIcon from '@/pages/dataSources/components/DataSourceTypeIcon'
import {
  canFullReindex,
  canIncrementalReindex,
  isSharePointMicrosoftAuth,
  performIncrementalReindex,
  performFullReindex,
} from '@/pages/dataSources/utils/dataSourceUtils'
import { appInfoStore } from '@/store/appInfo'
import { dataSourceStore } from '@/store/dataSources'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'
import { GuardrailEntity } from '@/types/entity/guardrail'
import { getCronDescription, getNextCronRun } from '@/utils/cronValidator'
import { canDelete, canEdit } from '@/utils/entity'
import { formatDateTime, formatScheduleDate, humanize, isNumberValue } from '@/utils/helpers'
import { getIndexTypeCode } from '@/utils/indexing'

import DataSourceDeleteModal from './DataSourceDeleteModal'
import DataSourceDetailsProvider from './DataSourceDetails/DetaSourceDetailsProvider'
import SharePointReindexAuthPopup from './SharePointReindexAuthPopup'

import type { MenuItem } from 'primereact/menuitem'

interface DataSourceDetailsProps {
  dataSource: DataSourceDetailsResponse
}

enum TabsId {
  extension,
  files,
  sharepointFilter,
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
    field: 'failed_documents',
    label: 'Failed Documents:',
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

type DataListItem = {
  id: string
  displayValue: string
}

const DataList: React.FC<{ items: DataListItem[]; emptyText?: string }> = ({
  items,
  emptyText = 'None',
}) => {
  if (!items.length) {
    return <div className={styles.textScroll}>{emptyText}</div>
  }
  return (
    <ul className="bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg px-6 py-3 mt-4 max-h-56 overflow-y-auto show-scroll">
      {items.map((item) => (
        <li key={item.id} className={styles.propertyValue + ' break-words mb-1 list-disc'}>
          {item.displayValue}
        </li>
      ))}
    </ul>
  )
}

const DataSourceDetails: React.FC<DataSourceDetailsProps> = ({ dataSource }) => {
  const router = useVueRouter()
  const projectDisplayNames = useProjectDisplayNames(dataSource?.project_name)
  const projectDisplayName = dataSource?.project_name
    ? projectDisplayNames.get(dataSource.project_name)
    : undefined
  const indexType = useMemo(() => {
    if (dataSource?.vcs_type === INDEX_TYPES.SVN) return INDEX_TYPES.SVN
    return getIndexTypeCode(dataSource?.index_type)
  }, [dataSource?.index_type, dataSource?.vcs_type]) as IndexType

  const isBedrock = useMemo(() => {
    // Check if index_type contains 'bedrock'
    return !!dataSource?.index_type?.toLowerCase().includes('bedrock')
  }, [dataSource?.index_type, dataSource?.provider_fields])
  const isSummarizationIndexType = useMemo(
    () =>
      dataSource?.index_type === INDEX_TYPE_SUMMARY ||
      dataSource?.index_type === INDEX_TYPE_CHUNK_SUMMARY,
    [dataSource?.index_type]
  )
  const {
    reindexProviderIndex,
    updateKBIndex,
    reIndexKBIndex,
    updateApplicationIndex,
    reindexMarketplace,
  } = useSnapshot(dataSourceStore) as typeof dataSourceStore

  const [isReindexConfirmationVisible, setIsReindexConfirmationVisible] = useState(false)
  const [spReindexVisible, setSpReindexVisible] = useState(false)
  const [isDeleteVisible, setIsDeleteVisible] = useState(false)

  const showEditButton = useMemo(() => canEdit(dataSource), [dataSource])
  const showDeleteButton = useMemo(() => canDelete(dataSource), [dataSource])

  const showIncrementalReindexButton = useMemo(
    () => canIncrementalReindex(dataSource),
    [dataSource]
  )
  const showFullReindexButton = useMemo(() => canFullReindex(dataSource), [dataSource])

  const cronDescription = useMemo(
    () => (dataSource.cron_expression ? getCronDescription(dataSource.cron_expression) : null),
    [dataSource]
  )
  const isCustomSchedule = useMemo(() => cronDescription === 'Custom schedule', [cronDescription])
  const nextRun = useMemo(
    () => (dataSource.cron_expression ? getNextCronRun(dataSource.cron_expression) : null),
    [dataSource]
  )

  const handleEdit = useCallback(() => {
    router.push(`/data-sources/${dataSource.id}/edit`)
  }, [router, dataSource.id])
  const processedFilesData = useMemo<DataListItem[]>(
    () =>
      (dataSource.processed_files || []).flatMap((file: string, idx: number) =>
        file.includes('\n')
          ? file.split('\n').map((line, i) => ({ id: `${idx}-${i}`, displayValue: line }))
          : [{ id: String(idx), displayValue: file }]
      ),
    [dataSource.processed_files]
  )

  const uploadedFilesData = useMemo<DataListItem[]>(
    () =>
      (dataSource.uploaded_files || []).map((file: string, idx: number) => ({
        id: String(idx),
        displayValue: file,
      })),
    [dataSource.uploaded_files]
  )

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
    if (indexType === INDEX_TYPES.GIT || indexType === INDEX_TYPES.SVN) {
      tabsList.push({ id: TabsId.files, label: 'Files Filter' })
    }
    if (indexType === INDEX_TYPES.SHAREPOINT && dataSource.sharepoint?.files_filter) {
      tabsList.push({ id: TabsId.sharepointFilter, label: 'Document Filter' })
    }

    if (indexType && !SECTIONS_DISABLED.processingData.includes(indexType)) {
      tabsList.push({ id: TabsId.data, label: 'Processed Data' })
    }

    return tabsList
  }, [processingSummary, indexType, dataSource.sharepoint?.files_filter])

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

    if (activeTabId === TabsId.sharepointFilter) {
      const filter = dataSource.sharepoint?.files_filter
      return filter ? (
        <div className={styles.textScroll}>
          <ul className="overflow-y-visible">
            {filter
              .split('\n')
              .filter(Boolean)
              .map((pattern, idx) => (
                <li key={`${pattern}-${idx}`}>{pattern}</li>
              ))}
          </ul>
        </div>
      ) : (
        <div className={styles.textScroll}>N/A</div>
      )
    }

    if (activeTabId === TabsId.data) {
      return <DataList items={processedFilesData} emptyText="None" />
    }

    return <div />
  }, [tabs, activeTabId, processingSummary, dataSource, processedFilesData])

  const showFullReindexConfirmation = () => {
    if (isSharePointMicrosoftAuth(dataSource)) {
      setSpReindexVisible(true)
    } else {
      setIsReindexConfirmationVisible(true)
    }
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

  const handleSpOauthSuccess = (accessToken: string) => {
    const customClientId =
      dataSource.sharepoint?.auth_type === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
        ? dataSource.sharepoint?.oauth_client_id || undefined
        : undefined
    const customTenantId =
      dataSource.sharepoint?.auth_type === SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM
        ? dataSource.sharepoint?.oauth_tenant_id || undefined
        : undefined
    updateKBIndex(
      INDEX_TYPES.SHAREPOINT,
      {
        name: dataSource.repo_name,
        project_name: dataSource.project_name,
        site_url: dataSource.sharepoint?.site_url ?? '',
        auth_type: dataSource.sharepoint?.auth_type ?? SHAREPOINT_AUTH_TYPES.OAUTH_CODEMIE,
        access_token: accessToken,
        oauth_client_id: customClientId,
        oauth_tenant_id: customTenantId,
      },
      true
    )
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
            {dataSource.updated_by && (
              <div className="flex gap-4 text-xs text-text-quaternary">
                <p>Updated by {dataSource.updated_by.name || 'N/A'}</p>
                {dataSource.update_date && (
                  <>
                    <span>|</span>
                    <p>{formatDateTime(dataSource.update_date)}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {(showDeleteButton ||
          showEditButton ||
          showFullReindexButton ||
          showIncrementalReindexButton) && (
          <div className="flex gap-2 my-3">
            {showDeleteButton && (
              <Button size="small" variant="secondary" onClick={() => setIsDeleteVisible(true)}>
                <DeleteSvg />
                Delete
              </Button>
            )}
            {showEditButton && (
              <Button size="small" variant="secondary" onClick={handleEdit}>
                <EditSvg />
                Edit
              </Button>
            )}
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
                {indexType === INDEX_TYPES.SVN && (
                  <>
                    <div className={styles.col}>
                      <span className={styles.propertyLabel}>Repository URL:</span>
                      <span className={styles.propertyValue + ' w-full'}>
                        <DetailsCopyField value={dataSource.link} label="" />
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Branch / Path:</span>
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
                {indexType === INDEX_TYPES.SHAREPOINT && (
                  <>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Site URL:</span>
                      <span className={styles.propertyValue}>
                        {dataSource.sharepoint?.site_url || 'N/A'}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Auth Method:</span>
                      <span className={styles.propertyValue}>
                        {(
                          {
                            [SHAREPOINT_AUTH_TYPES.OAUTH_CODEMIE]:
                              'Sign in with Microsoft (CodeMie Project)',
                            [SHAREPOINT_AUTH_TYPES.OAUTH_CUSTOM]:
                              'Sign in with Microsoft (Custom Project)',
                          } as Record<string, string>
                        )[dataSource.sharepoint?.auth_type ?? ''] ?? 'Integration'}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Include Pages:</span>
                      <span className={styles.propertyValue}>
                        {dataSource.sharepoint?.include_pages ?? true ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Include Documents:</span>
                      <span className={styles.propertyValue}>
                        {dataSource.sharepoint?.include_documents ?? true ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Include Lists:</span>
                      <span className={styles.propertyValue}>
                        {dataSource.sharepoint?.include_lists ?? true ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </>
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
                <h5 className={styles.sectionTitle.replace('mb-3', '')}>
                  Latest Processing Summary
                </h5>
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

          {indexType === INDEX_TYPES.FILE && uploadedFilesData.length > 0 && (
            <div>
              <h5 className={styles.sectionTitle}>All Uploaded Files</h5>
              <DataList items={uploadedFilesData} />
            </div>
          )}
        </div>

        <DetailsSidebar classNames="max-view-details-bp:order-1 max-view-details-bp:min-w-full">
          <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
            <DetailsProperty
              label="Project"
              value={
                projectDisplayName ? (
                  <span data-tooltip-id="react-tooltip" data-tooltip-content={projectDisplayName}>
                    {dataSource?.project_name}
                  </span>
                ) : (
                  dataSource?.project_name
                )
              }
            />
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
                  <p className="text-xs text-text-quaternary">Embeddings model</p>
                  <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5">
                    {appInfoStore.findEmbeddingLabel(dataSource.embeddings_model)}
                  </div>
                </div>
              )}
              {dataSource.summarization_model && isSummarizationIndexType && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs text-text-quaternary">Summarization model</p>
                  <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5">
                    {appInfoStore.findLLMLabel(dataSource.summarization_model)}
                  </div>
                </div>
              )}
            </DetailsSidebarSection>
          )}

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

          <DetailsSidebarSection headline="SCHEDULER">
            <div className="flex flex-col gap-3">
              {dataSource.last_reindex_triggered_at && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-text-quaternary">Last indexed</p>
                  <p className="text-xs">
                    {formatScheduleDate(dataSource.last_reindex_triggered_at)}
                  </p>
                </div>
              )}
              {!dataSource.cron_expression ? (
                <p className="text-xs text-text-quaternary">Manual indexing only</p>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-text-quaternary">Next scheduled run</p>
                    <p className="text-xs">{formatScheduleDate(nextRun)}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-text-quaternary">Schedule</p>
                    <p className="text-xs">{cronDescription}</p>
                  </div>
                  {isCustomSchedule && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-text-quaternary">Cron expression</p>
                      <code className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-xs leading-5 font-mono text-text-primary">
                        {dataSource.cron_expression}
                      </code>
                    </div>
                  )}
                </>
              )}
            </div>
          </DetailsSidebarSection>

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
      <DataSourceDeleteModal
        item={dataSource}
        visible={isDeleteVisible}
        onHide={() => setIsDeleteVisible(false)}
        onDeleted={() => router.push(`/${DATASOURCES}`)}
      />
      <ConfirmationModal
        visible={isReindexConfirmationVisible}
        onCancel={() => setIsReindexConfirmationVisible(false)}
        header="Reindex Data Source?"
        message="Are you sure you want to reindex this data source?"
        confirmText="Confirm"
        onConfirm={confirmFullReindex}
        confirmButtonType={ButtonType.BASE}
      />
      <SharePointReindexAuthPopup
        item={dataSource}
        visible={spReindexVisible}
        onHide={() => setSpReindexVisible(false)}
        onSuccess={handleSpOauthSuccess}
      />
    </div>
  )
}

export default DataSourceDetails
