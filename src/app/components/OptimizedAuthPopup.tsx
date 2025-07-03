// components/OptimizedAuthPopup.tsx
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { OptimizedWikiAPI } from '@/lib/optimized-wiki-api'
import { User } from '@supabase/supabase-js'

interface AuthPopupProps {
  isPopupMode?: boolean
  onClose?: () => void
}

interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  is_admin: boolean
  is_moderator: boolean
  bio: string | null
  avatar_url: string | null
  created_at: string
  edit_count: number
}

export default function OptimizedAuthPopup({ isPopupMode = false, onClose }: AuthPopupProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)
  const [authError, setAuthError] = useState('')

  // Create or get user profile with better error handling
  const createOrGetUserProfile = useCallback(async (authUser: User): Promise<UserProfile | null> => {
    try {
      console.log('🔍 Looking for existing profile for user:', authUser.id)
      
      // Try to get existing profile first
      const existingProfile = await OptimizedWikiAPI.getUserProfile(authUser.id)
      
      if (existingProfile) {
        console.log('✅ Found existing user profile:', existingProfile)
        setUserProfile(existingProfile)
        return existingProfile
      }

      // Create new profile if doesn't exist
      const getDisplayName = (user: User) => {
        if (user.user_metadata?.full_name) return user.user_metadata.full_name
        if (user.user_metadata?.name) return user.user_metadata.name
        if (user.user_metadata?.display_name) return user.user_metadata.display_name
        if (user.email) return user.email.split('@')[0]
        return 'User'
      }

      const getUsername = (user: User) => {
        if (user.user_metadata?.preferred_username) return user.user_metadata.preferred_username
        if (user.user_metadata?.user_name) return user.user_metadata.user_name
        if (user.email) return user.email.split('@')[0]
        return `user_${Date.now()}`
      }

      console.log('👤 Creating new user profile for:', authUser.id)
      
      // Insert with conflict handling
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authUser.id,
          username: getUsername(authUser),
          display_name: getDisplayName(authUser),
          avatar_url: authUser.user_metadata?.avatar_url || null,
          is_admin: false,
          is_moderator: false,
          bio: null,
          edit_count: 0
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating user profile:', createError)
        setAuthError('Error creating user profile: ' + createError.message)
        return null
      }

      console.log('✅ Created user profile:', newProfile)
      setUserProfile(newProfile)
      return newProfile
    } catch (error) {
      console.error('❌ Error in createOrGetUserProfile:', error)
      setAuthError('Failed to create user profile')
      return null
    }
  }, [])
  
const initializeAuth = useCallback(async () => {
  try {
    console.log('🚀 Initializing auth...')

    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session?.user) {
      console.warn('⚠️ No session found or error:', error)
      setAuthError('Authentication error: ' + (error?.message || 'No active session'))
      return
    }

    const currentUser = session.user
    console.log('👤 Found current user:', currentUser.email)
    setUser(currentUser)

    const profile = await createOrGetUserProfile(currentUser)
    if (!profile) {
      console.warn('⚠️ Could not get/create user profile')
    }
  } catch (error) {
    console.error('❌ Auth initialization error:', error)
    setAuthError('Failed to initialize authentication')
  }
}, [createOrGetUserProfile])


  // OAuth login with better error handling
  const loginWithProvider = useCallback(async (provider: 'google' | 'discord') => {
    setLoading(true)
    setMessage('')
    setAuthError('')
    
    try {
      console.log(`🔑 Attempting OAuth login with ${provider}`)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.href,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      })
      
      if (error) {
        console.error('OAuth error:', error)
        setAuthError(error.message)
        setMessage('OAuth login failed: ' + error.message)
      } else {
        console.log('🎉 OAuth login initiated successfully')
        setMessage(`Redirecting to ${provider} login...`)
      }
    } catch (error) {
      console.error('OAuth exception:', error)
      setAuthError('An error occurred during login')
      setMessage('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }, [])

  // Email authentication with better validation
  const handleEmailAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setMessage('Please fill in all fields')
      setAuthError('Missing email or password')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      setAuthError('Password too short')
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setMessage('Please enter a valid email address')
      setAuthError('Invalid email format')
      return
    }

    setLoading(true)
    setMessage('')
    setAuthError('')

    try {
      let result
      
      if (activeTab === 'signup') {
        console.log('📝 Attempting to sign up:', email)
        result = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/wiki/ballscord`
          }
        })
        
        if (result.error) {
          console.error('Signup error:', result.error)
          setAuthError(result.error.message)
          setMessage(result.error.message)
        } else if (result.data?.user && !result.data.session) {
          setMessage('Check your email for verification link!')
          console.log('📧 Verification email sent')
        } else if (result.data?.user && result.data.session) {
          console.log('🎉 User signed up and logged in immediately')
          await createOrGetUserProfile(result.data.user)
          setMessage('Account created successfully!')
        }
      } else {
        console.log('🔑 Attempting to sign in:', email)
        result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        })
        
        if (result.error) {
          console.error('Signin error:', result.error)
          setAuthError(result.error.message)
          setMessage(result.error.message)
        } else if (result.data?.user) {
          console.log('🎉 User signed in successfully')
          await createOrGetUserProfile(result.data.user)
          setMessage('Signed in successfully!')
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      setAuthError('An unexpected error occurred')
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [email, password, activeTab, createOrGetUserProfile])

  // Logout with cache clearing
  const logout = useCallback(async () => {
    console.log('👋 Signing out')
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        setAuthError('Error signing out: ' + error.message)
      } else {
        setUser(null)
        setUserProfile(null)
        setMessage('')
        setAuthError('')
        
        // Clear auth-related caches
        OptimizedWikiAPI.clearCache()
        
        console.log('✅ Successfully signed out')
      }
    } catch (error) {
      console.error('Logout exception:', error)
      setAuthError('Failed to sign out')
    } finally {
      setLoading(false)
    }
  }, [])

  // Get display name with fallbacks
  const getDisplayName = useMemo(() => {
    if (!user) return ''
    
    if (userProfile?.display_name) return userProfile.display_name
    if (userProfile?.username) return userProfile.username
    if (user.user_metadata?.full_name) return user.user_metadata.full_name
    if (user.user_metadata?.name) return user.user_metadata.name
    if (user.email) return user.email.split('@')[0]
    return 'User'
  }, [user, userProfile])

 useEffect(() => {
  setMounted(true)

  // Set up auth state change listener
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user')

    if (event === 'INITIAL_SESSION') {
      if (session?.user) {
        setUser(session.user)
        await createOrGetUserProfile(session.user)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      return
    }

    if (event === 'SIGNED_IN' && session?.user) {
      setUser(session.user)
      await createOrGetUserProfile(session.user)
      if (isPopupMode && onClose) {
        setTimeout(() => {
          onClose()
        }, 1500)
      }
      setMessage('Signed in successfully!')
    }

    if (event === 'SIGNED_OUT') {
      setUser(null)
      setUserProfile(null)
      setMessage('')
      setAuthError('')
    }
  })

  return () => subscription.unsubscribe()
}, [isPopupMode, onClose, createOrGetUserProfile])


  // Clear messages after delay
  useEffect(() => {
    if (message && !message.includes('Check your email')) {
      const timer = setTimeout(() => {
        setMessage('')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        setAuthError('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [authError])

  // Show loading state during mount
  if (!mounted) {
    return <span>Login</span>
  }

  // Popup mode rendering
  if (isPopupMode) {
    return (
      <div style={{ width: '100%' }}>
        {/* Tab buttons */}
        <div style={{ display: 'flex', marginBottom: '8px' }}>
          <button 
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '11px',
              background: activeTab === 'signin' ? '#e0e0e0' : '#c0c0c0',
              border: '1px outset #c0c0c0',
              cursor: 'pointer',
              marginRight: '2px'
            }}
            onClick={() => {
              setActiveTab('signin')
              setMessage('')
              setAuthError('')
            }}
          >
            Sign In
          </button>
          <button 
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '11px',
              background: activeTab === 'signup' ? '#e0e0e0' : '#c0c0c0',
              border: '1px outset #c0c0c0',
              cursor: 'pointer'
            }}
            onClick={() => {
              setActiveTab('signup')
              setMessage('')
              setAuthError('')
            }}
          >
            Sign Up
          </button>
        </div>

        {/* OAuth buttons */}
        <button
          onClick={() => loginWithProvider('google')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '4px 8px',
            marginBottom: '4px',
            fontSize: '11px',
            background: '#c0c0c0',
            border: '1px outset #c0c0c0',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Loading...' : '🔍 Continue with Google'}
        </button>

        <button
          onClick={() => loginWithProvider('discord')}
          disabled={loading}
          style={{
            width: '100%',
            padding: '4px 8px',
            marginBottom: '8px',
            fontSize: '11px',
            background: '#c0c0c0',
            border: '1px outset #c0c0c0',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Loading...' : '🎮 Continue with Discord'}
        </button>

        <div style={{
          textAlign: 'center',
          margin: '8px 0',
          fontSize: '9px',
          color: '#808080'
        }}>
          ── OR ──
        </div>

        {/* Email/password form */}
        <form onSubmit={handleEmailAuth}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            autoComplete="email"
            style={{
              width: '100%',
              padding: '2px 4px',
              marginBottom: '8px',
              border: '1px inset #c0c0c0',
              fontSize: '11px',
              boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            minLength={6}
            required
            autoComplete={activeTab === 'signup' ? 'new-password' : 'current-password'}
            style={{
              width: '100%',
              padding: '2px 4px',
              marginBottom: '8px',
              border: '1px inset #c0c0c0',
              fontSize: '11px',
              boxSizing: 'border-box'
            }}
          />
          <button 
            type="submit" 
            disabled={loading || !email.trim() || !password.trim()}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '11px',
              background: '#c0c0c0',
              border: '1px outset #c0c0c0',
              cursor: (loading || !email.trim() || !password.trim()) ? 'not-allowed' : 'pointer',
              opacity: (loading || !email.trim() || !password.trim()) ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : (activeTab === 'signin' ? '✅ Sign In' : '📝 Sign Up')}
          </button>
        </form>

        {/* Error display */}
        {authError && (
          <div style={{ 
            fontSize: '10px', 
            color: '#ff0000',
            marginTop: '8px',
            padding: '4px',
            border: '1px inset #c0c0c0',
            background: '#ffe0e0',
            borderRadius: '2px'
          }}>
            ❌ {authError}
          </div>
        )}

        {/* Message display */}
        {message && !authError && (
          <div style={{ 
            fontSize: '10px', 
            color: message.includes('Check your email') || message.includes('successfully') ? '#008000' : '#0066cc',
            marginTop: '8px',
            padding: '4px',
            border: '1px inset #c0c0c0',
            background: message.includes('Check your email') || message.includes('successfully') ? '#e0ffe0' : '#e0f0ff',
            borderRadius: '2px'
          }}>
            {message.includes('successfully') && '✅ '}
            {message.includes('Check your email') && '📧 '}
            {message.includes('Redirecting') && '🔄 '}
            {message}
          </div>
        )}
      </div>
    )
  }

  // Regular nav link mode
  return (
    <>
      {!user ? (
        <span style={{ color: '#80001c', fontWeight: 'bold', cursor: 'pointer' }}>
          Login
        </span>
      ) : (
        <span className="user-info">
          {getDisplayName}
          {userProfile?.is_admin && <span style={{ color: '#ff6666' }}> [Admin]</span>}
          {userProfile?.is_moderator && !userProfile?.is_admin && <span style={{ color: '#ffaa00' }}> [Mod]</span>}
          {' | '}
          <a 
            href="#" 
            onClick={(e) => { 
              e.preventDefault(); 
              logout() 
            }} 
            style={{ color: '#80001c' }}
          >
            {loading ? 'Logging out...' : 'Logout'}
          </a>
        </span>
      )}
    </>
  )
}