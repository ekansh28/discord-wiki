// src/app/error.tsx
'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'url("https://cdn.sekansh21.workers.dev/coolwallpaper.png")',
      backgroundRepeat: 'repeat',
      backgroundSize: 'cover',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Verdana, sans-serif'
    }}>
      <div style={{
        background: '#181818',
        border: '2px solid #999',
        color: 'white',
        boxShadow: '0 0 10px #000',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '20px'
      }}>
        <h1 style={{ color: '#ff6666', marginBottom: '20px', fontSize: '24px' }}>
          💥 Something went wrong!
        </h1>
        
        <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
          The Ballscord Wiki encountered an error. This is probably our fault, not yours.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{
              background: '#000080',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔄 Try again
          </button>
          
          <button
            onClick={() => window.location.href = '/wiki/ballscord'}
            style={{
              background: '#008000',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
             Go Home
          </button>
        </div>
        
        <p style={{ marginTop: '20px', fontSize: '10px', color: '#888' }}>
          🌀 Error in the chaos engine. Very meta.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details style={{ marginTop: '20px', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#ffaa00' }}>
              🔍 Error Details (Dev Mode)
            </summary>
            <pre style={{ 
              background: '#000', 
              padding: '10px', 
              fontSize: '10px', 
              overflow: 'auto',
              marginTop: '10px',
              border: '1px solid #666'
            }}>
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}