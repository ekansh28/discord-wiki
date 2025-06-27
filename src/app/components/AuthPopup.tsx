'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPopup() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  // Create or get user profile
  const createOrGetUserProfile = async (authUser: any) => {
    try {
      // First, check if user profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (existingProfile && !fetchError) {
        console.log('✅ User profile exists:', existingProfile)
        setUserProfile(existingProfile)
        return existingProfile
      }

      // Extract display name from user metadata
      const getDisplayName = (user: any) => {
        if (user.user_metadata?.full_name) return user.user_metadata.full_name
        if (user.user_metadata?.name) return user.user_metadata.name
        if (user.user_metadata?.display_name) return user.user_metadata.display_name
        if (user.email) return user.email.split('@')[0]
        return 'User'
      }

      const getUsername = (user: any) => {
        if (user.user_metadata?.preferred_username) return user.user_metadata.preferred_username
        if (user.user_metadata?.user_name) return user.user_metadata.user_name
        if (user.email) return user.email.split('@')[0]
        return `user_${Date.now()}`
      }

      // Create new user profile
      console.log('👤 Creating new user profile for:', authUser.id)
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.id, // Use the same ID as the auth user
          username: getUsername(authUser),
          display_name: getDisplayName(authUser),
          avatar_url: authUser.user_metadata?.avatar_url || null,
          is_admin: false, // New users are not admin by default
          is_moderator: false,
          bio: null,
          edit_count: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating user profile:', createError)
        setMessage('Error creating user profile')
        return null
      }

      console.log('✅ Created user profile:', newProfile)
      setUserProfile(newProfile)
      return newProfile
    } catch (error) {
      console.error('❌ Error in createOrGetUserProfile:', error)
      return null
    }
  }

  // Load user on page load or auth state change
  useEffect(() => {
    setMounted(true)
    
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setUser(data.user)
        await createOrGetUserProfile(data.user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email)
      
      if (session?.user) {
        setUser(session.user)
        
        // Create or get user profile for any sign in/up event
        await createOrGetUserProfile(session.user)
        
        setShowPopup(false) // Hide popup after login
        setMessage('')
        
        // Show success message based on event type
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setMessage('Signed in successfully!')
        }
      } else {
        setUser(null)
        setUserProfile(null)
        if (event === 'SIGNED_OUT') {
          setMessage('')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Trigger Supabase OAuth login
  const loginWithProvider = async (provider: 'google' | 'discord') => {
    setLoading(true)
    setMessage('')
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.href,
        },
      })
      if (error) {
        console.error('OAuth error:', error)
        setMessage(error.message)
      }
    } catch (error) {
      console.error('OAuth exception:', error)
      setMessage('An error occurred during login')
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

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      let result
      if (activeTab === 'signup') {
        console.log('📝 Attempting to sign up:', email)
        result = await supabase.auth.signUp({
          email,
          password,
        })
        
        if (result.error) {
          setMessage(result.error.message)
        } else if (result.data?.user && !result.data.session) {
          setMessage('Check your email for verification link!')
        } else if (result.data?.user && result.data.session) {
          // User is immediately signed in (email confirmation disabled)
          await createOrGetUserProfile(result.data.user)
          setMessage('Account created successfully!')
        }
      } else {
        console.log('🔑 Attempting to sign in:', email)
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (result.error) {
          setMessage(result.error.message)
        } else if (result.data?.user) {
          await createOrGetUserProfile(result.data.user)
          setMessage('Signed in successfully!')
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      setMessage('An error occurred')
    }
    
    setLoading(false)
  }

  const logout = async () => {
    console.log('👋 Signing out')
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    setMessage('')
  }

  // Extract username from email or use display name
  const getDisplayName = (user: any) => {
    // First try to use the user profile display name
    if (userProfile?.display_name) return userProfile.display_name
    if (userProfile?.username) return userProfile.username
    
    // Fallback to auth user metadata
    if (user.user_metadata?.full_name) return user.user_metadata.full_name
    if (user.user_metadata?.name) return user.user_metadata.name
    if (user.email) return user.email.split('@')[0]
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
          {getDisplayName(user)}
          {userProfile?.is_admin && <span style={{ color: '#ff6666' }}> [Admin]</span>}
          {userProfile?.is_moderator && !userProfile?.is_admin && <span style={{ color: '#ffaa00' }}> [Mod]</span>}
          {' | '}
          <a href="#" onClick={(e) => { e.preventDefault(); logout() }}>Logout</a>
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
                style={{ marginBottom: '4px' }}
              >
                {loading ? 'Loading...' : '🔍 Continue with Google'}
              </button>

              <button
                onClick={() => loginWithProvider('discord')}
                disabled={loading}
                className="auth-form button"
                style={{ marginBottom: '8px' }}
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
                  required
                />
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  minLength={6}
                  required
                />
                <button type="submit" disabled={loading || !email || !password}>
                  {loading ? 'Loading...' : (activeTab === 'signin' ? '✅ Sign In' : '📝 Sign Up')}
                </button>
              </form>

              {/* Message display */}
              {message && (
                <div style={{ 
                  fontSize: '10px', 
                  color: message.includes('Check your email') || message.includes('successfully') ? '#008000' : '#800000',
                  marginTop: '8px',
                  padding: '4px',
                  border: '1px inset #c0c0c0',
                  background: '#f0f0f0'
                }}>
                  {message}
                </div>
              )}

              {/* Debug info for development */}
              {process.env.NODE_ENV === 'development' && user && (
                <div style={{ 
                  fontSize: '9px', 
                  color: '#666',
                  marginTop: '8px',
                  padding: '4px',
                  border: '1px solid #ddd',
                  background: '#f9f9f9'
                }}>
                  <strong>Debug:</strong><br/>
                  User ID: {user.id}<br/>
                  Profile: {userProfile ? '✅' : '❌'}<br/>
                  {userProfile && (
                    <>
                      Username: {userProfile.username}<br/>
                      Admin: {userProfile.is_admin ? 'Yes' : 'No'}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}