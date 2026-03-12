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

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'

import { filesStore } from '@/store/files'

import { FileMetadata, useFileUpload, FileUploadError } from '../useFileUpload'

vi.hoisted(() => vi.resetModules())

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
  proxy: vi.fn(),
}))

vi.mock('@/store', () => ({
  userStore: {
    user: { userId: 'test-user' },
  },
}))

vi.mock('@/store/files', () => ({
  filesStore: {
    uploadFiles: vi.fn(),
  },
}))

vi.mock('@/utils/utils', () => ({
  decodeFileName: vi.fn((fileUrl: string) => {
    if (fileUrl === 'existing-url')
      return { mimeType: 'text/plain', user: 'test-user', originalFileName: 'existing-file.txt' }
    return {
      mimeType: 'text/plain',
      user: 'test-user',
      originalFileName: fileUrl.split('/').pop() ?? '',
    }
  }),
}))

const createMockFile = (name: string, size: number = 1024, type: string = 'text/plain'): File => {
  const file = new File(['mock content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with correct default values', () => {
    const files: FileMetadata[] = []
    const setFiles = vi.fn()
    const { result } = renderHook(() => useFileUpload({ files, setFiles }))

    expect(result.current.hasActiveUploads).toBe(false)
    expect(typeof result.current.addFiles).toBe('function')
    expect(typeof result.current.removeFile).toBe('function')
    expect(typeof result.current.openFilePicker).toBe('function')
    expect(result.current.inputProps).toMatchObject({
      type: 'file',
      multiple: true,
      className: 'hidden',
      'aria-label': 'Select files to upload',
    })
    expect(result.current.inputProps.ref).toBeDefined()
    expect(typeof result.current.inputProps.onChange).toBe('function')
  })

  it('calls click on the input ref when openFilePicker is called', () => {
    const files: FileMetadata[] = []
    const setFiles = vi.fn()
    const { result } = renderHook(() => useFileUpload({ files, setFiles }))

    const mockClick = vi.fn()
    // @ts-expect-error: Access to ref.current for testing
    result.current.inputProps.ref.current = { click: mockClick }

    act(() => {
      result.current.openFilePicker()
    })

    expect(mockClick).toHaveBeenCalled()
  })

  describe('addFiles', () => {
    it('handles no files gracefully', async () => {
      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles }))

      await act(async () => {
        result.current.addFiles([])
      })

      expect(setFiles).not.toHaveBeenCalled()
      expect(filesStore.uploadFiles).not.toHaveBeenCalled()
    })

    it('uploads valid files', async () => {
      ;(filesStore.uploadFiles as Mock).mockResolvedValue({
        files: [{ file_url: 'upload-url/test.txt' }],
        failed_files: {},
      })

      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles }))
      const mockFile = createMockFile('test.txt')

      await act(async () => {
        result.current.addFiles([mockFile])
      })

      expect(setFiles).toHaveBeenCalledTimes(2)
      expect(filesStore.uploadFiles).toHaveBeenCalledWith([mockFile])
    })

    it('rejects files that exceed size limit', async () => {
      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()
      const customMaxSize = 1024
      const { result } = renderHook(() =>
        useFileUpload({ files, setFiles, handleErrors, maxFileSize: customMaxSize })
      )
      const oversizedFile = createMockFile('big.txt', customMaxSize + 1)

      await act(async () => {
        result.current.addFiles([oversizedFile])
      })

      expect(filesStore.uploadFiles).not.toHaveBeenCalled()
      expect(handleErrors).toHaveBeenCalled()
    })

    it('limits the number of files added', async () => {
      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()
      const customMaxFiles = 3
      const { result } = renderHook(() =>
        useFileUpload({ files, setFiles, handleErrors, maxFiles: customMaxFiles })
      )

      const mockFiles = Array.from({ length: customMaxFiles + 2 }, (_, i) =>
        createMockFile(`file${i}.txt`)
      )

      await act(async () => {
        result.current.addFiles(mockFiles)
      })

      expect(handleErrors).toHaveBeenNthCalledWith(1, [
        expect.objectContaining({
          type: 'LIMIT_EXCEEDED_ERROR',
          message: expect.stringContaining(`Max ${customMaxFiles} files are allowed`),
        }),
      ])

      expect(filesStore.uploadFiles).toHaveBeenNthCalledWith(
        1,
        expect.arrayContaining(mockFiles.slice(0, customMaxFiles))
      )
    })

    it('handles both size and limit errors in one operation', async () => {
      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()
      const { result } = renderHook(() =>
        useFileUpload({ files, setFiles, handleErrors, maxFiles: 10, maxFileSize: 100 })
      )

      const validFiles = Array.from({ length: 10 }, (_, i) => createMockFile(`valid${i}.txt`, 50))

      const oversizedFile = createMockFile('big.txt', 101)
      const extraFile = createMockFile('extra.txt', 50)

      await act(async () => {
        result.current.addFiles([...validFiles, oversizedFile, extraFile])
      })

      expect(handleErrors).toHaveBeenNthCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ type: 'SIZE_EXCEEDED_ERROR' }),
          expect.objectContaining({ type: 'LIMIT_EXCEEDED_ERROR' }),
        ])
      )

      expect(filesStore.uploadFiles).toHaveBeenNthCalledWith(1, validFiles)
    })
  })

  describe('handleFilesUpload', () => {
    it('tracks upload status correctly', async () => {
      ;(filesStore.uploadFiles as Mock).mockImplementationOnce(() =>
        Promise.resolve({
          files: [{ file_url: 'upload-url/test.txt' }],
          failed_files: {},
        })
      )

      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles }))
      const mockFile = createMockFile('test.txt')

      await act(async () => {
        result.current.addFiles([mockFile])
      })

      expect(setFiles).toHaveBeenCalledTimes(2)

      const firstCallUpdater = setFiles.mock.calls[0][0]
      const firstCallResult = firstCallUpdater([])
      expect(firstCallResult).toEqual([
        expect.objectContaining({
          fileName: 'test.txt',
          isUploading: true,
        }),
      ])

      const secondCallUpdater = setFiles.mock.calls[1][0]
      const secondCallResult = secondCallUpdater([
        { fileName: 'test.txt', mimeType: 'text/plain', user: 'test-user', isUploading: true },
      ])
      expect(secondCallResult).toEqual([
        expect.objectContaining({
          fileName: 'test.txt',
          isUploading: false,
        }),
      ])
    })

    it('handles upload failures', async () => {
      ;(filesStore.uploadFiles as Mock).mockResolvedValueOnce({
        files: [],
        failed_files: {
          'failed.txt': 'Upload failed',
        },
      })

      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles, handleErrors }))
      const mockFile = createMockFile('failed.txt')

      await act(async () => {
        result.current.addFiles([mockFile])
      })

      expect(handleErrors).toHaveBeenNthCalledWith(1, [
        expect.objectContaining({
          type: 'UPLOAD_ERROR',
          fileNames: ['failed.txt'],
          message: expect.stringContaining('failed.txt'),
        }),
      ])
    })

    it('handles API errors gracefully', async () => {
      const uploadFilesSpy = vi
        .spyOn(filesStore, 'uploadFiles')
        .mockRejectedValueOnce(new Error('Network failure'))

      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles, handleErrors }))
      const mockFile = createMockFile('test.txt')

      await act(async () => {
        result.current.addFiles([mockFile])
      })

      expect(handleErrors).toHaveBeenNthCalledWith(1, [
        expect.objectContaining({
          type: 'UPLOAD_ERROR',
          message: expect.stringContaining('Network failure'),
        }),
      ])

      uploadFilesSpy.mockRestore()
    })

    it('groups failed uploads by error message', async () => {
      ;(filesStore.uploadFiles as Mock).mockResolvedValueOnce({
        files: [{ file_url: 'upload-url/success.txt' }],
        failed_files: {
          'failed1.txt': 'Same error',
          'failed2.txt': 'Same error',
          'failed3.txt': 'Different error',
        },
      })

      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles, handleErrors }))
      const mockFiles = [
        createMockFile('success.txt'),
        createMockFile('failed1.txt'),
        createMockFile('failed2.txt'),
        createMockFile('failed3.txt'),
      ]

      await act(async () => {
        result.current.addFiles(mockFiles)
      })

      expect(handleErrors).toHaveBeenCalledWith([
        expect.objectContaining({
          fileNames: ['failed1.txt', 'failed2.txt'],
          type: 'UPLOAD_ERROR',
          message: expect.stringContaining('Same error'),
        }),
        expect.objectContaining({
          fileNames: ['failed3.txt'],
          type: 'UPLOAD_ERROR',
          message: expect.stringContaining('Different error'),
        }),
      ])
    })

    it('handles multiple file uploads', async () => {
      ;(filesStore.uploadFiles as Mock).mockResolvedValueOnce({
        files: [{ file_url: 'upload-url/file1.txt' }, { file_url: 'upload-url/file2.txt' }],
        failed_files: {},
      })

      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles }))
      const mockFiles = [createMockFile('file1.txt'), createMockFile('file2.txt')]

      await act(async () => {
        result.current.addFiles(mockFiles)
      })

      const lastCall = setFiles.mock.calls[setFiles.mock.calls.length - 1]
      const updaterFunction = lastCall[0]
      const resultFiles = updaterFunction([
        { fileName: 'file1.txt', mimeType: 'text/plain', user: 'test-user', isUploading: true },
        { fileName: 'file2.txt', mimeType: 'text/plain', user: 'test-user', isUploading: true },
      ])

      expect(resultFiles).toEqual([
        expect.objectContaining({ fileName: 'file1.txt', isUploading: false }),
        expect.objectContaining({ fileName: 'file2.txt', isUploading: false }),
      ])
    })
  })

  describe('removeFile', () => {
    it('removes file by index', () => {
      const files: FileMetadata[] = [
        { fileName: 'file1.txt', mimeType: 'text/plain', user: 'test-user', isUploading: false },
        { fileName: 'file2.txt', mimeType: 'text/plain', user: 'test-user', isUploading: false },
      ]
      const setFiles = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles }))

      act(() => {
        result.current.removeFile(0)
      })

      expect(setFiles.mock.calls[0][0](files)[0]).toEqual({
        fileName: 'file2.txt',
        mimeType: 'text/plain',
        user: 'test-user',
        isUploading: false,
      })
    })

    it('removes associated file errors', async () => {
      const uploadFilesMock = filesStore.uploadFiles as Mock
      uploadFilesMock.mockResolvedValueOnce({
        files: [{ file_url: 'upload-url/valid.txt' }],
        failed_files: {},
      })

      const oversizedFile = createMockFile('big.txt', 101)
      const validFile = createMockFile('valid.txt', 50)
      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()

      const mockedHandleErrors = (errors: FileUploadError[]) => {
        handleErrors(errors)
      }

      const { result } = renderHook(() =>
        useFileUpload({
          files,
          setFiles,
          handleErrors: mockedHandleErrors,
          maxFileSize: 100,
        })
      )

      await act(async () => {
        result.current.addFiles([validFile, oversizedFile])
      })

      expect(handleErrors).toHaveBeenCalled()

      const errorCalls = handleErrors.mock.calls
      expect(errorCalls.length).toBeGreaterThan(0)

      const firstCallArgs = errorCalls[0][0]
      expect(firstCallArgs).toBeDefined()
      expect(firstCallArgs.length).toBeGreaterThan(0)
      expect(firstCallArgs[0].fileNames).toContain('big.txt')

      act(() => {
        result.current.removeFile(0)
      })
    })
  })

  describe('hasActiveUploads', () => {
    it('returns true when files are uploading', () => {
      const files: FileMetadata[] = [
        { fileName: 'file1.txt', mimeType: 'text/plain', user: 'test-user', isUploading: true },
        { fileName: 'file2.txt', mimeType: 'text/plain', user: 'test-user', isUploading: false },
      ]
      const setFiles = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles }))

      expect(result.current.hasActiveUploads).toBe(true)
    })

    it('returns false when no files are uploading', () => {
      const files: FileMetadata[] = [
        { fileName: 'file1.txt', mimeType: 'text/plain', user: 'test-user', isUploading: false },
        { fileName: 'file2.txt', mimeType: 'text/plain', user: 'test-user', isUploading: false },
      ]
      const setFiles = vi.fn()
      const { result } = renderHook(() => useFileUpload({ files, setFiles }))

      expect(result.current.hasActiveUploads).toBe(false)
    })
  })

  describe('error handling and message formatting', () => {
    it('formats error messages with limited file names', async () => {
      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()
      const maxDisplayed = 2
      const { result } = renderHook(() =>
        useFileUpload({
          files,
          setFiles,
          handleErrors,
          maxFilesDisplayedInError: maxDisplayed,
          maxFileSize: 100,
        })
      )

      const oversizedFiles = Array.from({ length: maxDisplayed + 3 }, (_, i) =>
        createMockFile(`big${i}.txt`, 200)
      )

      await act(async () => {
        result.current.addFiles(oversizedFiles)
      })

      expect(handleErrors).toHaveBeenNthCalledWith(1, [
        expect.objectContaining({
          type: 'SIZE_EXCEEDED_ERROR',
          message: expect.stringContaining(`(+3)`),
        }),
      ])
    })

    it('uses maxFileSizeHumanized in error messages', async () => {
      const files: FileMetadata[] = []
      const setFiles = vi.fn()
      const handleErrors = vi.fn()
      const customSizeLabel = '50MB'
      const { result } = renderHook(() =>
        useFileUpload({
          files,
          setFiles,
          handleErrors,
          maxFileSize: 50 * 1024 * 1024,
          maxFileSizeHumanized: customSizeLabel,
        })
      )

      const oversizedFile = createMockFile('big.txt', 51 * 1024 * 1024)

      await act(async () => {
        result.current.addFiles([oversizedFile])
      })

      expect(handleErrors).toHaveBeenNthCalledWith(1, [
        expect.objectContaining({
          type: 'SIZE_EXCEEDED_ERROR',
          message: expect.stringContaining(customSizeLabel),
        }),
      ])
    })
  })
})
