// src/app/components/EnhancedWikiRouter.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WikiAPI } from '@/lib/wiki-api'
import { Page, PageRevision, UserProfile, Category, PendingChange, PageSummary } from '@/types/wiki'
import VisualEditor from './VisualEditor'
import AdminPanel from './AdminPanel'
import SpecialPages from './SpecialPages'
import CategoryPage from './CategoryPage'
import { generateTableOfContents, renderWikiMarkdown, slugify, validatePageTitle } from '@/lib/wiki-utils'

interface EnhancedWikiRouterProps {
  onShowAuthPopup: () => void
}

export default function EnhancedWikiRouter({ onShowAuthPopup }: EnhancedWikiRouterProps) {
  // Core state
  const [currentView, setCurrentView] = useState('ballscord') // Changed to ballscord as main page
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [mounted, setMounted] = useState(false)
  
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
  
  // Wiki data
  const [allPageSlugs, setAllPageSlugs] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PageSummary[]>([])
  const [showSearch, setShowSearch] = useState(false)
  
  // Table of contents
  const [tableOfContents, setTableOfContents] = useState<any[]>([])
  const [showToc, setShowToc] = useState(true)

  useEffect(() => {
    setMounted(true)
    initializeApp()
    handleRoute()
    
    // Handle browser navigation
    const handlePopState = () => handleRoute()
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const initializeApp = async () => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        setUser(userData.user)
        const profile = await WikiAPI.getUserProfile(userData.user.id)
        setUserProfile(profile)
      }

      // Load all page slugs for link validation
      const slugs = await WikiAPI.getAllPageSlugs()
      setAllPageSlugs(slugs)

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const profile = await WikiAPI.getUserProfile(session.user.id)
          setUserProfile(profile)
        } else {
          setUser(null)
          setUserProfile(null)
        }
      })

      return () => subscription.unsubscribe()
    } catch (error) {
      console.error('Error initializing app:', error)
    }
  }

  const handleRoute = () => {
    const path = window.location.pathname
    let view = 'ballscord' // Default to ballscord instead of main-page
    
    if (path.startsWith('/wiki/')) {
      view = path.slice(6) || 'ballscord'
    } else if (path.startsWith('/category/')) {
      view = 'category:' + path.slice(10)
    } else if (path === '/') {
      view = 'ballscord' // Homepage shows ballscord
    }
    
    setCurrentView(view)
    loadPage(view)
  }

  const loadPage = async (slug: string) => {
    try {
      setLoading(true)
      setError('')
      
      // Handle special pages
      if (slug.startsWith('special-')) {
        setCurrentPage(null)
        setLoading(false)
        return
      }
      
      // Handle category pages
      if (slug.startsWith('category:')) {
        setCurrentPage(null)
        setLoading(false)
        return
      }
      
      const page = await WikiAPI.getPage(slug)
      
      if (page) {
        setCurrentPage(page)
        setEditTitle(page.title)
        setEditContent(page.content || '')
        
        // Generate table of contents
        if (page.content) {
          const toc = generateTableOfContents(page.content)
          setTableOfContents(toc)
        } else {
          setTableOfContents([])
        }
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
  }

  const navigateTo = (path: string) => {
    const fullPath = path.startsWith('/') ? path : `/wiki/${path}`
    window.history.pushState({}, '', fullPath)
    setCurrentView(path.replace('/wiki/', ''))
    loadPage(path.replace('/wiki/', ''))
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
  }

  const startEditing = () => {
    if (!user) {
      setError('')
      onShowAuthPopup() // Show auth popup instead of just showing error
      return
    }
    setIsEditing(true)
    setError('')
    setSuccess('')
  }

  const cancelEditing = () => {
    setIsEditing(false)
    if (currentPage) {
      setEditTitle(currentPage.title)
      setEditContent(currentPage.content || '')
    }
    setEditSummary('')
    setError('')
    setSuccess('')
  }

  const saveChanges = async () => {
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
      
      if (currentPage) {
        // Update existing page
        await WikiAPI.updatePage(
          currentPage.id,
          editTitle,
          editContent,
          editSummary,
          user.id,
          userProfile?.is_admin || userProfile?.is_moderator || false
        )
        
        if (userProfile?.is_admin || userProfile?.is_moderator) {
          setSuccess('Page updated successfully!')
          // Navigate to the new page if slug changed
          if (slug !== currentView) {
            navigateTo(slug)
          } else {
            // Reload current page
            await loadPage(slug)
          }
        } else {
          setSuccess('Changes submitted for review!')
        }
      } else {
        // Create new page
        await WikiAPI.createPage(editTitle, editContent, editSummary, user.id)
        setSuccess('Page created successfully!')
        // Navigate to the new page
        navigateTo(slug)
      }

      setIsEditing(false)
      setEditSummary('')
      
      // Update page slugs cache
      const newSlugs = await WikiAPI.getAllPageSlugs()
      setAllPageSlugs(newSlugs)
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const searchPages = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      setShowSearch(false)
      return
    }

    try {
      const results = await WikiAPI.searchPages(query)
      setSearchResults(results)
      setShowSearch(true)
    } catch (err) {
      console.error('Search error:', err)
    }
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  const renderTableOfContents = (items: any[], level = 0) => {
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
          <div>{renderTableOfContents(item.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  const renderSpecialPage = () => {
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
  }

  if (!mounted) {
    return <div className="main">Loading wiki...</div>
  }

  // Handle special pages
  if (currentView.startsWith('special-')) {
    return (
      <div className="main">
        <div className="sidebar" style={{ width: '175px' }}> {/* Reduced from 250px to 175px (30% reduction) */}
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
        {renderSpecialPage()}
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
      {/* Sidebar - Reduced width */}
      <div className="sidebar" style={{ width: '175px' }}>
        {/* Search */}
        <div className="sidebar-section">
          <h3>🔍 Search</h3>
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              searchPages(e.target.value)
            }}
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
      </div>

      {/* Main Content */}
      <div className="content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Loading...
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