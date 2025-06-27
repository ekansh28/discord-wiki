// src/app/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import EnhancedWikiRouter from './components/EnhancedWikiRouter'
import AuthPopup from './components/AuthPopup'

export default function HomePage() {
  const [showAuthPopup, setShowAuthPopup] = useState(false)

  useEffect(() => {
    // Redirect homepage to ballscord page if we're at root
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/wiki/ballscord')
    }
  }, [])

  const handleShowAuthPopup = () => {
    setShowAuthPopup(true)
  }

  const handleCloseAuthPopup = () => {
    setShowAuthPopup(false)
  }

  return (
    <div className="wrapper">
      <header>
        <Image
          src="https://cdn.sekansh21.workers.dev/fire.gif"
          alt="Fire GIF"
          className="fire-gif"
          width={40}
          height={40}
          unoptimized
        />
        Ballscord Wiki
        <div style={{ 
          position: 'absolute', 
          top: '5px', 
          right: '10px',
          fontSize: '10px',
          color: '#888'
        }}>
         
        </div>
      </header>

      <nav>
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/ballscord');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
           Home
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-allpages');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
            Pages
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-categories');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
           Categories
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-recent-changes');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          Recent Changes
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-random');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
           Random
        </a>
        
        {/* AuthPopup with controlled visibility */}
        <span onClick={handleShowAuthPopup} style={{ cursor: 'pointer' }}>
          <AuthPopup />
        </span>
      </nav>

      <EnhancedWikiRouter onShowAuthPopup={handleShowAuthPopup} />

      {/* Controlled Auth Popup */}
      {showAuthPopup && (
        <div className="auth-popup-backdrop" onClick={handleCloseAuthPopup}>
          <div className="auth-popup" onClick={(e) => e.stopPropagation()}>
            <div className="auth-popup-header">
              <span> User Authentication</span>
              <button 
                className="auth-popup-close"
                onClick={handleCloseAuthPopup}
                title="Close"
                type="button"
              >
                ×
              </button>
            </div>
            
            <div className="auth-popup-content">
              <AuthPopup isPopupMode={true} onClose={handleCloseAuthPopup} />
            </div>
          </div>
        </div>
      )}

      <footer>
        By Ekansh | please give me <a href="https://paypal.me/ekansh32" target="_blank" rel="noopener noreferrer">money</a> | made for ballscord
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#666' }}>
         
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