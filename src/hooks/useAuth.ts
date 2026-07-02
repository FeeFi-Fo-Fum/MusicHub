import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

export function useAuth() {
  const { setUser, setProfile } = useStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user
      if (u) { setUser({ id: u.id, email: u.email ?? '' }); fetchProfile(u.id) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      if (u) { setUser({ id: u.id, email: u.email ?? '' }); fetchProfile(u.id) }
      else { setUser(null); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }

  async function signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) return { error: error?.message ?? 'Sign up failed' }
    await supabase.from('profiles').insert({ id: data.user.id, username, bio: '', avatar_url: null })
    await fetchProfile(data.user.id)
    return { error: null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { signUp, signIn, signOut }
}
