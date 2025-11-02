import { createClient } from '@supabase/supabase-js'

// TODO: Replace these with your actual values from Supabase Dashboard
// Project Settings → API
const supabaseUrl = 'https://qujifwhwntqxziymqdwu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1amlmd2h3bnRxeHppeW1xZHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDA5MzcsImV4cCI6MjA3NzI3NjkzN30.-zi38lElFSGhPs7TzVYqYhYFuM8t0eGgrbAsLce5zF0' // Long string starting with eyJ...

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
