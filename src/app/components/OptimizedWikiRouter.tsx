// components/OptimizedWikiRouter.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo, ReactElement } from 'react'
import { supabase } from '@/lib/supabase'
import { OptimizedWikiAPI } from '@/lib/optimized-wiki-api'
import { Page, PageRevision, UserProfile, Category, PendingChange, PageSummary } from '@/types/wiki'
import VisualEditor from './VisualEditor'
import AdminPanel from './AdminPanel'
import SpecialPages from './SpecialPages'
import CategoryPage from './CategoryPage'
import { generateTableOfContents, renderWikiMarkdown, slugify, validatePageTitle } from '@/lib/wiki-utils'

interface OptimizedWikiRouterProps {
  onShowAuthPopup: () => void
}

// Performance monitoring
const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    pageLoadTime: 0,
    authCheckTime: 0,
    searchTime: 0
  })

  const recordMetric = useCallback((key: string, time: number) => {
    setMetrics(prev => ({ ...prev, [key]: time }))
  }, [])

  return { metrics, recordMetric }
}

// Debounced search hook
const useDebounceSearch = (callback: (query: string) => void, delay: number) => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback((query: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(() => {
      callback(query)
    }, delay)

    setDebounceTimer(timer)
  }, [callback, delay, debounceTimer])

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return debouncedCallback
}

export default function OptimizedWikiRouter({ onShowAuthPopup }: OptimizedWikiRouterProps) {
  // Performance monitoring
  const { metrics, recordMetric } = usePerformanceMonitor()

  // Core state
  const [currentView, setCurrentView] = useState('ballscord')
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [mounted, setMounted] = useState(false)
  const [initializing, setInitializing] = useState(true)
  
  // Page state
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Editor state
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editorMode, setEditorMode] = useState<'visual' | 'source'>('visual')
  const [saving, setSaving] = useState(false)
  
  // Wiki data with caching
  const [allPageSlugs, setAllPageSlugs] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PageSummary[]>([])
  const [showSearch, setShowSearch] = useState(false)
  
  // Table of contents
  const [tableOfContents, setTableOfContents] = useState<any[]>([])
  const [showToc, setShowToc] = useState(true)

  // Memoized route handler
  const handleRoute = useCallback(() => {
    const path = window.location.pathname
    let view = 'ballscord'
    
    if (path.startsWith('/wiki/')) {
      view = path.slice(6) || 'ballscord'
    } else if (path.startsWith('/category/')) {
      view = 'category:' + path.slice(10)
    } else if (path === '/') {
      view = 'ballscord'
    }
    
    setCurrentView(view)
    loadPage(view)
  }, [])

  // Fast initialization with parallel loading
  const initializeApp = useCallback(async () => {
    const authStart = performance.now()
    
    try {
      // Load user and page slugs in parallel
      const [authResult, slugsResult] = await Promise.all([
        OptimizedWikiAPI.getCurrentUser(),
        OptimizedWikiAPI.getAllPageSlugs()
      ])

      recordMetric('authCheckTime', performance.now() - authStart)
      
      // Set auth state
      if (authResult.user) {
        setUser(authResult.user)
        setUserProfile(authResult.profile)
      }

      // Set page slugs
      setAllPageSlugs(slugsResult)

      // Listen for auth changes with optimized handling
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const profile = await OptimizedWikiAPI.getUserProfile(session.user.id)
          setUserProfile(profile)
        } else {
          setUser(null)
          setUserProfile(null)
        }
      })

      return () => subscription.unsubscribe()
    } catch (error) {
      console.error('Error initializing app:', error)
      setError('Failed to initialize wiki')
    } finally {
      setInitializing(false)
    }
  }, [recordMetric])

  // Optimized page loading
  const loadPage = useCallback(async (slug: string) => {
    const pageStart = performance.now()
    
    try {
      setLoading(true)
      setError('')
      
      // Handle special pages
      if (slug.startsWith('special-') || slug.startsWith('category:')) {
        setCurrentPage(null)
        setLoading(false)
        return
      }
      
      // Load page with cache
      const page = await OptimizedWikiAPI.getPage(slug)
      
      recordMetric('pageLoadTime', performance.now() - pageStart)
      
      if (page) {
        setCurrentPage(page)
        setEditTitle(page.title)
        setEditContent(page.content || '')
        
        // Generate table of contents asynchronously
        setTimeout(() => {
          if (page.content) {
            const toc = generateTableOfContents(page.content)
            setTableOfContents(toc)
          } else {
            setTableOfContents([])
          }
        }, 0)
      } else {
        // Page doesn't exist
        setCurrentPage(null)
        setEditTitle(slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        setEditContent('')
        setTableOfContents([])
      }
    } catch (err) {
      console.error('Error loading page:', err)
      setError('Failed to load page')
    } finally {
      setLoading(false)
    }
  }, [recordMetric])

  // Optimized navigation
  const navigateTo = useCallback((path: string) => {
    const fullPath = path.startsWith('/') ? path : `/wiki/${path}`
    window.history.pushState({}, '', fullPath)
    setCurrentView(path.replace('/wiki/', ''))
    loadPage(path.replace('/wiki/', ''))
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }, [loadPage])

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearch(false)
      return
    }

    const searchStart = performance.now()
    
    try {
      const results = await OptimizedWikiAPI.searchPages(query)
      setSearchResults(results)
      setShowSearch(true)
      
      recordMetric('searchTime', performance.now() - searchStart)
    } catch (err) {
      console.error('Search error:', err)
    }
  }, [recordMetric])

  const debouncedSearch = useDebounceSearch(performSearch, 300)

  // Search handler
  const searchPages = useCallback((query: string) => {
    setSearchQuery(query)
    debouncedSearch(query)
  }, [debouncedSearch])

  // Editor functions
  const startEditing = useCallback(() => {
    if (!user) {
      setError('')
      onShowAuthPopup()
      return
    }
    setIsEditing(true)
    setError('')
    setSuccess('')
  }, [user, onShowAuthPopup])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    if (currentPage) {
      setEditTitle(currentPage.title)
      setEditContent(currentPage.content || '')
    }
    setEditSummary('')
    setError('')
    setSuccess('')
  }, [currentPage])

  const saveChanges = useCallback(async () => {
    if (!user) {
      setError('')
      onShowAuthPopup()
      return
    }

    const titleValidation = validatePageTitle(editTitle)
    if (!titleValidation.valid) {
      setError(titleValidation.error!)
      return
    }

    if (!editSummary.trim()) {
      setError('Please provide an edit summary')
      return
    }

    try {
      setSaving(true)
      setError('')

      const slug = slugify(editTitle)
      
      const result = await OptimizedWikiAPI.savePage(
        slug,
        editTitle,
        editContent,
        editSummary,
        user.id,
        userProfile?.is_admin || userProfile?.is_moderator || false
      )
      
      if (!result.success) {
        setError(result.error || 'Failed to save changes')
        return
      }

      if (userProfile?.is_admin || userProfile?.is_moderator) {
        setSuccess('Page updated successfully!')
        if (slug !== currentView) {
          navigateTo(slug)
        } else {
          await loadPage(slug)
        }
      } else {
        setSuccess('Changes submitted for review!')
      }

      setIsEditing(false)
      setEditSummary('')
      
      // Update page slugs cache
      const newSlugs = await OptimizedWikiAPI.getAllPageSlugs()
      setAllPageSlugs(newSlugs)
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [user, userProfile, editTitle, editContent, editSummary, currentView, navigateTo, loadPage, onShowAuthPopup])

  const clearMessages = useCallback(() => {
    setError('')
    setSuccess('')
  }, [])

  // Memoized table of contents renderer
  const renderTableOfContents = useMemo(() => {
    const renderItems = (items: any[], level = 0): ReactElement[] => {
      return items.map(item => (
        <div key={item.id} style={{ marginLeft: `${level * 15}px` }}>
          <a 
            href={`#${item.id}`} 
            className="toc-link"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            {item.title}
          </a>
          {item.children && item.children.length > 0 && (
            <div>{renderItems(item.children, level + 1)}</div>
          )}
        </div>
      ))
    }
    
    return renderItems
  }, [])

  // Memoized special page renderer
  const renderSpecialPage = useMemo((): ReactElement | null => {
    if (currentView === 'special-admin') {
      return <AdminPanel userProfile={userProfile} />
    }
    
    if (currentView === 'special-allpages') {
      return <SpecialPages pageType="allpages" />
    }
    
    if (currentView === 'special-categories') {
      return <SpecialPages pageType="categories" />
    }
    
    if (currentView === 'special-recent-changes') {
      return <SpecialPages pageType="recent-changes" />
    }
    
    if (currentView === 'special-random') {
      return <SpecialPages pageType="random" />
    }

    return null
  }, [currentView, userProfile])

  // Initialize on mount
  useEffect(() => {
    setMounted(true)
    initializeApp()
    handleRoute()
    
    // Handle browser navigation
    const handlePopState = () => handleRoute()
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [initializeApp, handleRoute])

  // Show loading screen during initialization
  if (!mounted || initializing) {
    return (
      <div className="main">
        <div className="content">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ marginBottom: '20px' }}>Loading wiki...</div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              Initializing optimized caching system...
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle special pages
  if (currentView.startsWith('special-')) {
    return (
      <div className="main">
        <div className="sidebar" style={{ width: '175px' }}>
          <div className="sidebar-section">
            <h3>🧭 Navigation</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('ballscord') }}>Main Page</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-allpages') }}>All Pages</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-categories') }}>Categories</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-recent-changes') }}>Recent Changes</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-random') }}>Random Page</a></li>
              {userProfile?.is_admin && (
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-admin') }}>Admin Panel</a></li>
              )}
            </ul>
          </div>
          
          {/* Performance metrics for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="sidebar-section">
              <h3>⚡ Performance</h3>
              <div style={{ fontSize: '10px', color: '#888' }}>
                <div>Page Load: {metrics.pageLoadTime.toFixed(1)}ms</div>
                <div>Auth Check: {metrics.authCheckTime.toFixed(1)}ms</div>
                <div>Search: {metrics.searchTime.toFixed(1)}ms</div>
              </div>
            </div>
          )}
        </div>
        {renderSpecialPage}
      </div>
    )
  }

  // Handle category pages
  if (currentView.startsWith('category:')) {
    const categorySlug = currentView.slice(9)
    return (
      <div className="main">
        <div className="sidebar" style={{ width: '175px' }}>
          <div className="sidebar-section">
            <h3>🧭 Navigation</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('ballscord') }}>Main Page</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-allpages') }}>All Pages</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-categories') }}>Categories</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-recent-changes') }}>Recent Changes</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-random') }}>Random Page</a></li>
              {userProfile?.is_admin && (
                <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-admin') }}>Admin Panel</a></li>
              )}
            </ul>
          </div>
        </div>
        <CategoryPage categorySlug={categorySlug} />
      </div>
    )
  }

  // Render main wiki page
  return (
    <div className="main">
      {/* Sidebar */}
      <div className="sidebar" style={{ width: '175px' }}>
        {/* Search */}
        <div className="sidebar-section">
          <h3>🔍 Search</h3>
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => searchPages(e.target.value)}
            style={{
              width: '100%',
              padding: '4px',
              border: '1px inset #c0c0c0',
              background: '#fff',
              fontSize: '11px'
            }}
          />
          {searchResults.length > 0 && (
            <div style={{ marginTop: '8px', background: '#000', border: '1px solid #666', padding: '4px' }}>
              {searchResults.slice(0, 10).map(page => (
                <div key={page.id}>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      navigateTo(page.slug)
                    }}
                    style={{ color: '#a3213d', fontSize: '11px', display: 'block', padding: '2px' }}
                  >
                    {page.title}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table of Contents */}
        {tableOfContents.length > 0 && showToc && (
          <div className="sidebar-section">
            <h3>
              📋 Contents 
              <button 
                onClick={() => setShowToc(!showToc)}
                style={{ float: 'right', background: 'none', border: 'none', color: '#a3213d', cursor: 'pointer' }}
              >
                [hide]
              </button>
            </h3>
            <div className="toc">
              {renderTableOfContents(tableOfContents)}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="sidebar-section">
          <h3>🧭 Navigation</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('ballscord') }}>Main Page</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-allpages') }}>All Pages</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-categories') }}>Categories</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-recent-changes') }}>Recent Changes</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-random') }}>Random Page</a></li>
            {userProfile?.is_admin && (
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-admin') }}>Admin Panel</a></li>
            )}
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="sidebar-section">
          <h3>⚡ Quick Actions</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('help-editing') }}>Help: Editing</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('community-guidelines') }}>Guidelines</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('featured-content') }}>Featured</a></li>
          </ul>
        </div>

        {/* Page Info */}
        {currentPage && (
          <div className="sidebar-section">
            <h3>ℹ️ Page Info</h3>
            <div style={{ fontSize: '10px', color: '#ccc' }}>
              <div>Views: {currentPage.view_count}</div>
              <div>Created: {new Date(currentPage.created_at).toLocaleDateString()}</div>
              <div>Modified: {new Date(currentPage.updated_at).toLocaleDateString()}</div>
            </div>
          </div>
        )}

        {/* Performance metrics for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="sidebar-section">
            <h3>⚡ Performance</h3>
            <div style={{ fontSize: '10px', color: '#888' }}>
              <div>Page Load: {metrics.pageLoadTime.toFixed(1)}ms</div>
              <div>Auth Check: {metrics.authCheckTime.toFixed(1)}ms</div>
              <div>Search: {metrics.searchTime.toFixed(1)}ms</div>
              <div>Cache: {OptimizedWikiAPI.getCacheStats().memoryKeys} keys</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div>Loading...</div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '10px' }}>
              Using optimized caching for faster loads
            </div>
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div style={{ borderBottom: '1px solid #666', paddingBottom: '10px', marginBottom: '15px' }}>
              <h1 style={{ margin: '0 0 10px 0', color: '#fff' }}>
                {currentPage ? currentPage.title : editTitle}
                {!currentPage && <span style={{ color: '#ff6666' }}> (page does not exist)</span>}
              </h1>
              
              {/* Page Actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {!isEditing ? (
                  <>
                    <button onClick={startEditing} style={{ fontSize: '11px' }}>
                      {currentPage ? '✏️ Edit' : '📝 Create'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={saveChanges} disabled={saving} style={{ fontSize: '11px' }}>
                      {saving ? '💾 Saving...' : '💾 Save'}
                    </button>
                    <button onClick={cancelEditing} style={{ fontSize: '11px' }}>
                      ❌ Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div style={{ 
                background: '#800000', 
                color: '#fff', 
                padding: '8px', 
                marginBottom: '15px',
                border: '1px solid #ff0000'
              }}>
                {error}
                <button 
                  onClick={clearMessages}
                  style={{ 
                    float: 'right', 
                    background: 'none', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer' 
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div style={{ 
                background: '#008000', 
                color: '#fff', 
                padding: '8px', 
                marginBottom: '15px',
                border: '1px solid #00ff00'
              }}>
                {success}
                <button 
                  onClick={clearMessages}
                  style={{ 
                    float: 'right', 
                    background: 'none', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer' 
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Editor or Content */}
            {isEditing ? (
              <div>
                {/* Title Input */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', color: '#ccc' }}>
                    Page Title:
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      border: '1px inset #c0c0c0',
                      background: '#fff',
                      fontSize: '11px'
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Page Content */}
                {currentPage ? (
                  <div 
                    className="wiki-content"
                    dangerouslySetInnerHTML={{ 
                      __html: renderWikiMarkdown(currentPage.content || '', allPageSlugs)
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    <h2>This page does not exist</h2>
                    <p>You can create it by clicking the "Create" button above.</p>
                    {!user && (
                      <p style={{ color: '#ffaa00' }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); onShowAuthPopup() }} style={{ color: '#6699ff' }}>
                          Log in
                        </a> to create and edit pages.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}