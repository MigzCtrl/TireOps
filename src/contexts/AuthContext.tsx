'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Profile type matching database schema
export interface Profile {
  id: string
  shop_id: string
  role: 'owner' | 'staff' | 'viewer'
  full_name: string | null
  email: string | null
  created_at: string
  updated_at: string
}

// Shop type
export interface Shop {
  id: string
  name: string
  owner_id: string | null
  email: string | null
  phone: string | null
  address: string | null
  tax_rate: number | null
  currency: string | null
  email_notifications: boolean | null
  low_stock_threshold: number | null
  created_at: string
  updated_at: string
}

// Auth context type
export interface AuthContextType {
  user: User | null
  profile: Profile | null
  shop: Shop | null
  loading: boolean
  canEdit: boolean  // true if owner or staff
  canDelete: boolean  // true if owner only
  isOwner: boolean  // true if owner
  isStaff: boolean  // true if staff
  isViewer: boolean  // true if viewer
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create supabase client once outside component
const supabase = createClient()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('[AuthContext] Error loading profile:', profileError)
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Load shop data if profile has shop_id
      if (profileData?.shop_id) {
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('id', profileData.shop_id)
          .single()

        if (shopError) {
          console.error('[AuthContext] Error loading shop:', shopError)
        } else {
          setShop(shopData)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('[AuthContext] Error in loadProfile:', error)
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        loadProfile(user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
          setShop(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(
    () => ({
      user,
      profile,
      shop,
      loading,
      canEdit: profile?.role === 'owner' || profile?.role === 'staff',
      canDelete: profile?.role === 'owner',
      isOwner: profile?.role === 'owner',
      isStaff: profile?.role === 'staff',
      isViewer: profile?.role === 'viewer',
      refreshProfile,
    }),
    [user, profile, shop, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
