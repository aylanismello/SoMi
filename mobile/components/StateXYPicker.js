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
// X axis: energy (left=low, right=high)
// Y axis: safety (top=safe/connected, bottom=unsafe)
// Exports energy_level (0-100) and safety_level (0-100) via callbacks
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

  // cursor.x = energy/100 (0=left, 1=right)
  // cursor.y = 1 - safety/100 (0=top=safe, 1=bottom=unsafe)
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

  // Fire initial values on mount
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
        {/* Dark base — anchors the Shutdown quadrant (bottom-left) */}
        <View style={[StyleSheet.absoluteFillObject, styles.padBase]} />

        {/* Restful: cyan-teal from top-left */}
        <LinearGradient
          colors={['rgba(20,210,200,0.62)', 'rgba(20,210,200,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Glowing: vivid orange from top-right — dominant feature */}
        <LinearGradient
          colors={['rgba(255,138,20,0.88)', 'rgba(255,138,20,0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Wired: deep indigo-purple from bottom-right */}
        <LinearGradient
          colors={['rgba(110,40,220,0.75)', 'rgba(110,40,220,0)']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Unsafe zone: bottom darkening */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
          start={{ x: 0.5, y: 0.25 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Low energy: left-side darkening */}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0.5, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Crosshair grid */}
        <View style={styles.dividerH} />
        <View style={styles.dividerV} />

        {/* Axis labels */}
        <Text style={styles.axisTop} pointerEvents="none">Safe · Connected</Text>
        <Text style={styles.axisBottomLeft} pointerEvents="none">Low Energy</Text>
        <Text style={styles.axisBottomRight} pointerEvents="none">High Energy</Text>

        {/* Quadrant state labels */}
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
                  opacity: isActive ? 1 : 0.28,
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

        {/* Cursor orb */}
        <View
          pointerEvents="none"
          style={[styles.cursor, { left: curLeft, top: curTop }]}
        />

        {/* Readout: top-left */}
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
    backgroundColor: '#091525',
  },
  dividerH: {
    position: 'absolute',
    left: 0, right: 0,
    top: '50%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerV: {
    position: 'absolute',
    top: 0, bottom: 0,
    left: '50%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  axisTop: {
    position: 'absolute',
    top: 8,
    left: 0, right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.28)',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  axisBottomLeft: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  axisBottomRight: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    color: 'rgba(255,255,255,0.6)',
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
    borderWidth: 2.5,
    borderColor: 'rgba(160,220,240,0.9)',
    backgroundColor: 'rgba(10,20,40,0.65)',
    shadowColor: 'rgba(160,220,240,0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  readout: {
    position: 'absolute',
    top: 11, left: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  readoutState: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  readoutDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  readoutIntensity: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '500',
  },
})
