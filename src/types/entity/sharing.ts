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

export interface SharedWithUser {
  id: string
  name: string
  email: string
  picture?: string
  /**
   * How the grant was made: `name` when an owner added the person, `link` when they opened a
   * share link. Sent for hosted applications.
   */
  grant_source?: 'name' | 'link'
}

export interface SharableUser {
  id: string
  name: string
  email: string
  picture?: string
}
