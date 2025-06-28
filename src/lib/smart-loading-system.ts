// lib/smart-loading-system.ts
import { Page, UserProfile, PageSummary } from '@/types/wiki'

// Smart localStorage manager with compression and expiry
class SmartStorage {
  private static compress(data: any): string {
    try {
      return JSON.stringify(data)
    } catch {
      return ''
    }
  }

  private static decompress(data: string): any {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  static set(key: string, data: any, ttlMinutes = 60): void {
    if (typeof window === 'undefined') return
    
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000
      }
      localStorage.setItem(`ballscord_${key}`, this.compress(item))
    } catch (error) {
      // Storage quota exceeded, clear old items
      this.cleanup()
      try {
        const item = {
          data,
          timestamp: Date.now(),
          ttl: ttlMinutes * 60 * 1000
        }
        localStorage.setItem(`ballscord_${key}`, this.compress(item))
      } catch {
        // Still failing, ignore
      }
    }
  }

  static get(key: string): any {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(`ballscord_${key}`)
      if (!stored) return null

      const item = this.decompress(stored)
      if (!item) return null

      // Check if expired
      if (Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(`ballscord_${key}`)
        return null
      }

      return item.data
    } catch {
      return null
    }
  }

  static cleanup(): void {
    if (typeof window === 'undefined') return
    
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('ballscord_')) {
          const stored = localStorage.getItem(key)
          if (stored) {
            const item = this.decompress(stored)
            if (item && Date.now() - item.timestamp > item.ttl) {
              localStorage.removeItem(key)
            }
          }
        }
      })
    } catch {
      // Ignore cleanup errors
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return
    
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('ballscord_')) {
          localStorage.removeItem(key)
        }
      })
    } catch {
      // Ignore clear errors
    }
  }
}

// Skeleton content generator for instant loading illusion
class SkeletonGenerator {
  static generatePageSkeleton(title?: string): string {
    return `
      <div class="skeleton-content" style="animation: pulse 1.5s infinite;">
        <h1 style="color: #ff6666; margin-bottom: 20px;">
          ${title || 'Loading Page...'}
        </h1>
        
        <div class="skeleton-paragraph" style="
          height: 16px; 
          background: linear-gradient(90deg, #333 25%, #555 50%, #333 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          margin-bottom: 12px;
          border-radius: 2px;
        "></div>
        
        <div class="skeleton-paragraph" style="
          height: 16px; 
          background: linear-gradient(90deg, #333 25%, #555 50%, #333 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          margin-bottom: 12px;
          border-radius: 2px;
          width: 85%;
        "></div>
        
        <div class="skeleton-paragraph" style="
          height: 16px; 
          background: linear-gradient(90deg, #333 25%, #555 50%, #333 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          margin-bottom: 20px;
          border-radius: 2px;
          width: 70%;
        "></div>
        
        <div class="skeleton-infobox" style="
          width: 250px;
          height: 200px;
          float: right;
          margin: 0 0 15px 15px;
          background: linear-gradient(90deg, #222 25%, #444 50%, #222 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          border: 1px solid #666;
          border-radius: 4px;
        "></div>
        
        <div class="skeleton-paragraph" style="
          height: 16px; 
          background: linear-gradient(90deg, #333 25%, #555 50%, #333 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          margin-bottom: 12px;
          border-radius: 2px;
        "></div>
        
        <div class="skeleton-paragraph" style="
          height: 16px; 
          background: linear-gradient(90deg, #333 25%, #555 50%, #333 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          margin-bottom: 12px;
          border-radius: 2px;
          width: 90%;
        "></div>
      </div>
      
      <style>
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      </style>
    `
  }

  static generateSearchSkeleton(): PageSummary[] {
    return [
      { id: 'skeleton-1', title: 'Loading search results...', slug: 'loading-1' },
      { id: 'skeleton-2', title: 'Finding relevant pages...', slug: 'loading-2' },
      { id: 'skeleton-3', title: 'Preparing results...', slug: 'loading-3' }
    ]
  }
}

// Background preloader for seamless navigation
class BackgroundPreloader {
  private static preloadQueue: Set<string> = new Set()
  private static isPreloading = false

  static async preloadPage(slug: string): Promise<void> {
    if (this.preloadQueue.has(slug)) return
    
    this.preloadQueue.add(slug)
    
    if (this.isPreloading) return
    this.isPreloading = true

    try {
      // Check if already cached
      const cached = SmartStorage.get(`page_${slug}`)
      if (cached) {
        this.preloadQueue.delete(slug)
        return
      }

      // Import API dynamically to avoid blocking
      const { OptimizedWikiAPI } = await import('./optimized-wiki-api')
      const page = await OptimizedWikiAPI.getPage(slug)
      
      if (page) {
        SmartStorage.set(`page_${slug}`, page, 30) // Cache for 30 minutes
      }
    } catch (error) {
      console.warn('Preload failed for', slug, error)
    } finally {
      this.preloadQueue.delete(slug)
      this.isPreloading = false
    }
  }

  static preloadPopularPages(): void {
    // Preload commonly accessed pages
    const popularPages = ['ballscord', 'ekansh', 'server-lore', 'help-editing']
    
    setTimeout(() => {
      popularPages.forEach(slug => this.preloadPage(slug))
    }, 1000) // Start preloading after 1 second
  }

  static preloadFromLinks(): void {
    // Preload pages when user hovers over links
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href^="/wiki/"]') as HTMLAnchorElement
      
      if (link) {
        const slug = link.href.split('/wiki/')[1]
        if (slug && !slug.startsWith('special-')) {
          this.preloadPage(slug)
        }
      }
    })
  }
}

// Smart navigation system with instant feedback
class SmartNavigation {
  private static currentSlug: string = ''
  private static navigationQueue: Array<{slug: string, resolve: Function}> = []
  private static isNavigating = false

  static async navigateInstantly(slug: string, updateHistory = true): Promise<void> {
    // Immediate UI feedback
    this.showInstantFeedback(slug)
    
    // Update URL immediately
    if (updateHistory) {
      window.history.pushState({}, '', `/wiki/${slug}`)
    }

    // Store current navigation
    this.currentSlug = slug

    // Check cache first
    const cachedPage = SmartStorage.get(`page_${slug}`)
    if (cachedPage) {
      this.renderPageInstantly(cachedPage)
      return
    }

    // Show skeleton while loading
    this.showSkeletonContent(slug)

    // Load in background
    try {
      const { OptimizedWikiAPI } = await import('./optimized-wiki-api')
      const page = await OptimizedWikiAPI.getPage(slug)
      
      // Only update if this is still the current navigation
      if (this.currentSlug === slug) {
        if (page) {
          SmartStorage.set(`page_${slug}`, page, 30)
          this.renderPageInstantly(page)
        } else {
          this.showPageNotFound(slug)
        }
      }
    } catch (error) {
      if (this.currentSlug === slug) {
        this.showLoadingError(slug)
      }
    }
  }

  private static showInstantFeedback(slug: string): void {
    // Flash effect to show navigation
    const content = document.querySelector('.content') as HTMLElement
    if (content) {
      content.style.transition = 'opacity 0.1s'
      content.style.opacity = '0.7'
      setTimeout(() => {
        content.style.opacity = '1'
      }, 100)
    }
  }

  private static showSkeletonContent(slug: string): void {
    const content = document.querySelector('.content') as HTMLElement
    if (content) {
      const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      content.innerHTML = SkeletonGenerator.generatePageSkeleton(title)
    }
  }

  private static renderPageInstantly(page: Page): void {
    const content = document.querySelector('.content') as HTMLElement
    if (!content) return

    // Import utils dynamically
    import('./wiki-utils').then(({ renderWikiMarkdown }) => {
      const slugs = SmartStorage.get('all_page_slugs') || []
      
      content.innerHTML = `
        <div style="border-bottom: 1px solid #666; padding-bottom: 10px; margin-bottom: 15px;">
          <h1 style="margin: 0 0 10px 0; color: #fff;">${page.title}</h1>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button onclick="window.smartEdit && window.smartEdit('${page.slug}')" style="font-size: 11px;">
              ✏️ Edit
            </button>
          </div>
        </div>
        <div class="wiki-content">
          ${renderWikiMarkdown(page.content || '', slugs)}
        </div>
      `
    }).catch(() => {
      // Fallback rendering
      content.innerHTML = `
        <div style="border-bottom: 1px solid #666; padding-bottom: 10px; margin-bottom: 15px;">
          <h1 style="margin: 0 0 10px 0; color: #fff;">${page.title}</h1>
        </div>
        <div class="wiki-content">
          <p>${page.content || 'No content available.'}</p>
        </div>
      `
    })
  }

  private static showPageNotFound(slug: string): void {
    const content = document.querySelector('.content') as HTMLElement
    if (content) {
      const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <h2>This page does not exist</h2>
          <h1 style="color: #ff6666;">${title}</h1>
          <p>You can create it by clicking the "Create" button.</p>
          <button onclick="window.smartEdit && window.smartEdit('${slug}')" style="
            padding: 8px 16px; 
            background: #006600; 
            color: white; 
            border: none; 
            cursor: pointer; 
            font-size: 12px;
          ">
            📝 Create Page
          </button>
        </div>
      `
    }
  }

  private static showLoadingError(slug: string): void {
    const content = document.querySelector('.content') as HTMLElement
    if (content) {
      content.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ff6666;">
          <h2>Failed to load page</h2>
          <p>There was an error loading this page. Please try again.</p>
          <button onclick="window.location.reload()" style="
            padding: 8px 16px; 
            background: #333; 
            color: white; 
            border: 1px solid #666; 
            cursor: pointer; 
            font-size: 12px;
          ">
            🔄 Retry
          </button>
        </div>
      `
    }
  }
}

// Initialize smart loading system
export class SmartLoadingSystem {
  private static initialized = false

  static initialize(): void {
    if (this.initialized || typeof window === 'undefined') return
    this.initialized = true

    // Cleanup old cache on startup
    SmartStorage.cleanup()

    // Preload critical data
    this.preloadCriticalData()

    // Setup background preloading
    BackgroundPreloader.preloadPopularPages()
    BackgroundPreloader.preloadFromLinks()

    // Setup smart navigation
    this.setupSmartNavigation()

    // Setup auth caching
    this.setupAuthCaching()

    // Cache page slugs for link validation
    this.cachePageSlugs()

    console.log('🚀 Smart Loading System initialized')
  }

  private static async preloadCriticalData(): Promise<void> {
    try {
      // Preload main page if not cached
      const mainPage = SmartStorage.get('page_ballscord')
      if (!mainPage) {
        BackgroundPreloader.preloadPage('ballscord')
      }

      // Preload auth state
      const { OptimizedWikiAPI } = await import('./optimized-wiki-api')
      const authData = await OptimizedWikiAPI.getCurrentUser()
      if (authData.user) {
        SmartStorage.set('current_user', authData, 120) // Cache for 2 hours
      }
    } catch (error) {
      console.warn('Critical data preload failed:', error)
    }
  }

  private static setupSmartNavigation(): void {
    // Override default navigation
    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      if (path.startsWith('/wiki/')) {
        const slug = path.slice(6) || 'ballscord';
        SmartNavigation.navigateInstantly(slug, false);
      }
    });

    // Expose smart navigation globally
    (window as any).smartNavigate = (slug: string) => {
      SmartNavigation.navigateInstantly(slug)
    }

    // Expose smart edit function
    (window as any).smartEdit = (slug: string) => {
      // This will be implemented in the router component
      const event = new CustomEvent('smartEdit', { detail: { slug } })
      window.dispatchEvent(event)
    }
  }

  private static setupAuthCaching(): void {
    // Cache auth state changes
    if (typeof window !== 'undefined') {
      import('./supabase').then(({ supabase }) => {
        supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            // Cache user session
            SmartStorage.set('auth_session', {
              user: session.user,
              timestamp: Date.now()
            }, 120)
          } else {
            // Clear cached auth data
            SmartStorage.set('auth_session', null)
            SmartStorage.set('current_user', null)
          }
        })
      })
    }
  }

  private static async cachePageSlugs(): Promise<void> {
    try {
      const cached = SmartStorage.get('all_page_slugs')
      if (!cached) {
        const { OptimizedWikiAPI } = await import('./optimized-wiki-api')
        const slugs = await OptimizedWikiAPI.getAllPageSlugs()
        SmartStorage.set('all_page_slugs', slugs, 60) // Cache for 1 hour
      }
    } catch (error) {
      console.warn('Page slugs caching failed:', error)
    }
  }

  // Public methods for components to use
  static getCachedPage(slug: string): Page | null {
    return SmartStorage.get(`page_${slug}`)
  }

  static getCachedAuth(): { user: any; profile: any } | null {
    return SmartStorage.get('current_user')
  }

  static getCachedSlugs(): string[] {
    return SmartStorage.get('all_page_slugs') || []
  }

  static clearCache(): void {
    SmartStorage.clear()
  }

  static navigateTo(slug: string): void {
    SmartNavigation.navigateInstantly(slug)
  }
}

// Export utilities
export { SmartStorage, SkeletonGenerator, BackgroundPreloader, SmartNavigation }