'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types/wiki'
import { WikiAPI } from '@/lib/wiki-api'
import WikiEditor from './components/WikiEditor'
import AdminPanel from './components/AdminPanel'
import SpecialPages from './components/SpecialPages'
import AuthPopup from './components/AuthPopup'

export default function HomePage() {
  const [currentView, setCurrentView] = useState<string>('main-page')
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    initializeApp()
    
    // Handle browser navigation
    const handlePopState = () => {
      const path = window.location.pathname
      if (path.startsWith('/wiki/')) {
        setCurrentView(path.slice(6) || 'main-page')
      } else {
        setCurrentView('main-page')
      }
    }

    window.addEventListener('popstate', handlePopState)
    handlePopState() // Handle initial load

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const initializeApp = async () => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        setUser(userData.user)
        const profile = await WikiAPI.getUserProfile(userData.user.id)
        setUserProfile(profile)
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          const profile = await WikiAPI.getUserProfile(session.user.id)
          setUserProfile(profile)
        } else {
          setUser(null)
          setUserProfile(null)
        }
      })

      return () => subscription.unsubscribe()
    } catch (error) {
      console.error('Error initializing app:', error)
    }
  }

  const navigateTo = (path: string) => {
    const fullPath = path.startsWith('/') ? path : `/wiki/${path}`
    window.history.pushState({}, '', fullPath)
    setCurrentView(path.startsWith('/wiki/') ? path.slice(6) : path)
  }

  const renderContent = () => {
    // Special pages
    if (currentView === 'special-admin') {
      return <AdminPanel userProfile={userProfile} />
    }
    
    if (currentView === 'special-allpages') {
      return <SpecialPages pageType="allpages" />
    }
    
    if (currentView === 'special-categories') {
      return <SpecialPages pageType="categories" />
    }
    
    if (currentView === 'special-recent-changes') {
      return <SpecialPages pageType="recent-changes" />
    }
    
    if (currentView === 'special-random') {
      return <SpecialPages pageType="random" />
    }

    // Regular wiki pages
    return <WikiEditor />
  }

  if (!mounted) {
    return (
      <div className="wrapper">
        <header>
          <img
            src="https://cdn.sekansh21.workers.dev/fire.gif"
            alt="Fire GIF"
            className="fire-gif"
          />
          Ballscord Wiki
        </header>
        <div className="main">
          <div className="content">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              Loading...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wrapper">
      <header>
        <img
          src="https://cdn.sekansh21.workers.dev/fire.gif"
          alt="Fire GIF"
          className="fire-gif"
        />
        Ballscord Wiki
      </header>

      <nav>
        <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('main-page') }}>
          🏠 Home
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-allpages') }}>
          📄 Articles
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-recent-changes') }}>
          📝 Recent Edits
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-categories') }}>
          📁 Categories
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-random') }}>
          🎲 Random
        </a>
        {userProfile?.is_admin && (
          <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('special-admin') }}>
            🛡️ Admin
          </a>
        )}
        <AuthPopup />
      </nav>

      {renderContent()}

      <footer>
        🌀 Made with love & chaos on Neocities | Styled like 2007 | Powered by your trauma
        {userProfile && (
          <div style={{ marginTop: '5px', fontSize: '10px' }}>
            Welcome back, {userProfile.display_name}! 
            {userProfile.is_admin && <span style={{ color: '#ff6666' }}> [ADMIN]</span>}
            {userProfile.is_moderator && !userProfile.is_admin && <span style={{ color: '#ffaa00' }}> [MOD]</span>}
          </div>
        )}
      </footer>

      {/* Global styles */}
      <style jsx global>{`
        /* Wiki notification system */
        .wiki-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 10px 15px;
          border: 1px solid;
          border-radius: 4px;
          font-size: 12px;
          z-index: 9999;
          animation: slideIn 0.3s ease-out;
        }

        .wiki-notification.success {
          background: #003300;
          border-color: #00ff00;
          color: #ccffcc;
        }

        .wiki-notification.error {
          background: #330000;
          border-color: #ff0000;
          color: #ffcccc;
        }

        .wiki-notification.info {
          background: #000033;
          border-color: #0099ff;
          color: #ccddff;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Enhanced scrollbar for webkit browsers */
        ::-webkit-scrollbar {
          width: 12px;
        }

        ::-webkit-scrollbar-track {
          background: #222;
          border: 1px solid #666;
        }

        ::-webkit-scrollbar-thumb {
          background: #555;
          border: 1px solid #777;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #666;
        }

        /* Selection color */
        ::selection {
          background: #ff6666;
          color: #fff;
        }

        ::-moz-selection {
          background: #ff6666;
          color: #fff;
        }

        /* Focus styles */
        button:focus,
        input:focus,
        textarea:focus,
        select:focus {
          outline: 2px solid #6699ff;
          outline-offset: 1px;
        }

        /* Print styles */
        @media print {
          .wrapper {
            background: white;
            color: black;
            border: none;
            box-shadow: none;
            width: 100%;
            margin: 0;
            padding: 20px;
          }

          .sidebar {
            display: none;
          }

          .main {
            display: block;
          }

          nav {
            display: none;
          }

          .auth-popup-backdrop {
            display: none;
          }

          .wiki-content {
            color: black;
          }

          .wiki-content h1,
          .wiki-content h2,
          .wiki-content h3 {
            color: black;
            border-color: black;
          }

          .wiki-link,
          .wiki-link-new {
            color: blue;
            text-decoration: underline;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .wrapper {
            background: #000;
            color: #fff;
            border: 2px solid #fff;
          }

          button {
            background: #000;
            color: #fff;
            border: 2px solid #fff;
          }

          input,
          textarea {
            background: #000;
            color: #fff;
            border: 2px solid #fff;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .fire-gif {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}