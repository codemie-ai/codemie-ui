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
  generatePath,
  matchRoutes,
  NonIndexRouteObject,
  resolvePath,
  RouteObject,
  useLocation,
  useParams,
} from 'react-router'

import { router as hashRouter } from '@/router'
import { getRootPath } from '@/utils/helpers'

type ParamValue = string | number | boolean | null | undefined
export type ParamsType = Record<string, ParamValue | ParamValue[]>
export type QueryType = Record<string, ParamValue | ParamValue[]>

export interface RouteOptions<P extends ParamsType = ParamsType, Q extends QueryType = QueryType> {
  path: string
  name: string
  params: P
  query: Q
  hash: string
}

export type RouterPush = (options: string | Partial<RouteOptions>) => void

type RouterResolve = ({ name }: Partial<RouteOptions>) => {
  href: string
  path: string
  fullPath: string
  searchParamsString: string
}

interface RouterActions {
  back: () => void
  push: RouterPush
  replace: RouterPush
  resolve: RouterResolve
}

export interface RouterState extends RouteOptions, RouterActions {
  currentRoute: {
    value: RouteOptions
  }
}

export const useVueRoute = () => {
  return useReactRouter()
}

export const useVueRouter = () => {
  return useReactRouter()
}

export const findRouteObject = (routeId: string): RouteObject => {
  const routesStack: RouteObject[] = [...hashRouter.routes]

  while (routesStack.length > 0) {
    const route = routesStack.pop()!
    if (route.id === routeId) return route
    if (route.children?.length) routesStack.push(...route.children)
  }

  throw new Error(`Route with ID "${routeId}" was not found.`)
}

export const findParentRouteObject = (childRouteId: string): NonIndexRouteObject => {
  const routesStack: RouteObject[] = [...hashRouter.routes]

  while (routesStack.length > 0) {
    const route = routesStack.pop()!
    if (route.children?.some((child) => child.id === childRouteId)) return route
    if (route.children?.length) routesStack.push(...route.children)
  }

  throw new Error(`Parent route for index route "${childRouteId}" was not found.`)
}

export const createSearchParamsString = (query: QueryType): string => {
  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, String(v)))
    } else if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })

  return searchParams.toString()
}

export const parseSearchParams = (searchParams: URLSearchParams): QueryType => {
  const query: QueryType = {}
  searchParams.forEach((value, key) => {
    const existing = query[key]
    if (existing === undefined) {
      query[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      query[key] = [existing as string, value]
    }
  })

  return query
}

const resolve: RouterResolve = ({ name, path, query = {}, params = {} }) => {
  let route: RouteObject
  let unresolvedPathname = path ?? ''

  if (name) {
    route = findRouteObject(name)

    if (route.index) {
      const parentRoute = findParentRouteObject(name)
      unresolvedPathname = parentRoute.path ?? '/'
    } else if (route.path) {
      unresolvedPathname = route.path
    }
  }

  const searchParamsString = createSearchParamsString(query)
  const { pathname } = resolvePath({
    pathname: generatePath(unresolvedPathname, params),
  })

  return {
    href: `${getRootPath()}/#${pathname[0] === '/' ? pathname : `/${pathname}`}`,
    fullPath: pathname,
    path: pathname,
    searchParamsString,
  }
}

const navigate: (newRoute: Parameters<RouterPush>[0], options?: { replace?: boolean }) => void = (
  newRoute,
  { replace } = {}
) => {
  if (typeof newRoute === 'string') {
    hashRouter.navigate(newRoute, { replace })
    return
  }

  const paramsToResolve = newRoute

  // if parameters does not have a route id, then modify current route
  if (!paramsToResolve.name && !paramsToResolve.path) {
    const currentRoute = hashRouter.state.matches.at(-1)
    paramsToResolve.name = currentRoute?.route.id
    paramsToResolve.params = currentRoute?.params
    paramsToResolve.query = newRoute.query
  }

  const route = resolve(paramsToResolve)
  hashRouter.navigate({ pathname: route.path, search: route.searchParamsString }, { replace })
}

const back = () => hashRouter.navigate(-1)

const push: RouterPush = (params) => {
  navigate(params, { replace: false })
}

export const replace: RouterPush = (params) => {
  navigate(params, { replace: true })
}

const routerActions = { back, push, replace, resolve }

const useReactRouter = (): RouterState => {
  const { pathname, search } = useLocation()
  const params = useParams()
  const query = parseSearchParams(new URLSearchParams(search))

  const routerState: Omit<RouterState, 'currentRoute'> = {
    path: pathname,
    query,
    params,
    hash: '',
    name:
      matchRoutes(hashRouter.routes, hashRouter.state.location.pathname)?.at(-1)?.route.id ?? '',
    ...routerActions,
  }

  return {
    ...routerState,
    currentRoute: { value: routerState },
  }
}

export const router: RouterActions = routerActions
