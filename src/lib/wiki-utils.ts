// lib/wiki-utils.ts
import { TableOfContentsItem, WikiLink } from '@/types/wiki'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateTableOfContents(content: string): TableOfContentsItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: TableOfContentsItem[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const title = match[2].trim()
    const id = slugify(title)

    headings.push({
      id,
      title,
      level,
      children: []
    })
  }

  // Build nested structure
  const buildNestedToc = (items: TableOfContentsItem[], minLevel: number = 1): TableOfContentsItem[] => {
    const result: TableOfContentsItem[] = []
    let i = 0

    while (i < items.length) {
      const item = items[i]
      
      if (item.level === minLevel) {
        const newItem: TableOfContentsItem = { 
          ...item, 
          children: [] 
        }
        
        // Look for children
        const children = []
        let j = i + 1
        
        while (j < items.length && items[j].level > minLevel) {
          children.push(items[j])
          j++
        }
        
        if (children.length > 0) {
          newItem.children = buildNestedToc(children, minLevel + 1)
        }
        
        result.push(newItem)
        i = j
      } else {
        i++
      }
    }

    return result
  }

  return buildNestedToc(headings)
}

export function parseWikiLinks(content: string): WikiLink[] {
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  const links: WikiLink[] = []
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    const title = match[1].trim()
    const slug = slugify(title)
    
    links.push({
      title,
      slug,
      exists: false // Will be determined when rendering
    })
  }

  return links
}

export function renderWikiMarkdown(content: string, existingPages: string[] = []): string {
  if (!content) return ''

  let rendered = content

  // Convert wiki links [[Page Name]] or [[Page Name|Display Text]]
  rendered = rendered.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, pageName, displayText) => {
    const slug = slugify(pageName.trim())
    const display = displayText ? displayText.trim() : pageName.trim()
    const exists = existingPages.includes(slug)
    const className = exists ? 'wiki-link' : 'wiki-link-new'
    
    return `<a href="/wiki/${slug}" class="${className}">${display}</a>`
  })

  // Convert categories [[Category:Name]]
  rendered = rendered.replace(/\[\[Category:([^\]]+)\]\]/g, (match, categoryName) => {
    const slug = slugify(categoryName.trim())
    return `<a href="/category/${slug}" class="category-link">Category: ${categoryName.trim()}</a>`
  })

  // Convert headings to have IDs for table of contents
  rendered = rendered.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
    const id = slugify(title.trim())
    return `${hashes} <span id="${id}">${title.trim()}</span>`
  })

  // Convert markdown-style formatting
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  rendered = rendered.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  
  // Convert lists - using a different approach for ES2015 compatibility
  const lines = rendered.split('\n')
  let inList = false
  const processedLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isListItem = /^[\*\-]\s+(.+)$/.test(line)
    
    if (isListItem && !inList) {
      // Starting a new list
      processedLines.push('<ul>')
      processedLines.push(`<li>${line.replace(/^[\*\-]\s+/, '')}</li>`)
      inList = true
    } else if (isListItem && inList) {
      // Continuing the list
      processedLines.push(`<li>${line.replace(/^[\*\-]\s+/, '')}</li>`)
    } else if (!isListItem && inList) {
      // Ending the list
      processedLines.push('</ul>')
      processedLines.push(line)
      inList = false
    } else {
      // Regular line
      processedLines.push(line)
    }
  }
  
  // Close any remaining open list
  if (inList) {
    processedLines.push('</ul>')
  }
  
  rendered = processedLines.join('\n')
  
  // Convert line breaks
  rendered = rendered.replace(/\n\n/g, '</p><p>')
  rendered = rendered.replace(/\n/g, '<br>')
  
  // Wrap in paragraphs
  if (rendered && !rendered.startsWith('<')) {
    rendered = '<p>' + rendered + '</p>'
  }

  return rendered
}

export function extractCategories(content: string): string[] {
  const categoryRegex = /\[\[Category:([^\]]+)\]\]/g
  const categories: string[] = []
  let match

  while ((match = categoryRegex.exec(content)) !== null) {
    categories.push(match[1].trim())
  }

  return categories
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function timeSince(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
  
  return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

export function validatePageTitle(title: string): { valid: boolean; error?: string } {
  if (!title.trim()) {
    return { valid: false, error: 'Title cannot be empty' }
  }
  
  if (title.length > 255) {
    return { valid: false, error: 'Title cannot be longer than 255 characters' }
  }
  
  if (title.includes('[') || title.includes(']')) {
    return { valid: false, error: 'Title cannot contain square brackets' }
  }
  
  if (title.includes('|')) {
    return { valid: false, error: 'Title cannot contain pipe characters' }
  }
  
  return { valid: true }
}