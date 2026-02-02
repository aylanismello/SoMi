import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qujifwhwntqxziymqdwu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1amlmd2h3bnRxeHppeW1xZHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDA5MzcsImV4cCI6MjA3NzI3NjkzN30.-zi38lElFSGhPs7TzVYqYhYFuM8t0eGgrbAsLce5zF0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
