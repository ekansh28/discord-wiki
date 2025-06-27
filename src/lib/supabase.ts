import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mbessirvgrfztivyftfl.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

if (!supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_KEY in environment variables.")
}

export const supabase = createClient(supabaseUrl, supabaseKey)
