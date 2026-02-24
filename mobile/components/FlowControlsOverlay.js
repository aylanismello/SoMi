import { useState, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Animated, Modal, PanResponder } from 'react-native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useSettingsStore } from '../stores/settingsStore'
import { useFlowMusicStore } from '../stores/flowMusicStore'

/**
 * Standardized flow controls overlay.
 * Layout: skip block + audio centered in middle, pause/end pinned to bottom.
 */
export default function FlowControlsOverlay({
  visible,
  opacity,
  isPaused,
  onSkipBlock,
  onPauseResume,
  onEndFlow,
  onDismiss,
  onInteraction,
}) {
  const { isMusicEnabled, isSfxEnabled, toggleMusic, toggleSfx } = useSettingsStore()
  const { updateMusicSetting, setVolume: setFlowMusicVolume, volume: storeMusicVolume } = useFlowMusicStore()
  const [showAudioModal, setShowAudioModal] = useState(false)
  const [musicVolume, setMusicVolume] = useState(Math.round(storeMusicVolume * 100))
  const [sfxVolume, setSfxVolume] = useState(100)

  const resetTimer = () => {
    if (onInteraction) onInteraction()
  }

  const handlePauseResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!isPaused) {
      updateMusicSetting(false)
    } else {
      updateMusicSetting(isMusicEnabled)
    }
    onPauseResume()
    resetTimer()
  }

  const handleOpenAudio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowAudioModal(true)
    resetTimer()
  }

  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      {/* Scrim - tap to dismiss */}
      <TouchableOpacity
        style={styles.scrim}
        activeOpacity={1}
        onPress={onDismiss}
      />

      {/* Center area: Skip Block + Audio */}
      <View style={styles.centerArea} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.skipBlockButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onSkipBlock()
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.skipBlockText}>SKIP BLOCK</Text>
          <Text style={styles.skipBlockIcon}>⏭</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.audioButton}
          onPress={handleOpenAudio}
          activeOpacity={0.7}
        >
          <Text style={styles.audioIcon}>🔊</Text>
          <Text style={styles.audioText}>Audio</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom area: Pause + End */}
      <View style={styles.bottomArea} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={handlePauseResume}
          activeOpacity={0.8}
        >
          <Text style={styles.pauseIcon}>{isPaused ? '▶' : '❚❚'}</Text>
          <Text style={styles.pauseText}>{isPaused ? 'RESUME FLOW' : 'PAUSE FLOW'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onEndFlow()
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.endIcon}>⊖</Text>
          <Text style={styles.endText}>END FLOW</Text>
        </TouchableOpacity>
      </View>

      {/* Audio Volume Modal */}
      <Modal
        visible={showAudioModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAudioModal(false)}
      >
        <TouchableOpacity
          style={styles.audioModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAudioModal(false)}
        >
          <View style={styles.audioModalContent}>
            {/* Music Volume Slider */}
            <View style={styles.volumeColumn}>
              <VolumeSlider
                value={musicVolume}
                onChange={(val) => {
                  setMusicVolume(val)
                  setFlowMusicVolume(val / 100)
                }}
              />
              <Text style={styles.volumeIcon}>🎵</Text>
              <Text style={styles.volumeLabel}>MUSIC</Text>
            </View>

            {/* SFX Volume Slider */}
            <View style={styles.volumeColumn}>
              <VolumeSlider
                value={sfxVolume}
                onChange={(val) => {
                  setSfxVolume(val)
                  // SFX volume is handled by soundManager
                  const { soundManager } = require('../utils/SoundManager')
                  if (soundManager.setVolume) soundManager.setVolume(val / 100)
                }}
              />
              <Text style={styles.volumeIcon}>🔊</Text>
              <Text style={styles.volumeLabel}>SOUND</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  )
}

/**
 * Vertical volume slider component - tall rounded bar you drag up/down.
 */
function VolumeSlider({ value, onChange }) {
  const sliderHeight = 280
  const trackRef = useRef(null)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        updateFromTouch(evt)
      },
      onPanResponderMove: (evt) => {
        updateFromTouch(evt)
      },
      onPanResponderRelease: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      },
    })
  ).current

  const updateFromTouch = (evt) => {
    if (trackRef.current) {
      trackRef.current.measure((x, y, width, height, pageX, pageY) => {
        const touchY = evt.nativeEvent.pageY - pageY
        const pct = Math.round(Math.max(0, Math.min(100, ((height - touchY) / height) * 100)))
        onChange(pct)
      })
    }
  }

  const fillHeight = `${value}%`

  return (
    <View
      ref={trackRef}
      style={styles.volumeTrack}
      {...panResponder.panHandlers}
    >
      <View style={[styles.volumeFill, { height: fillHeight }]} />
      <Text style={styles.volumeValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  // Center area - skip + audio
  centerArea: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 16,
  },
  skipBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(80, 80, 80, 0.9)',
    borderRadius: 22,
  },
  skipBlockText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  skipBlockIcon: {
    color: '#ffffff',
    fontSize: 16,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(60, 60, 60, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  audioIcon: {
    fontSize: 18,
  },
  audioText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Bottom area - pause + end
  bottomArea: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    gap: 10,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    backgroundColor: 'rgba(70, 70, 70, 0.9)',
    borderRadius: 20,
  },
  pauseIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  pauseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    backgroundColor: 'rgba(60, 60, 60, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  endIcon: {
    color: '#ff6b6b',
    fontSize: 20,
  },
  endText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Audio modal
  audioModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioModalContent: {
    flexDirection: 'row',
    gap: 40,
    alignItems: 'center',
  },
  volumeColumn: {
    alignItems: 'center',
    gap: 16,
  },
  volumeTrack: {
    width: 90,
    height: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  volumeFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 24,
  },
  volumeValue: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    color: '#000000',
    fontSize: 24,
    fontWeight: '700',
    zIndex: 10,
  },
  volumeIcon: {
    fontSize: 24,
  },
  volumeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
})
