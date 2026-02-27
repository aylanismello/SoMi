// SoMi Theme - Water & Regulation Inspired
// Ocean blues reflecting fluidity, regulation, and calm

export const colors = {
  // Core backgrounds
  background: {
    primary: '#1A2F4F',      // Deep ocean blue - main background
    secondary: '#2A4A6F',    // Medium ocean blue - cards, elevated surfaces
    overlay: 'rgba(26, 47, 79, 0.95)',
  },

  // Text colors
  text: {
    primary: '#FFFFFF',      // White - primary text for legibility
    secondary: 'rgba(255, 255, 255, 0.85)',    // Slightly dimmed white - secondary text
    muted: 'rgba(255, 255, 255, 0.5)',
    inverse: '#0A1128',
  },

  // Accent & interactive colors
  accent: {
    primary: '#00D9A3',      // Teal green - primary actions, continue buttons
    secondary: '#00B4D8',    // Turquoise - selected states
    tertiary: '#90E0EF',     // Frosted Blue - subtle highlights
    light: '#CAF0F8',        // Light Cyan - very light accents
    teal: '#4ecdc4',         // Teal - used for time/stats displays
  },

  // State colors
  state: {
    active: '#00B4D8',
    inactive: 'rgba(0, 180, 216, 0.3)',
    hover: '#90E0EF',
    disabled: 'rgba(202, 240, 248, 0.3)',
  },

  // Polyvagal states - keep existing colors for recognition
  polyvagal: {
    sos: '#ff6b9d',
    drained: '#9b59b6',
    foggy: '#95a5a6',
    wired: '#e67e22',
    steady: '#3498db',
    glowing: '#f1c40f',
  },

  // Utility colors
  border: {
    default: 'rgba(255, 255, 255, 0.15)',
    active: '#00D9A3',
    subtle: 'rgba(255, 255, 255, 0.08)',
  },

  // Overlays & blurs
  overlay: {
    dark: 'rgba(26, 47, 79, 0.9)',
    medium: 'rgba(26, 47, 79, 0.7)',
    light: 'rgba(26, 47, 79, 0.5)',
  },

  // Surface colors for cards, buttons
  surface: {
    primary: 'rgba(42, 74, 111, 0.5)',
    secondary: 'rgba(0, 217, 163, 0.15)',
    tertiary: 'rgba(255, 255, 255, 0.1)',
  },
}

export default { colors }
