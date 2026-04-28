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

const appStyles: Record<string, HTMLElement[]> = {}

export const observeAndMoveStyles = (shadowRoot: ShadowRoot, appSlug: string) => {
  const copyIntoShadow = (el: Element) => {
    if (el.nodeName === 'STYLE') {
      const cloned = el.cloneNode(true) as HTMLStyleElement
      if (cloned.getAttribute('data-styled-version')) {
        const elem = document.createElement('style')
        elem.textContent = cloned.textContent
        shadowRoot.append(elem)
      } else shadowRoot.prepend(cloned)
    } else if (el.nodeName === 'LINK') {
      const link = el as HTMLLinkElement
      if (link.rel === 'stylesheet') {
        const cloned = document.createElement('link')
        cloned.rel = 'stylesheet'
        cloned.href = link.href
        shadowRoot.prepend(cloned)
      }
    }
  }

  if (!appStyles[appSlug]) appStyles[appSlug] = []

  if (appStyles[appSlug]) {
    shadowRoot.append(...appStyles[appSlug])
  }

  const regex = /^https?:\/\/[^/]+(\/[^/]+)*\/assets\/style-.*\.css$/

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement

          copyIntoShadow(el)

          if (el.tagName === 'LINK') {
            const link = el as HTMLLinkElement

            if (regex.test(link.href)) {
              appStyles[appSlug].push(link)
              link.remove()
            }
          }
        }
      })
    })
  })

  observer.observe(document.head, { childList: true, subtree: false })
}
