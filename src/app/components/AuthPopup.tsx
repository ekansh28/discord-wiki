'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPopup() {
  const [user, setUser] = useState<any>(null)
  const [showPopup, setShowPopup] = useState(false)

  // Load user on page load or auth state change
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setShowPopup(false) // Hide popup after login
      }
    })
  }, [])

  // Trigger Supabase login
  const loginWithProvider = async (provider: 'google' | 'discord') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.href,
      },
    })
  }

  return (
    <>
      {/* This is the "Login" nav link */}
      {!user && (
        <a href="#" onClick={(e) => {
          e.preventDefault()
          setShowPopup(!showPopup)
        }}>
          Login
        </a>
      )}

      {/* ✅ Pop-up box (styled like a retro floating window) */}
      {showPopup && (
        <div className="fixed bottom-10 right-10 z-50 bg-white text-black border border-gray-800 shadow-lg rounded-lg w-[280px] p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-lg">Sign in</h2>
            <button onClick={() => setShowPopup(false)} className="text-gray-600 hover:text-black">✕</button>
          </div>

          <button
            onClick={() => loginWithProvider('google')}
            className="w-full bg-blue-600 text-white py-1 px-2 rounded mb-2 hover:bg-blue-700"
          >
            Continue with Google
          </button>

          <button
            onClick={() => loginWithProvider('discord')}
            className="w-full bg-indigo-600 text-white py-1 px-2 rounded hover:bg-indigo-700"
          >
            Continue with Discord
          </button>
        </div>
      )}

      {/* Show user info if logged in */}
      {user && (
        <span className="text-green-400 text-sm">Logged in as {user.email}</span>
      )}
    </>
  )
}
