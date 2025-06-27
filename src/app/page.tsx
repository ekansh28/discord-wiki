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

      {/* Enhanced global styles */}
      <style jsx global>{`
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Enhanced body styles */
        body {
          background: url('https://cdn.sekansh21.workers.dev/coolwallpaper.png');
          color: #000;
          background-repeat: repeat;
          background-size: cover;
          font-family: "Verdana", sans-serif;
          margin: 0;
          padding: 0;
          min-height: 100vh;
        }

        /* Enhanced wrapper */
        .wrapper {
          width: 900px;
          margin: 40px auto;
          background: #181818;
          border: 2px solid #999;
          color: white;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
          padding: 20px;
          min-height: calc(100vh - 80px);
          position: relative;
        }

        /* Enhanced header */
        header {
          position: relative;
          text-align: center;
          background: #000000;
          color: rgb(252, 2, 2);
          padding: 20px;
          padding-bottom: 25px;
          font-size: 20px;
          font-family: "Arial Black", sans-serif;
          border-radius: 4px 4px 0 0;
          overflow: hidden;
        }

        .fire-gif {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          height: 40px;
          pointer-events: none;
          filter: brightness(1.2);
        }

        /* Enhanced navigation */
        nav {
          background: linear-gradient(135deg, #040413, #0a0a2a);
          color: red;
          padding: 12px;
          text-align: center;
          font-size: 14px;
          margin-bottom: 20px;
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
        }

        nav a {
          margin: 0 8px;
          text-decoration: none;
          color: #80001c;
          font-weight: bold;
          padding: 6px 12px;
          border-radius: 4px;
          transition: all 0.3s ease;
          display: inline-block;
          font-size: 12px;
        }

        nav a:hover {
          background: rgba(128, 0, 28, 0.2);
          color: #ff6666;
          transform: translateY(-1px);
        }

        /* Enhanced main layout */
        .main {
          display: flex;
          gap: 20px;
          min-height: 500px;
        }

        .sidebar {
          width: 250px;
          padding: 15px;
          background: linear-gradient(135deg, #000005, #0a0a0f);
          border: 1px solid #333;
          border-radius: 4px;
          font-size: 13px;
          height: fit-content;
          position: sticky;
          top: 20px;
        }

        .content {
          flex-grow: 1;
          padding: 15px 25px;
          font-size: 14px;
          background: linear-gradient(135deg, #1a1a1a, #111111);
          border: 1px solid #333;
          border-radius: 4px;
          min-height: 500px;
        }

        /* Enhanced form elements */
        input, textarea, select {
          transition: all 0.3s ease;
        }

        input:focus, textarea:focus, select:focus {
          transform: scale(1.02);
          box-shadow: 0 0 8px rgba(102, 153, 255, 0.5);
        }

        /* Enhanced buttons */
        button {
          margin-top: 10px;
          background: linear-gradient(135deg, #000080, #000060);
          color: white;
          border: 1px solid #333;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        button:hover {
          background: linear-gradient(135deg, #0000a0, #000080);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        button:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Enhanced footer */
        footer {
          text-align: center;
          font-size: 11px;
          color: #888;
          margin-top: 40px;
          padding: 20px;
          background: linear-gradient(135deg, #0a0a0a, #000000);
          border-radius: 0 0 4px 4px;
          border-top: 1px solid #333;
        }

        /* Notification system */
        .wiki-notification {
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 10px;
          font-size: 12px;
          max-width: 300px;
          animation: slideInRight 0.3s ease-out;
          pointer-events: auto;
          cursor: pointer;
        }

        .wiki-notification.success {
          border-color: #00ff00;
          color: #ccffcc;
          background: rgba(0, 51, 0, 0.9);
        }

        .wiki-notification.error {
          border-color: #ff0000;
          color: #ffcccc;
          background: rgba(51, 0, 0, 0.9);
        }

        .wiki-notification.info {
          border-color: #0099ff;
          color: #ccddff;
          background: rgba(0, 0, 51, 0.9);
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Enhanced scrollbars */
        ::-webkit-scrollbar {
          width: 14px;
        }

        ::-webkit-scrollbar-track {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 7px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #555, #333);
          border-radius: 7px;
          border: 1px solid #444;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #666, #444);
        }

        /* Enhanced selection */
        ::selection {
          background: rgba(255, 102, 102, 0.3);
          color: #fff;
        }

        ::-moz-selection {
          background: rgba(255, 102, 102, 0.3);
          color: #fff;
        }

        /* Loading states */
        .loading {
          opacity: 0.7;
          pointer-events: none;
        }

        /* Responsive enhancements */
        @media (max-width: 1000px) {
          .wrapper {
            width: 95%;
            margin: 20px auto;
            padding: 15px;
          }
        }

        @media (max-width: 768px) {
          header {
            font-size: 18px;
            padding: 15px;
          }
          
          nav {
            padding: 10px;
          }
          
          nav a {
            margin: 4px;
            padding: 4px 8px;
            font-size: 11px;
          }
          
          .content {
            padding: 15px;
            font-size: 13px;
          }
          
          .sidebar {
            width: 100%;
            position: static;
            margin-bottom: 20px;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .wrapper {
            box-shadow: 0 0 30px rgba(255, 102, 102, 0.1);
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .wrapper {
            background: #000;
            color: #fff;
            border: 3px solid #fff;
          }
          
          button {
            background: #000;
            color: #fff;
            border: 2px solid #fff;
          }
        }

        /* Reduced motion */
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

        /* Print optimizations */
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
          
          nav, .sidebar {
            display: none;
          }
          
          .main {
            display: block;
          }
          
          .fire-gif {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}