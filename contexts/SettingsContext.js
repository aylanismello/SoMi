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
  const [showTime, setShowTime] = useState(false)

  const toggleMusic = () => {
    setIsMusicEnabled(prev => !prev)
  }

  const toggleShowTime = () => {
    setShowTime(prev => !prev)
  }

  const value = {
    isMusicEnabled,
    toggleMusic,
    showTime,
    toggleShowTime,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}
