// src/app/components/VisualEditor.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'

interface VisualEditorProps {
  content: string
  onChange: (content: string) => void
  onModeChange: (mode: 'visual' | 'source') => void
  mode: 'visual' | 'source'
  existingPages: string[]
}

export default function VisualEditor({ content, onChange, onModeChange, mode, existingPages }: VisualEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [selectedColor, setSelectedColor] = useState('#ffffff')
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#000000')
  const [fontSize, setFontSize] = useState('14')
  const [fontFamily, setFontFamily] = useState('Verdana')

  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      // Convert markdown to HTML for visual editing
      const htmlContent = markdownToHtml(content)
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent
      }
    }
  }, [content, mode])

  const markdownToHtml = (markdown: string): string => {
    if (!markdown.trim()) return '<p><br></p>'
    
    let html = markdown
    
    // Convert headings
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>')
    
    // Convert bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Convert wiki links
    html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, pageName, displayText) => {
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
    if (!html.match(/^<[h1-6]|<ul|<ol|<p/)) {
      html = '<p>' + html + '</p>'
    }
    
    return html
  }

  const htmlToMarkdown = (html: string): string => {
    let markdown = html
    
    // Convert headings
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1')
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1')
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1')
    
    // Convert bold and italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
    
    // Convert wiki links
    markdown = markdown.replace(/<a[^>]*class="wiki-link[^"]*"[^>]*href="\/wiki\/([^"]*)"[^>]*>(.*?)<\/a>/g, '[[$2]]')
    
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

  const handleContentChange = () => {
    if (editorRef.current && mode === 'visual') {
      const html = editorRef.current.innerHTML
      const markdown = htmlToMarkdown(html)
      onChange(markdown)
    }
  }

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    handleContentChange()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Enter key to create proper paragraphs
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      document.execCommand('insertHTML', false, '<br><br>')
      handleContentChange()
    }
  }

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

  const insertTable = () => {
    const rows = prompt('Number of rows:', '3')
    const cols = prompt('Number of columns:', '3')
    
    if (rows && cols) {
      const numRows = parseInt(rows)
      const numCols = parseInt(cols)
      
      let tableHtml = '<table class="wiki-table" style="border-collapse: collapse; width: 100%; margin: 15px 0; border: 1px solid #666;"><thead><tr>'
      
      // Header row
      for (let j = 0; j < numCols; j++) {
        tableHtml += '<th style="border: 1px solid #666; padding: 8px; background: #333; color: #fff;">Header ' + (j + 1) + '</th>'
      }
      tableHtml += '</tr></thead><tbody>'
      
      // Data rows
      for (let i = 1; i < numRows; i++) {
        tableHtml += '<tr>'
        for (let j = 0; j < numCols; j++) {
          tableHtml += '<td style="border: 1px solid #666; padding: 6px;">Cell ' + i + ',' + (j + 1) + '</td>'
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

  const insertImage = () => {
    const url = prompt('Enter image URL:')
    const alt = prompt('Enter image description:', 'Image')
    
    if (url) {
      const imgHtml = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; display: block; margin: 10px 0;" /><p><br></p>`
      
      if (mode === 'visual') {
        document.execCommand('insertHTML', false, imgHtml)
      } else {
        onChange(content + `\n![${alt}](${url})\n`)
      }
      
      handleContentChange()
    }
  }

  const applyTextColor = () => {
    execCommand('foreColor', selectedColor)
  }

  const applyBackgroundColor = () => {
    execCommand('hiliteColor', selectedBackgroundColor)
  }

  const applyFontSize = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const span = document.createElement('span')
      span.style.fontSize = fontSize + 'px'
      
      try {
        range.surroundContents(span)
        handleContentChange()
      } catch (e) {
        span.innerHTML = selection.toString()
        range.deleteContents()
        range.insertNode(span)
        handleContentChange()
      }
    }
  }

  const applyFontFamily = () => {
    execCommand('fontName', fontFamily)
  }

  if (mode === 'source') {
    return (
      <div className="editor-container">
        <div className="editor-toolbar" style={{ 
          background: '#333', 
          border: '1px solid #666', 
          padding: '8px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <button onClick={() => onModeChange('visual')} style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
            👁️ Visual Mode
          </button>
          <div style={{ fontSize: '10px', color: '#ccc' }}>
            Source Editor - Use markdown syntax
          </div>
        </div>
        
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: '400px',
            padding: '10px',
            border: '1px inset #c0c0c0',
            background: '#fff',
            fontSize: '12px',
            fontFamily: 'Consolas, Monaco, monospace',
            resize: 'vertical',
            color: '#000'
          }}
          placeholder="Enter your content using markdown syntax..."
        />
      </div>
    )
  }

  return (
    <div className="editor-container">
      {/* Rich Toolbar */}
      <div className="editor-toolbar" style={{ 
        background: '#333', 
        border: '1px solid #666', 
        padding: '8px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        {/* Mode Toggle */}
        <button onClick={() => onModeChange('source')} style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
          📝 Source
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Text Formatting */}
        <button onClick={() => execCommand('bold')} style={{ fontSize: '10px', fontWeight: 'bold', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
          B
        </button>
        <button onClick={() => execCommand('italic')} style={{ fontSize: '10px', fontStyle: 'italic', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
          I
        </button>
        <button onClick={() => execCommand('underline')} style={{ fontSize: '10px', textDecoration: 'underline', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
          U
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Lists */}
        <button onClick={() => execCommand('insertOrderedList')} style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
          1. List
        </button>
        <button onClick={() => execCommand('insertUnorderedList')} style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
          • List
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Headings */}
        <select 
          onChange={(e) => execCommand('formatBlock', e.target.value)}
          style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px' }}
        >
          <option value="">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Wiki-specific Tools */}
        <button onClick={insertWikiLink} style={{ fontSize: '10px', background: '#006600', color: '#fff', border: '1px solid #008800', padding: '4px 8px' }}>
          🔗 Link Page
        </button>
        <button onClick={insertTable} style={{ fontSize: '10px', background: '#660066', color: '#fff', border: '1px solid #880088', padding: '4px 8px' }}>
          📊 Table
        </button>
        <button onClick={insertImage} style={{ fontSize: '10px', background: '#666600', color: '#fff', border: '1px solid #888800', padding: '4px 8px' }}>
          🖼️ Image
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Special Inserts */}
        <button 
          onClick={() => execCommand('insertHTML', '<hr style="border: 1px solid #666; margin: 20px 0;"><p><br></p>')}
          style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}
        >
          ➖ Line
        </button>
        <button 
          onClick={() => execCommand('insertHTML', '<blockquote style="border-left: 3px solid #666; margin: 15px 0; padding: 10px 15px; background: #f5f5f5; font-style: italic; color: #000;">Quote text here</blockquote><p><br></p>')}
          style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}
        >
          💬 Quote
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Undo/Redo */}
        <button onClick={() => execCommand('undo')} style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
          ↶ Undo
        </button>
        <button onClick={() => execCommand('redo')} style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777', padding: '4px 8px' }}>
          ↷ Redo
        </button>
      </div>
      
      {/* Visual Editor - No white container, integrated styling */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handleContentChange}
        style={{
          minHeight: '400px',
          padding: '15px',
          border: '2px solid #666',
          background: '#181818', // Match the wiki background
          color: '#fff', // White text like the rest of the wiki
          fontSize: '14px',
          fontFamily: 'Verdana, sans-serif',
          lineHeight: '1.6',
          outline: 'none',
          overflow: 'auto',
          borderRadius: '0', // Keep it retro
          boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.3)' // Slight inset shadow for depth
        }}
        suppressContentEditableWarning={true}
      />
      
      {/* Helper Text */}
      <div style={{ 
        fontSize: '10px', 
        color: '#888', 
        marginTop: '5px',
        padding: '5px',
        background: '#222',
        border: '1px solid #555'
      }}>
        💡 <strong>Tips:</strong> 
        • Select text and use toolbar buttons 
        • Use "Link Page" to link to other wiki pages 
        • Switch to Source mode for advanced editing 
        • Press Enter twice for new paragraphs
      </div>
      
      <style jsx>{`
        .editor-container .wiki-link {
          color: #6699ff !important;
          text-decoration: none;
          border-bottom: 1px dotted #6699ff;
          background: rgba(102, 153, 255, 0.1);
          padding: 1px 3px;
          border-radius: 2px;
        }
        
        .editor-container .wiki-link-new {
          color: #ff6666 !important;
          text-decoration: none;
          border-bottom: 1px dotted #ff6666;
          background: rgba(255, 102, 102, 0.1);
          padding: 1px 3px;
          border-radius: 2px;
        }
        
        .editor-container .wiki-link:hover,
        .editor-container .wiki-link-new:hover {
          opacity: 0.8;
        }
        
        .editor-container h1 {
          color: #ff6666 !important;
          border-bottom: 2px solid #ff6666;
          padding-bottom: 5px;
          margin: 20px 0 10px 0;
        }
        
        .editor-container h2 {
          color: #ff6666 !important;
          border-bottom: 1px solid #ff6666;
          padding-bottom: 3px;
          margin: 20px 0 10px 0;
        }
        
        .editor-container h3 {
          color: #ff6666 !important;
          margin: 20px 0 10px 0;
        }
        
        .editor-container ul, .editor-container ol {
          margin: 10px 0;
          padding-left: 25px;
        }
        
        .editor-container li {
          margin-bottom: 5px;
        }
        
        .editor-container blockquote {
          border-left: 3px solid #666;
          margin: 15px 0;
          padding: 10px 15px;
          background: #f5f5f5;
          font-style: italic;
          color: #000;
        }
        
        .editor-container p {
          margin: 10px 0;
        }
        
        .editor-container strong {
          font-weight: bold;
        }
        
        .editor-container em {
          font-style: italic;
        }
        
        .editor-container img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px 0;
        }
      `}</style>
    </div>
  )
}