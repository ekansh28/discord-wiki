'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPopup() {
  const [user, setUser] = useState<any>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  // Load user on page load or auth state change
  useEffect(() => {
    setMounted(true)
    
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setShowPopup(false) // Hide popup after login
        setMessage('')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Trigger Supabase OAuth login
  const loginWithProvider = async (provider: 'google' | 'discord') => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.href,
        },
      })
      if (error) setMessage(error.message)
    } catch (error) {
      setMessage('An error occurred')
    }
    setLoading(false)
  }

  // Handle email/password authentication
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setMessage('Please fill in all fields')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      let result
      if (activeTab === 'signup') {
        result = await supabase.auth.signUp({
          email,
          password,
        })
        if (result.data?.user && !result.data.session) {
          setMessage('Check your email for verification link!')
        }
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        })
      }

      if (result.error) {
        setMessage(result.error.message)
      }
    } catch (error) {
      setMessage('An error occurred')
    }
    
    setLoading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Extract username from email or use display name
  const getDisplayName = (user: any) => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user.user_metadata?.name) {
      return user.user_metadata.name
    }
    if (user.email) {
      return user.email.split('@')[0] // Extract username part from email
    }
    return 'User'
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <a href="#">Login</a>
  }

  return (
    <>
      {/* Login/Logout nav link */}
      {!user ? (
        <a href="#" onClick={(e) => {
          e.preventDefault()
          setShowPopup(!showPopup)
          setMessage('')
        }}>
          Login
        </a>
      ) : (
        <span className="user-info">
          {getDisplayName(user)} | <a href="#" onClick={(e) => { e.preventDefault(); logout() }}>Logout</a>
        </span>
      )}

      {/* Windows 98 style floating popup */}
      {showPopup && (
        <div className="auth-popup-backdrop" onClick={(e) => {
          // Close popup when clicking backdrop
          if (e.target === e.currentTarget) {
            setShowPopup(false)
          }
        }}>
          <div className="auth-popup" onClick={(e) => e.stopPropagation()}>
            <div className="auth-popup-header">
              <span>🔐 User Authentication</span>
              <button 
                className="auth-popup-close"
                onClick={() => setShowPopup(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className="auth-popup-content">
              {/* Tab buttons */}
              <div className="auth-tab-buttons">
                <button 
                  className={`auth-tab-button ${activeTab === 'signin' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('signin')
                    setMessage('')
                  }}
                >
                  Sign In
                </button>
                <button 
                  className={`auth-tab-button ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('signup')
                    setMessage('')
                  }}
                >
                  Sign Up
                </button>
              </div>

              {/* OAuth buttons */}
              <button
                onClick={() => loginWithProvider('google')}
                disabled={loading}
                className="auth-form button"
              >
                {loading ? 'Loading...' : '🔍 Continue with Google'}
              </button>

              <button
                onClick={() => loginWithProvider('discord')}
                disabled={loading}
                className="auth-form button"
              >
                {loading ? 'Loading...' : '🎮 Continue with Discord'}
              </button>

              <div className="auth-divider">
                ── OR ──
              </div>

              {/* Email/Password form */}
              <form onSubmit={handleEmailAuth} className="auth-form">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button type="submit" disabled={loading}>
                  {loading ? 'Loading...' : (activeTab === 'signin' ? '✅ Sign In' : '📝 Sign Up')}
                </button>
              </form>

              {/* Message display */}
              {message && (
                <div style={{ 
                  fontSize: '10px', 
                  color: message.includes('Check your email') ? '#008000' : '#800000',
                  marginTop: '8px',
                  padding: '4px',
                  border: '1px inset #c0c0c0',
                  background: '#f0f0f0'
                }}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}