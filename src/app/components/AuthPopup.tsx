// src/app/components/AuthPopup.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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

export default function AuthPopup({ isPopupMode = false, onClose }: AuthPopupProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)

  // Create or get user profile
  const createOrGetUserProfile = async (authUser: User): Promise<UserProfile | null> => {
    try {
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
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.id,
          username: getUsername(authUser),
          display_name: getDisplayName(authUser),
          avatar_url: authUser.user_metadata?.avatar_url || null,
          is_admin: false,
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
        await createOrGetUserProfile(session.user)
        setMessage('')
        
        // Close popup after successful login
        if (isPopupMode && onClose) {
          setTimeout(() => {
            onClose()
          }, 1000)
        }
        
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
  }, [isPopupMode, onClose])

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

  const getDisplayName = (user: User) => {
    if (userProfile?.display_name) return userProfile.display_name
    if (userProfile?.username) return userProfile.username
    if (user.user_metadata?.full_name) return user.user_metadata.full_name
    if (user.user_metadata?.name) return user.user_metadata.name
    if (user.email) return user.email.split('@')[0]
    return 'User'
  }

  if (!mounted) {
    return <span>Login</span>
  }

  // If in popup mode, show the auth form directly
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
            cursor: 'pointer'
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
            cursor: 'pointer'
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

        {/* Email/Password form */}
        <form onSubmit={handleEmailAuth}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
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
            disabled={loading || !email || !password}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '11px',
              background: '#c0c0c0',
              border: '1px outset #c0c0c0',
              cursor: 'pointer'
            }}
          >
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
          {getDisplayName(user)}
          {userProfile?.is_admin && <span style={{ color: '#ff6666' }}> [Admin]</span>}
          {userProfile?.is_moderator && !userProfile?.is_admin && <span style={{ color: '#ffaa00' }}> [Mod]</span>}
          {' | '}
          <a href="#" onClick={(e) => { e.preventDefault(); logout() }} style={{ color: '#80001c' }}>Logout</a>
        </span>
      )}
    </>
  )
}