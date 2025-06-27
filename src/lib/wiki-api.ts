// lib/wiki-api.ts
import { supabase } from './supabase'
import { Page, PageRevision, UserProfile, Category, PendingChange, PageSummary } from '@/types/wiki'
import { slugify } from './wiki-utils'

// Simple in-memory cache
class WikiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  set(key: string, data: any, ttlSeconds = 300) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }
  
  get(key: string) {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
  
  clear() {
    this.cache.clear()
  }
}

const cache = new WikiCache()

// Legacy WikiAPI class for backward compatibility
export class WikiAPI {
  static async getPage(slug: string): Promise<Page | null> {
    return EnhancedWikiAPI.getPage(slug)
  }

  static async getAllPages(limit = 1000, offset = 0): Promise<Page[]> {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('title')
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching pages:', error)
      return []
    }

    return data || []
  }

  static async getAllPageSlugs(): Promise<string[]> {
    return EnhancedWikiAPI.getAllPageSlugs()
  }

  static async searchPages(query: string): Promise<PageSummary[]> {
    return EnhancedWikiAPI.searchPages(query)
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    return EnhancedWikiAPI.getUserProfile(userId)
  }

  static async getPageRevisions(pageId: string, limit = 10): Promise<PageRevision[]> {
    return EnhancedWikiAPI.getPageRevisions(pageId, limit)
  }

  static async getAllCategories(): Promise<Category[]> {
    return EnhancedWikiAPI.getAllCategories()
  }

  static async getRecentChanges(limit = 50): Promise<PageRevision[]> {
    return EnhancedWikiAPI.getRecentChanges(limit)
  }

  static async getPendingChanges(): Promise<PendingChange[]> {
    return EnhancedWikiAPI.getPendingChanges()
  }

  static async reviewChange(
    changeId: string,
    status: 'approved' | 'rejected',
    reviewComment: string,
    reviewerId: string
  ): Promise<void> {
    return EnhancedWikiAPI.reviewChange(changeId, status, reviewComment, reviewerId)
  }

  static async createPage(title: string, content: string, editSummary: string, userId: string): Promise<Page> {
    const slug = slugify(title)
    const result = await EnhancedWikiAPI.savePage(slug, title, content, editSummary, userId, false)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create page')
    }

    const page = await EnhancedWikiAPI.getPage(slug)
    if (!page) {
      throw new Error('Page was created but could not be retrieved')
    }

    return page
  }

  static async updatePage(
    pageId: string,
    title: string,
    content: string,
    editSummary: string,
    userId: string,
    isAdmin = false
  ): Promise<void> {
    const slug = slugify(title)
    const result = await EnhancedWikiAPI.savePage(slug, title, content, editSummary, userId, isAdmin)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update page')
    }
  }

  static async getPageStats(): Promise<{
    totalPages: number
    totalRevisions: number
    totalUsers: number
    totalCategories: number
  }> {
    const [pagesResult, revisionsResult, usersResult, categoriesResult] = await Promise.all([
      supabase.from('pages').select('id', { count: 'exact' }),
      supabase.from('page_revisions').select('id', { count: 'exact' }),
      supabase.from('user_profiles').select('id', { count: 'exact' }),
      supabase.from('categories').select('id', { count: 'exact' })
    ])

    return {
      totalPages: pagesResult.count || 0,
      totalRevisions: revisionsResult.count || 0,
      totalUsers: usersResult.count || 0,
      totalCategories: categoriesResult.count || 0
    }
  }
}

// Enhanced WikiAPI class with caching and optimizations
export class EnhancedWikiAPI {
  // Fast page loading with caching
  static async getPage(slug: string): Promise<Page | null> {
    const cacheKey = `page:${slug}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) return null

      // Increment view count asynchronously
      supabase
        .from('pages')
        .update({ view_count: data.view_count + 1 })
        .eq('id', data.id)
        .then(() => {
          // Invalidate cache after view count update
          cache.invalidate(`page:${slug}`)
        })

      // Cache the result
      cache.set(cacheKey, data, 180) // 3 minutes
      return data
    } catch (error) {
      console.error('Error loading page:', error)
      return null
    }
  }

  // Batch load multiple pages
  static async getPages(slugs: string[]): Promise<Page[]> {
    const results: Page[] = []
    const toFetch: string[] = []

    // Check cache first
    for (const slug of slugs) {
      const cached = cache.get(`page:${slug}`)
      if (cached) {
        results.push(cached)
      } else {
        toFetch.push(slug)
      }
    }

    // Fetch uncached pages in batch
    if (toFetch.length > 0) {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .in('slug', toFetch)

      if (!error && data) {
        for (const page of data) {
          cache.set(`page:${page.slug}`, page, 180)
          results.push(page)
        }
      }
    }

    return results
  }

  // Fast page search with caching
 static async searchPages(query: string): Promise<PageSummary[]> {
  if (!query.trim()) return []
  
  const cacheKey = `search:${query.toLowerCase()}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('pages')
    .select('id, title, slug') // Keep as PageSummary (lightweight for search)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('title')
    .limit(20)

  if (error) return []
  
  cache.set(cacheKey, data || [], 120) // 2 minutes
  return data || []
}

  // Get all page slugs for link validation (cached)
  static async getAllPageSlugs(): Promise<string[]> {
    const cacheKey = 'all-page-slugs'
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('pages')
      .select('slug')

    if (error) return []
    
    const slugs = data?.map(p => p.slug) || []
    cache.set(cacheKey, slugs, 300) // 5 minutes
    return slugs
  }

  // Create or update page
  static async savePage(
    slug: string,
    title: string,
    content: string,
    editSummary: string,
    userId: string,
    isAdmin = false
  ): Promise<{ success: boolean; needsApproval: boolean; error?: string }> {
    try {
      // Check if page exists
      let existingPage = await this.getPage(slug)
      const isNewPage = !existingPage

      if (isNewPage) {
        // Create new page
        const { data: newPage, error } = await supabase
          .from('pages')
          .insert({
            title,
            slug,
            content,
            created_by: userId
          })
          .select()
          .single()

        if (error) throw error
        existingPage = newPage
      }

      if (!existingPage) throw new Error('Failed to create page')

      // Get user profile
      const userProfile = await this.getUserProfile(userId)
      const canDirectEdit = isAdmin || userProfile?.is_admin || userProfile?.is_moderator

      // Create revision
      const revisionData = {
        page_id: existingPage.id,
        title,
        content,
        edit_summary: editSummary,
        created_by: userId,
        revision_number: await this.getNextRevisionNumber(existingPage.id),
        is_approved: canDirectEdit,
        approved_by: canDirectEdit ? userId : null,
        approved_at: canDirectEdit ? new Date().toISOString() : null
      }

      const { data: revision, error: revError } = await supabase
        .from('page_revisions')
        .insert(revisionData)
        .select()
        .single()

      if (revError) throw revError

      if (canDirectEdit) {
        // Update page directly
        await supabase
          .from('pages')
          .update({ title, slug, content })
          .eq('id', existingPage.id)
      } else {
        // Create pending change
        await supabase
          .from('pending_changes')
          .insert({
            page_id: existingPage.id,
            revision_id: revision.id,
            status: 'pending'
          })
      }

      // Invalidate cache
      cache.invalidate(slug)
      cache.invalidate('all-page-slugs')
      cache.invalidate('search:')

      return {
        success: true,
        needsApproval: !canDirectEdit
      }
    } catch (error: any) {
      return {
        success: false,
        needsApproval: false,
        error: error.message
      }
    }
  }

  // Get next revision number
  private static async getNextRevisionNumber(pageId: string): Promise<number> {
    const { data } = await supabase
      .from('page_revisions')
      .select('revision_number')
      .eq('page_id', pageId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single()

    return (data?.revision_number || 0) + 1
  }

  // Fast user profile loading
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = `user:${userId}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) return null
    
    cache.set(cacheKey, data, 600) // 10 minutes
    return data
  }

  // Get page revisions with caching
  static async getPageRevisions(pageId: string, limit = 10): Promise<PageRevision[]> {
    const cacheKey = `revisions:${pageId}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('page_revisions')
      .select('*')
      .eq('page_id', pageId)
      .eq('is_approved', true)
      .order('revision_number', { ascending: false })
      .limit(limit)

    if (error) return []

    // Fetch authors in batch
    const userIds = [...new Set(data?.map(r => r.created_by).filter(Boolean))]
    const authors = await this.getBatchUserProfiles(userIds)
    
    const revisionsWithAuthors = data?.map(revision => ({
      ...revision,
      author: authors.find(a => a.id === revision.created_by)
    })) || []

    cache.set(cacheKey, revisionsWithAuthors, 300)
    return revisionsWithAuthors
  }

  // Batch load user profiles
  static async getBatchUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) return []

    const cached: UserProfile[] = []
    const toFetch: string[] = []

    for (const id of userIds) {
      const cachedUser = cache.get(`user:${id}`)
      if (cachedUser) {
        cached.push(cachedUser)
      } else {
        toFetch.push(id)
      }
    }

    if (toFetch.length > 0) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', toFetch)

      if (data) {
        for (const user of data) {
          cache.set(`user:${user.id}`, user, 600)
          cached.push(user)
        }
      }
    }

    return cached
  }

  // Categories with caching
  static async getAllCategories(): Promise<Category[]> {
    const cacheKey = 'all-categories'
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) return []

    cache.set(cacheKey, data || [], 300)
    return data || []
  }

  // Recent changes with caching
  static async getRecentChanges(limit = 50): Promise<PageRevision[]> {
    const cacheKey = `recent-changes:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('page_revisions')
      .select('*, page_id')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []

    // Batch fetch pages and users
    const pageIds = [...new Set(data?.map(r => r.page_id))]
    const userIds = [...new Set(data?.map(r => r.created_by).filter(Boolean))]

    const [pages, users] = await Promise.all([
      this.getBatchPages(pageIds),
      this.getBatchUserProfiles(userIds)
    ])

    const changesWithData = data?.map(revision => ({
      ...revision,
      author: users.find(u => u.id === revision.created_by),
      page: pages.find(p => p.id === revision.page_id)
    })) || []

    cache.set(cacheKey, changesWithData, 60) // 1 minute
    return changesWithData
  }

  // Batch load pages
  static async getBatchPages(pageIds: string[]): Promise<PageSummary[]> {
    if (pageIds.length === 0) return []

    const { data } = await supabase
      .from('pages')
      .select('id, title, slug')
      .in('id', pageIds)

    return data || []
  }

  // Admin functions
  static async getPendingChanges(): Promise<PendingChange[]> {
    const { data, error } = await supabase
      .from('pending_changes')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) return []

    // Manually fetch related data in batches
    const pageIds = [...new Set(data?.map(c => c.page_id))]
    const revisionIds = [...new Set(data?.map(c => c.revision_id))]

    const [pages, revisions] = await Promise.all([
      this.getBatchPages(pageIds),
      this.getBatchRevisions(revisionIds)
    ])

    return data?.map(change => ({
      ...change,
      page: pages.find(p => p.id === change.page_id),
      revision: revisions.find(r => r.id === change.revision_id)
    })) || []
  }

  static async getBatchRevisions(revisionIds: string[]): Promise<PageRevision[]> {
    if (revisionIds.length === 0) return []

    const { data } = await supabase
      .from('page_revisions')
      .select('*')
      .in('id', revisionIds)

    if (!data) return []

    // Fetch authors
    const userIds = [...new Set(data.map(r => r.created_by).filter(Boolean))]
    const users = await this.getBatchUserProfiles(userIds)

    return data.map(revision => ({
      ...revision,
      author: users.find(u => u.id === revision.created_by)
    }))
  }

  static async reviewChange(
    changeId: string,
    status: 'approved' | 'rejected',
    reviewComment: string,
    reviewerId: string
  ): Promise<void> {
    const { data: change } = await supabase
      .from('pending_changes')
      .select('*, revision_id, page_id')
      .eq('id', changeId)
      .single()

    if (!change) throw new Error('Change not found')

    // Update change status
    await supabase
      .from('pending_changes')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment
      })
      .eq('id', changeId)

    if (status === 'approved') {
      // Get the revision
      const { data: revision } = await supabase
        .from('page_revisions')
        .select('*')
        .eq('id', change.revision_id)
        .single()

      if (revision) {
        // Apply changes to page
        await supabase
          .from('pages')
          .update({
            title: revision.title,
            slug: slugify(revision.title),
            content: revision.content
          })
          .eq('id', change.page_id)

        // Mark revision as approved
        await supabase
          .from('page_revisions')
          .update({
            is_approved: true,
            approved_by: reviewerId,
            approved_at: new Date().toISOString()
          })
          .eq('id', change.revision_id)

        // Invalidate related caches
        const { data: page } = await supabase
          .from('pages')
          .select('slug')
          .eq('id', change.page_id)
          .single()

        if (page) {
          cache.invalidate(page.slug)
        }
      }
    }

    // Clear caches
    cache.invalidate('recent-changes')
  }

  // Utility to check if page exists
  static async pageExists(slug: string): Promise<boolean> {
    const allSlugs = await this.getAllPageSlugs()
    return allSlugs.includes(slug)
  }

  // Clear all caches (for admin)
  static clearCache() {
    cache.clear()
  }
}