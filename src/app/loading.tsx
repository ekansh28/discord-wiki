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
        
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #333',
          borderTop: '4px solid #ff6666',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px auto'
        }} />
        
        <p style={{ fontSize: '12px', color: '#888' }}>
          🌀 Initializing chaos engine...
        </p>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}