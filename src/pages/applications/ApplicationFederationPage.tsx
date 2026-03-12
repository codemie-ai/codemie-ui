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

import {
  __federation_method_getRemote as getRemote,
  __federation_method_setRemote as setRemote,
  __federation_method_unwrapDefault as unwrapModule,
} from 'virtual:__federation__'

import { FC, useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router'

import { applicationsStore } from '@/store/applications'
import { Application } from '@/types/entity/application'

import { observeAndMoveStyles } from './utils/observeAndMoveStyles'

const MODULE_FEDERATION_COMPONENT_NAME = 'CodemieEntryComponent'

interface FederationApp {
  unmount?: () => void
}

const ApplicationFederationPage: FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [appConfig, setAppConfig] = useState<Application | null>(null)
  const federationAppRef = useRef<FederationApp | null>(null)

  const currentAppSlug = slug?.includes('&') ? slug.split('&')[0] : slug

  useEffect(() => {
    const loadApplication = async () => {
      const applications = await applicationsStore.fetchApplications()
      const app = applications.find((app) => app.slug === currentAppSlug)

      if (!app) {
        console.error('Application configuration not found')
        return
      }

      if (app.type === 'module') {
        setAppConfig(app)
      } else {
        console.error('Unsupported application type:', app.type)
      }
    }

    loadApplication()
  }, [slug])

  useEffect(() => {
    const loadModuleFederation = async () => {
      const container = document.querySelector('#federation-app')
      if (!appConfig || !container || !currentAppSlug) return

      setRemote(appConfig.slug, {
        format: 'esm',
        url: appConfig.entry,
      })

      try {
        const shadow = container.shadowRoot || container.attachShadow({ mode: 'open' })
        observeAndMoveStyles(shadow, currentAppSlug)

        let mountTarget = shadow.querySelector('#root')
        if (!mountTarget) {
          mountTarget = document.createElement('div')
          mountTarget.id = 'root'
          mountTarget.className = 'h-full'
          shadow.prepend(mountTarget)
        }

        const remoteModule = await getRemote(appConfig.slug, MODULE_FEDERATION_COMPONENT_NAME)
        const remoteComponent = await unwrapModule(remoteModule)

        if (remoteComponent) {
          federationAppRef.current = remoteComponent.mount(mountTarget, appConfig.arguments)
        } else {
          console.error('Failed to load remote component')
        }
      } catch (error) {
        console.error('Error loading remote:', error)
      }
    }

    loadModuleFederation()

    return () => {
      if (federationAppRef.current?.unmount) {
        federationAppRef.current.unmount()
      }
    }
  }, [appConfig])

  return (
    <div className="w-full h-full">
      <div id="federation-app" className="w-full h-full" />
    </div>
  )
}

export default ApplicationFederationPage
