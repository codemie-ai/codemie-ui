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

export const CART_STORAGE_KEY = 'shopping_cart'
export const PRODUCTS_PER_PAGE = 12

export const CART_MESSAGES = {
  UNAVAILABLE_PRODUCT: 'Sorry, this product is currently unavailable',
  PRODUCT_LOAD_ERROR: 'Failed to load product. Please try again',
} as const
