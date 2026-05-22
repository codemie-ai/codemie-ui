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

import { ChangeEvent, FC, useEffect, useMemo, useRef, useState } from 'react'

import CrossSvg from '@/assets/icons/cross.svg?react'
import FileSvg from '@/assets/icons/file.svg?react'
import FolderAddSvg from '@/assets/icons/folder-add.svg?react'
import FolderSvg from '@/assets/icons/folder.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { SkillCompanionFile } from '@/types/entity/skill'
import toaster from '@/utils/toaster'

import {
  collectBundleFolders,
  fileToSkillCompanionFile,
  getBundleFileName,
  getBundleFolderPath,
  normalizeBundleFolderPath,
} from '../utils/skillBundleUtils'

const formatFileSize = (sizeBytes?: number): string => {
  if (sizeBytes == null) return 'Unknown size'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

interface SkillBundleFilesSectionProps {
  companionFiles: SkillCompanionFile[]
  folders: string[]
  isLoading?: boolean
  onCompanionFilesChange: (files: SkillCompanionFile[]) => void
  onFoldersChange: (folders: string[]) => void
}

const SkillBundleFilesSection: FC<SkillBundleFilesSectionProps> = ({
  companionFiles,
  folders,
  isLoading = false,
  onCompanionFilesChange,
  onFoldersChange,
}) => {
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [isAddFolderPopupVisible, setIsAddFolderPopupVisible] = useState(false)
  const [newFolderPath, setNewFolderPath] = useState('')
  const [uploadTargetFolder, setUploadTargetFolder] = useState('')
  const allFolders = useMemo(
    () => collectBundleFolders(companionFiles, folders),
    [companionFiles, folders]
  )

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, SkillCompanionFile[]>()

    allFolders.forEach((folder) => {
      groups.set(folder, [])
    })

    companionFiles.forEach((file) => {
      const folderPath = getBundleFolderPath(file.path)
      const folderFiles = groups.get(folderPath) ?? []
      folderFiles.push(file)
      groups.set(folderPath, folderFiles)
    })

    return Array.from(groups.entries()).map(([folderPath, files]) => ({
      folderPath,
      files: files.sort((left, right) => left.path.localeCompare(right.path)),
    }))
  }, [allFolders, companionFiles])

  const updateFolders = (updatedFolders: string[]) => {
    const normalizedFolders = Array.from(
      new Set(updatedFolders.map((folder) => normalizeBundleFolderPath(folder)))
    )

    onFoldersChange(normalizedFolders)
  }

  useEffect(() => {
    if (isAddFolderPopupVisible) {
      setTimeout(() => folderInputRef.current?.focus(), 50)
    }
  }, [isAddFolderPopupVisible])

  const handleOpenAddFolderPopup = () => {
    setNewFolderPath('')
    setIsAddFolderPopupVisible(true)
  }

  const handleAddFolderSubmit = () => {
    try {
      const normalizedFolderPath = normalizeBundleFolderPath(newFolderPath)

      if (!normalizedFolderPath) {
        toaster.error('Enter a folder path to add a sub-folder')
        return
      }

      if (!allFolders.includes(normalizedFolderPath)) {
        updateFolders([...folders, normalizedFolderPath])
      }

      setIsAddFolderPopupVisible(false)
      setNewFolderPath('')
    } catch (error) {
      toaster.error(error instanceof Error ? error.message : 'Invalid folder path')
    }
  }

  const handleAddFolderCancel = () => {
    setIsAddFolderPopupVisible(false)
    setNewFolderPath('')
  }

  const handleOpenUploadDialog = (folderPath: string) => {
    setUploadTargetFolder(folderPath)
    uploadInputRef.current?.click()
  }

  const handleUploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files ?? [])

    if (uploadedFiles.length === 0) return

    try {
      const bundleFiles = await Promise.all(
        uploadedFiles.map((file) => fileToSkillCompanionFile(file, uploadTargetFolder))
      )
      const filesByPath = new Map(companionFiles.map((file) => [file.path, file]))

      bundleFiles.forEach((file) => {
        filesByPath.set(file.path, file)
      })

      onCompanionFilesChange(
        Array.from(filesByPath.values()).sort((left, right) => left.path.localeCompare(right.path))
      )
    } catch (error) {
      toaster.error(error instanceof Error ? error.message : 'Failed to process uploaded files')
    } finally {
      setUploadTargetFolder('')
      event.target.value = ''
    }
  }

  const handleRemoveFile = (path: string) => {
    onCompanionFilesChange(companionFiles.filter((file) => file.path !== path))
  }

  return (
    <div className="rounded-xl border border-border-primary bg-surface-base-content p-4">
      <div className="flex flex-col gap-4">
        <Popup
          header="Add Folder"
          visible={isAddFolderPopupVisible}
          onHide={handleAddFolderCancel}
          onSubmit={handleAddFolderSubmit}
          submitText="OK"
          cancelText="Cancel"
          submitDisabled={!newFolderPath.trim()}
          className="w-[520px]"
        >
          <div className="flex flex-col gap-3">
            <Input
              ref={folderInputRef}
              label="Folder path"
              placeholder="references/guides"
              value={newFolderPath}
              onChange={(event) => setNewFolderPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && newFolderPath.trim()) {
                  handleAddFolderSubmit()
                }
              }}
            />
            <p className="text-xs text-text-secondary">
              Use a relative folder path. Nested paths like references/guides are supported.
            </p>
          </div>
        </Popup>

        <input
          ref={uploadInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUploadFiles}
        />

        <p className="text-xs text-text-quaternary">
          Upload files directly from the root or a sub-folder section below. Empty folders stay only
          in the current editor session until a file is added to them.
        </p>

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-border-primary px-4 py-5">
              <Spinner />
              <span className="text-sm text-text-secondary">Loading bundled files...</span>
            </div>
          ) : (
            groupedFiles.map(({ folderPath, files }) => (
              <div key={folderPath || 'root'} className="rounded-lg border border-border-primary">
                <div className="flex items-center justify-between gap-3 border-b border-border-primary px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderSvg className="size-4 text-text-quaternary" />
                    <span className="text-sm font-medium text-text-primary truncate">
                      {folderPath || 'root'}
                    </span>
                  </div>
                  <Button
                    type="tertiary"
                    size="small"
                    buttonType="button"
                    disabled={isLoading}
                    onClick={() => handleOpenUploadDialog(folderPath)}
                  >
                    Upload files
                  </Button>
                </div>

                {files.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-text-secondary">
                    No files in this folder yet.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {files.map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center justify-between gap-3 border-t border-border-primary/60 px-4 py-3 first:border-t-0"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <FileSvg className="size-4 flex-shrink-0 text-text-quaternary" />
                          <div className="min-w-0">
                            <div className="truncate text-sm text-text-primary">
                              {getBundleFileName(file.path)}
                            </div>
                            <div className="truncate text-xs text-text-quaternary">
                              {file.path} · {formatFileSize(file.size_bytes)}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="tertiary"
                          buttonType="button"
                          className="!px-2"
                          onClick={() => handleRemoveFile(file.path)}
                          aria-label={`Remove ${getBundleFileName(file.path)}`}
                        >
                          <CrossSvg className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex">
          <Button type="secondary" buttonType="button" onClick={handleOpenAddFolderPopup}>
            <FolderAddSvg /> Add Folder
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SkillBundleFilesSection
