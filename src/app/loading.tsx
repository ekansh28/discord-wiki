// src/app/loading.tsx
export default function Loading() {
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
        maxWidth: '400px',
        margin: '20px'
      }}>
        <h2 style={{ color: '#ff6666', marginBottom: '20px', fontSize: '18px' }}>
          Loading Ballscord Wiki...
        </h2>
        
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>
          🌀
        </div>
        
        <p style={{ fontSize: '12px', color: '#888' }}>
          Initializing chaos engine...
        </p>
      </div>
    </div>
  )
}