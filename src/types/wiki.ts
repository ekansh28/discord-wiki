// types/wiki.ts
export interface Page {
  id: string
  title: string
  slug: string
  content: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  is_protected: boolean
  view_count: number
  categories?: Category[]
  latest_revision?: PageRevision
}

// Partial page interface for batch operations
export interface PageSummary {
  id: string
  title: string
  slug: string
}

export interface PageRevision {
  id: string
  page_id: string
  title: string
  content: string
  edit_summary: string | null
  created_at: string
  created_by: string | null
  revision_number: number
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  author?: UserProfile
  page?: Page | PageSummary
}

export interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  is_admin: boolean
  is_moderator: boolean
  bio: string | null
  avatar_url: string | null
  created_at: string
  edit_count: number
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
  created_by: string | null
  page_count?: number
}

export interface PendingChange {
  id: string
  page_id: string
  revision_id: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  review_comment: string | null
  created_at: string
  page?: Page | PageSummary
  revision?: PageRevision
  author?: UserProfile
}

export interface WikiLink {
  title: string
  slug: string
  exists: boolean
}

export interface TableOfContentsItem {
  id: string
  title: string
  level: number
  children?: TableOfContentsItem[]
}