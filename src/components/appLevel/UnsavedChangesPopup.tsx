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

import { useEffect, useState, useCallback, useContext } from 'react'
import { useBlocker } from 'react-router'

import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { UnsavedChangesContext } from '@/hooks/useUnsavedChangesWarning'

export const UnsavedChangesPopup: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<any>(null)

  const {
    checkHasUnsavedChanges,
    pendingAction,
    setPendingAction,
    showProgrammaticDialog,
    setShowProgrammaticDialog,
    isNavigatingAwayRef,
    dialogMessage,
  } = useContext(UnsavedChangesContext)!

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const hasUnsavedChanges = checkHasUnsavedChanges()
    return (
      hasUnsavedChanges &&
      !isNavigatingAwayRef.current &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash)
    )
  })

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowDialog(true)
      setPendingNavigation(blocker)
    }
  }, [blocker.state])

  useEffect(() => {
    if (showProgrammaticDialog) {
      setShowDialog(true)
    }
  }, [showProgrammaticDialog])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (checkHasUnsavedChanges() && !isNavigatingAwayRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [checkHasUnsavedChanges, isNavigatingAwayRef])

  const handleConfirm = useCallback(() => {
    setShowDialog(false)

    if (pendingAction) {
      setTimeout(() => {
        pendingAction()
        setPendingAction(null)
        setShowProgrammaticDialog(false)
      }, 300)
      return
    }

    if (pendingNavigation) {
      isNavigatingAwayRef.current = false
      setTimeout(() => {
        pendingNavigation?.proceed?.()
        setPendingNavigation(null)
      }, 300)
    }
  }, [
    pendingNavigation,
    pendingAction,
    setPendingAction,
    setShowProgrammaticDialog,
    isNavigatingAwayRef,
  ])

  const handleCancel = useCallback(() => {
    setShowDialog(false)

    if (pendingAction) {
      setPendingAction(null)
      setShowProgrammaticDialog(false)
      return
    }

    if (pendingNavigation) {
      isNavigatingAwayRef.current = false
      pendingNavigation?.reset?.()
      setPendingNavigation(null)
    }
  }, [
    pendingNavigation,
    pendingAction,
    setPendingAction,
    setShowProgrammaticDialog,
    isNavigatingAwayRef,
  ])

  return (
    <ConfirmationModal
      visible={showDialog}
      header="Unsaved Changes"
      message={dialogMessage}
      confirmText="Discard Changes"
      cancelText="Keep Editing"
      confirmButtonType={ButtonType.PRIMARY}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}
