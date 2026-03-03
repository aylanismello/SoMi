import { useState, useRef, useMemo, useEffect } from 'react'
import { StyleSheet, View, Text, Dimensions, PanResponder } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { deriveState } from '../../constants/polyvagalStates'

export function intensityWord(v) {
  if (v < 20) return 'barely'
  if (v < 40) return 'mild'
  if (v < 65) return 'clear'
  if (v < 85) return 'strong'
  return 'intense'
}

const CURSOR_R = 16
const ASPECT = 1.0  // height / width — square

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

// Somatic Compass palette — polyvagal-theory-informed:
// Base     #0F1020  Deep midnight indigo — dorsal vagal floor, the resting darkness
//
// Restful  (TL safe+low)  → sage green    — parasympathetic rest, grounded calm
// Glowing  (TR safe+high) → golden amber  — peak ventral vagal, radiant aliveness
// Shutdown (BL unsf+low)  → cold steel    — dorsal collapse, frozen withdrawal
// Wired    (BR unsf+high) → coral-red     — sympathetic activation, fight/flight
// Steady   (center blend) — natural complex mid, all four states in equilibrium
const ZONE_COLORS = {
  restful:  { label: '#0A3D0A', readout: '#82D28C' },  // dark forest on sage
  glowing:  { label: '#6B3200', readout: '#FFC346' },  // dark umber on amber gold
  steady:   { label: '#FFFFFF', readout: '#E0F0FF' },  // white on center blend
  shutdown: { label: '#A8CDE8', readout: '#7BAECF' },  // ice on cold steel
  wired:    { label: '#FFF3F0', readout: '#FFBCBA' },  // warm cream on coral
}

// ─── 2D Energy × Safety Picker ────────────────────────────────────────────────
export default function PolyvagalStatePicker({
  energyLevel,
  safetyLevel,
  onEnergyChange,
  onSafetyChange,
  onDragStart,
  onDragEnd,
  hideReadout,
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      },
      onPanResponderTerminate: () => {
        onDragEndRef.current?.()
      },
    })
  }, [])

  const energy = Math.round(cursor.x * 100)
  const safety = Math.round((1 - cursor.y) * 100)
  const curState = deriveState(energy, safety)
  const zoneColors = ZONE_COLORS[curState.name] ?? ZONE_COLORS.steady

  const padHeight = padSize * ASPECT
  const curLeft = Math.max(0, Math.min(padSize - CURSOR_R * 2, cursor.x * padSize - CURSOR_R))
  const curTop  = Math.max(0, Math.min(padHeight - CURSOR_R * 2, cursor.y * padHeight - CURSOR_R))

  return (
    <View style={{ width: '100%' }}>
      {/* Readout: displayed above the picker box */}
      {!hideReadout && (
        <View style={styles.readout} pointerEvents="none">
          <Text style={{ fontSize: 13 }}>{curState.icon}</Text>
          <Text style={[styles.readoutState, { color: zoneColors.readout }]}>
            {curState.label}
          </Text>
        </View>
      )}
      <View
        {...panResponder.panHandlers}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width
          setPadSize(w)
          padSizeRef.current = w
        }}
        style={[styles.pad, { height: padHeight }]}
      >
        {/* Base: Deep midnight indigo — the dorsal vagal floor */}
        <View style={[StyleSheet.absoluteFillObject, styles.padBase]} />

        {/* RESTFUL 🌦 — sage green, top-left: parasympathetic rest, grounded calm */}
        <LinearGradient
          colors={['rgba(130,210,140,0.87)', 'rgba(130,210,140,0.48)', 'rgba(130,210,140,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.78, y: 0.78 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* GLOWING ☀️ — golden amber, top-right: peak ventral vagal, radiant aliveness */}
        <LinearGradient
          colors={['rgba(255,195,70,0.90)', 'rgba(255,195,70,0.50)', 'rgba(255,195,70,0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.14, y: 0.80 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* SHUTDOWN 🌑 — cold steel blue, bottom-left: dorsal freeze, withdrawal */}
        <LinearGradient
          colors={['rgba(55,80,110,0.88)', 'rgba(55,80,110,0.48)', 'rgba(55,80,110,0)']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.80, y: 0.14 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* WIRED 🌪 — coral-red, bottom-right: sympathetic activation, fight/flight */}
        <LinearGradient
          colors={['rgba(215,75,75,0.92)', 'rgba(215,75,75,0.52)', 'rgba(215,75,75,0)']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0.14, y: 0.14 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Safety axis: warm golden kiss at safe top, cold dark sink at unsafe bottom */}
        <LinearGradient
          colors={[
            'rgba(255,220,160,0.12)',   // warm ventral glow at top
            'rgba(255,220,160,0.03)',
            'rgba(10,6,24,0.00)',
            'rgba(10,6,24,0.28)',       // cold collapse weight at bottom
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Axis corner labels */}
        {[
          { lines: ['safe', 'low energy'],    pos: { top: 8,    left: 10  }, align: 'flex-start' },
          { lines: ['safe', 'high energy'],   pos: { top: 8,    right: 10 }, align: 'flex-end'   },
          { lines: ['unsafe', 'low energy'],  pos: { bottom: 8, left: 10  }, align: 'flex-start' },
          { lines: ['unsafe', 'high energy'], pos: { bottom: 8, right: 10 }, align: 'flex-end'   },
        ].map((corner, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[styles.axisCorner, corner.pos, { alignItems: corner.align }]}
          >
            {corner.lines.map((line, j) => (
              <Text key={j} style={styles.axisCornerText}>{line}</Text>
            ))}
          </View>
        ))}

        {/* State zone labels — floating, no dividers */}
        {QUAD_LABELS.map(ql => {
          const isActive = curState.name === ql.name
          const labelColor = isActive
            ? ZONE_COLORS[ql.name]?.label ?? '#FFFFFF'
            : 'rgba(255,255,255,0.22)'  // neutral dim white — readable across all quadrant colors
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
                  opacity: isActive ? 1 : 0.25,
                },
              ]}
            >
              <Text style={[styles.stateLabelIcon, isActive && styles.stateLabelIconActive]}>
                {ql.icon}
              </Text>
              <Text style={[styles.stateLabelText, { color: labelColor }, isActive && styles.stateLabelTextActive]}>
                {ql.label}
              </Text>
            </View>
          )
        })}

        {/* Cursor: white ring so it reads clearly across all blue tones */}
        <View
          pointerEvents="none"
          style={[styles.cursor, { left: curLeft, top: curTop }]}
        />
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
    backgroundColor: '#0F1020',
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
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  stateLabelTextActive: {
    fontWeight: '700',
    fontSize: 9,
  },
  cursor: {
    position: 'absolute',
    width: CURSOR_R * 2,
    height: CURSOR_R * 2,
    borderRadius: CURSOR_R,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.95)',
    backgroundColor: 'rgba(15,16,32,0.35)',    // midnight tinted fill
    shadowColor: '#FFC346',                    // warm golden glow — aspirational ventral warmth
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 11,
  },
  readout: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,16,32,0.72)',    // midnight base pill
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',      // neutral subtle border
  },
  readoutState: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  axisCorner: {
    position: 'absolute',
  },
  axisCornerText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 10,
    textShadowColor: 'rgba(0,0,20,0.70)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
})
