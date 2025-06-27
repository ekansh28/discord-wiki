// lib/wiki-api.ts
import { supabase } from './supabase'
import { Page, PageRevision, UserProfile, Category, PendingChange } from '@/types/wiki'
import { slugify } from './wiki-utils'

export class WikiAPI {
  // Pages
  static async getPage(slug: string): Promise<Page | null> {
    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        categories:page_categories(
          category:categories(*)
        )
      `)
      .eq('slug', slug)
      .single()

    if (error || !data) return null

    // Increment view count
    await supabase
      .from('pages')
      .update({ view_count: data.view_count + 1 })
      .eq('id', data.id)

    return {
      ...data,
      categories: data.categories?.map((pc: any) => pc.category) || []
    }
  }

  static async getAllPages(limit = 50, offset = 0): Promise<Page[]> {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('title')
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data || []
  }

  static async searchPages(query: string): Promise<Page[]> {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('title')
      .limit(20)

    if (error) throw error
    return data || []
  }

  static async createPage(title: string, content: string, editSummary: string, userId: string): Promise<Page> {
    const slug = slugify(title)

    // Check if page already exists
    const existing = await this.getPage(slug)
    if (existing) {
      throw new Error('Page already exists')
    }

    // Create page
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .insert({
        title,
        slug,
        content,
        created_by: userId
      })
      .select()
      .single()

    if (pageError) throw pageError

    // Create initial revision
    await this.createRevision(page.id, title, content, editSummary, userId, true)

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

    // Get current user profile to check admin status
    const profile = await this.getUserProfile(userId)
    const canDirectEdit = isAdmin || profile?.is_admin || profile?.is_moderator

    if (canDirectEdit) {
      // Admin/moderator can edit directly
      await supabase
        .from('pages')
        .update({ title, slug, content })
        .eq('id', pageId)

      await this.createRevision(pageId, title, content, editSummary, userId, true)
    } else {
      // Regular users create pending changes
      const revisionId = await this.createRevision(pageId, title, content, editSummary, userId, false)
      
      await supabase
        .from('pending_changes')
        .insert({
          page_id: pageId,
          revision_id: revisionId,
          status: 'pending'
        })
    }
  }

  // Page Revisions
  static async createRevision(
    pageId: string, 
    title: string, 
    content: string, 
    editSummary: string, 
    userId: string,
    isApproved = false
  ): Promise<string> {
    // Get next revision number
    const { data: latestRevision } = await supabase
      .from('page_revisions')
      .select('revision_number')
      .eq('page_id', pageId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .single()

    const revisionNumber = (latestRevision?.revision_number || 0) + 1

    const { data, error } = await supabase
      .from('page_revisions')
      .insert({
        page_id: pageId,
        title,
        content,
        edit_summary: editSummary,
        created_by: userId,
        revision_number: revisionNumber,
        is_approved: isApproved,
        approved_by: isApproved ? userId : null,
        approved_at: isApproved ? new Date().toISOString() : null
      })
      .select('id')
      .single()

    if (error) throw error

    // Update user edit count
    await supabase.rpc('increment_edit_count', { user_id: userId })

    return data.id
  }

  static async getPageRevisions(pageId: string): Promise<PageRevision[]> {
    const { data, error } = await supabase
      .from('page_revisions')
      .select(`
        *,
        author:user_profiles(*)
      `)
      .eq('page_id', pageId)
      .order('revision_number', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async getRevision(revisionId: string): Promise<PageRevision | null> {
    const { data, error } = await supabase
      .from('page_revisions')
      .select(`
        *,
        author:user_profiles(*)
      `)
      .eq('id', revisionId)
      .single()

    if (error) return null
    return data
  }

  // User Profiles
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) return null
    return data
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
  }

  // Categories
  static async getAllCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select(`
        *,
        page_count:page_categories(count)
      `)
      .order('name')

    if (error) throw error
    return data?.map(cat => ({
      ...cat,
      page_count: cat.page_count?.[0]?.count || 0
    })) || []
  }

  static async getCategoryPages(categorySlug: string): Promise<Page[]> {
    const { data, error } = await supabase
      .from('page_categories')
      .select(`
        page:pages(*)
      `)
      .eq('category.slug', categorySlug)

    if (error) throw error
    return data?.map((pc: any) => pc.page as Page).filter(Boolean) || []
  }

  static async createCategory(name: string, description: string, userId: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        description,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Admin Functions
  static async getPendingChanges(): Promise<PendingChange[]> {
    const { data, error } = await supabase
      .from('pending_changes')
      .select(`
        *,
        page:pages(*),
        revision:page_revisions(
          *,
          author:user_profiles(*)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async reviewChange(
    changeId: string, 
    status: 'approved' | 'rejected', 
    reviewComment: string,
    reviewerId: string
  ): Promise<void> {
    const { data: change, error: fetchError } = await supabase
      .from('pending_changes')
      .select(`
        *,
        revision:page_revisions(*)
      `)
      .eq('id', changeId)
      .single()

    if (fetchError) throw fetchError

    // Update pending change status
    await supabase
      .from('pending_changes')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment
      })
      .eq('id', changeId)

    if (status === 'approved' && change.revision) {
      // Apply the changes to the page
      await supabase
        .from('pages')
        .update({
          title: change.revision.title,
          slug: slugify(change.revision.title),
          content: change.revision.content
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
    }
  }

  // Recent Changes
  static async getRecentChanges(limit = 50): Promise<PageRevision[]> {
    const { data, error } = await supabase
      .from('page_revisions')
      .select(`
        *,
        author:user_profiles(*),
        page:pages!inner(title, slug)
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // Special Pages
  static async getPageStats(): Promise<{
    totalPages: number
    totalRevisions: number
    totalUsers: number
    totalCategories: number
  }> {
    const [pagesResult, revisionsResult, usersResult, categoriesResult] = await Promise.all([
      supabase.from('pages').select('id', { count: 'exact', head: true }),
      supabase.from('page_revisions').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true })
    ])

    return {
      totalPages: pagesResult.count || 0,
      totalRevisions: revisionsResult.count || 0,
      totalUsers: usersResult.count || 0,
      totalCategories: categoriesResult.count || 0
    }
  }
}

// Create the increment function in Supabase
/*
CREATE OR REPLACE FUNCTION increment_edit_count(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles 
  SET edit_count = edit_count + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
*/