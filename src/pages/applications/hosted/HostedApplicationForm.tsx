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

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useId, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import PageLayout from '@/components/Layouts/Layout'
import ProjectSelector from '@/components/ProjectSelector'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import { hostedApplicationsStore as store, hostedErrorMessage } from '@/store/hostedApplications'
import type { HostedTransferProgress as Progress } from '@/store/utils/hostedApplicationUpload'
import type { HostedApplication } from '@/types/entity/hostedApplication'

import { applicationMetadataSchema, type ApplicationMetadataForm } from './formSchema'
import { isManager, suspensionRefuses } from './hostedAccess'
import HostedArtifactUpload from './HostedArtifactUpload'
import HostedCoverField, { NO_COVER_CHANGE, type HostedCoverChange } from './HostedCoverField'
import HostedTransferProgress from './HostedTransferProgress'

interface Props {
  /** The application to edit; without it the form creates a new one. */
  application?: HostedApplication
  /** Leaves the page without saving. */
  onCancel(): void
  /** The saved application, or the private draft a create left behind before its upload stopped. */
  onSaved(application: HostedApplication): void
}

/** Only the fields the person changed: an edit sends a PATCH with nothing else. */
const changedMetadata = (current: HostedApplication, values: ApplicationMetadataForm) => {
  const changes: Partial<ApplicationMetadataForm> = {}
  if (current.name !== values.name) changes.name = values.name
  if (current.description !== values.description) changes.description = values.description
  if (values.project && (current.project ?? '') !== values.project) changes.project = values.project
  if (!!current.shared !== values.shared) changes.shared = values.shared
  return changes
}

/**
 * The create and edit page body of a hosted application: its header actions and the form. Both set
 * the name, description, project, sharing and card cover; create also takes an optional first
 * artifact. The cover is sent after the application is saved, before the artifact.
 */
const HostedApplicationForm = ({ application, onCancel, onSaved }: Props) => {
  const selectId = useId()
  const descriptionId = useId()
  const form = useForm<ApplicationMetadataForm>({
    resolver: yupResolver(applicationMetadataSchema, { context: { creating: !application } }),
    defaultValues: {
      name: application?.name ?? '',
      description: application?.description ?? '',
      project: application?.project ?? '',
      shared: !!application?.shared,
    },
  })
  const [file, setFile] = useState<File | null>(null)
  const [cover, setCover] = useState<HostedCoverChange>(NO_COVER_CHANGE)
  const [routing, setRouting] = useState<'static' | 'spa_history'>('static')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [phase, setPhase] = useState<string | null>(null)
  // One request key per create payload: a retry of the same values replays, an edited one is new.
  const createRequest = useRef<{ key: string; body: string } | null>(null)
  const persisted = useRef<HostedApplication | null>(application ?? null)
  const transfer = useRef<AbortController | null>(null)
  const alive = useRef(true)
  const { attemptFormClose, unblockTransition, blockTransition } = useUnsavedChanges({
    formId: 'hosted-application-' + (application?.id ?? 'new'),
    getCurrentValues: () => ({
      ...form.getValues(),
      file: file?.name ?? null,
      routing,
      cover: cover.file?.name ?? null,
      coverRemoved: cover.removed,
    }),
  })
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      transfer.current?.abort()
    }
  }, [])
  const busy = form.formState.isSubmitting
  // Edit rules mirror the server: write access, and a suspended app can switch sharing off but not on.
  const readOnly = !!application && !isManager(application)
  const moveLocked = readOnly || (!!application && suspensionRefuses(application, 'move'))
  const shareOnLocked =
    readOnly || (!!application && !application.shared && suspensionRefuses(application, 'share_on'))

  // Leaving after a save or a confirmed cancel: the unsaved-changes guard must not stop it.
  const leave = (go: () => void) => {
    unblockTransition()
    go()
    blockTransition()
  }
  const cancel = () =>
    attemptFormClose(
      () => {
        alive.current = false
        transfer.current?.abort()
        form.reset()
        // A draft created here stays visible: its page shows the interrupted upload under Versions.
        const draft = application ? null : persisted.current
        leave(() => (draft ? onSaved(draft) : onCancel()))
      },
      busy ? 'Stop this upload and keep the private draft?' : undefined
    )

  const saveMetadata = async (values: ApplicationMetadataForm) => {
    if (!persisted.current) {
      setPhase('Creating private application…')
      const { shared, ...rest } = values
      const payload = shared ? { ...rest, shared } : rest
      const body = JSON.stringify(payload)
      if (createRequest.current?.body !== body)
        createRequest.current = { key: crypto.randomUUID(), body }
      persisted.current = await store.createApplication(payload, createRequest.current.key)
    } else {
      const { current } = persisted
      const changes = changedMetadata(current, values)
      if (Object.keys(changes).length) {
        setPhase('Saving application…')
        persisted.current = await store.updateApplication(current, changes)
      }
    }
    return persisted.current
  }
  /** Sends the chosen cover once the application exists; a retry does not send it again. */
  const saveCover = async (app: HostedApplication) => {
    if (cover.file) {
      setPhase('Uploading cover…')
      persisted.current = await store.uploadCover(app, cover.file)
    } else if (cover.removed && app.has_cover) {
      setPhase('Removing cover…')
      persisted.current = await store.removeCover(app)
    } else return app
    setCover(NO_COVER_CHANGE)
    return persisted.current
  }
  const save = form.handleSubmit(async (values) => {
    setError(null)
    setProgress(null)
    // The save step in flight, so a failure can say what was kept.
    const saving: { step: 'metadata' | 'cover' | 'artifact' } = { step: 'metadata' }
    try {
      let draft = await saveMetadata(values)
      if (!alive.current) return
      saving.step = 'cover'
      draft = await saveCover(draft)
      if (!alive.current) return
      saving.step = 'artifact'
      if (file) {
        transfer.current = new AbortController()
        setPhase('Uploading artifact, then checking its security…')
        await store.uploadArtifact(draft, file, routing, transfer.current.signal, setProgress)
        if (!alive.current) return
      }
      setPhase(null)
      form.reset(values)
      // The save answered with the application; its page loads it fresh.
      leave(() => onSaved(draft))
    } catch (cause) {
      if (!alive.current) return
      setPhase(null)
      if ((cause as Error)?.name === 'AbortError')
        setError(
          'Upload stopped. Your private application is saved; check Versions to resume or remove the upload.'
        )
      else if (saving.step === 'cover')
        // The application itself is saved; a retry sends only the cover (and any artifact).
        setError(
          (application
            ? 'Your changes are saved, but the cover was not: '
            : 'Your private application is saved, but the cover was not: ') +
            hostedErrorMessage(cause)
        )
      else setError(hostedErrorMessage(cause))
    }
  })

  return (
    <PageLayout
      showBack
      limitWidth
      title={application ? 'Edit application' : 'Create application'}
      onBack={cancel}
      rightContent={
        <div className="flex flex-wrap justify-end gap-4">
          <Button variant="secondary" onClick={cancel}>
            {busy ? 'Stop and close' : 'Cancel'}
          </Button>
          <Button onClick={save} isLoading={busy} disabled={busy || readOnly}>
            {application ? 'Save' : 'Create'}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
        className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-6"
      >
        <p className="text-sm text-text-tertiary">
          {application
            ? 'Update how this application is named, described, shared, and shown on its card.'
            : 'Upload a static app, visual, or idea. New applications stay private until you share them.'}
        </p>
        <Controller
          control={form.control}
          name="project"
          render={({ field }) => (
            <ProjectSelector
              label="Project"
              className="w-full"
              value={field.value}
              selectDefault={!application}
              disabled={busy || moveLocked}
              error={form.formState.errors.project?.message}
              onChange={(value) => field.onChange(Array.isArray(value) ? value[0] : value)}
            />
          )}
        />
        <Controller
          control={form.control}
          name="shared"
          render={({ field }) => (
            <Switch
              label="Shared with project"
              value={field.value}
              onChange={(event) => field.onChange(event.target.checked)}
              disabled={busy || shareOnLocked}
            />
          )}
        />
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <Input
              {...field}
              label="Application name"
              maxLength={120}
              required
              disabled={busy || readOnly}
              error={form.formState.errors.name?.message}
              autoFocus
            />
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <Textarea
              {...field}
              id={descriptionId}
              label="Description"
              maxLength={2000}
              rows={4}
              required
              disabled={busy || readOnly}
              hint="Help people understand what this application does."
              error={form.formState.errors.description?.message}
            />
          )}
        />
        <HostedCoverField
          application={persisted.current}
          name={form.watch('name')}
          value={cover}
          onChange={setCover}
          disabled={busy || readOnly}
        />
        {!application && (
          <>
            <HostedArtifactUpload file={file} onChange={setFile} disabled={busy} optional />
            {file && (
              <Select
                id={selectId + '-navigation'}
                label="Navigation"
                value={routing}
                options={[
                  { label: 'Static pages / hash routing', value: 'static' },
                  { label: 'Single-page app with history routing', value: 'spa_history' },
                ]}
                disabled={busy}
                onChangeValue={(value) => setRouting(value === 'spa_history' ? value : 'static')}
              />
            )}
            {file && (
              <p className="-mt-2 text-xs text-text-quaternary">
                Choose history routing when your app uses paths such as /settings; unknown paths
                then open your index.html.
              </p>
            )}
            <p className="text-xs text-text-quaternary">
              Upload the build output, for example your dist folder as a ZIP. Apps run only in the
              browser: server code, external APIs, and web workers are not available.
            </p>
          </>
        )}
        {busy && <HostedTransferProgress progress={progress} />}
        {phase && (
          <output aria-live="polite" className="block text-text-secondary">
            {phase}
          </output>
        )}
        {error && (
          <p role="alert" className="text-failed-secondary break-words">
            {error}
          </p>
        )}
      </form>
    </PageLayout>
  )
}

export default HostedApplicationForm
