import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwuceptggwlpkjschdsb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dWNlcHRnZ3dscGtqc2NoZHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDAxNjIsImV4cCI6MjA3ODI3NjE2Mn0.quRdsaXLFXLhtXe8ZFb1rJceTuIpSnrzdt4izqHXWLo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});