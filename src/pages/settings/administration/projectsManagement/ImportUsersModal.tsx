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

import { FC, useCallback, useMemo, useState } from 'react'

import DownloadSvg from '@/assets/icons/export-to-json.svg?react'
import ImportSvg from '@/assets/icons/export.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import Button from '@/components/Button'
import InfoWarning from '@/components/InfoWarning/InfoWarning'
import Pagination from '@/components/Pagination'
import Popup from '@/components/Popup'
import Table from '@/components/Table'
import Tooltip from '@/components/Tooltip'
import { ButtonSize, ButtonType, DECIMAL_PAGINATION_OPTIONS, InfoWarningType } from '@/constants'
import { useDragAndDrop } from '@/hooks/useDragAndDrop'
import { projectsStore } from '@/store/projects'
import { Project } from '@/types/entity/project'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { humanize } from '@/utils/helpers'
import toaster from '@/utils/toaster'

interface ImportUsersModalProps {
  visible: boolean
  project: Project | null
  onHide: () => void
  onSuccess?: () => void
}

interface ImportUserRow {
  email: string
  role: string
  error: string | null
}

type PreviewRow = ImportUserRow & { rowNum: number }

const IMPORT_STEPS = { UPLOAD: 'upload', PREVIEW: 'preview' } as const
type ImportStep = (typeof IMPORT_STEPS)[keyof typeof IMPORT_STEPS]

const DEFAULT_PER_PAGE = 10

const MESSAGES = {
  ONLY_CSV_ALLOWED: 'Only CSV files are allowed',
  FILE_TOO_LARGE: 'File size must be less than 10MB',
  IMPORT_SUCCESS: (count: number) => `Users imported successfully! ${count} users added`,
  CSV_VALIDATION_ERROR:
    'An error has been detected in your CSV file. Please fix it and upload the file again.',
  CSV_FORMAT_HINT:
    'Make sure your CSV includes at least one column named email. You can also include a role column (user/project_admin).',
  IMPORTING: 'Importing...',
  IMPORT: 'Import',
} as const

const PREVIEW_COLUMNS: ColumnDefinition[] = [
  { key: 'rowNum', label: '', type: DefinitionTypes.String, headClassNames: 'w-8' },
  { key: 'email', label: 'Email', type: DefinitionTypes.Custom },
  { key: 'role', label: 'Role', type: DefinitionTypes.Custom },
  { key: 'status', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-2' },
]

const ImportUsersModal: FC<ImportUsersModalProps> = ({ visible, project, onHide, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [step, setStep] = useState<ImportStep>(IMPORT_STEPS.UPLOAD)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewUsers, setPreviewUsers] = useState<ImportUserRow[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE)

  const validateFile = useCallback((file: File): boolean => {
    const isCSV =
      file.name.toLowerCase().endsWith('.csv') ||
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel'

    if (!isCSV) {
      toaster.error(MESSAGES.ONLY_CSV_ALLOWED)
      return false
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toaster.error(MESSAGES.FILE_TOO_LARGE)
      return false
    }

    return true
  }, [])

  const triggerValidation = useCallback(
    async (file: File) => {
      if (!project) return
      setIsValidating(true)
      setValidationError(null)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const result = await projectsStore.validateImportUsers(project.id, formData)
        setPreviewUsers(result.users ?? [])
        setCurrentPage(0)
        setStep(IMPORT_STEPS.PREVIEW)
      } catch (error: any) {
        console.error('Failed to validate CSV:', error)
        setValidationError(MESSAGES.CSV_VALIDATION_ERROR)
        setSelectedFile(null)
      } finally {
        setIsValidating(false)
      }
    },
    [project]
  )

  const handleFileDrop = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file)
        triggerValidation(file)
      }
    },
    [validateFile, triggerValidation]
  )

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useDragAndDrop({ onFileDrop: handleFileDrop })

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      if (validateFile(file)) {
        setSelectedFile(file)
        triggerValidation(file)
      }
      event.target.value = ''
    },
    [validateFile, triggerValidation]
  )

  const handleClose = useCallback(() => {
    setSelectedFile(null)
    setStep(IMPORT_STEPS.UPLOAD)
    setPreviewUsers([])
    setCurrentPage(0)
    setValidationError(null)
    onHide()
  }, [onHide])

  const handleBackToUpload = useCallback(() => {
    setStep(IMPORT_STEPS.UPLOAD)
    setPreviewUsers([])
    setCurrentPage(0)
  }, [])

  const handleImportSubmit = useCallback(async () => {
    if (!project) return
    const validRows = previewUsers.filter((u) => u.error === null)
    if (validRows.length === 0) return

    const csvLines = ['email,role', ...validRows.map((u) => `${u.email},${u.role}`)]
    const csvFile = new File([csvLines.join('\n')], 'import.csv', { type: 'text/csv' })

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('project_id', project.id)
      const result = await projectsStore.importUsers(project.id, formData)
      toaster.info(MESSAGES.IMPORT_SUCCESS(result.total))
      onSuccess?.()
      handleClose()
    } catch (error: any) {
      console.error('Failed to import users:', error)
    } finally {
      setIsUploading(false)
    }
  }, [project, previewUsers, onSuccess, handleClose])

  const handleDownloadTemplate = useCallback(() => {
    const csvContent = 'email,role\nexample@domain.com,project_admin\nexample2@domain.com,user\n'
    const a = document.createElement('a')
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`
    a.download = 'users_template.csv'
    a.click()
  }, [])

  const handlePaginationChange = useCallback((page: number, newPerPage?: number) => {
    setCurrentPage(page)
    if (newPerPage !== undefined) setPerPage(newPerPage)
  }, [])

  const totalPages = Math.ceil(previewUsers.length / perPage)
  const paginatedRows: PreviewRow[] = previewUsers
    .slice(currentPage * perPage, (currentPage + 1) * perPage)
    .map((user, i) => ({ ...user, rowNum: currentPage * perPage + i + 1 }))

  const hasValidRows = previewUsers.length > 0 && previewUsers.every((u) => u.error === null)

  const previewRenderColumns = useMemo(
    () => ({
      email: (user: PreviewRow) => (
        <span className={user.error ? 'text-error' : ''}>{user.email}</span>
      ),
      role: (user: PreviewRow) => (
        <span className="text-text-quaternary">{humanize(user.role)}</span>
      ),
      status: (user: PreviewRow) =>
        user.error ? (
          <span
            className="import-error-icon error-row inline-flex cursor-pointer pr-4"
            data-pr-tooltip={user.error}
          >
            <InfoSvg className="w-4 h-4 text-error opacity-70" />
          </span>
        ) : null,
    }),
    []
  )

  return (
    <Popup
      visible={visible}
      onHide={handleClose}
      dismissableMask={false}
      headerContent={
        <h4 className="font-geist-mono font-semibold text-base leading-none text-text-primary mb-0">
          Import Users to project
        </h4>
      }
      className={step === IMPORT_STEPS.PREVIEW ? undefined : 'w-[500px] rounded-lg'}
      isFullWidth={step === IMPORT_STEPS.PREVIEW}
      hideFooter
    >
      {step === IMPORT_STEPS.UPLOAD && (
        <div className="flex flex-col gap-6">
          <p className="font-geist-mono font-normal text-sm leading-[21px] text-text-quaternary">
            Upload a CSV file to add multiple users at once. Each row should include user&apos;s
            email and optionally a role.
          </p>

          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative overflow-hidden flex flex-col items-center justify-center gap-2.5 p-5 rounded-lg transition-colors ${
              isDragging ? 'bg-surface-base-dropzone-hover' : 'bg-surface-base-dropzone'
            }`}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none">
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                rx="8"
                stroke="rgb(var(--colors-border-specific-dropzone))"
                strokeDasharray="6 6"
              />
            </svg>
            <input
              type="file"
              accept=".csv,text/csv,application/vnd.ms-excel"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
              disabled={isValidating}
            />
            <label
              htmlFor="csv-upload"
              className={`flex flex-col items-center gap-2 ${
                isValidating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <ImportSvg className="w-4.5 h-4.5" />
              <span className="text-text-primary text-sm underline">
                {(() => {
                  if (isValidating) return 'Validating...'
                  if (selectedFile) return selectedFile.name
                  if (isDragging) return 'Drop file here'
                  return 'Upload or drop file'
                })()}
              </span>
            </label>
          </div>

          {validationError ? (
            <InfoWarning
              type={InfoWarningType.ERROR}
              message={validationError}
              className="font-geist-mono font-normal text-xs leading-none"
            />
          ) : (
            <InfoWarning
              type={InfoWarningType.INFO}
              message={MESSAGES.CSV_FORMAT_HINT}
              className="font-geist-mono font-normal text-xs leading-none"
            />
          )}

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 text-text-primary text-sm underline cursor-pointer self-start"
          >
            <DownloadSvg className="w-4 h-4" />
            <span>Download template</span>
          </button>

          <div className="flex justify-end gap-2 mb-4">
            <Button
              onClick={handleClose}
              size={ButtonSize.MEDIUM}
              type={ButtonType.SECONDARY}
              disabled={isValidating}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === IMPORT_STEPS.PREVIEW && (
        <div className="flex flex-col gap-1">
          <Tooltip target=".import-error-icon" appendTo={document.body} position="left" />
          {previewUsers.some((u) => u.error !== null) && (
            <InfoWarning
              type={InfoWarningType.ERROR}
              message={MESSAGES.CSV_VALIDATION_ERROR}
              className="font-geist-mono font-normal text-xs leading-none bg-opacity-70 py-4 px-2"
            />
          )}
          <Table<PreviewRow>
            items={paginatedRows}
            columnDefinitions={PREVIEW_COLUMNS}
            customRenderColumns={previewRenderColumns}
            className="[&_td]:py-4 [&_td:last-child]:px-2 [&_th:last-child]:px-2 [&_tr:has(.error-row)_td]:bg-red-900"
            embedded
          />

          {previewUsers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              setPage={handlePaginationChange}
              perPage={perPage}
              perPageOptions={DECIMAL_PAGINATION_OPTIONS}
              className="bg-transparent border-t-0 mt-4"
            />
          )}

          <div className="flex justify-end gap-2 my-4">
            <Button
              onClick={handleBackToUpload}
              size={ButtonSize.MEDIUM}
              type={ButtonType.SECONDARY}
              disabled={isUploading}
            >
              Back
            </Button>
            <Button
              onClick={handleImportSubmit}
              size={ButtonSize.MEDIUM}
              disabled={!hasValidRows || isUploading}
            >
              {isUploading ? MESSAGES.IMPORTING : MESSAGES.IMPORT}
            </Button>
          </div>
        </div>
      )}
    </Popup>
  )
}

export default ImportUsersModal
