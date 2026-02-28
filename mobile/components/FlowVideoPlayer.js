import React from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'
import { VideoView } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import { colors } from '../constants/theme'
import FlowProgressHeader from './FlowProgressHeader'
import PlayerControls from './PlayerControls'

export default function FlowVideoPlayer({
  player,
  currentVideo,
  isPlaying,
  videoCurrentTime,
  videoDuration,
  showBackground,
  showOverlay,
  onScreenTap,
  onPlayPause,
  onExit,
  onOpenSettings,
  onSkip,
}) {
  const cappedDuration = Math.min(videoDuration, 60)
  const fillWidth = `${Math.min(100, (videoCurrentTime / Math.max(1, cappedDuration)) * 100)}%`

  return (
    <View style={styles.container}>
      {/* Flow Progress Header - always visible at top */}
      <View style={styles.progressHeader}>
        <FlowProgressHeader />
      </View>

      <Pressable style={styles.playerArea} onPress={onScreenTap}>
        {showBackground ? (
          <LinearGradient
            colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
            style={styles.backgroundGradient}
          >
            <Text style={styles.backgroundText}>SoMi</Text>
            <Text style={styles.backgroundSubtext}>audio only</Text>
          </LinearGradient>
        ) : (
          player && (
            <VideoView
              style={styles.video}
              player={player}
              nativeControls={false}
              contentFit="cover"
            />
          )
        )}
      </Pressable>

      <PlayerControls
        isPaused={!isPlaying}
        onPause={onPlayPause}
        onPlay={onPlayPause}
        onStop={onExit}
        onOpenSettings={onOpenSettings}
        skipLabel={currentVideo?.name ? `Skip ${currentVideo.name}` : 'Skip Block'}
        onSkip={onSkip}
        fillWidth={fillWidth}
        showControls={showOverlay}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  playerArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  backgroundGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundText: {
    color: colors.text.primary,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 16,
  },
  backgroundSubtext: {
    color: colors.text.muted,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 1,
  },
})
