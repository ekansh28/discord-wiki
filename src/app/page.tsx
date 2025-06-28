// app/page.tsx
'use client'

import React, { useEffect, useState, Suspense, lazy } from 'react'
import Image from 'next/image'
import { OptimizedWikiAPI } from '@/lib/optimized-wiki-api'

// Lazy load components for better performance
const OptimizedWikiRouter = lazy(() => import('./components/OptimizedWikiRouter'))
const OptimizedAuthPopup = lazy(() => import('./components/OptimizedAuthPopup'))

// Loading fallback component
const ComponentLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '200px',
      color: '#888',
      fontSize: '12px'
    }}>
      Loading...
    </div>
  }>
    {children}
  </Suspense>
)

// Performance monitoring hook
const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    initialLoadTime: 0,
    routerLoadTime: 0,
    authLoadTime: 0
  })

  const recordMetric = (key: string, time: number) => {
    setMetrics(prev => ({ ...prev, [key]: time }))
  }

  return { metrics, recordMetric }
}

export default function OptimizedHomePage() {
  const [showAuthPopup, setShowAuthPopup] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { metrics, recordMetric } = usePerformanceMetrics()

  const handleShowAuthPopup = () => {
    setShowAuthPopup(true)
  }

  const handleCloseAuthPopup = () => {
    setShowAuthPopup(false)
  }

  // Optimized initialization
  useEffect(() => {
    const initStart = performance.now()
    
    // Redirect homepage to ballscord page if we're at root
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/wiki/ballscord')
    }

    // Preload critical resources
    const preloadResources = async () => {
      try {
        // Preload essential data in parallel
        await Promise.all([
          OptimizedWikiAPI.getCurrentUser(),
          OptimizedWikiAPI.getAllPageSlugs(),
          OptimizedWikiAPI.getPage('ballscord') // Preload main page
        ])
        
        recordMetric('initialLoadTime', performance.now() - initStart)
        setIsInitialized(true)
      } catch (error) {
        console.error('Preload error:', error)
        setIsInitialized(true) // Still initialize even if preload fails
      }
    }

    preloadResources()
  }, [recordMetric])

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder="Search pages..."]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
      
      // Ctrl/Cmd + / for help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        window.history.pushState({}, '', '/wiki/help-editing')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
      
      // Alt + R for random page
      if (e.altKey && e.key === 'r') {
        e.preventDefault()
        window.history.pushState({}, '', '/wiki/special-random')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Show loading screen during initialization
  if (!isInitialized) {
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
            v2.0 Optimized
          </div>
        </header>

        <nav>
          <span style={{ color: '#888' }}>Loading navigation...</span>
        </nav>

        <div className="main">
          <div className="content">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <h2 style={{ color: '#ff6666', marginBottom: '20px' }}>
                🚀 Initializing Ballscord Wiki
              </h2>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ 
                  display: 'inline-block',
                  width: '200px',
                  height: '4px',
                  background: '#333',
                  border: '1px solid #666',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: '30%',
                    background: 'linear-gradient(90deg, #ff6666, #ffaa00)',
                    animation: 'loading 2s ease-in-out infinite'
                  }} />
                </div>
              </div>
              
              <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
                • Loading optimized caching system<br/>
                • Preloading critical resources<br/>
                • Initializing authentication<br/>
                • Setting up performance monitoring
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <div style={{ 
                  marginTop: '20px', 
                  fontSize: '10px', 
                  color: '#666',
                  fontFamily: 'monospace'
                }}>
                  Dev Mode: Performance metrics enabled
                </div>
              )}
            </div>
          </div>
        </div>

        <footer>
          Loading footer...
        </footer>

        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(300%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    )
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
          v2.0 Optimized
        </div>
      </header>

      <nav>
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/ballscord');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          🏠 Home
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-allpages');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          📄 Pages
        </a>
        
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          window.history.pushState({}, '', '/wiki/special-categories');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}>
          📁 Categories
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
        
        {/* Optimized Auth component */}
        <span onClick={handleShowAuthPopup} style={{ cursor: 'pointer' }}>
          <ComponentLoader>
            <OptimizedAuthPopup />
          </ComponentLoader>
        </span>
      </nav>

      {/* Main wiki router with performance monitoring */}
      <ComponentLoader>
        <OptimizedWikiRouter onShowAuthPopup={handleShowAuthPopup} />
      </ComponentLoader>

      {/* Controlled Auth Popup */}
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
              <ComponentLoader>
                <OptimizedAuthPopup isPopupMode={true} onClose={handleCloseAuthPopup} />
              </ComponentLoader>
            </div>
          </div>
        </div>
      )}

      <footer>
        By Ekansh | please give me <a href="https://paypal.me/ekansh32" target="_blank" rel="noopener noreferrer">money</a> | made for ballscord
        <div style={{ marginTop: '8px', fontSize: '9px', color: '#666' }}>
          Performance Optimized v2.0 | Multi-level caching enabled
        </div>
        <div style={{ marginTop: '4px', fontSize: '9px', color: '#555' }}>
          💡 Tips: Ctrl+K to search • Ctrl+/ for help • Alt+R for random page
        </div>
        
        {/* Performance metrics for development */}
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
            🚀 Performance: Init {metrics.initialLoadTime.toFixed(1)}ms | Router {metrics.routerLoadTime.toFixed(1)}ms | Auth {metrics.authLoadTime.toFixed(1)}ms
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

      {/* Service Worker Registration for offline caching */}
      {typeof window !== 'undefined' && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `
          }}
        />
      )}
    </div>
  )
}