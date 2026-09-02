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

import { FC } from 'react'

import Link from '@/components/Link'

import { Issue } from '../types'

interface IssueLinkProps {
  issue: Issue
}

export const IssueLink: FC<IssueLinkProps> = ({ issue }) => (
  <Link
    url={issue.link}
    className="!w-auto inline-flex font-geist-mono font-normal text-sm leading-5"
    tooltip={`${issue.type}: ${issue.key}`}
  >
    {issue.key}
  </Link>
)
