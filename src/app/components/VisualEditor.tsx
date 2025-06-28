// src/app/components/VisualEditor.tsx
'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface VisualEditorProps {
  content: string
  onChange: (content: string) => void
  onModeChange: (mode: 'visual' | 'source') => void
  mode: 'visual' | 'source'
  existingPages: string[]
}

export default function VisualEditor({ content, onChange, onModeChange, mode, existingPages }: VisualEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastCursorPosition = useRef<{ node: Node | null; offset: number }>({ node: null, offset: 0 })

  // Store cursor position before content updates
  const saveCursorPosition = useCallback(() => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      lastCursorPosition.current = {
        node: range.startContainer,
        offset: range.startOffset
      }
    }
  }, [])

  // Restore cursor position after content updates
  const restoreCursorPosition = useCallback(() => {
    if (!editorRef.current || !lastCursorPosition.current.node) return
    
    try {
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        
        // Check if the node is still in the document
        if (document.contains(lastCursorPosition.current.node)) {
          range.setStart(lastCursorPosition.current.node, Math.min(
            lastCursorPosition.current.offset,
            lastCursorPosition.current.node.textContent?.length || 0
          ))
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
        } else {
          // If node no longer exists, place cursor at end
          range.selectNodeContents(editorRef.current)
          range.collapse(false)
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }
    } catch (error) {
      // If cursor restoration fails, just place at end
      const selection = window.getSelection()
      if (selection && editorRef.current) {
        const range = document.createRange()
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }, [])

  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      const htmlContent = markdownToHtml(content)
      if (editorRef.current.innerHTML !== htmlContent) {
        saveCursorPosition()
        editorRef.current.innerHTML = htmlContent
        // Restore cursor position after a brief delay
        setTimeout(restoreCursorPosition, 0)
      }
    }
  }, [content, mode, saveCursorPosition, restoreCursorPosition])

  const markdownToHtml = (markdown: string): string => {
    if (!markdown.trim()) return '<p><br></p>'
    
    let html = markdown

    // Convert headings FIRST (before other processing)
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>')
    
    // Convert infoboxes {{Infobox|param=value|...}}
    html = html.replace(/\{\{Infobox([\s\S]*?)\}\}/g, (match: string, content: string) => {
      const lines = content.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
      const params: Record<string, string> = {}
      
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

      let infoboxHtml = '<div class="infobox" contenteditable="false">'
      
      if (params.title) {
        infoboxHtml += `<div class="infobox-title">${params.title}</div>`
      }
      
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
      
      const excludedKeys = ['title', 'image', 'caption']
      for (const [key, value] of Object.entries(params)) {
        if (!excludedKeys.includes(key) && value) {
          const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          
          let processedValue = value
          
          processedValue = processedValue.replace(/\[([^[\]\s]+)\s+([^\]]+)\]/g, (match: string, url: string, displayText: string) => {
            if (url.match(/^https?:\/\//)) {
              return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="external-link">${displayText}</a>`
            }
            return match
          })
          
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

    // Convert external links
    html = html.replace(/\[([^[\]\s]+)\s+([^\]]+)\]/g, (match: string, url: string, displayText: string) => {
      const cleanUrl = url.trim()
      const cleanDisplay = displayText.trim()
      
      if (cleanUrl.match(/^https?:\/\//)) {
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="external-link" contenteditable="false">${cleanDisplay}</a>`
      }
      
      return match
    })

    // Convert bold external links
    html = html.replace(/\*\*\[([^[\]\s]+)\s+([^\]]+)\]\*\*/g, (match: string, url: string, displayText: string) => {
      const cleanUrl = url.trim()
      const cleanDisplay = displayText.trim()
      
      if (cleanUrl.match(/^https?:\/\//)) {
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="external-link" contenteditable="false"><strong>${cleanDisplay}</strong></a>`
      }
      
      return match
    })

    // Convert file attachments
    html = html.replace(/\[\[File:([^|\]]+)(?:\|([^|\]]+))?(?:\|([^\]]+))?\]\]/g, (match: string, filename: string, size?: string, altText?: string) => {
      const cleanFilename = filename.trim()
      const cleanSize = size ? size.trim() : ''
      const cleanAlt = altText ? altText.trim() : cleanFilename
      
      const storageUrl = `https://mbessirvgrfztivyftfl.supabase.co/storage/v1/object/public/wiki-files/${cleanFilename}`
      
      let sizeStyle = ''
      if (cleanSize) {
        if (cleanSize.includes('x') && cleanSize.includes('px')) {
          const [width, height] = cleanSize.replace('px', '').split('x')
          sizeStyle = `width: ${width}px; height: ${height}px;`
        } else if (cleanSize.includes('px')) {
          sizeStyle = `width: ${cleanSize};`
        } else if (cleanSize.includes('%')) {
          sizeStyle = `width: ${cleanSize};`
        }
      }
      
      return `<img src="${storageUrl}" alt="${cleanAlt}" style="${sizeStyle} max-width: 100%; height: auto; display: inline-block; vertical-align: middle;" class="wiki-image" contenteditable="false" />`
    })
    
    // Convert bold and italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    
    // Convert wiki links
    html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match: string, pageName: string, displayText?: string) => {
      if (pageName.startsWith('File:') || pageName.startsWith('Category:')) {
        return match
      }
      
      const display = displayText || pageName
      const slug = pageName.toLowerCase().replace(/\s+/g, '-')
      const exists = existingPages.includes(slug)
      const className = exists ? 'wiki-link' : 'wiki-link-new'
      return `<a href="/wiki/${slug}" class="${className}" contenteditable="false">${display}</a>`
    })
    
    // Convert lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>')
    html = html.replace(/\n/g, '<br>')
    
    // Wrap in paragraphs if not already wrapped
    if (!html.match(/^<[h1-6]|<ul|<ol|<p|<div/)) {
      html = '<p>' + html + '</p>'
    }
    
    return html
  }

  const htmlToMarkdown = (html: string): string => {
    let markdown = html
    
    // Convert headings FIRST
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1')
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1')
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1')
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1')
    
    // Convert infoboxes
    markdown = markdown.replace(/<div class="infobox"[^>]*>([\s\S]*?)<\/div>/g, (match, content) => {
      let infoboxMarkdown = '{{Infobox\n'
      
      const titleMatch = content.match(/<div class="infobox-title"[^>]*>(.*?)<\/div>/)
      if (titleMatch) {
        infoboxMarkdown += `|title        = ${titleMatch[1].replace(/<[^>]*>/g, '')}\n`
      }
      
      const imageMatch = content.match(/<div class="infobox-image"[^>]*>[\s\S]*?<img[^>]*src="[^"]*\/wiki-files\/([^"]*)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<\/div>/)
      if (imageMatch) {
        infoboxMarkdown += `|image        = ${imageMatch[1]}\n`
        if (imageMatch[2] && imageMatch[2] !== imageMatch[1]) {
          infoboxMarkdown += `|caption      = ${imageMatch[2]}\n`
        }
      }
      
      const rowMatches = content.matchAll(/<div class="infobox-row"[^>]*>[\s\S]*?<div class="infobox-label"[^>]*>(.*?)<\/div>[\s\S]*?<div class="infobox-value"[^>]*>(.*?)<\/div>[\s\S]*?<\/div>/g)
      for (const rowMatch of rowMatches) {
        const label = rowMatch[1].replace(/<[^>]*>/g, '').toLowerCase().replace(/\s+/g, '_')
        let value = rowMatch[2]
        
        value = value.replace(/<a[^>]*href="([^"]*)"[^>]*class="external-link"[^>]*>(.*?)<\/a>/g, '[$1 $2]')
        value = value.replace(/<a[^>]*href="\/wiki\/([^"]*)"[^>]*class="wiki-link[^"]*"[^>]*>(.*?)<\/a>/g, '[[$2]]')
        value = value.replace(/<[^>]*>/g, '')
        
        infoboxMarkdown += `|${label.padEnd(12)} = ${value}\n`
      }
      
      infoboxMarkdown += '}}'
      return infoboxMarkdown
    })
    
    // Convert bold and italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
    
    // Convert external links with bold
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*class="external-link"[^>]*><strong>(.*?)<\/strong><\/a>/g, '**[$1 $2]**')
    
    // Convert regular external links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*class="external-link"[^>]*>(.*?)<\/a>/g, '[$1 $2]')
    
    // Convert wiki images
    markdown = markdown.replace(/<img[^>]*src="[^"]*\/wiki-files\/([^"]*)"[^>]*alt="([^"]*)"[^>]*style="([^"]*)"[^>]*>/g, (match, filename, alt, style) => {
      let sizeString = ''
      
      const widthMatch = style.match(/width:\s*(\d+(?:\.\d+)?(?:px|%)?)/i)
      const heightMatch = style.match(/height:\s*(\d+(?:\.\d+)?px)/i)
      
      if (widthMatch && heightMatch && widthMatch[1].includes('px') && heightMatch[1].includes('px')) {
        const width = widthMatch[1].replace('px', '')
        const height = heightMatch[1].replace('px', '')
        sizeString = `|${width}x${height}px`
      } else if (widthMatch) {
        sizeString = `|${widthMatch[1]}`
      }
      
      if (alt === filename) {
        return `[[File:${filename}${sizeString}]]`
      } else {
        return `[[File:${filename}${sizeString}|${alt}]]`
      }
    })
    
    // Convert wiki links
    markdown = markdown.replace(/<a[^>]*class="wiki-link[^"]*"[^>]*href="\/wiki\/([^"]*)"[^>]*>(.*?)<\/a>/g, (match: string, slug: string, text: string) => {
      const pageName = slug.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      
      if (text === pageName) {
        return `[[${pageName}]]`
      } else {
        return `[[${pageName}|${text}]]`
      }
    })
    
    // Convert lists
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gs, '* $1\n')
    })
    
    // Convert paragraphs and breaks
    markdown = markdown.replace(/<\/p>\s*<p[^>]*>/g, '\n\n')
    markdown = markdown.replace(/<p[^>]*>/g, '')
    markdown = markdown.replace(/<\/p>/g, '\n')
    markdown = markdown.replace(/<br\s*\/?>/g, '\n')
    
    // Clean up HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '')
    
    // Clean up extra whitespace
    markdown = markdown.replace(/\n\n\n+/g, '\n\n')
    markdown = markdown.trim()
    
    return markdown
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    handleContentChange()
  }

  const handleContentChange = useCallback(() => {
    if (editorRef.current && mode === 'visual') {
      saveCursorPosition()
      const html = editorRef.current.innerHTML
      const markdown = htmlToMarkdown(html)
      onChange(markdown)
    }
  }, [mode, onChange, saveCursorPosition])

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    handleContentChange()
  }, [handleContentChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key to create proper paragraphs
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const container = range.commonAncestorContainer
        
        // Check if we're in a heading
        let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element
        while (element && element !== editorRef.current) {
          if (element.tagName && /^H[1-6]$/.test(element.tagName)) {
            // We're in a heading, let default behavior handle it
            return
          }
          element = element.parentElement
        }
        
        // For other cases, create a new paragraph
        e.preventDefault()
        document.execCommand('insertHTML', false, '<br><br>')
        handleContentChange()
      }
    }
    
    // Handle heading shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '1':
          e.preventDefault()
          execCommand('formatBlock', 'h1')
          break
        case '2':
          e.preventDefault()
          execCommand('formatBlock', 'h2')
          break
        case '3':
          e.preventDefault()
          execCommand('formatBlock', 'h3')
          break
        case '4':
          e.preventDefault()
          execCommand('formatBlock', 'h4')
          break
      }
    }
  }, [handleContentChange])

  const insertWikiLink = () => {
    const selection = window.getSelection()
    const selectedText = selection?.toString() || ''
    const pageName = prompt('Enter page name:', selectedText) || selectedText
    
    if (pageName) {
      const slug = pageName.toLowerCase().replace(/\s+/g, '-')
      const exists = existingPages.includes(slug)
      const className = exists ? 'wiki-link' : 'wiki-link-new'
      
      const linkHtml = `<a href="/wiki/${slug}" class="${className}" contenteditable="false">${pageName}</a>`
      
      if (mode === 'visual') {
        document.execCommand('insertHTML', false, linkHtml + '&nbsp;')
      } else {
        onChange(content + `[[${pageName}]]`)
      }
      
      handleContentChange()
    }
  }

  const insertExternalLink = () => {
    const selection = window.getSelection()
    const selectedText = selection?.toString() || ''
    const url = prompt('Enter URL:', 'https://')
    const displayText = prompt('Enter display text:', selectedText || 'Link')
    
    if (url && displayText) {
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="external-link" contenteditable="false">${displayText}</a>`
      
      if (mode === 'visual') {
        document.execCommand('insertHTML', false, linkHtml + '&nbsp;')
      } else {
        onChange(content + `[${url} ${displayText}]`)
      }
      
      handleContentChange()
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      
      // Upload to your backend/storage
      // This is a placeholder - implement actual upload logic
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const { filename } = await response.json()
        insertImageByFilename(filename, file.name)
      } else {
        alert('Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
    }
  }

  const insertImageByFilename = (filename: string, alt?: string) => {
    if (mode === 'visual') {
      const storageUrl = `https://mbessirvgrfztivyftfl.supabase.co/storage/v1/object/public/wiki-files/${filename}`
      const imgHtml = `<img src="${storageUrl}" alt="${alt || filename}" style="max-width: 100%; height: auto; display: inline-block; vertical-align: middle;" class="wiki-image" contenteditable="false" /><p><br></p>`
      document.execCommand('insertHTML', false, imgHtml)
    } else {
      onChange(content + `\n[[File:${filename}|${alt || ''}]]\n`)
    }
    
    handleContentChange()
  }

  const insertImage = () => {
    const method = prompt('Choose method:\n1. Upload file (type "upload")\n2. Enter filename (type "file")\n3. Enter URL (type "url")', 'upload')
    
    if (method === 'upload') {
      fileInputRef.current?.click()
    } else if (method === 'file') {
      const filename = prompt('Enter image filename (will be stored in Supabase):', 'image.png')
      const size = prompt('Enter size (optional, e.g., "40x40px", "200px", "50%"):', '')
      const alt = prompt('Enter alt text (optional):', filename || '')
      
      if (filename) {
        let imageMarkdown = `[[File:${filename}`
        
        if (size) {
          imageMarkdown += `|${size}`
        }
        
        if (alt && alt !== filename) {
          imageMarkdown += `|${alt}`
        }
        
        imageMarkdown += ']]'
        
        if (mode === 'visual') {
          insertImageByFilename(filename, alt || undefined)
        } else {
          onChange(content + `\n${imageMarkdown}\n`)
        }
        
        handleContentChange()
      }
    } else if (method === 'url') {
      const url = prompt('Enter image URL:', 'https://')
      const alt = prompt('Enter alt text:', 'Image')
      
      if (url && alt) {
        if (mode === 'visual') {
          const imgHtml = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; display: inline-block; vertical-align: middle;" class="wiki-image" contenteditable="false" /><p><br></p>`
          document.execCommand('insertHTML', false, imgHtml)
        } else {
          onChange(content + `\n![${alt}](${url})\n`)
        }
        
        handleContentChange()
      }
    }
  }

  const insertInfobox = () => {
    const title = prompt('Enter infobox title:', 'Page Title')
    const image = prompt('Enter image filename (optional):', '')
    
    if (title) {
      let infoboxMarkdown = '{{Infobox\n'
      infoboxMarkdown += `|title        = ${title}\n`
      
      if (image) {
        infoboxMarkdown += `|image        = ${image}\n`
        const caption = prompt('Enter image caption (optional):', '')
        if (caption) {
          infoboxMarkdown += `|caption      = ${caption}\n`
        }
      }
      
      const founder = prompt('Enter founder (optional):', '')
      if (founder) {
        infoboxMarkdown += `|founder      = ${founder}\n`
      }
      
      const created = prompt('Enter date created (optional):', '')
      if (created) {
        infoboxMarkdown += `|date_created = ${created}\n`
      }
      
      const status = prompt('Enter status (optional):', '')
      if (status) {
        infoboxMarkdown += `|status       = ${status}\n`
      }
      
      infoboxMarkdown += '}}\n\n'
      
      if (mode === 'visual') {
        const infoboxHtml = markdownToHtml(infoboxMarkdown)
        document.execCommand('insertHTML', false, infoboxHtml)
      } else {
        onChange(infoboxMarkdown + content)
      }
      
      handleContentChange()
    }
  }

  const insertTable = () => {
    const rows = prompt('Number of rows:', '3')
    const cols = prompt('Number of columns:', '3')
    
    if (rows && cols) {
      const numRows = parseInt(rows)
      const numCols = parseInt(cols)
      
      let tableHtml = '<table class="wiki-table"><thead><tr>'
      
      for (let j = 0; j < numCols; j++) {
        tableHtml += '<th>Header ' + (j + 1) + '</th>'
      }
      tableHtml += '</tr></thead><tbody>'
      
      for (let i = 1; i < numRows; i++) {
        tableHtml += '<tr>'
        for (let j = 0; j < numCols; j++) {
          tableHtml += '<td>Cell ' + i + ',' + (j + 1) + '</td>'
        }
        tableHtml += '</tr>'
      }
      
      tableHtml += '</tbody></table><p><br></p>'
      
      if (mode === 'visual') {
        document.execCommand('insertHTML', false, tableHtml)
      }
      
      handleContentChange()
    }
  }

  if (mode === 'source') {
    return (
      <div className="editor-container">
        <div className="editor-toolbar">
          <button onClick={() => onModeChange('visual')} className="toolbar-btn">
            👁️ Visual Mode
          </button>
          <div className="toolbar-info">
            Source Editor - Use markdown syntax (# = h1, ## = h2, ### = h3, #### = h4)
          </div>
        </div>
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="source-editor"
          placeholder="Enter your content using markdown syntax...&#10;# Heading 1&#10;## Heading 2&#10;### Heading 3&#10;#### Heading 4"
        />
        
        <div className="editor-help">
          💡 <strong>Syntax Help:</strong> 
          • Headings: # ## ### #### 
          • Wiki links: [[Page Name]] or [[Page Name|Display Text]]
          • External links: [https://example.com Display Text] or **[https://example.com Bold Link]**
          • Images: [[File:image.png|40x40px|Alt text]]
          • Infoboxes: {'{{Infobox|title=Title|image=image.png|param=value}}'}
          • Bold: **text** • Italic: *text*
        </div>
      </div>
    )
  }

  return (
    <div className="editor-container">
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleImageUpload(file)
          }
        }}
      />

      {/* Rich Toolbar */}
      <div className="editor-toolbar">
        {/* Mode Toggle */}
        <button onClick={() => onModeChange('source')} className="toolbar-btn">
          📝 Source
        </button>
        
        <div className="toolbar-separator" />
        
        {/* Text Formatting */}
        <button onClick={() => execCommand('bold')} className="toolbar-btn toolbar-bold">
          B
        </button>
        <button onClick={() => execCommand('italic')} className="toolbar-btn toolbar-italic">
          I
        </button>
        <button onClick={() => execCommand('underline')} className="toolbar-btn toolbar-underline">
          U
        </button>
        
        <div className="toolbar-separator" />
        
        {/* Lists */}
        <button onClick={() => execCommand('insertOrderedList')} className="toolbar-btn">
          1. List
        </button>
        <button onClick={() => execCommand('insertUnorderedList')} className="toolbar-btn">
          • List
        </button>
        
        <div className="toolbar-separator" />
        
        {/* Headings */}
        <button onClick={() => execCommand('formatBlock', 'h1')} className="toolbar-btn">
          H1
        </button>
        <button onClick={() => execCommand('formatBlock', 'h2')} className="toolbar-btn">
          H2
        </button>
        <button onClick={() => execCommand('formatBlock', 'h3')} className="toolbar-btn">
          H3
        </button>
        <button onClick={() => execCommand('formatBlock', 'h4')} className="toolbar-btn">
          H4
        </button>
        
        <div className="toolbar-separator" />
        
        {/* Wiki-specific Tools */}
        <button onClick={insertWikiLink} className="toolbar-btn toolbar-wiki-link">
          🔗 Wiki Link
        </button>
        <button onClick={insertExternalLink} className="toolbar-btn toolbar-external-link">
          🌐 External Link
        </button>
        <button onClick={insertImage} className="toolbar-btn toolbar-image">
          🖼️ Image
        </button>
        <button onClick={insertInfobox} className="toolbar-btn toolbar-infobox">
          📋 Infobox
        </button>
        <button onClick={insertTable} className="toolbar-btn toolbar-table">
          📊 Table
        </button>
        
        <div className="toolbar-separator" />
        
        {/* Special Inserts */}
        <button 
          onClick={() => execCommand('insertHTML', '<hr style="border: 1px solid #666; margin: 20px 0;"><p><br></p>')}
          className="toolbar-btn"
        >
          ➖ Line
        </button>
        <button 
          onClick={() => execCommand('insertHTML', '<blockquote style="border-left: 3px solid #666; margin: 15px 0; padding: 10px 15px; background: #f5f5f5; font-style: italic; color: #000;">Quote text here</blockquote><p><br></p>')}
          className="toolbar-btn"
        >
          💬 Quote
        </button>
        
        <div className="toolbar-separator" />
        
        {/* Undo/Redo */}
        <button onClick={() => execCommand('undo')} className="toolbar-btn">
          ↶ Undo
        </button>
        <button onClick={() => execCommand('redo')} className="toolbar-btn">
          ↷ Redo
        </button>
      </div>
      
      {/* Visual Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handleContentChange}
        className="visual-editor"
        suppressContentEditableWarning={true}
        style={{
          minHeight: '400px',
          padding: '15px',
          border: '2px solid #666',
          background: '#181818',
          color: '#fff',
          fontSize: '14px',
          fontFamily: 'Verdana, sans-serif',
          lineHeight: '1.6',
          outline: 'none',
          overflow: 'auto'
        }}
      />
      
      {/* Helper Text */}
      <div className="editor-help">
        💡 <strong>Tips:</strong> 
        • Use toolbar buttons or keyboard shortcuts (Ctrl+1-4 for headings)
        • Use "Wiki Link" for internal pages 
        • Use "External Link" for websites 
        • Use "Image" to upload files or enter URLs/filenames
        • Use "Infobox" to create info panels like Fandom wikis
        • Switch to Source mode for advanced editing 
        • Press Enter twice for new paragraphs
      </div>
    </div>
  )
}