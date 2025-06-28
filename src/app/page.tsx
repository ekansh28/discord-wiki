// app/page.tsx
'use client'

import React, { useEffect, useState, Suspense, lazy } from 'react'
import Image from 'next/image'
import { SmartLoadingSystem, SmartStorage } from '@/lib/smart-loading-system'

// Lazy load components for better performance
const UltraFastWikiRouter = lazy(() => import('./components/UltraFastWikiRouter'))
const OptimizedAuthPopup = lazy(() => import('./components/OptimizedAuthPopup'))

// Instant fallback component
const InstantFallback = ({ message = "Loading..." }: { message?: string }) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100px',
    color: '#888',
    fontSize: '12px'
  }}>
    {message}
  </div>
)

export default function UltraFastHomePage() {
  const [showAuthPopup, setShowAuthPopup] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [fastInitComplete, setFastInitComplete] = useState(false)

  const handleShowAuthPopup = () => {
    setShowAuthPopup(true)
  }

  const handleCloseAuthPopup = () => {
    setShowAuthPopup(false)
  }

  // Instant initialization phase
  useEffect(() => {
    // Phase 1: Instant setup (0ms)
    if (typeof window !== 'undefined') {
      // Redirect homepage to ballscord page if we're at root
      if (window.location.pathname === '/') {
        window.history.replaceState({}, '', '/wiki/ballscord')
      }
      
      // Initialize smart loading system immediately
      SmartLoadingSystem.initialize()
      
      setFastInitComplete(true)
      
      // Phase 2: Background initialization (non-blocking)
      setTimeout(() => {
        setIsInitialized(true)
      }, 100) // Minimal delay for smooth UI
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!fastInitComplete) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder="Search pages..."]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }
      
      // Ctrl/Cmd + / for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        SmartLoadingSystem.navigateTo('help-editing')
      }
      
      // Alt + R for random page
      if (e.altKey && e.key === 'r') {
        e.preventDefault()
        SmartLoadingSystem.navigateTo('special-random')
      }
      
      // Escape to close popups
      if (e.key === 'Escape' && showAuthPopup) {
        setShowAuthPopup(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fastInitComplete, showAuthPopup])

  // Show instant interface even during initialization
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
          priority
        />
        Ballscord Wiki
        <div style={{ 
          position: 'absolute', 
          top: '5px', 
          right: '10px',
          fontSize: '10px',
          color: '#888'
        }}>
          ⚡ Ultra-Fast
        </div>
      </header>

      <nav>
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          SmartLoadingSystem.navigateTo('ballscord')
        }}>
          🏠 Home
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          SmartLoadingSystem.navigateTo('special-allpages')
        }}>
          📄 Pages
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          SmartLoadingSystem.navigateTo('special-categories')
        }}>
          📁 Categories
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          SmartLoadingSystem.navigateTo('special-recent-changes')
        }}>
          📝 Recent Changes
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          SmartLoadingSystem.navigateTo('special-random')
        }}>
          🎲 Random
        </a>
        
        {/* Optimized Auth component with instant fallback */}
        <span onClick={handleShowAuthPopup} style={{ cursor: 'pointer' }}>
          {fastInitComplete ? (
            <Suspense fallback={<span style={{ color: '#80001c' }}>Login</span>}>
              <OptimizedAuthPopup />
            </Suspense>
          ) : (
            <span style={{ color: '#80001c', fontWeight: 'bold' }}>Login</span>
          )}
        </span>
      </nav>

      {/* Main wiki router with ultra-fast loading */}
      {fastInitComplete ? (
        <Suspense fallback={
          <div className="main">
            <div className="sidebar" style={{ width: '175px' }}>
              <div className="sidebar-section">
                <h3>🧭 Navigation</h3>
                <div style={{ color: '#888', fontSize: '11px' }}>Initializing...</div>
              </div>
            </div>
            <div className="content">
              <div style={{ padding: '20px' }}>
                <h1 style={{ color: '#ff6666' }}>Loading Ballscord Wiki...</h1>
                <div style={{ 
                  background: 'linear-gradient(90deg, #333 25%, #555 50%, #333 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite',
                  height: '16px',
                  marginBottom: '12px',
                  borderRadius: '2px'
                }}></div>
                <div style={{ 
                  background: 'linear-gradient(90deg, #333 25%, #555 50%, #333 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite',
                  height: '16px',
                  marginBottom: '12px',
                  borderRadius: '2px',
                  width: '85%'
                }}></div>
                <div style={{ 
                  background: 'linear-gradient(90deg, #333 25%, #555 50%, #333 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite',
                  height: '16px',
                  marginBottom: '12px',
                  borderRadius: '2px',
                  width: '70%'
                }}></div>
              </div>
            </div>
          </div>
        }>
          <UltraFastWikiRouter onShowAuthPopup={handleShowAuthPopup} />
        </Suspense>
      ) : (
        // Instant skeleton while components load
        <div className="main">
          <div className="sidebar" style={{ width: '175px' }}>
            <div className="sidebar-section">
              <h3>🧭 Navigation</h3>
              <div style={{ color: '#888', fontSize: '11px' }}>Starting up...</div>
            </div>
          </div>
          <div className="content">
            <div style={{ padding: '20px' }}>
              <h1 style={{ color: '#ff6666' }}>Ballscord Wiki</h1>
              <div style={{ 
                background: 'linear-gradient(90deg, #333 25%, #555 50%, #333 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                height: '16px',
                marginBottom: '12px',
                borderRadius: '2px'
              }}></div>
              <div style={{ 
                background: 'linear-gradient(90deg, #333 25%, #555 50%, #333 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                height: '16px',
                marginBottom: '12px',
                borderRadius: '2px',
                width: '85%'
              }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Auth Popup with instant loading */}
      {showAuthPopup && (
        <div className="auth-popup-backdrop" onClick={handleCloseAuthPopup}>
          <div className="auth-popup" onClick={(e) => e.stopPropagation()}>
            <div className="auth-popup-header">
              <span>🔐 User Authentication</span>
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
              <Suspense fallback={
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#888' }}>Loading authentication...</div>
                </div>
              }>
                <OptimizedAuthPopup isPopupMode={true} onClose={handleCloseAuthPopup} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      <footer>
        By Ekansh | please give me <a href="https://paypal.me/ekansh32" target="_blank" rel="noopener noreferrer">money</a> | made for ballscord
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#666' }}>
          ⚡ Ultra-Fast Loading v3.0 | Smart Caching & Instant Navigation
        </div>
        <div style={{ marginTop: '4px', fontSize: '9px', color: '#555' }}>
          💡 Tips: Ctrl+K to search • Ctrl+/ for help • Alt+R for random • ESC to close
        </div>
        
        {/* Performance info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '8px', 
            fontSize: '8px', 
            color: '#444',
            fontFamily: 'monospace',
            background: '#111',
            padding: '4px',
            border: '1px solid #333'
          }}>
            🚀 Smart Loading: {fastInitComplete ? 'Active' : 'Starting'} | Cache: localStorage + sessionStorage | Preloading: Enabled
          </div>
        )}
      </footer>

      {/* Global notification system */}
      <div id="wiki-notifications" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}></div>

      {/* Inline styles for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .auth-popup-backdrop {
          animation: fadeIn 0.15s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .wiki-content img {
          transition: opacity 0.2s ease;
        }
        
        .wiki-content img:not([src]) {
          opacity: 0;
        }
        
        /* Smooth transitions for everything */
        .content {
          transition: opacity 0.1s ease;
        }
        
        .sidebar a:hover {
          color: #ff6666 !important;
          transition: color 0.1s ease;
        }
      `}</style>
    </div>
  )
}