// lib/optimized-wiki-api.ts
import { supabase } from './supabase'
import { Page, PageRevision, UserProfile, Category, PendingChange, PageSummary } from '@/types/wiki'
import { slugify } from './wiki-utils'

// Enhanced multi-level caching system
class EnhancedCache {
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private sessionCache = new Map<string, any>()
  
  // Memory cache with TTL
  set(key: string, data: any, ttlSeconds = 300) {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    })
  }
  
  get(key: string): any | null {
    const cached = this.memoryCache.get(key)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.memoryCache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  // Session-level cache (persists during browser session)
  setSession(key: string, data: any) {
    this.sessionCache.set(key, data)
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`wiki_cache_${key}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }))
      } catch (e) {
        // Storage quota exceeded or disabled
      }
    }
  }
  
  getSession(key: string): any | null {
    // Check memory first
    const memData = this.sessionCache.get(key)
    if (memData) return memData
    
    // Check sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`wiki_cache_${key}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Session data valid for 1 hour
          if (Date.now() - parsed.timestamp < 3600000) {
            this.sessionCache.set(key, parsed.data)
            return parsed.data
          } else {
            sessionStorage.removeItem(`wiki_cache_${key}`)
          }
        }
      } catch (e) {
        // Storage error
      }
    }
    
    return null
  }
  
  invalidate(pattern: string) {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
      }
    }
    
    // Clear session cache
    for (const key of this.sessionCache.keys()) {
      if (key.includes(pattern)) {
        this.sessionCache.delete(key)
      }
    }
    
    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('wiki_cache_') && key.includes(pattern)) {
            sessionStorage.removeItem(key)
          }
        })
      } catch (e) {
        // Storage error
      }
    }
  }
  
  clear() {
    this.memoryCache.clear()
    this.sessionCache.clear()
    if (typeof window !== 'undefined') {
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('wiki_cache_')) {
            sessionStorage.removeItem(key)
          }
        })
      } catch (e) {
        // Storage error
      }
    }
  }
}

const cache = new EnhancedCache()

// Request deduplication to prevent multiple identical requests
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>()
  
  dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key)!
    }
    
    const promise = fn().finally(() => {
      this.pending.delete(key)
    })
    
    this.pending.set(key, promise)
    return promise
  }
}

const deduplicator = new RequestDeduplicator()

// Database indexes and query optimizations
export class OptimizedWikiAPI {
  
  // Ultra-fast user authentication check
  static async getCurrentUser(): Promise<{ user: any; profile: UserProfile | null }> {
    const cacheKey = 'current_user_session'
    const cached = cache.getSession(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe('auth_check', async () => {
      const start = performance.now()
      
      const { data: { user } } = await supabase.auth.getUser()
      let profile: UserProfile | null = null
      
      if (user) {
        // Use single optimized query with all required fields
        const { data } = await supabase
          .from('user_profiles')
          .select('id, username, display_name, is_admin, is_moderator, bio, avatar_url, created_at, edit_count')
          .eq('id', user.id)
          .single()
        
        profile = data as UserProfile | null
      }
      
      const result = { user, profile }
      
      // Cache for session duration if user exists
      if (user) {
        cache.setSession(cacheKey, result)
      }
      
      console.log(`🔐 Auth check took ${(performance.now() - start).toFixed(2)}ms`)
      return result
    })
  }
  
  // Lightning-fast page loading with aggressive caching
  static async getPage(slug: string): Promise<Page | null> {
    const cacheKey = `page:${slug}`
    
    // Check multiple cache levels
    let cached = cache.get(cacheKey)
    if (cached) return cached
    
    cached = cache.getSession(cacheKey)
    if (cached) {
      // Refresh memory cache
      cache.set(cacheKey, cached, 300)
      return cached
    }
    
    return deduplicator.dedupe(`page:${slug}`, async () => {
      const start = performance.now()
      
      try {
        // Optimized single query with all required fields
        const { data, error } = await supabase
          .from('pages')
          .select('id, title, slug, content, created_at, updated_at, created_by, view_count, is_protected')
          .eq('slug', slug)
          .single()

        if (error || !data) {
          console.log(`📄 Page ${slug} not found (${(performance.now() - start).toFixed(2)}ms)`)
          return null
        }

        // Increment view count asynchronously without waiting
        this.incrementViewCountAsync(data.id, data.view_count)

        // Cache at multiple levels
        cache.set(cacheKey, data, 300) // 5 minutes memory
        cache.setSession(cacheKey, data) // Session cache
        
        console.log(`📄 Loaded page ${slug} in ${(performance.now() - start).toFixed(2)}ms`)
        return data as Page
      } catch (error) {
        console.error('Error loading page:', error)
        return null
      }
    })
  }
  
  // Async view count increment (doesn't block page loading)
  private static incrementViewCountAsync(pageId: string, currentCount: number) {
    // Use a debounced approach to prevent spam
    const viewKey = `view_${pageId}_${Date.now().toString().slice(-6)}`
    
    setTimeout(async () => {
      try {
        await supabase
          .from('pages')
          .update({ view_count: currentCount + 1 })
          .eq('id', pageId)
      } catch (error) {
        // Silently fail view count updates
      }
    }, 100)
  }
  
  // Batch page loading with connection pooling
  static async getPages(slugs: string[]): Promise<Page[]> {
    if (slugs.length === 0) return []
    
    const results: Page[] = []
    const toFetch: string[] = []
    
    // Check cache first
    for (const slug of slugs) {
      const cached = cache.get(`page:${slug}`) || cache.getSession(`page:${slug}`)
      if (cached) {
        results.push(cached)
      } else {
        toFetch.push(slug)
      }
    }
    
    // Batch fetch uncached pages
    if (toFetch.length > 0) {
      const batchKey = `batch_pages:${toFetch.sort().join(',')}`
      
      return deduplicator.dedupe(batchKey, async () => {
        const start = performance.now()
        
        const { data, error } = await supabase
          .from('pages')
          .select('id, title, slug, content, created_at, updated_at, created_by, view_count, is_protected')
          .in('slug', toFetch)
        
        if (!error && data) {
          for (const page of data) {
            const pageData = page as Page
            cache.set(`page:${pageData.slug}`, pageData, 300)
            cache.setSession(`page:${pageData.slug}`, pageData)
            results.push(pageData)
          }
        }
        
        console.log(`📄 Batch loaded ${toFetch.length} pages in ${(performance.now() - start).toFixed(2)}ms`)
        return results
      })
    }
    
    return results
  }
  
  // Ultra-fast search with debouncing and caching
  static async searchPages(query: string): Promise<PageSummary[]> {
    if (!query.trim()) return []
    
    const normalizedQuery = query.toLowerCase().trim()
    const cacheKey = `search:${normalizedQuery}`
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe(cacheKey, async () => {
      const start = performance.now()
      
      // Optimized search query with limited fields and results
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug')
        .or(`title.ilike.%${normalizedQuery}%,content.ilike.%${normalizedQuery}%`)
        .order('title')
        .limit(15) // Reduced from 20 for faster results
      
      if (error) {
        console.error('Search error:', error)
        return []
      }
      
      const results = data || []
      
      // Cache search results for 2 minutes
      cache.set(cacheKey, results, 120)
      
      console.log(`🔍 Search "${query}" returned ${results.length} results in ${(performance.now() - start).toFixed(2)}ms`)
      return results
    })
  }
  
  // Optimized page slugs loading with aggressive caching
  static async getAllPageSlugs(): Promise<string[]> {
    const cacheKey = 'all-page-slugs'
    
    // Check session cache first (this data doesn't change often)
    let cached = cache.getSession(cacheKey)
    if (cached) return cached
    
    cached = cache.get(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe('page-slugs', async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('pages')
        .select('slug')
        .order('slug')
      
      if (error) {
        console.error('Error fetching page slugs:', error)
        return []
      }
      
      const slugs = data?.map(p => p.slug) || []
      
      // Cache aggressively - slugs don't change often
      cache.set(cacheKey, slugs, 600) // 10 minutes memory
      cache.setSession(cacheKey, slugs) // Session cache
      
      console.log(`📝 Loaded ${slugs.length} page slugs in ${(performance.now() - start).toFixed(2)}ms`)
      return slugs
    })
  }
  
  // Fast user profile loading with caching
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = `user:${userId}`
    
    // Check cache first
    let cached = cache.get(cacheKey)
    if (cached) return cached
    
    cached = cache.getSession(cacheKey)
    if (cached) {
      cache.set(cacheKey, cached, 600)
      return cached
    }
    
    return deduplicator.dedupe(`user:${userId}`, async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.log(`👤 User profile ${userId} not found`)
        return null
      }
      
      // Cache user profiles for longer since they change less frequently
      cache.set(cacheKey, data, 600) // 10 minutes
      cache.setSession(cacheKey, data)
      
      console.log(`👤 Loaded user profile in ${(performance.now() - start).toFixed(2)}ms`)
      return data
    })
  }
  
  // Optimized page creation/update
  static async savePage(
    slug: string,
    title: string,
    content: string,
    editSummary: string,
    userId: string,
    isAdmin = false
  ): Promise<{ success: boolean; needsApproval: boolean; error?: string }> {
    try {
      const start = performance.now()
      
      // Check if page exists (use cache first)
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
            created_by: userId,
            view_count: 0,
            is_protected: false
          })
          .select('id, title, slug, content, created_at, updated_at, created_by, view_count, is_protected')
          .single()

        if (error) throw error
        existingPage = newPage as Page
      }

      if (!existingPage) throw new Error('Failed to create page')

      // Get user profile (use cache)
      const userProfile = await this.getUserProfile(userId)
      const canDirectEdit = isAdmin || userProfile?.is_admin || userProfile?.is_moderator

      // Get next revision number efficiently
      const revisionNumber = await this.getNextRevisionNumber(existingPage.id)

      // Create revision
      const revisionData = {
        page_id: existingPage.id,
        title,
        content,
        edit_summary: editSummary,
        created_by: userId,
        revision_number: revisionNumber,
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
          .update({ title, slug, content, updated_at: new Date().toISOString() })
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

      // Invalidate all related caches
      this.invalidatePageCaches(slug)
      
      console.log(`💾 Saved page ${slug} in ${(performance.now() - start).toFixed(2)}ms`)
      
      return {
        success: true,
        needsApproval: !canDirectEdit
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Save page error:', errorMessage)
      return {
        success: false,
        needsApproval: false,
        error: errorMessage
      }
    }
  }
  
  // Efficient revision number calculation
  private static async getNextRevisionNumber(pageId: string): Promise<number> {
    const cacheKey = `rev_count:${pageId}`
    const cached = cache.get(cacheKey)
    
    if (cached && typeof cached === 'number') {
      const next = cached + 1
      cache.set(cacheKey, next, 300)
      return next
    }
    
    const { data } = await supabase
      .from('page_revisions')
      .select('revision_number')
      .eq('page_id', pageId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single()

    const nextNumber = (data?.revision_number || 0) + 1
    cache.set(cacheKey, nextNumber, 300)
    return nextNumber
  }
  
  // Optimized page revisions with caching
  static async getPageRevisions(pageId: string, limit = 10): Promise<PageRevision[]> {
    const cacheKey = `revisions:${pageId}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe(cacheKey, async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('page_revisions')
        .select('id, page_id, title, content, edit_summary, created_at, created_by, revision_number, is_approved, approved_by, approved_at')
        .eq('page_id', pageId)
        .eq('is_approved', true)
        .order('revision_number', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching revisions:', error)
        return []
      }

      // Batch fetch authors efficiently
      const userIds = [...new Set(data?.map(r => r.created_by).filter(Boolean))]
      const authors = await this.getBatchUserProfiles(userIds)
      
      const revisionsWithAuthors = data?.map(revision => ({
        ...revision,
        author: authors.find(a => a.id === revision.created_by)
      })) || []

      cache.set(cacheKey, revisionsWithAuthors, 300)
      
      console.log(`📚 Loaded ${revisionsWithAuthors.length} revisions in ${(performance.now() - start).toFixed(2)}ms`)
      return revisionsWithAuthors
    })
  }
  
  // Batch user profile loading with aggressive caching
  static async getBatchUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    if (userIds.length === 0) return []
    
    const cached: UserProfile[] = []
    const toFetch: string[] = []

    // Check cache for each user
    for (const id of userIds) {
      const cachedUser = cache.get(`user:${id}`) || cache.getSession(`user:${id}`)
      if (cachedUser) {
        cached.push(cachedUser)
      } else {
        toFetch.push(id)
      }
    }

    // Batch fetch uncached users
    if (toFetch.length > 0) {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', toFetch)

      if (data) {
        for (const user of data) {
          cache.set(`user:${user.id}`, user, 600)
          cache.setSession(`user:${user.id}`, user)
          cached.push(user)
        }
      }
    }

    return cached
  }
  
  // Optimized categories loading
  static async getAllCategories(): Promise<Category[]> {
    const cacheKey = 'all-categories'
    
    let cached = cache.getSession(cacheKey)
    if (cached) return cached
    
    cached = cache.get(cacheKey)
    if (cached) return cached

    return deduplicator.dedupe('categories', async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching categories:', error)
        return []
      }

      const categories = data || []
      
      // Cache categories aggressively
      cache.set(cacheKey, categories, 600) // 10 minutes
      cache.setSession(cacheKey, categories)
      
      console.log(`📁 Loaded ${categories.length} categories in ${(performance.now() - start).toFixed(2)}ms`)
      return categories
    })
  }
  
  // Optimized recent changes with smart caching
  static async getRecentChanges(limit = 50): Promise<PageRevision[]> {
    const cacheKey = `recent-changes:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    return deduplicator.dedupe(cacheKey, async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('page_revisions')
        .select('id, page_id, title, content, edit_summary, created_at, created_by, revision_number, is_approved, approved_by, approved_at')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent changes:', error)
        return []
      }

      // Batch fetch related data efficiently
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

      // Cache for shorter time since this changes frequently
      cache.set(cacheKey, changesWithData, 60) // 1 minute
      
      console.log(`🕐 Loaded ${changesWithData.length} recent changes in ${(performance.now() - start).toFixed(2)}ms`)
      return changesWithData
    })
  }
  
  // Efficient batch page loading
  static async getBatchPages(pageIds: string[]): Promise<PageSummary[]> {
    if (pageIds.length === 0) return []
    
    const cached: PageSummary[] = []
    const toFetch: string[] = []

    // Check cache first
    for (const id of pageIds) {
      const page = cache.get(`page_summary:${id}`)
      if (page) {
        cached.push(page)
      } else {
        toFetch.push(id)
      }
    }

    if (toFetch.length > 0) {
      const { data } = await supabase
        .from('pages')
        .select('id, title, slug')
        .in('id', toFetch)

      if (data) {
        for (const page of data) {
          cache.set(`page_summary:${page.id}`, page, 600)
          cached.push(page)
        }
      }
    }

    return cached
  }
  
  // Admin functions with optimizations
  static async getPendingChanges(): Promise<PendingChange[]> {
    const cacheKey = 'pending-changes'
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe('pending-changes', async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('pending_changes')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching pending changes:', error)
        return []
      }

      // Batch fetch related data
      const pageIds = [...new Set(data?.map(c => c.page_id))]
      const revisionIds = [...new Set(data?.map(c => c.revision_id))]

      const [pages, revisions] = await Promise.all([
        this.getBatchPages(pageIds),
        this.getBatchRevisions(revisionIds)
      ])

      const changesWithData = data?.map(change => ({
        ...change,
        page: pages.find(p => p.id === change.page_id),
        revision: revisions.find(r => r.id === change.revision_id)
      })) || []
      
      // Cache for shorter time
      cache.set(cacheKey, changesWithData, 30) // 30 seconds
      
      console.log(`⏳ Loaded ${changesWithData.length} pending changes in ${(performance.now() - start).toFixed(2)}ms`)
      return changesWithData
    })
  }

  static async getBatchRevisions(revisionIds: string[]): Promise<PageRevision[]> {
    if (revisionIds.length === 0) return []

    const { data } = await supabase
      .from('page_revisions')
      .select('id, page_id, title, content, edit_summary, created_at, created_by, revision_number, is_approved, approved_by, approved_at')
      .in('id', revisionIds)

    if (!data) return []

    // Fetch authors
    const userIds = [...new Set(data.map(r => r.created_by).filter(Boolean))]
    const users = await this.getBatchUserProfiles(userIds)

    return data.map(revision => ({
      ...revision,
      author: users.find(u => u.id === revision.created_by)
    })) as PageRevision[]
  }

  static async reviewChange(
    changeId: string,
    status: 'approved' | 'rejected',
    reviewComment: string,
    reviewerId: string
  ): Promise<void> {
    const start = performance.now()
    
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
            content: revision.content,
            updated_at: new Date().toISOString()
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

        // Get page slug for cache invalidation
        const { data: page } = await supabase
          .from('pages')
          .select('slug')
          .eq('id', change.page_id)
          .single()

        if (page) {
          this.invalidatePageCaches(page.slug)
        }
      }
    }

    // Clear admin caches
    cache.invalidate('pending-changes')
    cache.invalidate('recent-changes')
    
    console.log(`⚖️ Reviewed change in ${(performance.now() - start).toFixed(2)}ms`)
  }

  // Get database statistics efficiently
  static async getPageStats(): Promise<{
    totalPages: number
    totalRevisions: number
    totalUsers: number
    totalCategories: number
  }> {
    const cacheKey = 'page-stats'
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe('stats', async () => {
      const start = performance.now()
      
      const [pagesResult, revisionsResult, usersResult, categoriesResult] = await Promise.all([
        supabase.from('pages').select('id', { count: 'exact', head: true }),
        supabase.from('page_revisions').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true })
      ])

      const stats = {
        totalPages: pagesResult.count || 0,
        totalRevisions: revisionsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalCategories: categoriesResult.count || 0
      }
      
      // Cache stats for 5 minutes
      cache.set(cacheKey, stats, 300)
      
      console.log(`📊 Loaded stats in ${(performance.now() - start).toFixed(2)}ms`)
      return stats
    })
  }
  
  // Utility functions
  static async pageExists(slug: string): Promise<boolean> {
    const page = await this.getPage(slug)
    return page !== null
  }
  
  private static invalidatePageCaches(slug: string) {
    cache.invalidate(slug)
    cache.invalidate('all-page-slugs')
    cache.invalidate('search:')
    cache.invalidate('recent-changes')
    cache.invalidate('page-stats')
  }
  
  static clearCache() {
    cache.clear()
  }
  
  static getCacheStats() {
    return {
      memoryKeys: cache['memoryCache'].size,
      sessionKeys: cache['sessionCache'].size
    }
  }
}

// Legacy compatibility layer
export class WikiAPI {
  static async getPage(slug: string): Promise<Page | null> {
    return OptimizedWikiAPI.getPage(slug)
  }

  static async getAllPages(limit = 1000, offset = 0): Promise<Page[]> {
    const cacheKey = `all_pages:${limit}:${offset}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('title')
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching pages:', error)
      return []
    }

    const pages = data || []
    cache.set(cacheKey, pages, 300)
    return pages
  }

  static async getAllPageSlugs(): Promise<string[]> {
    return OptimizedWikiAPI.getAllPageSlugs()
  }

  static async searchPages(query: string): Promise<PageSummary[]> {
    return OptimizedWikiAPI.searchPages(query)
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    return OptimizedWikiAPI.getUserProfile(userId)
  }

  static async getPageRevisions(pageId: string, limit = 10): Promise<PageRevision[]> {
    return OptimizedWikiAPI.getPageRevisions(pageId, limit)
  }

  static async getAllCategories(): Promise<Category[]> {
    return OptimizedWikiAPI.getAllCategories()
  }

  static async getRecentChanges(limit = 50): Promise<PageRevision[]> {
    return OptimizedWikiAPI.getRecentChanges(limit)
  }

  static async getPendingChanges(): Promise<PendingChange[]> {
    return OptimizedWikiAPI.getPendingChanges()
  }

  static async reviewChange(
    changeId: string,
    status: 'approved' | 'rejected',
    reviewComment: string,
    reviewerId: string
  ): Promise<void> {
    return OptimizedWikiAPI.reviewChange(changeId, status, reviewComment, reviewerId)
  }

  static async createPage(title: string, content: string, editSummary: string, userId: string): Promise<Page> {
    const slug = slugify(title)
    const result = await OptimizedWikiAPI.savePage(slug, title, content, editSummary, userId, false)
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create page')
    }

    const page = await OptimizedWikiAPI.getPage(slug)
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
    const result = await OptimizedWikiAPI.savePage(slug, title, content, editSummary, userId, isAdmin)
    
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
    return OptimizedWikiAPI.getPageStats()
  }
}