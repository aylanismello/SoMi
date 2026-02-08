import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = 'https://qujifwhwntqxziymqdwu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1amlmd2h3bnRxeHppeW1xZHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDA5MzcsImV4cCI6MjA3NzI3NjkzN30.-zi38lElFSGhPs7TzVYqYhYFuM8t0eGgrbAsLce5zF0'

export function createAuthenticatedClient(request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return { error: 'Missing authorization token' }
  }

  // Create a Supabase client with the user's JWT
  // This makes RLS work - queries are scoped to the user
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  return { supabase, token }
}

export async function getAuthenticatedUser(request) {
  const { supabase, token, error } = createAuthenticatedClient(request)

  if (error) {
    return { error }
  }

  // Verify the token and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: 'Invalid or expired token' }
  }

  return { supabase, user }
}

// Helper to return a 401 response
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}
