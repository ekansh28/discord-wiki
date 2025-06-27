// src/app/page.tsx
'use client'

import React from 'react'
import EnhancedWikiRouter from './components/EnhancedWikiRouter'
import AuthPopup from './components/AuthPopup'

export default function HomePage() {
  return (
    <div className="wrapper">
      <header>
        <img
          src="https://cdn.sekansh21.workers.dev/fire.gif"
          alt="Fire GIF"
          className="fire-gif"
        />
        Ballscord Wiki
        <div style={{ 
          position: 'absolute', 
          top: '5px', 
          right: '10px', 
          fontSize: '10px',
          color: '#888'
        }}>
          ⚡ Enhanced • Cached • Fast
        </div>
      </header>

      <nav>
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/main-page');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          🏠 Home
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-allpages');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          📄 Browse All Pages
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-categories');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          📁 Browse Categories
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-recent-changes');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          📝 Recent Changes
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-random');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          🎲 Random
        </a>
        
        <AuthPopup />
      </nav>

      <EnhancedWikiRouter />

      <footer>
        🌀 Made with love & chaos on Neocities | Styled like 2007 | Powered by your trauma
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#666' }}>
          ⚡ Enhanced Features: Fast Caching • Rich Visual Editor • Smart Linking • Auto-Save
        </div>
        <div style={{ marginTop: '4px', fontSize: '9px', color: '#555' }}>
          💡 Tips: Click links to navigate • Red links = pages to create • Use Visual Editor for easy formatting
        </div>
      </footer>

      {/* Global notification system */}
      <div id="wiki-notifications" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}></div>
    </div>
  )
}