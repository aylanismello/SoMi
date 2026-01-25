import React, { createContext, useContext, useState } from 'react'

const SettingsContext = createContext()

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export const SettingsProvider = ({ children }) => {
  const [isMusicEnabled, setIsMusicEnabled] = useState(true)

  const toggleMusic = () => {
    setIsMusicEnabled(prev => !prev)
  }

  const value = {
    isMusicEnabled,
    toggleMusic,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}
