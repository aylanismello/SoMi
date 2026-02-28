import React from 'react'
import { StyleSheet, View, Text, Pressable, Animated } from 'react-native'
import { VideoView } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import FlowProgressHeader from './FlowProgressHeader'
import PlayerControls from './PlayerControls'

// Integration messages that rotate every 10 seconds
const INTEGRATION_MESSAGES = [
  "sense your body...\nnotice what's present",
  "where do you feel\nthis in your body?",
  "what sensations\nare you noticing?",
  "breathe into\nany tension",
  "allow whatever\nis here to be here",
  "notice without\njudging",
]

export { INTEGRATION_MESSAGES }

export default function FlowIntegration({
  oceanPlayer,
  oceanOpacity,
  previewPlayer,
  currentVideo,
  isPaused,
  messageIndex,
  messageOpacity,
  fillWidth,
  showOverlay,
  onScreenTap,
  onPauseResume,
  onSkip,
  onExit,
  onOpenSettings,
}) {
  return (
    <View style={styles.container}>
      {/* Ocean background video */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: oceanOpacity }]}>
        <VideoView
          player={oceanPlayer}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
      </Animated.View>
      {/* Dark overlay */}
      <View style={[StyleSheet.absoluteFillObject, styles.overlay]} />

      <FlowProgressHeader />

      {/* Main content — tappable to show overlay controls */}
      <Pressable style={styles.content} onPress={onScreenTap}>
        {/* Rotating integration message */}
        <Animated.Text style={[styles.integrationMessage, { opacity: messageOpacity }]}>
          {INTEGRATION_MESSAGES[messageIndex]}
        </Animated.Text>

        {/* Small next block video preview */}
        {currentVideo?.media_url && (
          <View style={styles.previewCard}>
            <VideoView
              player={previewPlayer}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              nativeControls={false}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.previewTopOverlay}
            >
              <Text style={styles.previewLabel}>UP NEXT</Text>
              <Text style={styles.previewName}>{currentVideo.name}</Text>
            </LinearGradient>
          </View>
        )}
      </Pressable>

      <PlayerControls
        isPaused={isPaused}
        onPause={onPauseResume}
        onPlay={onPauseResume}
        onStop={onExit}
        onOpenSettings={onOpenSettings}
        skipLabel="Skip Integration"
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
    backgroundColor: '#000',
    paddingTop: 48,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  integrationMessage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: 0.2,
    marginBottom: 40,
  },
  previewCard: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  previewTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 40,
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
})
