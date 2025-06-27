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
  const [showPlaceholder, setShowPlaceholder] = useState(false)

  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      // Convert markdown to HTML for visual editing
      const htmlContent = markdownToHtml(content)
      editorRef.current.innerHTML = htmlContent
      
      // Show placeholder if content is empty
      setShowPlaceholder(!content.trim())
    }
  }, [content, mode])

  const markdownToHtml = (markdown: string): string => {
    if (!markdown.trim()) return ''
    
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
    
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>')
    html = html.replace(/\n/g, '<br>')
    
    // Wrap in paragraphs if not already wrapped
    if (html && !html.startsWith('<')) {
      html = '<p>' + html + '</p>'
    }
    
    return html
  }

  const htmlToMarkdown = (html: string): string => {
    let markdown = html
    
    // Convert headings
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, '# $1')
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, '## $1')
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, '### $1')
    
    // Convert bold and italic
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*')
    
    // Convert wiki links
    markdown = markdown.replace(/<a[^>]*class="wiki-link[^"]*"[^>]*href="\/wiki\/([^"]*)"[^>]*>(.*?)<\/a>/g, '[[$2]]')
    
    // Convert paragraphs and breaks
    markdown = markdown.replace(/<\/p><p>/g, '\n\n')
    markdown = markdown.replace(/<p>/g, '')
    markdown = markdown.replace(/<\/p>/g, '')
    markdown = markdown.replace(/<br\s*\/?>/g, '\n')
    
    // Clean up HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '')
    
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
      
      // Update placeholder visibility
      setShowPlaceholder(!html.trim() || html === '<p><br></p>' || html === '<br>')
    }
  }

  const handleEditorFocus = () => {
    setShowPlaceholder(false)
    if (editorRef.current && (!editorRef.current.innerHTML.trim() || editorRef.current.innerHTML === '<p><br></p>')) {
      editorRef.current.innerHTML = '<p></p>'
      // Set cursor to the paragraph
      const range = document.createRange()
      const sel = window.getSelection()
      if (sel && editorRef.current.firstChild) {
        range.setStart(editorRef.current.firstChild, 0)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }

  const handleEditorBlur = () => {
    if (editorRef.current) {
      const isEmpty = !editorRef.current.innerHTML.trim() || 
                     editorRef.current.innerHTML === '<p><br></p>' || 
                     editorRef.current.innerHTML === '<br>' ||
                     editorRef.current.innerHTML === '<p></p>'
      setShowPlaceholder(isEmpty)
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
        document.execCommand('insertHTML', false, linkHtml)
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
      
      let tableHtml = '<table class="wiki-table"><thead><tr>'
      
      // Header row
      for (let j = 0; j < numCols; j++) {
        tableHtml += '<th>Header ' + (j + 1) + '</th>'
      }
      tableHtml += '</tr></thead><tbody>'
      
      // Data rows
      for (let i = 1; i < numRows; i++) {
        tableHtml += '<tr>'
        for (let j = 0; j < numCols; j++) {
          tableHtml += '<td>Cell ' + i + ',' + (j + 1) + '</td>'
        }
        tableHtml += '</tr>'
      }
      
      tableHtml += '</tbody></table><p></p>'
      
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
      const imgHtml = `<img src="${url}" alt="${alt}" style="max-width: 100%; height: auto;" />`
      
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
    // Document.execCommand doesn't support direct font-size, so we use a workaround
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const span = document.createElement('span')
      span.style.fontSize = fontSize + 'px'
      
      try {
        range.surroundContents(span)
        handleContentChange()
      } catch (e) {
        // If can't surround, insert at cursor
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
        <div className="editor-toolbar">
          <button onClick={() => onModeChange('visual')} style={{ fontSize: '10px', background: '#333' }}>
            👁️ Visual Mode
          </button>
          <div style={{ fontSize: '10px', color: '#ccc', marginLeft: '10px' }}>
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
            resize: 'vertical'
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
        alignItems: 'center'
      }}>
        {/* Mode Toggle */}
        <button onClick={() => onModeChange('source')} style={{ fontSize: '10px', background: '#555' }}>
          📝 Source
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Text Formatting */}
        <button onClick={() => execCommand('bold')} style={{ fontSize: '10px', fontWeight: 'bold' }}>
          B
        </button>
        <button onClick={() => execCommand('italic')} style={{ fontSize: '10px', fontStyle: 'italic' }}>
          I
        </button>
        <button onClick={() => execCommand('underline')} style={{ fontSize: '10px', textDecoration: 'underline' }}>
          U
        </button>
        <button onClick={() => execCommand('strikeThrough')} style={{ fontSize: '10px', textDecoration: 'line-through' }}>
          S
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Alignment */}
        <button onClick={() => execCommand('justifyLeft')} style={{ fontSize: '10px' }}>
          ⬅️
        </button>
        <button onClick={() => execCommand('justifyCenter')} style={{ fontSize: '10px' }}>
          ↔️
        </button>
        <button onClick={() => execCommand('justifyRight')} style={{ fontSize: '10px' }}>
          ➡️
        </button>
        <button onClick={() => execCommand('justifyFull')} style={{ fontSize: '10px' }}>
          ↕️
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Lists */}
        <button onClick={() => execCommand('insertOrderedList')} style={{ fontSize: '10px' }}>
          1. List
        </button>
        <button onClick={() => execCommand('insertUnorderedList')} style={{ fontSize: '10px' }}>
          • List
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Headings */}
        <select 
          onChange={(e) => execCommand('formatBlock', e.target.value)}
          style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777' }}
        >
          <option value="">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Font Family */}
        <select 
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          style={{ fontSize: '10px', background: '#555', color: '#fff', border: '1px solid #777' }}
        >
          <option value="Verdana">Verdana</option>
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times</option>
          <option value="Courier New">Courier</option>
          <option value="Georgia">Georgia</option>
        </select>
        
        <button onClick={applyFontFamily} style={{ fontSize: '9px' }}>
          Apply Font
        </button>
        
        {/* Font Size */}
        <input
          type="number"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          min="8"
          max="72"
          style={{ 
            width: '50px', 
            fontSize: '10px', 
            background: '#555', 
            color: '#fff', 
            border: '1px solid #777' 
          }}
        />
        <button onClick={applyFontSize} style={{ fontSize: '9px' }}>
          Size
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Colors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '9px', color: '#ccc' }}>Text:</label>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer' }}
          />
          <button onClick={applyTextColor} style={{ fontSize: '9px' }}>
            Apply
          </button>
          
          <label style={{ fontSize: '9px', color: '#ccc', marginLeft: '8px' }}>BG:</label>
          <input
            type="color"
            value={selectedBackgroundColor}
            onChange={(e) => setSelectedBackgroundColor(e.target.value)}
            style={{ width: '20px', height: '20px', border: 'none', cursor: 'pointer' }}
          />
          <button onClick={applyBackgroundColor} style={{ fontSize: '9px' }}>
            Apply
          </button>
        </div>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Wiki-specific Tools */}
        <button onClick={insertWikiLink} style={{ fontSize: '10px', background: '#006600' }}>
          🔗 Link Page
        </button>
        <button onClick={insertTable} style={{ fontSize: '10px', background: '#660066' }}>
          📊 Table
        </button>
        <button onClick={insertImage} style={{ fontSize: '10px', background: '#666600' }}>
          🖼️ Image
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Special Inserts */}
        <button 
          onClick={() => execCommand('insertHTML', '<hr style="border: 1px solid #666; margin: 20px 0;">')}
          style={{ fontSize: '10px' }}
        >
          ➖ Line
        </button>
        <button 
          onClick={() => execCommand('insertHTML', '<blockquote style="border-left: 3px solid #666; margin: 15px 0; padding: 10px 15px; background: #222; font-style: italic;">Quote text here</blockquote>')}
          style={{ fontSize: '10px' }}
        >
          💬 Quote
        </button>
        <button 
          onClick={() => execCommand('insertHTML', '<code style="background: #333; padding: 2px 4px; border-radius: 3px; font-family: monospace;">code</code>')}
          style={{ fontSize: '10px' }}
        >
          💻 Code
        </button>
        
        <div style={{ width: '1px', height: '20px', background: '#666', margin: '0 4px' }} />
        
        {/* Undo/Redo */}
        <button onClick={() => execCommand('undo')} style={{ fontSize: '10px' }}>
          ↶ Undo
        </button>
        <button onClick={() => execCommand('redo')} style={{ fontSize: '10px' }}>
          ↷ Redo
        </button>
      </div>
      
      {/* Visual Editor */}
      <div style={{ position: 'relative' }}>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          onPaste={handleContentChange}
          onKeyUp={handleContentChange}
          onFocus={handleEditorFocus}
          onBlur={handleEditorBlur}
          style={{
            width: '100%',
            minHeight: '400px',
            padding: '15px',
            border: '1px inset #c0c0c0',
            background: '#fff',
            color: '#000',
            fontSize: '14px',
            fontFamily: 'Verdana, sans-serif',
            lineHeight: '1.6',
            outline: 'none',
            overflow: 'auto'
          }}
          suppressContentEditableWarning={true}
        />
        
        {/* Placeholder overlay */}
        {showPlaceholder && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              color: '#999',
              fontSize: '14px',
              pointerEvents: 'none',
              fontFamily: 'Verdana, sans-serif'
            }}
          >
            Start typing your content...
          </div>
        )}
      </div>
      
      {/* Helper Text */}
      <div style={{ 
        fontSize: '10px', 
        color: '#888', 
        marginTop: '5px',
        padding: '5px'
      }}>
        💡 <strong>Tips:</strong> 
        • Select text and use toolbar buttons 
        • Use "Link Page" to link to other wiki pages 
        • Switch to Source mode for advanced editing 
        • All formatting is automatically saved
      </div>
      
      <style jsx>{`
        .editor-container .wiki-link {
          color: #0066cc;
          text-decoration: none;
          border-bottom: 1px dotted #0066cc;
          background: #e6f3ff;
          padding: 1px 3px;
          border-radius: 2px;
        }
        
        .editor-container .wiki-link-new {
          color: #cc0000;
          text-decoration: none;
          border-bottom: 1px dotted #cc0000;
          background: #ffe6e6;
          padding: 1px 3px;
          border-radius: 2px;
        }
        
        .editor-container .wiki-link:hover,
        .editor-container .wiki-link-new:hover {
          opacity: 0.8;
        }
        
        .editor-container .wiki-table {
          border-collapse: collapse;
          width: 100%;
          margin: 15px 0;
          border: 1px solid #ccc;
        }
        
        .editor-container .wiki-table th,
        .editor-container .wiki-table td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: left;
        }
        
        .editor-container .wiki-table th {
          background: #f0f0f0;
          font-weight: bold;
        }
        
        .editor-container .wiki-table tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .editor-container h1 {
          color: #cc0000;
          border-bottom: 2px solid #cc0000;
          padding-bottom: 5px;
        }
        
        .editor-container h2 {
          color: #cc0000;
          border-bottom: 1px solid #cc0000;
          padding-bottom: 3px;
        }
        
        .editor-container h3 {
          color: #cc0000;
        }
        
        .editor-container blockquote {
          border-left: 3px solid #666;
          margin: 15px 0;
          padding: 10px 15px;
          background: #f5f5f5;
          font-style: italic;
        }
        
        .editor-container code {
          background: #f0f0f0;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: Consolas, Monaco, monospace;
          font-size: 90%;
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