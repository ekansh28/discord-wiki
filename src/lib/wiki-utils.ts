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

  // Convert infoboxes {{Infobox|param=value|...}}
  rendered = rendered.replace(/\{\{Infobox([\s\S]*?)\}\}/g, (match: string, content: string) => {
    const lines = content.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
    const params: Record<string, string> = {}
    
    // Parse infobox parameters
    for (const line of lines) {
      if (line.startsWith('|')) {
        const cleanLine = line.substring(1).trim()
        const equalIndex = cleanLine.indexOf('=')
        if (equalIndex > 0) {
          const key = cleanLine.substring(0, equalIndex).trim()
          const value = cleanLine.substring(equalIndex + 1).trim()
          params[key] = value
        }
      }
    }

    // Build infobox HTML
    let infoboxHtml = '<div class="infobox">'
    
    // Title
    if (params.title) {
      infoboxHtml += `<div class="infobox-title">${params.title}</div>`
    }
    
    // Image
    if (params.image) {
      const imageUrl = params.image.startsWith('http') 
        ? params.image 
        : `https://mbessirvgrfztivyftfl.supabase.co/storage/v1/object/public/wiki-files/${params.image}`
      const caption = params.caption || ''
      
      infoboxHtml += `<div class="infobox-image">`
      infoboxHtml += `<img src="${imageUrl}" alt="${caption}" />`
      if (caption) {
        infoboxHtml += `<div class="infobox-caption">${caption}</div>`
      }
      infoboxHtml += `</div>`
    }
    
    // Data rows
    const excludedKeys = ['title', 'image', 'caption']
    for (const [key, value] of Object.entries(params)) {
      if (!excludedKeys.includes(key) && value) {
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
        
        // Process wiki links and external links in values
        let processedValue = value
        
        // Process external links
        processedValue = processedValue.replace(/\[([^[\]\s]+)\s+([^\]]+)\]/g, (match: string, url: string, displayText: string) => {
          if (url.match(/^https?:\/\//)) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="external-link">${displayText}</a>`
          }
          return match
        })
        
        // Process wiki links
        processedValue = processedValue.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match: string, pageName: string, displayText?: string) => {
          if (pageName.startsWith('User:')) {
            const slug = pageName.toLowerCase().replace(/\s+/g, '-').replace('user:', 'user-')
            const display = displayText || pageName.replace('User:', '')
            return `<a href="/wiki/${slug}" class="wiki-link">${display}</a>`
          }
          
          const slug = pageName.toLowerCase().replace(/\s+/g, '-')
          const display = displayText || pageName
          const exists = existingPages.includes(slug)
          const className = exists ? 'wiki-link' : 'wiki-link-new'
          return `<a href="/wiki/${slug}" class="${className}">${display}</a>`
        })
        
        infoboxHtml += `<div class="infobox-row">`
        infoboxHtml += `<div class="infobox-label">${displayKey}</div>`
        infoboxHtml += `<div class="infobox-value">${processedValue}</div>`
        infoboxHtml += `</div>`
      }
    }
    
    infoboxHtml += '</div>'
    return infoboxHtml
  })

  // Convert external links with custom text [https://example.com Display Text]
  rendered = rendered.replace(/\[([^[\]\s]+)\s+([^\]]+)\]/g, (match, url, displayText) => {
    const cleanUrl = url.trim()
    const cleanDisplay = displayText.trim()
    
    // Check if it's a valid URL
    if (cleanUrl.match(/^https?:\/\//)) {
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="external-link">${cleanDisplay}</a>`
    }
    
    // If not a valid URL, return original text
    return match
  })

  // Convert bold external links **[https://example.com Display Text]**
  rendered = rendered.replace(/\*\*\[([^[\]\s]+)\s+([^\]]+)\]\*\*/g, (match, url, displayText) => {
    const cleanUrl = url.trim()
    const cleanDisplay = displayText.trim()
    
    if (cleanUrl.match(/^https?:\/\//)) {
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="external-link"><strong>${cleanDisplay}</strong></a>`
    }
    
    return match
  })

  // Convert file attachments [[File:filename.ext|size|alt text]]
  rendered = rendered.replace(/\[\[File:([^|\]]+)(?:\|([^|\]]+))?(?:\|([^\]]+))?\]\]/g, (match, filename, size, altText) => {
    const cleanFilename = filename.trim()
    const cleanSize = size ? size.trim() : ''
    const cleanAlt = altText ? altText.trim() : cleanFilename
    
    // Generate Supabase storage URL
    const storageUrl = `https://mbessirvgrfztivyftfl.supabase.co/storage/v1/object/public/wiki-files/${cleanFilename}`
    
    // Parse size if provided (e.g., "40x40px", "200px", "50%")
    let sizeStyle = ''
    if (cleanSize) {
      if (cleanSize.includes('x') && cleanSize.includes('px')) {
        // Format: "40x40px"
        const [width, height] = cleanSize.replace('px', '').split('x')
        sizeStyle = `width: ${width}px; height: ${height}px;`
      } else if (cleanSize.includes('px')) {
        // Format: "200px"
        sizeStyle = `width: ${cleanSize};`
      } else if (cleanSize.includes('%')) {
        // Format: "50%"
        sizeStyle = `width: ${cleanSize};`
      }
    }
    
    return `<img src="${storageUrl}" alt="${cleanAlt}" style="${sizeStyle} max-width: 100%; height: auto; display: inline-block; vertical-align: middle;" class="wiki-image" />`
  })

  // Convert wiki links [[Page Name]] or [[Page Name|Display Text]]
  rendered = rendered.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, pageName, displayText) => {
    // Skip if this looks like a File: or Category: link (already processed above)
    if (pageName.startsWith('File:') || pageName.startsWith('Category:')) {
      return match
    }
    
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

  // Convert bold and italic (but not inside links we've already processed)
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

// Helper function to get Supabase storage URL for files
export function getStorageUrl(filename: string, bucket: string = 'wiki-files'): string {
  return `https://mbessirvgrfztivyftfl.supabase.co/storage/v1/object/public/${bucket}/${filename}`
}

// Helper function to validate if a URL is external
export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//.test(url)
}