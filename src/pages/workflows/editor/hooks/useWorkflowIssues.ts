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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { WorkflowIssue } from '@/types/entity'
import { WorkflowConfiguration } from '@/types/workflowEditor'
import { shouldResolveIssue } from '@/utils/workflowEditor/helpers/issues'

interface UseWorkflowIssuesProps {
  issues?: WorkflowIssue[] | null
  selectedStateId: string | null
  editorConfig: WorkflowConfiguration
}

const useWorkflowIssues = ({ issues, editorConfig }: UseWorkflowIssuesProps) => {
  const [resolvedIssues, setResolvedIssues] = useState<Set<string>>(new Set())
  const [dirtyIssues, setDirtyIssues] = useState<Set<string>>(new Set())

  const markIssueResolved = useCallback(
    (issue: string | WorkflowIssue) =>
      setResolvedIssues((prev) => new Set(prev).add(typeof issue === 'string' ? issue : issue.id)),
    []
  )
  const isIssueResolved = useCallback(
    (issue: string | WorkflowIssue) =>
      resolvedIssues.has(typeof issue === 'string' ? issue : issue.id),
    [resolvedIssues]
  )

  const markIssueDirty = useCallback(
    (issue: string | WorkflowIssue) =>
      setDirtyIssues((prev) => new Set(prev).add(typeof issue === 'string' ? issue : issue.id)),
    []
  )
  const isIssueDirty = useCallback(
    (issue: string | WorkflowIssue) =>
      dirtyIssues.has(typeof issue === 'string' ? issue : issue.id),
    [dirtyIssues]
  )

  const resolveAllDirtyIssues = useCallback(
    () =>
      setResolvedIssues((prev) => {
        dirtyIssues.forEach((issueId) => prev.add(issueId))
        return new Set(prev)
      }),
    [dirtyIssues]
  )

  const clearAllDirtyIssues = useCallback(() => setDirtyIssues(new Set()), [])
  const clearAllResolvedIssues = useCallback(() => setResolvedIssues(new Set()), [])

  const revalidateIssues = useCallback(
    (prevConfig: WorkflowConfiguration, nextConfig: WorkflowConfiguration) => {
      const nextIssues = issues?.map((issue) => ({ ...issue }))
      if (!nextIssues) return

      nextIssues.forEach((issue) => {
        if (isIssueResolved(issue)) return

        if (shouldResolveIssue(issue, prevConfig, nextConfig)) {
          markIssueResolved(issue)
        }
      })
    },
    [issues, isIssueResolved, markIssueResolved]
  )

  const prevEditorConfigRef = useRef<WorkflowConfiguration>(editorConfig)
  useEffect(() => {
    const prevEditorConfig = prevEditorConfigRef.current
    prevEditorConfigRef.current = editorConfig
    revalidateIssues(prevEditorConfig, editorConfig)
  }, [revalidateIssues, editorConfig])

  const issueMethods = useMemo(
    () => ({
      markIssueResolved,
      isIssueResolved,
      markIssueDirty,
      isIssueDirty,
      resolveAllDirtyIssues,
      clearAllDirtyIssues,
      revalidateIssues,
      clearAllResolvedIssues,
      setDirtyIssues,
    }),
    [
      markIssueResolved,
      isIssueResolved,
      markIssueDirty,
      isIssueDirty,
      resolveAllDirtyIssues,
      clearAllDirtyIssues,
      revalidateIssues,
      clearAllResolvedIssues,
    ]
  )

  return useMemo(() => ({ issueMethods }), [issueMethods])
}

export default useWorkflowIssues
