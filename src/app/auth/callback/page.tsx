'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const finishOAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session?.user) {
          console.error('❌ No session:', error)
          setStatus('error')
          setErrorMsg(error?.message || 'Authentication failed')
          return
        }

        console.log('✅ Auth success:', session.user.email)

        // Optional: create user profile here if needed

        router.replace('/wiki/ballscord') // ✅ Redirect after login
      } catch (err) {
        console.error('❌ Unexpected error:', err)
        setStatus('error')
        setErrorMsg('Unexpected authentication error')
      }
    }

    finishOAuth()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl mb-2">🔐 Logging you in...</h2>
        <p className="text-sm text-gray-500">Finalizing login via Supabase...</p>
        <div className="mt-4 w-6 h-6 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="p-6 text-center text-red-600">
        <h2 className="text-xl mb-2">❌ Login failed</h2>
        <p>{errorMsg}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-sm rounded"
        >
          🔁 Try again
        </button>
      </div>
    )
  }

  return null
}
