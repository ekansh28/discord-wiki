// components/UltraFastWikiRouter.tsx
'use client'

import React, { useState, useEffect, useCallback, useMemo, ReactElement, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { OptimizedWikiAPI } from '@/lib/optimized-wiki-api'
import { SmartLoadingSystem, SmartStorage, SkeletonGenerator } from '@/lib/smart-loading-system'
import { Page, PageRevision, UserProfile, Category, PendingChange, PageSummary } from '@/types/wiki'
import VisualEditor from './VisualEditor'
import AdminPanel from './AdminPanel'
import SpecialPages from './SpecialPages'
import CategoryPage from './CategoryPage'
import { generateTableOfContents, renderWikiMarkdown, slugify, validatePageTitle } from '@/lib/wiki-utils'

interface UltraFastWikiRouterProps {
  onShowAuthPopup: () => void
}

export default function UltraFastWikiRouter({ onShowAuthPopup }: UltraFastWikiRouterProps) {
  // Core state with instant defaults
  const [currentView, setCurrentView] = useState('ballscord')
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [mounted, setMounted] = useState(false)
  
  // Page state with smart defaults
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(false) // Changed to false for instant feel
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Editor state
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editorMode, setEditorMode] = useState<'visual' | 'source'>('visual')
  const [saving, setSaving] = useState(false)
  
  // Smart cached data
  const [allPageSlugs, setAllPageSlugs] = useState<string[]>(() => SmartLoadingSystem.getCachedSlugs())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PageSummary[]>([])
  const [showSearch, setShowSearch] = useState(false)
  
  // Table of contents
  const [tableOfContents, setTableOfContents] = useState<any[]>([])
  const [showToc, setShowToc] = useState(true)
  
  // Performance refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastNavigationRef = useRef<string>('')

  // Instant initialization with cached data
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    setMounted(true)
    
    // Initialize smart loading system
    SmartLoadingSystem.initialize()
    
    // Load cached auth immediately
    const cachedAuth = SmartLoadingSystem.getCachedAuth()
    if (cachedAuth) {
      setUser(cachedAuth.user)
      setUserProfile(cachedAuth.profile)
    }
    
    // Load cached page slugs
    const cachedSlugs = SmartLoadingSystem.getCachedSlugs()
    if (cachedSlugs.length > 0) {
      setAllPageSlugs(cachedSlugs)
    }
    
    // Handle initial route
    handleRouteInstantly()
    
    // Setup navigation listeners
    const handlePopState = () => handleRouteInstantly()
    window.addEventListener('popstate', handlePopState)
    
    // Setup smart edit listener
    const handleSmartEdit = (e: CustomEvent) => {
      startEditing()
    }
    window.addEventListener('smartEdit', handleSmartEdit as EventListener)
    
    // Background auth check
    backgroundAuthCheck()
    
    // Background data refresh
    backgroundDataRefresh()
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('smartEdit', handleSmartEdit as EventListener)
    }
  }, [])

  // Instant route handling with smart caching
  const handleRouteInstantly = useCallback(() => {
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
    
    // Prevent duplicate navigation
    if (lastNavigationRef.current === view) return
    lastNavigationRef.current = view
    
    loadPageInstantly(view)
  }, [])

  // Ultra-fast page loading with multiple fallbacks
  const loadPageInstantly = useCallback(async (slug: string) => {
    try {
      // Handle special pages immediately
      if (slug.startsWith('special-') || slug.startsWith('category:')) {
        setCurrentPage(null)
        setTableOfContents([])
        return
      }
      
      // Try cache first for instant loading
      const cachedPage = SmartLoadingSystem.getCachedPage(slug)
      if (cachedPage) {
        setCurrentPage(cachedPage)
        setEditTitle(cachedPage.title)
        setEditContent(cachedPage.content || '')
        
        // Generate TOC async
        setTimeout(() => {
          if (cachedPage.content) {
            const toc = generateTableOfContents(cachedPage.content)
            setTableOfContents(toc)
          }
        }, 0)
        return
      }
      
      // Show skeleton while loading
      setCurrentPage(null)
      setTableOfContents([])
      
      // Background load
      try {
        const page = await OptimizedWikiAPI.getPage(slug)
        
        // Only update if this is still the current view
        if (currentView === slug || lastNavigationRef.current === slug) {
          if (page) {
            setCurrentPage(page)
            setEditTitle(page.title)
            setEditContent(page.content || '')
            
            // Cache for next time
            SmartStorage.set(`page_${slug}`, page, 30)
            
            // Generate TOC
            if (page.content) {
              const toc = generateTableOfContents(page.content)
              setTableOfContents(toc)
            }
          } else {
            // Page doesn't exist
            setCurrentPage(null)
            setEditTitle(slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
            setEditContent('')
            setTableOfContents([])
          }
        }
      } catch (err) {
        console.error('Error loading page:', err)
        if (currentView === slug) {
          setError('Failed to load page')
        }
      }
    } catch (err) {
      console.error('Error in loadPageInstantly:', err)
    }
  }, [currentView])

  // Background auth check without blocking UI
  const backgroundAuthCheck = useCallback(async () => {
    try {
      const authResult = await OptimizedWikiAPI.getCurrentUser()
      setUser(authResult.user)
      setUserProfile(authResult.profile)
      
      // Cache the result
      if (authResult.user) {
        SmartStorage.set('current_user', authResult, 120)
      }
    } catch (error) {
      console.warn('Background auth check failed:', error)
    }
  }, [])

  // Background data refresh without blocking UI
  const backgroundDataRefresh = useCallback(async () => {
    try {
      // Refresh page slugs in background
      const slugs = await OptimizedWikiAPI.getAllPageSlugs()
      setAllPageSlugs(slugs)
      SmartStorage.set('all_page_slugs', slugs, 60)
    } catch (error) {
      console.warn('Background data refresh failed:', error)
    }
  }, [])

  // Instant navigation with smart preloading
  const navigateTo = useCallback((path: string) => {
    const fullPath = path.startsWith('/') ? path : `/wiki/${path}`
    const slug = path.replace('/wiki/', '')
    
    // Update URL immediately
    window.history.pushState({}, '', fullPath)
    
    // Update state immediately
    setCurrentView(slug)
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
    setError('')
    setSuccess('')
    
    // Load page
    loadPageInstantly(slug)
  }, [loadPageInstantly])

  // Smart search with caching and debouncing
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearch(false)
      return
    }

    // Show skeleton results immediately
    setSearchResults(SkeletonGenerator.generateSearchSkeleton())
    setShowSearch(true)
    
    try {
      // Check cache first
      const cacheKey = `search_${query.toLowerCase()}`
      const cached = SmartStorage.get(cacheKey)
      if (cached) {
        setSearchResults(cached)
        return
      }
      
      // Perform search
      const results = await OptimizedWikiAPI.searchPages(query)
      setSearchResults(results)
      
      // Cache results
      SmartStorage.set(cacheKey, results, 10) // Cache for 10 minutes
    } catch (err) {
      console.warn('Search error:', err)
      setSearchResults([])
    }
  }, [])

  const searchPages = useCallback((query: string) => {
    setSearchQuery(query)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 200) // Reduced from 300ms for faster feel
  }, [performSearch])

  // Editor functions with instant feedback
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
        
        // Clear cache for this page
        SmartStorage.set(`page_${slug}`, null)
        
        if (slug !== currentView) {
          navigateTo(slug)
        } else {
          await loadPageInstantly(slug)
        }
      } else {
        setSuccess('Changes submitted for review!')
      }

      setIsEditing(false)
      setEditSummary('')
      
      // Update page slugs cache in background
      backgroundDataRefresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [user, userProfile, editTitle, editContent, editSummary, currentView, navigateTo, loadPageInstantly, onShowAuthPopup, backgroundDataRefresh])

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
              const element = document.getElementById(item.id)
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
              }
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

  // Render skeleton content while loading
  const renderSkeletonContent = () => (
    <div 
      className="wiki-content"
      dangerouslySetInnerHTML={{ 
        __html: SkeletonGenerator.generatePageSkeleton(
          currentView.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        )
      }}
    />
  )

  // Show instant loading if not mounted
  if (!mounted) {
    return (
      <div className="main">
        <div className="sidebar" style={{ width: '175px' }}>
          <div className="sidebar-section">
            <h3>🧭 Navigation</h3>
            <div style={{ color: '#888', fontSize: '11px' }}>Loading...</div>
          </div>
        </div>
        <div className="content">
          {renderSkeletonContent()}
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
      {/* Sidebar with instant search */}
      <div className="sidebar" style={{ width: '175px' }}>
        {/* Search with instant feedback */}
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
              {searchResults.slice(0, 10).map((page, index) => (
                <div key={page.id}>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault()
                      if (!page.slug.startsWith('loading')) {
                        navigateTo(page.slug)
                      }
                    }}
                    style={{ 
                      color: page.slug.startsWith('loading') ? '#666' : '#a3213d', 
                      fontSize: '11px', 
                      display: 'block', 
                      padding: '2px',
                      cursor: page.slug.startsWith('loading') ? 'default' : 'pointer'
                    }}
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

        {/* Navigation with hover preloading */}
        <div className="sidebar-section">
          <h3>🧭 Navigation</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); navigateTo('ballscord') }}
                onMouseEnter={() => SmartLoadingSystem.getCachedPage('ballscord') || backgroundDataRefresh()}
              >
                Main Page
              </a>
            </li>
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

        {/* Smart Loading Status */}
        {process.env.NODE_ENV === 'development' && (
          <div className="sidebar-section">
            <h3>⚡ Smart Loading</h3>
            <div style={{ fontSize: '10px', color: '#888' }}>
              <div>Cache: {allPageSlugs.length} slugs</div>
              <div>Auth: {user ? 'Cached' : 'Guest'}</div>
              <div>Page: {currentPage ? 'Loaded' : 'Loading'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content with instant rendering */}
      <div className="content">
        {/* Page Header */}
        <div style={{ borderBottom: '1px solid #666', paddingBottom: '10px', marginBottom: '15px' }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#fff' }}>
            {currentPage ? currentPage.title : editTitle}
            {!currentPage && !loading && <span style={{ color: '#ff6666' }}> (page does not exist)</span>}
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

        {/* Messages with auto-hide */}
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
              onClick={() => setError('')}
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
              onClick={() => setSuccess('')}
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
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Enhanced Visual Editor */}
            <VisualEditor
              content={editContent}
              onChange={setEditContent}
              onModeChange={setEditorMode}
              mode={editorMode}
              existingPages={allPageSlugs}
            />

            {/* Edit Summary */}
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#ccc' }}>
                Edit Summary:
              </label>
              <input
                type="text"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Describe your changes..."
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
            {/* Page Content with smart rendering */}
            {currentPage ? (
              <div 
                className="wiki-content"
                dangerouslySetInnerHTML={{ 
                  __html: renderWikiMarkdown(currentPage.content || '', allPageSlugs)
                }}
              />
            ) : loading ? (
              renderSkeletonContent()
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
      </div>
    </div>
  )
}