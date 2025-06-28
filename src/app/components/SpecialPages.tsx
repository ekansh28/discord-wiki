'use client'

import React, { useState, useEffect } from 'react'
import { WikiAPI } from '@/lib/optimized-wiki-api'
import { Page, PageRevision, Category } from '@/types/wiki'
import { formatDate, timeSince } from '@/lib/wiki-utils'

interface SpecialPagesProps {
  pageType: 'allpages' | 'categories' | 'recent-changes' | 'random'
}

export default function SpecialPages({ pageType }: SpecialPagesProps) {
  const [pages, setPages] = useState<Page[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recentChanges, setRecentChanges] = useState<PageRevision[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchFilter, setSearchFilter] = useState('')
  const itemsPerPage = 50

  useEffect(() => {
    loadData()
  }, [pageType, currentPage])

  const loadData = async () => {
    try {
      setLoading(true)
      
      switch (pageType) {
        case 'allpages':
          const allPages = await WikiAPI.getAllPages(itemsPerPage, (currentPage - 1) * itemsPerPage)
          setPages(allPages)
          break
          
        case 'categories':
          const allCategories = await WikiAPI.getAllCategories()
          setCategories(allCategories)
          break
          
        case 'recent-changes':
          const changes = await WikiAPI.getRecentChanges(100)
          setRecentChanges(changes)
          break
          
        case 'random':
          // For random page, we'll get all pages and pick one randomly
          const randomPages = await WikiAPI.getAllPages(1000)
          if (randomPages.length > 0) {
            const randomIndex = Math.floor(Math.random() * randomPages.length)
            const randomPage = randomPages[randomIndex]
            window.location.href = `/wiki/${randomPage.slug}`
          }
          break
      }
    } catch (error) {
      console.error('Error loading special page data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchFilter.toLowerCase())
  )

  const filteredChanges = recentChanges.filter(change => 
    change.page?.title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    change.author?.display_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    change.edit_summary?.toLowerCase().includes(searchFilter.toLowerCase())
  )

  if (loading) {
    return (
      <div className="content">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading...
        </div>
      </div>
    )
  }

  const renderHeader = () => {
    switch (pageType) {
      case 'allpages':
        return (
          <>
            <h1 style={{ color: '#ff6666' }}>📄 All Pages</h1>
            <p>Browse all {pages.length} pages in the wiki.</p>
          </>
        )
      case 'categories':
        return (
          <>
            <h1 style={{ color: '#ff6666' }}>📁 Categories</h1>
            <p>Browse all {categories.length} categories in the wiki.</p>
          </>
        )
      case 'recent-changes':
        return (
          <>
            <h1 style={{ color: '#ff6666' }}>📝 Recent Changes</h1>
            <p>Latest changes to wiki pages.</p>
          </>
        )
      default:
        return <h1 style={{ color: '#ff6666' }}>Special Page</h1>
    }
  }

  return (
    <div className="content">
      {renderHeader()}

      {/* Search Filter */}
      {pageType !== 'random' && (
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder={`Search ${pageType === 'allpages' ? 'pages' : pageType === 'categories' ? 'categories' : 'changes'}...`}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              width: '300px',
              padding: '6px',
              border: '1px inset #c0c0c0',
              background: '#fff',
              fontSize: '12px'
            }}
          />
        </div>
      )}

      {/* All Pages */}
      {pageType === 'allpages' && (
        <div style={{ background: '#111', border: '1px solid #666' }}>
          <div style={{ 
            background: '#333', 
            padding: '8px', 
            borderBottom: '1px solid #666',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'grid',
            gridTemplateColumns: '1fr 120px 120px 80px',
            gap: '10px'
          }}>
            <div>Title</div>
            <div>Created</div>
            <div>Last Modified</div>
            <div>Views</div>
          </div>
          
          {filteredPages.map((page, index) => (
            <div 
              key={page.id}
              style={{ 
                padding: '10px 8px',
                borderBottom: index < filteredPages.length - 1 ? '1px solid #444' : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr 120px 120px 80px',
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
                    window.location.href = `/wiki/${page.slug}`
                  }}
                >
                  {page.title}
                </a>
              </div>
              <div style={{ color: '#ccc' }}>
                {formatDate(page.created_at).split(',')[0]}
              </div>
              <div style={{ color: '#ccc' }}>
                {timeSince(page.updated_at)}
              </div>
              <div style={{ color: '#888' }}>
                {page.view_count}
              </div>
            </div>
          ))}
          
          {filteredPages.length === 0 && (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#888',
              fontSize: '12px'
            }}>
              No pages found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      {pageType === 'categories' && (
        <div style={{ background: '#111', border: '1px solid #666' }}>
          <div style={{ 
            background: '#333', 
            padding: '8px', 
            borderBottom: '1px solid #666',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'grid',
            gridTemplateColumns: '1fr 2fr 100px',
            gap: '15px'
          }}>
            <div>Category</div>
            <div>Description</div>
            <div>Pages</div>
          </div>
          
          {filteredCategories.map((category, index) => (
            <div 
              key={category.id}
              style={{ 
                padding: '12px 8px',
                borderBottom: index < filteredCategories.length - 1 ? '1px solid #444' : 'none',
                display: 'grid',
                gridTemplateColumns: '1fr 2fr 100px',
                gap: '15px',
                alignItems: 'flex-start',
                fontSize: '11px'
              }}
            >
              <div>
                <a 
                  href={`/category/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{ color: '#ffaa00', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  {category.name}
                </a>
              </div>
              <div style={{ color: '#ccc' }}>
                {category.description || 'No description provided.'}
              </div>
              <div style={{ color: '#888' }}>
                {category.page_count || 0} pages
              </div>
            </div>
          ))}
          
          {filteredCategories.length === 0 && (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#888',
              fontSize: '12px'
            }}>
              No categories found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Recent Changes */}
      {pageType === 'recent-changes' && (
        <div style={{ background: '#111', border: '1px solid #666' }}>
          <div style={{ 
            background: '#333', 
            padding: '8px', 
            borderBottom: '1px solid #666',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 2fr 120px',
            gap: '10px'
          }}>
            <div>Page</div>
            <div>User</div>
            <div>Edit Summary</div>
            <div>Time</div>
          </div>
          
          {filteredChanges.slice(0, 50).map((change, index) => (
            <div 
              key={change.id}
              style={{ 
                padding: '10px 8px',
                borderBottom: index < Math.min(filteredChanges.length, 50) - 1 ? '1px solid #444' : 'none',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 2fr 120px',
                gap: '10px',
                alignItems: 'center',
                fontSize: '11px'
              }}
            >
              <div>
                <a 
                  href={`/wiki/${change.page?.slug}`}
                  style={{ color: '#6699ff', textDecoration: 'none' }}
                  onClick={(e) => {
                    e.preventDefault()
                    window.location.href = `/wiki/${change.page?.slug}`
                  }}
                >
                  {change.page?.title}
                </a>
                <span style={{ color: '#888', marginLeft: '8px' }}>
                  (Rev #{change.revision_number})
                </span>
              </div>
              <div style={{ color: '#ccc' }}>
                {change.author?.display_name || 'Unknown'}
              </div>
              <div style={{ 
                color: change.edit_summary ? '#ffaa00' : '#666',
                fontStyle: change.edit_summary ? 'italic' : 'normal'
              }}>
                {change.edit_summary || 'No edit summary'}
              </div>
              <div style={{ color: '#888' }}>
                {timeSince(change.created_at)}
              </div>
            </div>
          ))}
          
          {filteredChanges.length === 0 && (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#888',
              fontSize: '12px'
            }}>
              No recent changes found.
            </div>
          )}
        </div>
      )}

      {/* Pagination for All Pages */}
      {pageType === 'allpages' && pages.length === itemsPerPage && (
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {currentPage > 1 && (
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                background: '#333',
                border: '1px solid #666',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              ← Previous
            </button>
          )}
          
          <span style={{ color: '#ccc', fontSize: '11px' }}>
            Page {currentPage}
          </span>
          
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              background: '#333',
              border: '1px solid #666',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div style={{ 
        marginTop: '30px',
        padding: '15px',
        background: '#222',
        border: '1px solid #666',
        fontSize: '11px',
        color: '#888'
      }}>
        <strong>Quick Stats:</strong>
        {pageType === 'allpages' && ` Showing ${filteredPages.length} pages`}
        {pageType === 'categories' && ` ${filteredCategories.length} categories total`}
        {pageType === 'recent-changes' && ` ${filteredChanges.length} recent changes`}
        
        <div style={{ marginTop: '8px' }}>
          <a href="/wiki/main-page" style={{ color: '#6699ff', marginRight: '15px' }}>← Back to Main Page</a>
          <a href="/wiki/special-allpages" style={{ color: '#6699ff', marginRight: '15px' }}>All Pages</a>
          <a href="/wiki/special-categories" style={{ color: '#6699ff', marginRight: '15px' }}>Categories</a>
          <a href="/wiki/special-recent-changes" style={{ color: '#6699ff', marginRight: '15px' }}>Recent Changes</a>
          <a href="/wiki/special-random" style={{ color: '#6699ff' }}>Random Page</a>
        </div>
      </div>
    </div>
  )
}