import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,

  login: (provider) => {
    // Fake login - just set authenticated to true
    set({
      isAuthenticated: true,
      user: {
        provider: provider, // 'google' or 'apple'
        email: `user@${provider}.com`,
        name: 'User',
      },
    })
  },

  logout: () => {
    set({
      isAuthenticated: false,
      user: null,
    })
  },
}))
