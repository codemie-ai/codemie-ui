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

import { FC, useCallback, useState } from 'react'

import DownloadSvg from '@/assets/icons/export-to-json.svg?react'
import ImportSvg from '@/assets/icons/export.svg?react'
import Button from '@/components/Button'
import InfoWarning from '@/components/InfoWarning/InfoWarning'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType, InfoWarningType } from '@/constants'
import { useDragAndDrop } from '@/hooks/useDragAndDrop'
import { Project } from '@/types/entity/project'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

interface ImportUsersModalProps {
  visible: boolean
  project: Project | null
  onHide: () => void
  onSuccess?: () => void
}

const ImportUsersModal: FC<ImportUsersModalProps> = ({ visible, project, onHide, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const validateFile = useCallback((file: File): boolean => {
    const isCSV =
      file.name.toLowerCase().endsWith('.csv') ||
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel'

    if (!isCSV) {
      toaster.error('Only CSV files are allowed')
      return false
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toaster.error('File size must be less than 10MB')
      return false
    }

    return true
  }, [])

  const handleFileDrop = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file)
      }
    },
    [validateFile]
  )

  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useDragAndDrop({
      onFileDrop: handleFileDrop,
    })

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (validateFile(file)) {
        setSelectedFile(file)
      }
      event.target.value = ''
    },
    [validateFile]
  )

  const handleImportSubmit = useCallback(async () => {
    if (!selectedFile) {
      toaster.error('Please select a file to upload')
      return
    }

    if (!project) {
      toaster.error('No project selected')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('project_id', project.id)

      const response = await api.postMultipart(`v1/projects/${project.id}/import-users`, formData)
      const result = await response.json()

      toaster.info(`Users imported successfully! ${result.imported_count || 0} users added.`)
      onSuccess?.()
      onHide()
      setSelectedFile(null)
    } catch (error: any) {
      console.error('Failed to import users:', error)
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, project, onHide])

  const handleDownloadTemplate = useCallback(() => {
    const csvContent = 'email,role\nexample@domain.com,administrator\nexample2@domain.com,user\n'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedFile(null)
    onHide()
  }, [onHide])

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
      className="w-[500px] rounded-lg"
      hideFooter
    >
      <div className="flex flex-col gap-6">
        <p className="font-geist-mono font-normal text-sm leading-[21px] text-text-quaternary">
          Upload a CSV file to add multiple users at once. Each row should include user&apos;s email
          and optionally a role.
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
            disabled={isUploading}
          />
          <label
            htmlFor="csv-upload"
            className={`flex flex-col items-center gap-2 ${
              isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
          >
            <ImportSvg className="w-4.5 h-4.5" />
            <span className="text-text-primary text-sm underline">
              {(() => {
                if (selectedFile) return selectedFile.name
                if (isDragging) return 'Drop file here'
                return 'Upload or drop file'
              })()}
            </span>
          </label>
        </div>

        <InfoWarning
          type={InfoWarningType.INFO}
          message="Make sure your CSV includes at least one column named email. You can also include a role column (project admin)."
          className="font-geist-mono font-normal text-xs leading-none"
        />

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
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImportSubmit}
            size={ButtonSize.MEDIUM}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>
    </Popup>
  )
}

export default ImportUsersModal
