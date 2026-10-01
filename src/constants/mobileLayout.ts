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

/**
 * The exact media query Tailwind emits for `max-lg:`. Below the `lg` breakpoint (1024px) the app
 * swaps its desktop shell (navigation rail + inline sidebar) for the mobile/tablet shell (top bar +
 * overlays). Sharing the query keeps the parts rendered from JS in step with the `max-lg:` styles.
 */
export const MOBILE_LAYOUT_MEDIA_QUERY = 'not all and (min-width: 1024px)'

// Set by the mobile top bar to its bottom edge, which moves when the app banner is shown.
export const MOBILE_TOP_BAR_BOTTOM_CSS_VAR = '--mobile-top-bar-bottom'

// Full-width overlay right below the mobile top bar: the navigation menu and page sidebars.
export const MOBILE_OVERLAY_CLASS_NAME =
  'fixed inset-x-0 bottom-0 top-[var(--mobile-top-bar-bottom,3.5rem)] z-50'
