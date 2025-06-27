'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EnhancedWikiAPI } from '@/lib/enhanced-wiki-api'
import { UserProfile, Page } from '@/types/wiki'
import VisualEditor from './VisualEditor'
import AdminPanel from './AdminPanel'
import SpecialPages from './SpecialPages'
import { generateTableOfContents, renderWikiMarkdown, slugify, validatePageTitle } from '@/lib/wiki-utils'

export default function EnhancedWikiRouter() {
  // Core state
  const [currentView, setCurrentView] = useState('main-page')
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
  const [searchResults, setSearchResults] = useState<Page[]>([])
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
        const profile = await EnhancedWikiAPI.getUserProfile(userData.user.id)
        setUserProfile(profile)
      }

      // Load all page slugs for link validation
      const slugs = await EnhancedWikiAPI.getAllPageSlugs()
      setAllPageSlugs(slugs)

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const profile = await EnhancedWikiAPI.getUserProfile(session.user.id)
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
    let view = 'main-page'
    
    if (path.startsWith('/wiki/')) {
      view = path.slice(6) || 'main-page'
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
      
      const page = await EnhancedWikiAPI.getPage(slug)
      
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
      setError('Please log in to edit pages')
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
      setError('Please log in to save changes')
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
      const result = await EnhancedWikiAPI.savePage(
        slug,
        editTitle,
        editContent,
        editSummary,
        user.id,
        userProfile?.is_admin || userProfile?.is_moderator || false
      )

      if (result.success) {
        if (result.needsApproval) {
          setSuccess('Changes submitted for review!')
        } else {
          setSuccess('Page saved successfully!')
          // Navigate to the new page if slug changed
          if (slug !== currentView) {
            navigateTo(slug)
          } else {
            // Reload current page
            await loadPage(slug)
          }
        }
        setIsEditing(false)
        setEditSummary('')
        
        // Update page slugs cache
        const newSlugs = await EnhancedWikiAPI.getAllPageSlugs()
        setAllPageSlugs(newSlugs)
      } else {
        setError(result.error || 'Failed to save changes')
      }
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
      const results = await EnhancedWikiAPI.searchPages(query)
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
        <div className="sidebar">
          <div className="sidebar-section">
            <h3>🧭 Navigation</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('main-page') }}>Main Page</a></li>
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

  return (
    <div className="main">
      {/* Sidebar */}
      <div className="sidebar">
        {/* Search */}
        <div className="sidebar-section">
          <h3>🔍 Quick Search</h3>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => searchPages(e.target.value)}
              onFocus={() => searchQuery && setShowSearch(true)}
              style={{
                width: '100%',
                padding: '6px',
                border: '1px inset #c0c0c0',
                background: '#fff',
                fontSize: '11px'
              }}
            />
            
            {showSearch && searchResults.length > 0 && (
              <div style={{ 
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#000', 
                border: '1px solid #666', 
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 100
              }}>
                {searchResults.map(page => (
                  <div 
                    key={page.id}
                    style={{ 
                      padding: '8px',
                      borderBottom: '1px solid #444',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                    onClick={() => {
                      navigateTo(page.slug)
                      setShowSearch(false)
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#333'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ color: '#6699ff', fontWeight: 'bold' }}>{page.title}</div>
                  </div>
                ))}
                <div 
                  style={{ 
                    padding: '6px', 
                    textAlign: 'center', 
                    fontSize: '9px', 
                    color: '#888',
                    borderTop: '1px solid #444'
                  }}
                  onClick={() => setShowSearch(false)}
                >
                  Click to close
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table of Contents */}
        {tableOfContents.length > 0 && (
          <div className="sidebar-section">
            <h3>
              📋 Contents 
              <button 
                onClick={() => setShowToc(!showToc)}
                style={{ 
                  float: 'right', 
                  background: 'none', 
                  border: 'none', 
                  color: '#a3213d', 
                  cursor: 'pointer',
                  fontSize: '9px'
                }}
              >
                {showToc ? '[hide]' : '[show]'}
              </button>
            </h3>
            {showToc && (
              <div className="toc">
                {renderTableOfContents(tableOfContents)}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="sidebar-section">
          <h3>🧭 Navigation</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('main-page') }}>Main Page</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-allpages') }}>All Pages</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-categories') }}>Categories</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-recent-changes') }}>Recent Changes</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-random') }}>Random Page</a></li>
            {userProfile?.is_admin && (
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-admin') }}>🛡️ Admin Panel</a></li>
            )}
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

        {/* Quick Actions */}
        <div className="sidebar-section">
          <h3>⚡ Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => EnhancedWikiAPI.clearCache()}
              style={{ fontSize: '9px', padding: '4px' }}
            >
              🔄 Clear Cache
            </button>
            
            <button
              onClick={() => navigateTo('help-editing')}
              style={{ fontSize: '9px', padding: '4px' }}
            >
              📖 Help
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="content">
        {/* Messages */}
        {(error || success) && (
          <div 
            onClick={clearMessages}
            style={{ 
              background: error ? '#800000' : '#008000', 
              color: '#fff', 
              padding: '10px', 
              marginBottom: '15px',
              border: `1px solid ${error ? '#ff0000' : '#00ff00'}`,
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {error || success}
            <span style={{ 
              position: 'absolute', 
              right: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              fontSize: '12px'
            }}>
              ✕
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner"></div>
            <div style={{ marginTop: '10px' }}>Loading page...</div>
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div style={{ borderBottom: '1px solid #666', paddingBottom: '15px', marginBottom: '20px' }}>
              <h1 style={{ margin: '0 0 15px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {currentPage ? currentPage.title : editTitle}
                {!currentPage && (
                  <span style={{ 
                    color: '#ff6666', 
                    fontSize: '14px',
                    background: '#330000',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #ff6666'
                  }}>
                    PAGE DOES NOT EXIST
                  </span>
                )}
              </h1>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {!isEditing ? (
                  <>
                    <button 
                      onClick={startEditing} 
                      style={{ 
                        fontSize: '11px',
                        background: currentPage ? '#000080' : '#008000',
                        padding: '6px 12px'
                      }}
                    >
                      {currentPage ? '✏️ Edit Page' : '📝 Create Page'}
                    </button>
                    
                    {currentPage && (
                      <button 
                        onClick={() => navigateTo(`${currentView}/history`)} 
                        style={{ fontSize: '11px', padding: '6px 12px' }}
                      >
                        📜 History
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={saveChanges} 
                      disabled={saving} 
                      style={{ 
                        fontSize: '11px',
                        background: saving ? '#666' : '#008000',
                        padding: '6px 12px'
                      }}
                    >
                      {saving ? '💾 Saving...' : '💾 Save Changes'}
                    </button>
                    
                    <button 
                      onClick={cancelEditing} 
                      style={{ fontSize: '11px', padding: '6px 12px', background: '#800000' }}
                    >
                      ❌ Cancel
                    </button>
                    
                    <div style={{ fontSize: '10px', color: '#888', marginLeft: '10px' }}>
                      {userProfile?.is_admin || userProfile?.is_moderator 
                        ? 'Changes will be applied immediately' 
                        : 'Changes will be submitted for review'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Editor or Content */}
            {isEditing ? (
              <div>
                {/* Title Input */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '12px' }}>
                    Page Title:
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px inset #c0c0c0',
                      background: '#fff',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                    placeholder="Enter page title..."
                  />
                </div>

                {/* Visual Editor */}
                <VisualEditor
                  content={editContent}
                  onChange={setEditContent}
                  onModeChange={setEditorMode}
                  mode={editorMode}
                  existingPages={allPageSlugs}
                />

                {/* Edit Summary */}
                <div style={{ marginTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '12px' }}>
                    Edit Summary: <span style={{ color: '#ff6666' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    placeholder="Briefly describe your changes..."
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px inset #c0c0c0',
                      background: '#fff',
                      fontSize: '12px'
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
                    onClick={(e) => {
                      // Handle wiki link clicks
                      const target = e.target as HTMLElement
                      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('/wiki/')) {
                        e.preventDefault()
                        const href = target.getAttribute('href')!
                        const slug = href.replace('/wiki/', '')
                        
                        // Check if page exists
                        if (!allPageSlugs.includes(slug)) {
                          // Show page creation prompt
                          const shouldCreate = confirm(`The page "${slug.replace(/-/g, ' ')}" does not exist. Would you like to create it?`)
                          if (shouldCreate) {
                            navigateTo(slug)
                            setTimeout(() => startEditing(), 100)
                          }
                        } else {
                          navigateTo(slug)
                        }
                      }
                    }}
                  />
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    background: '#111',
                    border: '2px dashed #666',
                    borderRadius: '8px'
                  }}>
                    <h2 style={{ color: '#ff6666', marginBottom: '15px' }}>📄 Page Not Found</h2>
                    <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '14px' }}>
                      The page "<strong>{editTitle}</strong>" does not exist yet.
                    </p>
                    <p style={{ color: '#888', marginBottom: '25px', fontSize: '12px' }}>
                      You can be the first to create this page! Click the "Create Page" button above to get started.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button 
                        onClick={startEditing}
                        style={{ 
                          fontSize: '12px',
                          background: '#008000',
                          padding: '10px 20px',
                          border: '1px solid #00aa00'
                        }}
                      >
                        🚀 Create This Page
                      </button>
                      
                      <button 
                        onClick={() => navigateTo('main-page')}
                        style={{ 
                          fontSize: '12px',
                          background: '#333',
                          padding: '10px 20px'
                        }}
                      >
                        🏠 Go to Main Page
                      </button>
                      
                      <button 
                        onClick={() => navigateTo('special-allpages')}
                        style={{ 
                          fontSize: '12px',
                          background: '#333',
                          padding: '10px 20px'
                        }}
                      >
                        📄 Browse All Pages
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Enhanced Styles */}
      <style jsx>{`
        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid #666;
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .sidebar-section {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px dotted #666;
        }

        .sidebar-section:last-child {
          border-bottom: none;
        }

        .sidebar-section h3 {
          margin: 0 0 10px 0;
          font-size: 12px;
          color: #ff6666;
          font-weight: bold;
        }

        .sidebar-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sidebar-section li {
          margin-bottom: 6px;
        }

        .sidebar-section a {
          color: #a3213d;
          text-decoration: none;
          font-size: 11px;
          display: block;
          padding: 3px 0;
          border-left: 2px solid transparent;
          padding-left: 5px;
          transition: all 0.2s;
        }

        .sidebar-section a:hover {
          color: #ff6666;
          border-left-color: #ff6666;
          background: rgba(255, 102, 102, 0.1);
        }

        .toc-link {
          color: #a3213d;
          text-decoration: none;
          font-size: 10px;
          display: block;
          padding: 2px 0;
          line-height: 1.4;
          transition: color 0.2s;
        }

        .toc-link:hover {
          color: #ff6666;
          text-decoration: underline;
        }

        .wiki-content {
          line-height: 1.7;
          color: #fff;
        }

        .wiki-content h1, 
        .wiki-content h2, 
        .wiki-content h3, 
        .wiki-content h4, 
        .wiki-content h5, 
        .wiki-content h6 {
          color: #ff6666;
          margin: 25px 0 15px 0;
          font-weight: bold;
        }

        .wiki-content h1 {
          font-size: 24px;
          border-bottom: 3px solid #ff6666;
          padding-bottom: 8px;
        }

        .wiki-content h2 {
          font-size: 20px;
          border-bottom: 2px solid #666;
          padding-bottom: 5px;
        }

        .wiki-content h3 {
          font-size: 16px;
          border-bottom: 1px solid #444;
          padding-bottom: 3px;
        }

        .wiki-content p {
          margin: 15px 0;
          text-align: justify;
        }

        .wiki-content ul, .wiki-content ol {
          margin: 15px 0;
          padding-left: 30px;
        }

        .wiki-content li {
          margin-bottom: 8px;
        }

        .wiki-content blockquote {
          border-left: 4px solid #666;
          margin: 20px 0;
          padding: 15px 20px;
          background: #222;
          font-style: italic;
          border-radius: 0 4px 4px 0;
        }

        .wiki-content code {
          background: #333;
          padding: 3px 6px;
          border-radius: 4px;
          font-family: Consolas, Monaco, monospace;
          font-size: 90%;
          color: #ffeb3b;
        }

        .wiki-content pre {
          background: #1a1a1a;
          border: 1px solid #444;
          padding: 15px;
          overflow-x: auto;
          margin: 20px 0;
          border-radius: 4px;
          border-left: 4px solid #ff6666;
        }

        .wiki-content pre code {
          background: none;
          padding: 0;
          color: #fff;
        }

        .wiki-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
          background: #222;
          border: 1px solid #666;
        }

        .wiki-content th {
          background: #333;
          color: #fff;
          padding: 12px;
          border: 1px solid #666;
          font-weight: bold;
          text-align: left;
        }

        .wiki-content td {
          padding: 10px 12px;
          border: 1px solid #555;
          vertical-align: top;
        }

        .wiki-content tr:nth-child(even) {
          background: #1a1a1a;
        }

        .wiki-content tr:hover {
          background: #2a2a2a;
        }

        .wiki-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 20px auto;
          border: 1px solid #666;
          border-radius: 4px;
        }

        .wiki-link {
          color: #6699ff !important;
          text-decoration: none;
          border-bottom: 1px dotted #6699ff;
          padding: 1px 3px;
          background: rgba(102, 153, 255, 0.1);
          border-radius: 2px;
          transition: all 0.2s;
        }

        .wiki-link:hover {
          color: #99ccff !important;
          text-decoration: none;
          border-bottom-style: solid;
          background: rgba(102, 153, 255, 0.2);
        }

        .wiki-link-new {
          color: #ff6666 !important;
          text-decoration: none;
          border-bottom: 1px dotted #ff6666;
          padding: 1px 3px;
          background: rgba(255, 102, 102, 0.1);
          border-radius: 2px;
          transition: all 0.2s;
        }

        .wiki-link-new:hover {
          color: #ff9999 !important;
          text-decoration: none;
          border-bottom-style: solid;
          background: rgba(255, 102, 102, 0.2);
        }

        .wiki-link-new::after {
          content: " [create]";
          font-size: 9px;
          color: #999;
          font-weight: normal;
        }

        .category-link {
          color: #ffaa00 !important;
          text-decoration: none;
          font-size: 11px;
          border: 1px solid #ffaa00;
          padding: 3px 8px;
          border-radius: 12px;
          display: inline-block;
          margin: 3px;
          background: rgba(255, 170, 0, 0.1);
          transition: all 0.2s;
        }

        .category-link:hover {
          background: #ffaa00;
          color: #000 !important;
        }

        /* Responsive improvements */
        @media (max-width: 768px) {
          .main {
            flex-direction: column;
          }
          
          .sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 2px dotted #999;
            margin-bottom: 20px;
          }
          
          .sidebar-section {
            display: inline-block;
            width: 48%;
            margin-right: 2%;
            vertical-align: top;
          }
          
          .content {
            padding: 10px;
          }
        }

        /* Animation for smooth transitions */
        .wiki-content * {
          transition: color 0.2s, background-color 0.2s;
        }

        /* Enhanced focus styles for accessibility */
        button:focus,
        input:focus,
        textarea:focus {
          outline: 2px solid #6699ff;
          outline-offset: 2px;
        }

        /* Print styles */
        @media print {
          .sidebar {
            display: none;
          }
          
          .main {
            display: block;
          }
          
          .wiki-content {
            color: black;
          }
          
          .wiki-content h1,
          .wiki-content h2,
          .wiki-content h3 {
            color: black;
            border-color: black;
          }
          
          .wiki-link,
          .wiki-link-new {
            color: blue !important;
            background: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  )
}
 