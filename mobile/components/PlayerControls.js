import { useRef, useEffect } from 'react'
import { StyleSheet, View, Text, Animated, Pressable, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { GlassView } from 'expo-glass-effect'

/**
 * Combined transport bar + skip bar for all three player screens:
 * body scan, integration interstitial, and video phase.
 *
 * Both elements fade together under one 300ms parent opacity.
 *
 * Props:
 *   isPaused      – boolean
 *   onPause       – callback
 *   onPlay        – callback
 *   onStop        – callback (end session)
 *   onOpenSettings – callback
 *   skipLabel     – e.g. "Skip Body Scan" / "Skip Integration" / "Skip Block"
 *   onSkip        – called when skip bar is tapped
 *   fillWidth     – Animated interpolation or string "75%" for progress fill
 *   showControls  – drives fade in/out
 *   timeDisplay   – optional string shown in a pill below transport row
 */
export default function PlayerControls({
  isPaused,
  onPause,
  onPlay,
  onStop,
  onOpenSettings,
  skipLabel,
  onSkip,
  fillWidth,
  showControls,
  timeDisplay,
}) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: showControls ? 1 : 0,
      duration: 380,
      useNativeDriver: true,
    }).start()
  }, [showControls])

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPause?.()
  }

  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPlay?.()
  }

  const handleStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onStop?.()
  }

  return (
    <Animated.View
      style={[styles.root, { opacity }]}
      pointerEvents={showControls ? 'box-none' : 'none'}
    >
      {/* ── Transport row ── */}
      <View style={styles.transportRow}>
        {/* Left: haptic feedback */}
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          activeOpacity={0.75}
        >
          <Ionicons name="phone-portrait-outline" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>

        {/* Center controls */}
        <View style={styles.centerControls}>
          {isPaused ? (
            <>
              <TouchableOpacity style={styles.stopBtn} onPress={handleStop} activeOpacity={0.75}>
                <View style={styles.stopSquare} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.mainBtn} onPress={handlePlay} activeOpacity={0.85}>
                <Ionicons name="play" size={30} color="#000000" style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.mainBtn} onPress={handlePause} activeOpacity={0.85}>
              <Ionicons name="pause" size={26} color="#000000" />
            </TouchableOpacity>
          )}
        </View>

        {/* Right: settings */}
        <TouchableOpacity style={styles.sideBtn} onPress={onOpenSettings} activeOpacity={0.75}>
          <Ionicons name="options-outline" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      {timeDisplay ? (
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{timeDisplay}</Text>
        </View>
      ) : null}

      {/* ── Skip bar ── */}
      <Pressable onPress={onSkip} style={styles.skipPressable}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={styles.scrim}
          pointerEvents="none"
        />
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          style={styles.track}
        >
          <Animated.View style={[styles.fill, { width: fillWidth ?? 0 }]} />
          <View style={styles.trackContent}>
            <Text style={styles.skipLabel}>{skipLabel}</Text>
            <Text style={styles.skipArrow}>›</Text>
          </View>
        </GlassView>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 14,
    zIndex: 20,
    paddingBottom: 44,
  },
  // ── Transport row ──
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    width: '100%',
    marginTop: 96, // pushes transport row up from skip bar — keeps transport ~140px from bottom
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mainBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: 18,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 3,
  },
  timePill: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
  },
  timeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  // ── Skip bar ──
  skipPressable: {
    width: '100%',
    paddingHorizontal: 20,
  },
  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  track: {
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 32,
  },
  trackContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  skipLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  skipArrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 26,
    fontWeight: '300',
  },
})
