import { Animated, StyleSheet, View, TouchableOpacity, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRef, useEffect } from 'react'

/**
 * Standardized persistent transport bar shown during active flow.
 *
 * Playing:  [haptic]  [⏸ pause btn]  [settings]
 * Paused:   [haptic]  [■ stop]  [▶ play]  [settings]
 *                       [time pill]
 *
 * Stop button triggers end-flow confirmation via onStop.
 * The row fades in/out; timeDisplay (if provided) is always visible.
 */
export default function FlowTransportBar({
  isPaused,
  onPause,
  onPlay,
  onStop,
  onOpenSettings,
  onSkipNext,
  timeDisplay,
  showControls = true,
  containerStyle,
}) {
  const fadeAnim = useRef(new Animated.Value(showControls ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: showControls ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [showControls])

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.row, { opacity: fadeAnim }]}>
        {/* Left: haptic feedback button */}
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          activeOpacity={0.75}
        >
          <Ionicons name="phone-portrait-outline" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>

        {/* Center controls - pause button always stays dead center */}
        <View style={styles.centerControls}>
          {isPaused ? (
            <>
              <TouchableOpacity style={styles.stopBtn} onPress={onStop} activeOpacity={0.75}>
                <View style={styles.stopSquare} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playBtn} onPress={onPlay} activeOpacity={0.85}>
                <Ionicons name="play" size={30} color="#000000" style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.pauseBtn} onPress={onPause} activeOpacity={0.85}>
              <Ionicons name="pause" size={26} color="#000000" />
            </TouchableOpacity>
          )}
        </View>

        {/* Skip-next: absolutely positioned so it doesn't affect centering */}
        {!isPaused && onSkipNext && (
          <TouchableOpacity style={styles.skipNextBtn} onPress={onSkipNext} activeOpacity={0.85}>
            <Ionicons name="play-skip-forward" size={22} color="#000000" />
          </TouchableOpacity>
        )}

        {/* Right: settings button */}
        <TouchableOpacity style={styles.sideBtn} onPress={onOpenSettings} activeOpacity={0.75}>
          <Ionicons name="options-outline" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </Animated.View>

      {timeDisplay ? (
        <View style={styles.timePill}>
          <Text style={styles.timeText}>{timeDisplay}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 14,
    zIndex: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    width: '100%',
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
  pauseBtn: {
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
  playBtn: {
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
  skipNextBtn: {
    position: 'absolute',
    right: 104, // settings btn (52) + padding (36) + gap (16)
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
})
