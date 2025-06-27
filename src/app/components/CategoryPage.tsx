// src/app/components/CategoryPage.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { WikiAPI } from '@/lib/wiki-api'
import { Page, Category } from '@/types/wiki'
import { formatDate } from '@/lib/wiki-utils'

interface CategoryPageProps {
  categorySlug: string
}

export default function CategoryPage({ categorySlug }: CategoryPageProps) {
  const [category, setCategory] = useState<Category | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCategoryData()
  }, [categorySlug])

  const loadCategoryData = async () => {
    try {
      setLoading(true)
      
      // Convert slug back to category name
      const categoryName = categorySlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      // Get all categories and find the matching one
      const allCategories = await WikiAPI.getAllCategories()
      const foundCategory = allCategories.find(
        cat => cat.name.toLowerCase() === categoryName.toLowerCase()
      )

      if (foundCategory) {
        setCategory(foundCategory)
        
        // Get pages in this category
        const allPages = await WikiAPI.getAllPages(1000)
        const categoryPages = allPages.filter(page => 
          page.content?.includes(`[[Category:${foundCategory.name}]]`)
        )
        
        setPages(categoryPages)
      } else {
        setError(`Category "${categoryName}" not found`)
      }
    } catch (err) {
      console.error('Error loading category:', err)
      setError('Failed to load category')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading category...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="content">
        <h1 style={{ color: '#ff6666' }}>Category Not Found</h1>
        <p>{error}</p>
        <p>
          <a href="/wiki/special-categories" style={{ color: '#6699ff' }}>
            Browse all categories
          </a>
        </p>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="content">
        <h1 style={{ color: '#ff6666' }}>Category Not Found</h1>
        <p>The requested category does not exist.</p>
      </div>
    )
  }

  return (
    <div className="content">
      <h1 style={{ color: '#ff6666' }}>📁 Category: {category.name}</h1>
      
      {category.description && (
        <div style={{ 
          background: '#222', 
          border: '1px solid #666', 
          padding: '10px', 
          marginBottom: '20px',
          fontSize: '12px'
        }}>
          {category.description}
        </div>
      )}

      <div style={{ marginBottom: '15px', fontSize: '11px', color: '#888' }}>
        This category contains {pages.length} page{pages.length !== 1 ? 's' : ''}.
      </div>

      {pages.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#888',
          background: '#111',
          border: '1px solid #666'
        }}>
          <h3>No pages in this category</h3>
          <p>This category exists but contains no pages yet.</p>
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #666' }}>
          <div style={{ 
            background: '#333', 
            padding: '8px', 
            borderBottom: '1px solid #666',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'grid',
            gridTemplateColumns: '1fr 120px 80px',
            gap: '10px'
          }}>
            <div>Page Title</div>
            <div>Last Modified</div>
            <div>Views</div>
          </div>
          
          {pages.map((page, index) => (
            <div 
              key={page.id}
              style={{ 
                padding: '10px 8px',
                borderBottom: index < pages.length - 1 ? '1px solid #444' : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr 120px 80px',
                gap: '10px',
                alignItems: 'center',
                fontSize: '11px'
              }}
            >
              <div>
                <a 
                  href={`/wiki/${page.slug}`}
                  style={{ color: '#6699ff', textDecoration: 'none' }}
                  onClick={(e) => {
                    e.preventDefault()
                    window.history.pushState({}, '', `/wiki/${page.slug}`)
                    window.dispatchEvent(new PopStateEvent('popstate'))
                  }}
                >
                  {page.title}
                </a>
              </div>
              <div style={{ color: '#ccc' }}>
                {formatDate(page.updated_at).split(',')[0]}
              </div>
              <div style={{ color: '#888' }}>
                {page.view_count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category navigation */}
      <div style={{ 
        marginTop: '30px',
        padding: '15px',
        background: '#222',
        border: '1px solid #666',
        fontSize: '11px',
        color: '#888'
      }}>
        <strong>Category Navigation:</strong>
        <div style={{ marginTop: '8px' }}>
          <a href="/wiki/special-categories" style={{ color: '#6699ff', marginRight: '15px' }}>
            ← All Categories
          </a>
          <a href="/wiki/main-page" style={{ color: '#6699ff', marginRight: '15px' }}>
            Main Page
          </a>
          <a href="/wiki/special-allpages" style={{ color: '#6699ff' }}>
            All Pages
          </a>
        </div>
      </div>
    </div>
  )
}