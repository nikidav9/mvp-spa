import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://beqzuaxtbuhzhdjzxgko.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlcXp1YXh0YnVoemhkanp4Z2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjUyMDUsImV4cCI6MjA5NjA0MTIwNX0.oj4cLERGxM83RtayGPSr0WZ2HYgQQrbVGNLk5NP3Q-4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
