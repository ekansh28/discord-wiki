'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WikiAPI } from '@/lib/wiki-api'
import { Page, PageRevision, UserProfile, TableOfContentsItem } from '@/types/wiki'
import { generateTableOfContents, renderWikiMarkdown, formatDate, timeSince, validatePageTitle, slugify } from '@/lib/wiki-utils'

export default function WikiEditor() {
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editorMode, setEditorMode] = useState<'visual' | 'source'>('visual')
  const [showToc, setShowToc] = useState(true)
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([])
  const [revisions, setRevisions] = useState<PageRevision[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Page[]>([])
  const [currentSlug, setCurrentSlug] = useState('main-page')
  const [allPages, setAllPages] = useState<Page[]>([])
  const [mounted, setMounted] = useState(false)

  // Load user and initial page
  useEffect(() => {
    setMounted(true)
    initializeEditor()
  }, [])

  // Handle URL changes
  useEffect(() => {
    if (mounted) {
      const urlSlug = getSlugFromUrl()
      if (urlSlug !== currentSlug) {
        setCurrentSlug(urlSlug)
        loadPage(urlSlug)
      }
    }
  }, [mounted, currentSlug])

  const getSlugFromUrl = () => {
    if (typeof window === 'undefined') return 'main-page'
    const path = window.location.pathname
    if (path.startsWith('/wiki/')) {
      return path.slice(6) || 'main-page'
    }
    return 'main-page'
  }

  const initializeEditor = async () => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        setUser(userData.user)
        const profile = await WikiAPI.getUserProfile(userData.user.id)
        setUserProfile(profile)
      }

      // Load initial page
      const slug = getSlugFromUrl()
      await loadPage(slug)
      
      // Load all pages for link checking
      const pages = await WikiAPI.getAllPages(1000)
      setAllPages(pages)
    } catch (err) {
      console.error('Error initializing editor:', err)
      setError('Failed to load wiki')
    } finally {
      setLoading(false)
    }
  }

  const loadPage = async (slug: string) => {
    try {
      setLoading(true)
      const page = await WikiAPI.getPage(slug)
      
      if (page) {
        setCurrentPage(page)
        setEditTitle(page.title)
        setEditContent(page.content || '')
        
        // Generate table of contents
        if (page.content) {
          const toc = generateTableOfContents(page.content)
          setTableOfContents(toc)
        }
        
        // Load revisions
        const pageRevisions = await WikiAPI.getPageRevisions(page.id)
        setRevisions(pageRevisions)
      } else {
        // Page doesn't exist - show create page interface
        setCurrentPage(null)
        setEditTitle(slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        setEditContent('')
        setTableOfContents([])
        setRevisions([])
      }
    } catch (err) {
      console.error('Error loading page:', err)
      setError('Failed to load page')
    } finally {
      setLoading(false)
    }
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

      if (currentPage) {
        // Editing existing page
        await WikiAPI.updatePage(
          currentPage.id,
          editTitle,
          editContent,
          editSummary,
          user.id,
          userProfile?.is_admin || userProfile?.is_moderator
        )
        
        if (userProfile?.is_admin || userProfile?.is_moderator) {
          setSuccess('Page updated successfully!')
          await loadPage(slugify(editTitle))
        } else {
          setSuccess('Changes submitted for review!')
        }
      } else {
        // Creating new page
        const newPage = await WikiAPI.createPage(editTitle, editContent, editSummary, user.id)
        setSuccess('Page created successfully!')
        setCurrentPage(newPage)
        
        // Update URL
        const newSlug = slugify(editTitle)
        window.history.pushState({}, '', `/wiki/${newSlug}`)
        setCurrentSlug(newSlug)
      }

      setIsEditing(false)
      setEditSummary('')
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const searchPages = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const results = await WikiAPI.searchPages(query)
      setSearchResults(results)
    } catch (err) {
      console.error('Search error:', err)
    }
  }

  const navigateToPage = (slug: string) => {
    window.history.pushState({}, '', `/wiki/${slug}`)
    setCurrentSlug(slug)
    loadPage(slug)
    setSearchQuery('')
    setSearchResults([])
  }

  const insertWikiMarkup = (markup: string, placeholder = '') => {
    const textarea = document.getElementById('wiki-editor') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = editContent.substring(start, end)
    
    let replacement = ''
    if (markup.includes('{{}}')) {
      replacement = markup.replace('{{}}', selectedText || placeholder)
    } else {
      replacement = markup + (selectedText || placeholder) + markup
    }

    const newContent = editContent.substring(0, start) + replacement + editContent.substring(end)
    setEditContent(newContent)

    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursor = start + replacement.length
      textarea.setSelectionRange(newCursor, newCursor)
    }, 0)
  }

  const renderTableOfContents = (items: TableOfContentsItem[], level = 0) => {
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

  if (!mounted) {
    return <div className="main">Loading...</div>
  }

  if (loading) {
    return (
      <div className="main">
        <div className="content">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Loading wiki...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="main">
      {/* Sidebar */}
      <div className="sidebar">
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
                      navigateToPage(page.slug)
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
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateToPage('main-page') }}>Main Page</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateToPage('special-allpages') }}>All Pages</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateToPage('special-categories') }}>Categories</a></li>
            <li><a href="#" onClick={(e) => { e.preventDefault(); navigateToPage('special-recent-changes') }}>Recent Changes</a></li>
            {userProfile?.is_admin && (
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigateToPage('special-admin') }}>Admin Panel</a></li>
            )}
          </ul>
        </div>

        {/* Page Info */}
        {currentPage && (
          <div className="sidebar-section">
            <h3>ℹ️ Page Info</h3>
            <div style={{ fontSize: '10px', color: '#ccc' }}>
              <div>Views: {currentPage.view_count}</div>
              <div>Created: {formatDate(currentPage.created_at)}</div>
              <div>Modified: {formatDate(currentPage.updated_at)}</div>
              <div>Revisions: {revisions.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="content">
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
                {currentPage && (
                  <button 
                    onClick={() => setShowHistory(!showHistory)} 
                    style={{ fontSize: '11px' }}
                  >
                    📜 History
                  </button>
                )}
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
            {/* Editor Toolbar */}
            <div style={{ 
              background: '#333', 
              padding: '8px', 
              border: '1px inset #666',
              marginBottom: '10px',
              display: 'flex',
              gap: '5px',
              flexWrap: 'wrap'
            }}>
              <button onClick={() => setEditorMode(editorMode === 'visual' ? 'source' : 'visual')} style={{ fontSize: '10px' }}>
                {editorMode === 'visual' ? '📝 Source' : '👁️ Visual'}
              </button>
              
              {editorMode === 'source' && (
                <>
                  <button onClick={() => insertWikiMarkup('**', 'bold text')} style={{ fontSize: '10px' }}>
                    **Bold**
                  </button>
                  <button onClick={() => insertWikiMarkup('*', 'italic text')} style={{ fontSize: '10px' }}>
                    *Italic*
                  </button>
                  <button onClick={() => insertWikiMarkup('[[', 'Page Name]]')} style={{ fontSize: '10px' }}>
                    [[Link]]
                  </button>
                  <button onClick={() => insertWikiMarkup('## ', 'Heading')} style={{ fontSize: '10px' }}>
                    Heading
                  </button>
                  <button onClick={() => insertWikiMarkup('* ', 'List item')} style={{ fontSize: '10px' }}>
                    List
                  </button>
                </>
              )}
            </div>

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

            {/* Content Editor */}
            <textarea
              id="wiki-editor"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Enter your content here..."
              style={{
                width: '100%',
                height: '400px',
                padding: '8px',
                border: '1px inset #c0c0c0',
                background: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
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

            {/* Preview */}
            {editContent && (
              <div style={{ marginTop: '15px' }}>
                <h3 style={{ color: '#ccc' }}>Preview:</h3>
                <div 
                  style={{ 
                    border: '1px inset #666', 
                    padding: '10px', 
                    background: '#222',
                    minHeight: '100px'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: renderWikiMarkdown(editContent, allPages.map(p => p.slug))
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Page Content */}
            {currentPage ? (
              <div 
                className="wiki-content"
                dangerouslySetInnerHTML={{ 
                  __html: renderWikiMarkdown(currentPage.content || '', allPages.map(p => p.slug))
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                <h2>This page does not exist</h2>
                <p>You can create it by clicking the "Create" button above.</p>
              </div>
            )}

            {/* Page History */}
            {showHistory && revisions.length > 0 && (
              <div style={{ marginTop: '30px', borderTop: '1px solid #666', paddingTop: '15px' }}>
                <h3>Revision History</h3>
                <div style={{ background: '#111', border: '1px solid #666', padding: '10px' }}>
                  {revisions.slice(0, 10).map(revision => (
                    <div key={revision.id} style={{ 
                      padding: '8px',
                      borderBottom: '1px solid #444',
                      fontSize: '11px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <strong>Rev #{revision.revision_number}</strong>
                          {revision.author?.display_name && (
                            <span> by {revision.author.display_name}</span>
                          )}
                        </span>
                        <span style={{ color: '#888' }}>
                          {timeSince(revision.created_at)}
                        </span>
                      </div>
                      {revision.edit_summary && (
                        <div style={{ color: '#ccc', fontStyle: 'italic', marginTop: '2px' }}>
                          {revision.edit_summary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .sidebar-section {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px dotted #666;
        }
        .sidebar-section h3 {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #ff6666;
        }
        .toc-link {
          color: #a3213d;
          text-decoration: none;
          font-size: 10px;
          display: block;
          padding: 1px 0;
        }
        .toc-link:hover {
          color: #ff6666;
        }
        .wiki-content {
          line-height: 1.6;
        }
        .wiki-content h1, .wiki-content h2, .wiki-content h3 {
          color: #ff6666;
          margin: 20px 0 10px 0;
        }
        .wiki-content p {
          margin: 10px 0;
        }
        .wiki-content ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .wiki-link {
          color: #6699ff;
          text-decoration: none;
        }
        .wiki-link:hover {
          text-decoration: underline;
        }
        .wiki-link-new {
          color: #ff6666;
          text-decoration: none;
        }
        .wiki-link-new:hover {
          text-decoration: underline;
        }
        .category-link {
          color: #ffaa00;
          text-decoration: none;
          font-size: 11px;
        }
      `}</style>
    </div>
  )
}