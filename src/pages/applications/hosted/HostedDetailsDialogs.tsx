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

import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'

import HostedUploadDialog from './HostedUploadDialog'
import HostedValidationDialog from './HostedValidationDialog'

import type { useHostedApplicationDetails } from './useHostedApplicationDetails'

type Details = ReturnType<typeof useHostedApplicationDetails>

/** Dialogs of the version list, driven by the details hook's state; header actions have their own. */
const HostedDetailsDialogs = ({ details }: { details: Details }) => {
  const { application, resume, setResume, report, setReport, isCurrent, load } = details
  const { confirmVersion, setConfirmVersion, busy } = details
  const finish = () => {
    if (!isCurrent()) return
    setResume(null)
    load()
  }
  return (
    <>
      {resume && application && (
        <HostedUploadDialog
          version={resume}
          application={application}
          onClose={finish}
          onUploaded={finish}
        />
      )}
      {report && (
        <HostedValidationDialog
          appId={details.id}
          version={report}
          onClose={() => setReport(null)}
          onConfigured={() => {
            if (!isCurrent()) return
            setReport(null)
            load()
          }}
        />
      )}
      {confirmVersion && (
        <ConfirmationModal
          visible
          className="max-sm:!min-w-0"
          header={
            confirmVersion.action === 'activate' ? 'Activate this version?' : 'Cancel this version?'
          }
          message={
            confirmVersion.action === 'activate'
              ? 'People with access will see this version. Anyone viewing the app now needs to reopen it.'
              : 'Uploading or checking stops. Cleanup may continue in the background.'
          }
          confirmText={confirmVersion.action === 'activate' ? 'Activate version' : 'Cancel version'}
          confirmButtonType={
            confirmVersion.action === 'activate' ? ButtonType.PRIMARY : ButtonType.DELETE
          }
          confirmDisabled={busy}
          onCancel={() => setConfirmVersion(null)}
          onConfirm={() => details.act(confirmVersion.version, confirmVersion.action)}
        />
      )}
    </>
  )
}

export default HostedDetailsDialogs
