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

// Booking settings type
export interface BookingSettings {
  business_hours: {
    [key: string]: { open: string; close: string; enabled: boolean }
  }
  slot_duration: number // minutes
  buffer_time: number // minutes between appointments
  max_days_ahead: number // how far ahead customers can book
  services: string[] // available services for booking
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
  onboarding_completed: boolean | null
  slug: string | null
  booking_enabled: boolean | null
  booking_settings: BookingSettings | null
  stripe_customer_id: string | null
  subscription_id: string | null
  subscription_status: 'none' | 'active' | 'past_due' | 'canceled' | 'trialing' | null
  subscription_tier: 'basic' | 'pro' | 'enterprise' | null
  subscription_current_period_end: string | null
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
  needsOnboarding: boolean  // true if onboarding not completed
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
        // CRITICAL FIX: Set profile to null and stop loading even on error
        setProfile(null)
        setShop(null)
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
          // CRITICAL FIX: Set shop to null but don't fail the whole operation
          setShop(null)
        } else {
          setShop(shopData)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('[AuthContext] Error in loadProfile:', error)
      // CRITICAL FIX: Always set loading to false and reset state
      setProfile(null)
      setShop(null)
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  useEffect(() => {
    let isMounted = true

    // Get initial session with proper error handling
    const initAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (!isMounted) return

        // If there's an error or no user, clear all state
        if (error || !user) {
          console.log('[AuthContext] No valid session found')
          setUser(null)
          setProfile(null)
          setShop(null)
          setLoading(false)
          return
        }

        // Verify the user has a valid email (basic sanity check)
        if (!user.email) {
          console.warn('[AuthContext] User has no email, clearing session')
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          setShop(null)
          setLoading(false)
          return
        }

        setUser(user)
        await loadProfile(user.id)
      } catch (error) {
        console.error('[AuthContext] Error initializing auth:', error)
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setShop(null)
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        setUser(session?.user ?? null)

        if (session?.user) {
          try {
            await loadProfile(session.user.id)
          } catch (error) {
            console.error('[AuthContext] Error in onAuthStateChange:', error)
            setProfile(null)
            setShop(null)
            setLoading(false)
          }
        } else {
          setProfile(null)
          setShop(null)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
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
      needsOnboarding: profile?.role === 'owner' && shop?.onboarding_completed !== true,
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
