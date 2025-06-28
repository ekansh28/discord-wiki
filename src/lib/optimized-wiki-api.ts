// lib/optimized-wiki-api.ts
import { supabase } from './supabase'
import { Page, PageRevision, UserProfile, Category, PendingChange, PageSummary } from '@/types/wiki'
import { slugify } from './wiki-utils'

// Enhanced multi-level caching system
class EnhancedCache {
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private sessionCache = new Map<string, any>()
  
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
    const memData = this.sessionCache.get(key)
    if (memData) return memData
    
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`wiki_cache_${key}`)
        if (stored) {
          const parsed = JSON.parse(stored)
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
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
      }
    }
    
    for (const key of this.sessionCache.keys()) {
      if (key.includes(pattern)) {
        this.sessionCache.delete(key)
      }
    }
    
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

// Page ownership tracking
interface PageOwnership {
  pageId: string
  ownerId: string
  serverName?: string
  createdAt: string
}

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
        const { data } = await supabase
          .from('user_profiles')
          .select('id, username, display_name, is_admin, is_moderator, bio, avatar_url, created_at, edit_count')
          .eq('id', user.id)
          .single()
        
        profile = data as UserProfile | null
      }
      
      const result = { user, profile }
      
      if (user) {
        cache.setSession(cacheKey, result)
      }
      
      console.log(`🔐 Auth check took ${(performance.now() - start).toFixed(2)}ms`)
      return result
    })
  }
  
  // Check if user can edit a specific page
  static async canUserEditPage(pageId: string, userId: string): Promise<{
    canEdit: boolean
    needsApproval: boolean
    reason?: string
  }> {
    try {
      const userProfile = await this.getUserProfile(userId)
      if (!userProfile) {
        return { canEdit: false, needsApproval: false, reason: 'User not found' }
      }

      // Site admins can edit everything
      if (userProfile.is_admin) {
        return { canEdit: true, needsApproval: false }
      }

      // Site moderators can edit everything with approval
      if (userProfile.is_moderator) {
        return { canEdit: true, needsApproval: true }
      }

      // Check if user created this page
      const { data: page } = await supabase
        .from('pages')
        .select('created_by, title')
        .eq('id', pageId)
        .single()

      if (page?.created_by === userId) {
        return { canEdit: true, needsApproval: false }
      }

      // Check if this is a Discord server page the user owns
      if (page?.title && this.isDiscordServerPage(page.title)) {
        const serverName = this.extractServerNameFromTitle(page.title)
        const userOwnsServer = await this.userOwnsDiscordServer(userId, serverName)
        
        if (userOwnsServer) {
          return { canEdit: true, needsApproval: false }
        }
      }

      // Regular users need approval for other pages
      return { canEdit: true, needsApproval: true }
    } catch (error) {
      console.error('Error checking edit permissions:', error)
      return { canEdit: false, needsApproval: false, reason: 'Permission check failed' }
    }
  }

  // Check if user can create pages without approval
  static async canUserCreateWithoutApproval(userId: string, title: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId)
      if (!userProfile) return false

      // Site admins and moderators can create without approval
      if (userProfile.is_admin || userProfile.is_moderator) {
        return true
      }

      // Users can create their own user pages without approval
      if (title.toLowerCase().startsWith('user:')) {
        const userName = title.substring(5).toLowerCase()
        return userName === userProfile.username?.toLowerCase() || 
               userName === userProfile.display_name?.toLowerCase()
      }

      // Users can create Discord server pages without approval
      if (this.isDiscordServerPage(title)) {
        return true
      }

      return false
    } catch (error) {
      console.error('Error checking creation permissions:', error)
      return false
    }
  }

  private static isDiscordServerPage(title: string): boolean {
    const lowerTitle = title.toLowerCase()
    return lowerTitle.includes('discord') && 
           (lowerTitle.includes('server') || lowerTitle.includes('guild'))
  }

  private static extractServerNameFromTitle(title: string): string {
    // Extract server name from titles like "ServerName Discord Server" or "Discord Server: ServerName"
    return title.replace(/discord/gi, '').replace(/server/gi, '').replace(/guild/gi, '').trim()
  }

  private static async userOwnsDiscordServer(userId: string, serverName: string): Promise<boolean> {
    // This would check against a table of server ownerships
    // For now, we'll assume the user owns servers they create pages for
    return Promise.resolve(true)
  }

  // Lightning-fast page loading with aggressive caching
  static async getPage(slug: string): Promise<Page | null> {
    const cacheKey = `page:${slug}`
    
    let cached = cache.get(cacheKey)
    if (cached) return cached
    
    cached = cache.getSession(cacheKey)
    if (cached) {
      cache.set(cacheKey, cached, 300)
      return cached
    }
    
    return deduplicator.dedupe(`page:${slug}`, async () => {
      const start = performance.now()
      
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('id, title, slug, content, created_at, updated_at, created_by, view_count, is_protected')
          .eq('slug', slug)
          .single()

        if (error || !data) {
          console.log(`📄 Page ${slug} not found (${(performance.now() - start).toFixed(2)}ms)`)
          return null
        }

        this.incrementViewCountAsync(data.id, data.view_count)

        cache.set(cacheKey, data, 300)
        cache.setSession(cacheKey, data)
        
        console.log(`📄 Loaded page ${slug} in ${(performance.now() - start).toFixed(2)}ms`)
        return data as Page
      } catch (error) {
        console.error('Error loading page:', error)
        return null
      }
    })
  }
  
  private static incrementViewCountAsync(pageId: string, currentCount: number) {
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

  // Enhanced save page with proper permissions
  static async savePage(
    slug: string,
    title: string,
    content: string,
    editSummary: string,
    userId: string,
    forceApprove = false
  ): Promise<{ success: boolean; needsApproval: boolean; error?: string; pageId?: string }> {
    try {
      const start = performance.now()
      
      // Check if page exists
      let existingPage = await this.getPage(slug)
      const isNewPage = !existingPage

      if (isNewPage) {
        // Create new page
        const canCreateWithoutApproval = await this.canUserCreateWithoutApproval(userId, title)
        
        const { data: newPage, error } = await supabase
          .from('pages')
          .insert({
            title,
            slug,
            content: canCreateWithoutApproval || forceApprove ? content : '',
            created_by: userId,
            view_count: 0,
            is_protected: false,
            updated_at: new Date().toISOString()
          })
          .select('id, title, slug, content, created_at, updated_at, created_by, view_count, is_protected')
          .single()

        if (error) throw error
        existingPage = newPage as Page

        // If user can create without approval or force approve, we're done
        if (canCreateWithoutApproval || forceApprove) {
          const revisionNumber = 1
          await this.createRevision(existingPage.id, title, content, editSummary, userId, revisionNumber, true, userId)
          
          this.invalidatePageCaches(slug)
          console.log(`💾 Created page ${slug} in ${(performance.now() - start).toFixed(2)}ms`)
          
          return {
            success: true,
            needsApproval: false,
            pageId: existingPage.id
          }
        }
      } else {
        // Editing existing page
        if (!existingPage) {
          return {
            success: false,
            needsApproval: false,
            error: 'Page not found'
          }
        }
        
        const editPermissions = await this.canUserEditPage(existingPage.id, userId)
        
        if (!editPermissions.canEdit) {
          return {
            success: false,
            needsApproval: false,
            error: editPermissions.reason || 'You do not have permission to edit this page'
          }
        }

        // If user can edit without approval or force approve, apply changes immediately
        if (!editPermissions.needsApproval || forceApprove) {
          await supabase
            .from('pages')
            .update({ 
              title, 
              slug, 
              content, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingPage.id)

          const revisionNumber = await this.getNextRevisionNumber(existingPage.id)
          await this.createRevision(existingPage.id, title, content, editSummary, userId, revisionNumber, true, userId)
          
          this.invalidatePageCaches(slug)
          console.log(`💾 Updated page ${slug} in ${(performance.now() - start).toFixed(2)}ms`)
          
          return {
            success: true,
            needsApproval: false,
            pageId: existingPage.id
          }
        }
      }

      // Create revision for approval
      if (!existingPage) throw new Error('Page creation failed')
      
      const revisionNumber = await this.getNextRevisionNumber(existingPage.id)
      const revision = await this.createRevision(existingPage.id, title, content, editSummary, userId, revisionNumber, false)

      // Create pending change
      await supabase
        .from('pending_changes')
        .insert({
          page_id: existingPage.id,
          revision_id: revision.id,
          status: 'pending'
        })

      this.invalidatePageCaches('pending-changes')
      
      console.log(`💾 Submitted page ${slug} for approval in ${(performance.now() - start).toFixed(2)}ms`)
      
      return {
        success: true,
        needsApproval: true,
        pageId: existingPage.id
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

  private static async createRevision(
    pageId: string,
    title: string,
    content: string,
    editSummary: string,
    userId: string,
    revisionNumber: number,
    isApproved = false,
    approvedBy?: string
  ): Promise<PageRevision> {
    const revisionData = {
      page_id: pageId,
      title,
      content,
      edit_summary: editSummary,
      created_by: userId,
      revision_number: revisionNumber,
      is_approved: isApproved,
      approved_by: approvedBy || null,
      approved_at: isApproved ? new Date().toISOString() : null
    }

    const { data: revision, error } = await supabase
      .from('page_revisions')
      .insert(revisionData)
      .select()
      .single()

    if (error) throw error
    return revision as PageRevision
  }

  // Enhanced review function that properly updates pages
  static async reviewChange(
    changeId: string,
    status: 'approved' | 'rejected',
    reviewComment: string,
    reviewerId: string
  ): Promise<void> {
    const start = performance.now()
    
    try {
      // Get the pending change with related data
      const { data: change, error: changeError } = await supabase
        .from('pending_changes')
        .select(`
          id,
          page_id,
          revision_id,
          status,
          page_revisions (
            id,
            title,
            content,
            edit_summary,
            created_by,
            revision_number
          )
        `)
        .eq('id', changeId)
        .single()

      if (changeError || !change) {
        throw new Error('Pending change not found')
      }

      const revision = change.page_revisions as any

      // Update the pending change status
      const { error: updateError } = await supabase
        .from('pending_changes')
        .update({
          status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_comment: reviewComment
        })
        .eq('id', changeId)

      if (updateError) throw updateError

      if (status === 'approved' && revision) {
        // Apply the changes to the page
        const { error: pageUpdateError } = await supabase
          .from('pages')
          .update({
            title: revision.title,
            slug: slugify(revision.title),
            content: revision.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', change.page_id)

        if (pageUpdateError) throw pageUpdateError

        // Mark the revision as approved
        const { error: revisionUpdateError } = await supabase
          .from('page_revisions')
          .update({
            is_approved: true,
            approved_by: reviewerId,
            approved_at: new Date().toISOString()
          })
          .eq('id', change.revision_id)

        if (revisionUpdateError) throw revisionUpdateError

        // Get the page slug for cache invalidation
        const { data: page } = await supabase
          .from('pages')
          .select('slug')
          .eq('id', change.page_id)
          .single()

        if (page) {
          this.invalidatePageCaches(page.slug)
        }
      }

      // Clear admin caches
      cache.invalidate('pending-changes')
      cache.invalidate('recent-changes')
      cache.invalidate('page-stats')
      
      console.log(`⚖️ Reviewed change ${changeId} (${status}) in ${(performance.now() - start).toFixed(2)}ms`)
    } catch (error) {
      console.error('Error reviewing change:', error)
      throw error
    }
  }

  // Revert page to a specific revision
  static async revertPageToRevision(
    pageId: string,
    revisionId: string,
    revertReason: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the target revision
      const { data: revision, error: revisionError } = await supabase
        .from('page_revisions')
        .select('title, content, revision_number')
        .eq('id', revisionId)
        .eq('page_id', pageId)
        .eq('is_approved', true)
        .single()

      if (revisionError || !revision) {
        return { success: false, error: 'Revision not found or not approved' }
      }

      // Update the page
      const { error: pageUpdateError } = await supabase
        .from('pages')
        .update({
          title: revision.title,
          content: revision.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId)

      if (pageUpdateError) throw pageUpdateError

      // Create a new revision for the revert
      const nextRevisionNumber = await this.getNextRevisionNumber(pageId)
      const revertEditSummary = `Reverted to revision ${revision.revision_number}: ${revertReason}`
      
      await this.createRevision(
        pageId,
        revision.title,
        revision.content,
        revertEditSummary,
        userId,
        nextRevisionNumber,
        true,
        userId
      )

      // Get page slug for cache invalidation
      const { data: page } = await supabase
        .from('pages')
        .select('slug')
        .eq('id', pageId)
        .single()

      if (page) {
        this.invalidatePageCaches(page.slug)
      }

      return { success: true }
    } catch (error) {
      console.error('Error reverting page:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Delete a page (admin only)
  static async deletePage(pageId: string, reason: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userProfile = await this.getUserProfile(userId)
      if (!userProfile?.is_admin) {
        return { success: false, error: 'Only administrators can delete pages' }
      }

      // Get page info before deletion
      const { data: page } = await supabase
        .from('pages')
        .select('slug, title')
        .eq('id', pageId)
        .single()

      if (!page) {
        return { success: false, error: 'Page not found' }
      }

      // Delete pending changes first
      await supabase
        .from('pending_changes')
        .delete()
        .eq('page_id', pageId)

      // Delete revisions
      await supabase
        .from('page_revisions')
        .delete()
        .eq('page_id', pageId)

      // Delete the page
      const { error: deleteError } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)

      if (deleteError) throw deleteError

      // Invalidate caches
      this.invalidatePageCaches(page.slug)
      cache.invalidate('all-page-slugs')
      cache.invalidate('page-stats')

      console.log(`🗑️ Deleted page ${page.title} (${page.slug})`)
      return { success: true }
    } catch (error) {
      console.error('Error deleting page:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Get next revision number efficiently
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

  // All other methods remain the same...
  static async getAllPageSlugs(): Promise<string[]> {
    const cacheKey = 'all-page-slugs'
    
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
      
      cache.set(cacheKey, slugs, 600)
      cache.setSession(cacheKey, slugs)
      
      console.log(`📝 Loaded ${slugs.length} page slugs in ${(performance.now() - start).toFixed(2)}ms`)
      return slugs
    })
  }

  static async searchPages(query: string): Promise<PageSummary[]> {
    if (!query.trim()) return []
    
    const normalizedQuery = query.toLowerCase().trim()
    const cacheKey = `search:${normalizedQuery}`
    
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe(cacheKey, async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug')
        .or(`title.ilike.%${normalizedQuery}%,content.ilike.%${normalizedQuery}%`)
        .order('title')
        .limit(15)
      
      if (error) {
        console.error('Search error:', error)
        return []
      }
      
      const results = data || []
      cache.set(cacheKey, results, 120)
      
      console.log(`🔍 Search "${query}" returned ${results.length} results in ${(performance.now() - start).toFixed(2)}ms`)
      return results
    })
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = `user:${userId}`
    
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
      
      cache.set(cacheKey, data, 600)
      cache.setSession(cacheKey, data)
      
      console.log(`👤 Loaded user profile in ${(performance.now() - start).toFixed(2)}ms`)
      return data
    })
  }

  // Optimized pending changes with real-time updates
  static async getPendingChanges(): Promise<PendingChange[]> {
    const cacheKey = 'pending-changes'
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe('pending-changes', async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('pending_changes')
        .select(`
          *,
          pages!inner(id, title, slug),
          page_revisions!inner(
            id,
            title,
            content,
            edit_summary,
            created_by,
            revision_number,
            created_at,
            user_profiles!page_revisions_created_by_fkey(display_name, username)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching pending changes:', error)
        return []
      }

      const changesWithData = data?.map(change => ({
        ...change,
        page: change.pages,
        revision: {
          ...change.page_revisions,
          author: change.page_revisions.user_profiles
        }
      })) || []
      
      // Cache for shorter time since this changes frequently
      cache.set(cacheKey, changesWithData, 30)
      
      console.log(`⏳ Loaded ${changesWithData.length} pending changes in ${(performance.now() - start).toFixed(2)}ms`)
      return changesWithData
    })
  }

  static async getRecentChanges(limit = 50): Promise<PageRevision[]> {
    const cacheKey = `recent-changes:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    return deduplicator.dedupe(cacheKey, async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('page_revisions')
        .select(`
          *,
          pages!inner(id, title, slug),
          user_profiles!page_revisions_created_by_fkey(display_name, username, avatar_url)
        `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent changes:', error)
        return []
      }

      const changesWithData = data?.map(revision => ({
        ...revision,
        author: revision.user_profiles,
        page: revision.pages
      })) || []

      // Cache for shorter time since this changes frequently
      cache.set(cacheKey, changesWithData, 60)
      
      console.log(`🕐 Loaded ${changesWithData.length} recent changes in ${(performance.now() - start).toFixed(2)}ms`)
      return changesWithData
    })
  }

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
      
      cache.set(cacheKey, categories, 600)
      cache.setSession(cacheKey, categories)
      
      console.log(`📁 Loaded ${categories.length} categories in ${(performance.now() - start).toFixed(2)}ms`)
      return categories
    })
  }

  static async getPageRevisions(pageId: string, limit = 10): Promise<PageRevision[]> {
    const cacheKey = `revisions:${pageId}:${limit}`
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    return deduplicator.dedupe(cacheKey, async () => {
      const start = performance.now()
      
      const { data, error } = await supabase
        .from('page_revisions')
        .select(`
          *,
          user_profiles!page_revisions_created_by_fkey(display_name, username, avatar_url)
        `)
        .eq('page_id', pageId)
        .eq('is_approved', true)
        .order('revision_number', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching revisions:', error)
        return []
      }

      const revisionsWithAuthors = data?.map(revision => ({
        ...revision,
        author: revision.user_profiles
      })) || []

      cache.set(cacheKey, revisionsWithAuthors, 300)
      
      console.log(`📚 Loaded ${revisionsWithAuthors.length} revisions in ${(performance.now() - start).toFixed(2)}ms`)
      return revisionsWithAuthors
    })
  }

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
      
      cache.set(cacheKey, stats, 300)
      
      console.log(`📊 Loaded stats in ${(performance.now() - start).toFixed(2)}ms`)
      return stats
    })
  }
  
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
    cache.invalidate('pending-changes')
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

// Legacy compatibility layer with improved functionality
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

  // Additional methods for admin functionality
  static async revertPage(
    pageId: string,
    revisionId: string,
    reason: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return OptimizedWikiAPI.revertPageToRevision(pageId, revisionId, reason, userId)
  }

  static async deletePage(
    pageId: string,
    reason: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return OptimizedWikiAPI.deletePage(pageId, reason, userId)
  }

  static async canUserEdit(pageId: string, userId: string) {
    return OptimizedWikiAPI.canUserEditPage(pageId, userId)
  }
}