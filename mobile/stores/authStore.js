import { create } from 'zustand'
import { supabase } from '../supabase'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import { GoogleSignin } from '@react-native-google-signin/google-signin'

export const useAuthStore = create((set, get) => ({
  // State
  isAuthenticated: false,
  user: null,
  session: null,
  isLoading: true,

  // Initialize - call once in App.js useEffect
  initialize: () => {
    // Listen for auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session?.user,
          isLoading: false,
        })
      }
    )

    // Also check for existing session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        isLoading: false,
      })
    })

    // Return the subscription for cleanup
    return subscription
  },

  // Apple Sign In
  signInWithApple: async () => {
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync()
      console.log('Apple Auth available:', isAvailable)

      if (!isAvailable) {
        console.error('Apple Authentication is not available on this device')
        return { success: false, error: 'Apple Sign In not available on this device' }
      }

      // Generate a secure nonce
      const rawNonce = Math.random().toString(36).substring(2, 18)
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      )

      console.log('Attempting Apple sign in...')
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      })
      console.log('Apple credential received:', credential)
      console.log('Email from Apple:', credential.email)
      console.log('Full name from Apple:', credential.fullName)

      if (!credential.identityToken) {
        throw new Error('No identity token from Apple')
      }

      const { error, data } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      })

      if (error) throw error

      // Apple only provides name on first sign-in - save it
      if (credential.fullName) {
        const nameParts = []
        if (credential.fullName.givenName) nameParts.push(credential.fullName.givenName)
        if (credential.fullName.familyName) nameParts.push(credential.fullName.familyName)
        const fullName = nameParts.join(' ')

        if (fullName) {
          await supabase.auth.updateUser({
            data: {
              full_name: fullName,
              given_name: credential.fullName.givenName,
              family_name: credential.fullName.familyName,
            },
          })
        }
      }

      return { success: true }
    } catch (error) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('Apple sign-in cancelled by user')
        return { success: false, cancelled: true }
      }
      console.error('Apple sign-in error:', {
        message: error.message,
        code: error.code,
        fullError: error,
      })
      return { success: false, error: error.message }
    }
  },

  // Google Sign In
  signInWithGoogle: async () => {
    try {
      // Configure Google Auth (safe to call multiple times)
      await GoogleSignin.configure({
        scopes: ['email', 'profile'],
      })

      await GoogleSignin.hasPlayServices()
      const response = await GoogleSignin.signIn()

      if (!response.data?.idToken) {
        throw new Error('Failed to get Google ID token')
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.data.idToken,
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      if (error.code === GoogleSignin.statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, cancelled: true }
      }
      console.error('Google sign-in error:', error)
      return { success: false, error: error.message }
    }
  },

  // Email Sign Up
  signUpWithEmail: async (email, password) => {
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Email sign-up error:', error)
      return { success: false, error: error.message }
    }
  },

  // Email Sign In
  signInWithEmail: async (email, password) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Email sign-in error:', error)
      return { success: false, error: error.message }
    }
  },

  // Sign Out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      // State will be updated by onAuthStateChange listener
    } catch (error) {
      console.error('Sign out error:', error)
      // Force clear state even on error
      set({ isAuthenticated: false, user: null, session: null })
    }
  },
}))
