// src/app/components/EnhancedWikiRouter.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { WikiAPI } from '@/lib/wiki-api'
import { Page, PageRevision, UserProfile, Category, PendingChange, PageSummary } from '@/types/wiki'
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
}
    // Render main wiki page