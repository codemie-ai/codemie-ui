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

import isEqual from 'lodash/isEqual'
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react'

export const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes that will be lost. Are you sure you want to discard them?'

interface UnsavedChangesContextValue {
  checkHasUnsavedChanges: () => boolean
  registerForm: (formId: string, checkDirty: () => boolean) => void
  unregisterForm: (formId: string) => void
  attemptFormClose: (formId: string, onSuccess: () => void, message?: string) => void
  pendingAction: (() => void) | null
  setPendingAction: (action: (() => void) | null) => void
  showProgrammaticDialog: boolean
  setShowProgrammaticDialog: (show: boolean) => void
  isNavigatingAwayRef: React.MutableRefObject<boolean>
  dialogMessage: string
}

interface UseUnsavedChangesOptions<T = any> {
  formId: string
  getCurrentValues?: () => T
  comparator?: (initial: T, current: T) => boolean
}

export const UnsavedChangesContext = createContext<UnsavedChangesContextValue | undefined>(
  undefined
)

export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dirtyChecksRef = useRef<Map<string, () => boolean>>(new Map())
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [showProgrammaticDialog, setShowProgrammaticDialog] = useState(false)
  const [dialogMessage, setDialogMessage] = useState(UNSAVED_CHANGES_MESSAGE)
  const isNavigatingAwayRef = useRef(false)

  const checkHasUnsavedChanges = useCallback(() => {
    return Array.from(dirtyChecksRef.current.values()).some((checkFn) => checkFn())
  }, [])

  const registerForm = useCallback((formId: string, checkDirty: () => boolean) => {
    if (!formId) return
    dirtyChecksRef.current.set(formId, checkDirty)
  }, [])

  const unregisterForm = useCallback((formId: string) => {
    dirtyChecksRef.current.delete(formId)
  }, [])

  const attemptFormClose = useCallback(
    (formId: string, onSuccess: () => void, message?: string) => {
      const checkDirty = dirtyChecksRef.current.get(formId)
      const isFormDirty = checkDirty ? checkDirty() : false

      if (!isFormDirty) {
        onSuccess()
        return
      }

      const handleConfirm = () => {
        dirtyChecksRef.current.delete(formId)
        onSuccess()
      }

      setDialogMessage(message || UNSAVED_CHANGES_MESSAGE)
      setPendingAction(() => handleConfirm)
      setShowProgrammaticDialog(true)
    },
    []
  )

  const value = useMemo(
    () => ({
      checkHasUnsavedChanges,
      registerForm,
      unregisterForm,
      attemptFormClose,
      pendingAction,
      setPendingAction,
      showProgrammaticDialog,
      setShowProgrammaticDialog,
      isNavigatingAwayRef,
      dialogMessage,
    }),
    [
      checkHasUnsavedChanges,
      registerForm,
      unregisterForm,
      attemptFormClose,
      pendingAction,
      showProgrammaticDialog,
      dialogMessage,
    ]
  )

  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>
}

export const useUnsavedChanges = <T = any,>({
  formId,
  getCurrentValues = () => null as T,
  comparator,
}: UseUnsavedChangesOptions<T>) => {
  const context = useContext(UnsavedChangesContext)
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider')
  }

  const {
    registerForm,
    unregisterForm,
    attemptFormClose: contextAttemptFormClose,
    isNavigatingAwayRef,
  } = context

  const [initialValues, setInitialValues] = useState<T | null>(null)

  const cloneValues = useCallback((values: T) => {
    return JSON.parse(JSON.stringify(values, (_, value) => (value === undefined ? null : value)))
  }, [])

  const isReady = getCurrentValues() !== null

  useEffect(() => {
    if (isReady && initialValues === null) {
      const values = getCurrentValues()
      setInitialValues(cloneValues(values))
    }
  }, [isReady, initialValues, getCurrentValues, cloneValues, formId])

  const checkDirty = useCallback(() => {
    if (initialValues === null) return false
    const currentValues = getCurrentValues()

    if (comparator) {
      return comparator(initialValues, currentValues)
    }

    return !isEqual(initialValues, currentValues)
  }, [initialValues, getCurrentValues, comparator])

  useEffect(() => {
    registerForm(formId, checkDirty)
    return () => {
      unregisterForm(formId)
    }
  }, [formId, registerForm, unregisterForm, checkDirty])

  const attemptFormClose = useCallback(
    (onSuccess: () => void, message?: string) => {
      contextAttemptFormClose(formId, onSuccess, message)
    },
    [formId, contextAttemptFormClose]
  )

  const unblockTransition = useCallback(() => {
    isNavigatingAwayRef.current = true
  }, [isNavigatingAwayRef])

  const blockTransition = useCallback(() => {
    setTimeout(() => {
      isNavigatingAwayRef.current = false
    }, 100)
  }, [isNavigatingAwayRef])

  return { attemptFormClose, unblockTransition, blockTransition }
}
