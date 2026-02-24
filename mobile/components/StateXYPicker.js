import { useState, useRef, useEffect, useMemo } from 'react'
import { StyleSheet, View, Text, Dimensions, PanResponder } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'

// X-axis order follows polyvagal theory's arousal/activation spectrum:
//
//   ← Dorsal Vagal (shutdown) ── Ventral Vagal (regulated) ── Sympathetic (mobilized) →
//
//   Drained  = dorsal vagal shutdown (collapsed, frozen, very low energy)
//   Foggy    = mild dorsal / blended (hazy, numb, disconnected)
//   Steady   = ventral vagal (grounded, safe, window of tolerance)
//   Glowing  = high-vitality ventral vagal (warm, open, connected — still regulated)
//   Wired    = sympathetic activation (fight/flight, tense, over-activated)
//
// NOTE: Glowing intentionally sits between Steady and Wired — it is REGULATED energy,
// not sympathetic. Placing it after Wired would be physiologically wrong.
export const X_STATE_ORDER = [
  { id: 1, label: 'Drained', icon: '🌧', color: '#5B78B0' },
  { id: 2, label: 'Foggy',   icon: '🌫', color: '#6E92C8' },
  { id: 4, label: 'Steady',  icon: '🌤', color: '#7DBCE7' },
  { id: 5, label: 'Glowing', icon: '☀️', color: '#44CCD4' },
  { id: 3, label: 'Wired',   icon: '🌪', color: '#8B6FD8' },
]

// Gradient colors match the polyvagal arc:
//   very dark navy   → dark slate    → sky blue         → bright cyan  → electric violet
//   (collapsed/shut) → (hazy/numb)   → (regulated/safe)  → (vibrant/warm) → (activated/alert)
const GRAD_COLORS = ['#091321', '#1C3058', '#2575AA', '#38C4D4', '#7050CC']
const GRAD_LOCS   = [0, 0.25, 0.5, 0.75, 1]

const _SCREEN_W = Dimensions.get('window').width
const _H_PAD    = 20
const _AVAIL_W  = _SCREEN_W - _H_PAD * 2
const PAD_H     = 164
const CURSOR_R  = 15

export function intensityWord(v) {
  if (v < 20) return 'barely'
  if (v < 40) return 'mild'
  if (v < 65) return 'clear'
  if (v < 85) return 'strong'
  return 'intense'
}

// ─── 2D State × Intensity Picker ─────────────────────────────────────────────
// Like a color picker pad:
//   X axis → polyvagal state (left=collapsed, center=regulated, right=activated)
//   Y axis → intensity (bottom=barely, top=strong)
// Single tap or drag to place the cursor ring.
export default function StateXYPicker({ selectedStateId, onStateChange, intensityValue, onIntensityChange, onDragStart, onDragEnd }) {

  // Derive initial cursor position from props
  const initCursor = () => {
    const xi = selectedStateId != null
      ? Math.max(0, X_STATE_ORDER.findIndex(s => s.id === selectedStateId))
      : 2 // default → Steady (center)
    return {
      x: (xi + 0.5) / X_STATE_ORDER.length,
      y: (intensityValue != null ? intensityValue : 60) / 100,
    }
  }

  const [cursor, setCursor] = useState(initCursor)
  const [padWidth, setPadWidth] = useState(_AVAIL_W)
  const padWidthRef = useRef(_AVAIL_W)

  // Keep callback refs current so panResponder closure doesn't go stale
  const onStateRef     = useRef(onStateChange)
  const onIntensityRef = useRef(onIntensityChange)
  const onDragStartRef = useRef(onDragStart)
  const onDragEndRef   = useRef(onDragEnd)
  onStateRef.current     = onStateChange
  onIntensityRef.current = onIntensityChange
  onDragStartRef.current = onDragStart
  onDragEndRef.current   = onDragEnd

  // Fire defaults on mount
  useEffect(() => {
    const ic = initCursor()
    const si = Math.min(X_STATE_ORDER.length - 1, Math.floor(ic.x * X_STATE_ORDER.length))
    onStateChange(X_STATE_ORDER[si].id)
    onIntensityChange(Math.round(ic.y * 100))
  }, [])

  // Create PanResponder once — uses refs so no stale closures
  const panResponder = useMemo(() => {
    function apply(evt) {
      const w = padWidthRef.current
      const x = Math.max(0, Math.min(1, evt.nativeEvent.locationX / w))
      const y = Math.max(0, Math.min(1, 1 - evt.nativeEvent.locationY / PAD_H))
      setCursor({ x, y })
      const si = Math.min(X_STATE_ORDER.length - 1, Math.floor(x * X_STATE_ORDER.length))
      onStateRef.current(X_STATE_ORDER[si].id)
      onIntensityRef.current(Math.round(y * 100))
    }
    return PanResponder.create({
      // Capture both start and move so the parent ScrollView never gets the touch
      onStartShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder:         () => true,
      onMoveShouldSetPanResponderCapture:  () => true,
      onPanResponderGrant: (evt) => {
        apply(evt)
        onDragStartRef.current?.()
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      },
      onPanResponderMove: apply,
      onPanResponderRelease: () => {
        onDragEndRef.current?.()
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      },
      onPanResponderTerminate: () => {
        onDragEndRef.current?.()
      },
    })
  }, [])

  const curStateIdx = Math.min(X_STATE_ORDER.length - 1, Math.floor(cursor.x * X_STATE_ORDER.length))
  const curState    = X_STATE_ORDER[curStateIdx]
  const intensity   = Math.round(cursor.y * 100)

  // Cursor pixel position (clamped to stay inside pad)
  const curLeft = Math.max(0, Math.min(padWidth - CURSOR_R * 2, cursor.x * padWidth - CURSOR_R))
  const curTop  = Math.max(0, Math.min(PAD_H  - CURSOR_R * 2, (1 - cursor.y) * PAD_H - CURSOR_R))

  return (
    <View style={{ width: '100%' }}>

      {/* ── Gradient pad ── */}
      <View
        {...panResponder.panHandlers}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width
          setPadWidth(w)
          padWidthRef.current = w
        }}
        style={pickerStyles.pad}
      >
        {/* X: hue per polyvagal state */}
        <LinearGradient
          colors={GRAD_COLORS}
          locations={GRAD_LOCS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Y: intensity — dark/desaturated at bottom, vivid at top */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(4,8,18,0.93)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Subtle zone dividers */}
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[pickerStyles.divider, { left: `${i * 20}%` }]} />
        ))}

        {/* Y-axis hint labels */}
        <Text style={pickerStyles.yLabelTop} pointerEvents="none">intense</Text>
        <Text style={pickerStyles.yLabelBot} pointerEvents="none">barely</Text>

        {/* Current selection readout (top-left) */}
        <View style={pickerStyles.readout} pointerEvents="none">
          <Text style={{ fontSize: 13 }}>{curState.icon}</Text>
          <Text style={pickerStyles.readoutState}>{curState.label}</Text>
          <Text style={pickerStyles.readoutDot}>·</Text>
          <Text style={pickerStyles.readoutIntensity}>{intensityWord(intensity)}</Text>
        </View>

        {/* Cursor ring */}
        <View
          pointerEvents="none"
          style={[pickerStyles.cursor, { left: curLeft, top: curTop, borderColor: curState.color }]}
        />
      </View>

      {/* ── X-axis state labels ── */}
      <View style={pickerStyles.xLabels}>
        {X_STATE_ORDER.map((state, i) => {
          const active = i === curStateIdx
          return (
            <View key={state.id} style={pickerStyles.xLabelItem}>
              <Text style={{ fontSize: active ? 16 : 13 }}>{state.icon}</Text>
              <Text style={[
                pickerStyles.xLabelText,
                { color: active ? state.color : 'rgba(255,255,255,0.22)', fontWeight: active ? '700' : '400' },
              ]}>{state.label}</Text>
            </View>
          )
        })}
      </View>

    </View>
  )
}

const pickerStyles = StyleSheet.create({
  pad: {
    width: '100%',
    height: PAD_H,
    borderRadius: 20,
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  yLabelTop: {
    position: 'absolute',
    top: 10, right: 12,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  yLabelBot: {
    position: 'absolute',
    bottom: 10, right: 12,
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  readout: {
    position: 'absolute',
    top: 11, left: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  readoutState: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  readoutDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  readoutIntensity: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '500',
  },
  cursor: {
    position: 'absolute',
    width: CURSOR_R * 2,
    height: CURSOR_R * 2,
    borderRadius: CURSOR_R,
    borderWidth: 2.5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 5,
  },
  xLabels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  xLabelItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  xLabelText: {
    fontSize: 9,
    letterSpacing: 0.2,
  },
})
