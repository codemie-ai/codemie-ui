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

import React, { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Spinner from '@/components/Spinner'
import { ButtonSize } from '@/constants'
import { productsStore } from '@/store/products'
import { shoppingCartStore } from '@/store/shoppingCart'

import ProductCard from './components/ProductCard'

const ProductListPage: React.FC = () => {
  const { items: products, loading, error, pagination } = useSnapshot(productsStore)
  const [page, setPage] = useState(0)

  useEffect(() => {
    productsStore.fetchProducts(page)
  }, [page])

  const handleAddToCart = useCallback(async (productId: string) => {
    await shoppingCartStore.addToCart(productId)
  }, [])

  const hasNextPage = (page + 1) * pagination.perPage < pagination.total

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      )
    }
    if (error) {
      return <p className="text-text-error p-4">{error}</p>
    }
    return (
      <>
        {products.length === 0 && <p className="text-text-secondary p-4">No products available.</p>}
        {products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}
        {pagination.total > pagination.perPage && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              type="secondary"
              size={ButtonSize.SMALL}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              type="secondary"
              size={ButtonSize.SMALL}
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </>
    )
  }

  return <PageLayout title="Products">{renderContent()}</PageLayout>
}

export default ProductListPage
