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

import AzureDevOpsWiki from './IndexTypeAzureDevOpsWiki'
import AzureDevOpsWorkItem from './IndexTypeAzureDevOpsWorkItem'
import Confluence from './IndexTypeConfluence'
import File from './IndexTypeFile'
import Git from './IndexTypeGit'
import Google from './IndexTypeGoogle'
import Jira from './IndexTypeJira'
import Provider from './IndexTypeProvider'
import Xray from './IndexTypeXray'

const IndexTypeField = {
  Git,
  Google,
  File,
  Confluence,
  Jira,
  Xray,
  AzureDevOpsWiki,
  AzureDevOpsWorkItem,
  Provider,
}

export default IndexTypeField
