import { useState, useRef, useMemo, useEffect } from 'react'
import { StyleSheet, View, Text, Dimensions, PanResponder } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { deriveState } from '../constants/polyvagalStates'

export function intensityWord(v) {
  if (v < 20) return 'barely'
  if (v < 40) return 'mild'
  if (v < 65) return 'clear'
  if (v < 85) return 'strong'
  return 'intense'
}

const CURSOR_R = 16
const ASPECT = 0.52  // height / width — landscape rectangle

// State positions in the 2D space (cx/cy as 0-1 fractions of pad)
// X=0 left=low energy, X=1 right=high energy
// Y=0 top=safe, Y=1 bottom=unsafe
const QUAD_LABELS = [
  { name: 'restful',  label: 'Restful',  icon: '🌦', cx: 0.22, cy: 0.28 },
  { name: 'glowing',  label: 'Glowing',  icon: '☀️', cx: 0.78, cy: 0.28 },
  { name: 'steady',   label: 'Steady',   icon: '⛅', cx: 0.50, cy: 0.50 },
  { name: 'shutdown', label: 'Shutdown', icon: '🌑', cx: 0.22, cy: 0.72 },
  { name: 'wired',    label: 'Wired',    icon: '🌪', cx: 0.78, cy: 0.72 },
]

// ─── 2D Energy × Safety Picker ────────────────────────────────────────────────
export default function StateXYPicker({
  energyLevel,
  safetyLevel,
  onEnergyChange,
  onSafetyChange,
  onDragStart,
  onDragEnd,
}) {
  const defaultW = Dimensions.get('window').width - 40
  const [padSize, setPadSize] = useState(defaultW)
  const padSizeRef = useRef(defaultW)

  const [cursor, setCursor] = useState({
    x: (energyLevel != null ? energyLevel : 50) / 100,
    y: 1 - (safetyLevel != null ? safetyLevel : 50) / 100,
  })

  const onEnergyRef = useRef(onEnergyChange)
  const onSafetyRef = useRef(onSafetyChange)
  const onDragStartRef = useRef(onDragStart)
  const onDragEndRef = useRef(onDragEnd)
  onEnergyRef.current = onEnergyChange
  onSafetyRef.current = onSafetyChange
  onDragStartRef.current = onDragStart
  onDragEndRef.current = onDragEnd

  useEffect(() => {
    const energy = Math.round(cursor.x * 100)
    const safety = Math.round((1 - cursor.y) * 100)
    onEnergyChange?.(energy)
    onSafetyChange?.(safety)
  }, [])

  const panResponder = useMemo(() => {
    function apply(evt) {
      const size = padSizeRef.current
      const x = Math.max(0, Math.min(1, evt.nativeEvent.locationX / size))
      const y = Math.max(0, Math.min(1, evt.nativeEvent.locationY / (size * ASPECT)))
      setCursor({ x, y })
      onEnergyRef.current?.(Math.round(x * 100))
      onSafetyRef.current?.(Math.round((1 - y) * 100))
    }
    return PanResponder.create({
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

  const energy = Math.round(cursor.x * 100)
  const safety = Math.round((1 - cursor.y) * 100)
  const curState = deriveState(energy, safety)

  const padHeight = padSize * ASPECT
  const curLeft = Math.max(0, Math.min(padSize - CURSOR_R * 2, cursor.x * padSize - CURSOR_R))
  const curTop  = Math.max(0, Math.min(padHeight - CURSOR_R * 2, cursor.y * padHeight - CURSOR_R))

  return (
    <View style={{ width: '100%' }}>
      <View
        {...panResponder.panHandlers}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width
          setPadSize(w)
          padSizeRef.current = w
        }}
        style={[styles.pad, { height: padHeight }]}
      >
        {/* Deep ocean abyss base */}
        <View style={[StyleSheet.absoluteFillObject, styles.padBase]} />

        {/* RESTFUL 🌦 — cool rain, calm lake surface: aquamarine from top-left */}
        <LinearGradient
          colors={['rgba(0,215,195,0.75)', 'rgba(20,160,220,0.30)', 'rgba(0,215,195,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* GLOWING ☀️ — sun blazing on tropical water: golden amber from top-right */}
        <LinearGradient
          colors={['rgba(255,200,30,0.92)', 'rgba(255,100,20,0.35)', 'rgba(255,200,30,0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.05, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* WIRED 🌪 — underwater electric storm: vivid indigo-violet from bottom-right */}
        <LinearGradient
          colors={['rgba(90,50,255,0.88)', 'rgba(190,30,240,0.45)', 'rgba(90,50,255,0)']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0.08, y: 0.08 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* SHUTDOWN 🌑 — cold deep abyss: dark navy from bottom-left */}
        <LinearGradient
          colors={['rgba(5,10,70,0.70)', 'rgba(5,10,70,0)']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.75, y: 0.1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Depth vignette: bottom darkens into the unsafe deep */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,2,18,0.65)']}
          start={{ x: 0.5, y: 0.15 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Bioluminescence: subtle cyan shimmer through the center */}
        <LinearGradient
          colors={['rgba(0,210,255,0)', 'rgba(0,210,255,0.14)', 'rgba(0,210,255,0)']}
          start={{ x: 0.15, y: 0.45 }}
          end={{ x: 0.85, y: 0.55 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* State zone labels — floating, no dividers */}
        {QUAD_LABELS.map(ql => {
          const isActive = curState.name === ql.name
          return (
            <View
              key={ql.name}
              pointerEvents="none"
              style={[
                styles.stateLabel,
                {
                  left: ql.cx * padSize,
                  top: ql.cy * padHeight,
                  transform: [{ translateX: -28 }, { translateY: -22 }],
                  opacity: isActive ? 1 : 0.20,
                },
              ]}
            >
              <Text style={[styles.stateLabelIcon, isActive && styles.stateLabelIconActive]}>
                {ql.icon}
              </Text>
              <Text style={[styles.stateLabelText, isActive && styles.stateLabelTextActive]}>
                {ql.label}
              </Text>
            </View>
          )
        })}

        {/* Cursor: bioluminescent water orb */}
        <View
          pointerEvents="none"
          style={[styles.cursor, { left: curLeft, top: curTop }]}
        />

        {/* Readout: ocean glass pill */}
        <View style={styles.readout} pointerEvents="none">
          <Text style={{ fontSize: 13 }}>{curState.icon}</Text>
          <Text style={styles.readoutState}>{curState.label}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pad: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  padBase: {
    backgroundColor: '#020B18',
  },
  stateLabel: {
    position: 'absolute',
    alignItems: 'center',
    width: 56,
  },
  stateLabelIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  stateLabelIconActive: {
    fontSize: 20,
  },
  stateLabelText: {
    color: 'rgba(180,235,255,0.55)',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  stateLabelTextActive: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 9,
  },
  cursor: {
    position: 'absolute',
    width: CURSOR_R * 2,
    height: CURSOR_R * 2,
    borderRadius: CURSOR_R,
    borderWidth: 2,
    borderColor: 'rgba(100,240,255,0.95)',
    backgroundColor: 'rgba(0,180,230,0.22)',
    shadowColor: '#00E8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  readout: {
    position: 'absolute',
    top: 11, left: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,15,35,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,210,255,0.28)',
  },
  readoutState: {
    color: 'rgba(190,240,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
})
