// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
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
          404 - Page Not Found
        </h1>
        
        <p style={{ marginBottom: '20px', lineHeight: '1.6' }}>
          The page you&apos;re looking for doesn&apos;t exist in the Ballscord Wiki.
        </p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link 
            href="/wiki/ballscord"
            style={{
              background: '#000080',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              textDecoration: 'none',
              fontSize: '12px',
              display: 'inline-block'
            }}
          >
            🏠 Home
          </Link>
          
          <Link 
            href="/wiki/special-allpages"
            style={{
              background: '#000080',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              textDecoration: 'none',
              fontSize: '12px',
              display: 'inline-block'
            }}
          >
            📄 All Pages
          </Link>
          
          <Link 
            href="/wiki/special-random"
            style={{
              background: '#000080',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              textDecoration: 'none',
              fontSize: '12px',
              display: 'inline-block'
            }}
          >
            🎲 Random
          </Link>
        </div>
        
        <p style={{ marginTop: '20px', fontSize: '10px', color: '#888' }}>
          🌀 Lost in the chaos? That&apos;s very Ballscord of you.
        </p>
      </div>
    </div>
  )
}