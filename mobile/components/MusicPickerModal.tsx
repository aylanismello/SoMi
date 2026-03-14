import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { useAudioPlayer } from 'expo-audio'
import { useSettingsStore } from '../stores/settingsStore'
import { useFlowMusicStore, TRACKS } from '../stores/flowMusicStore'
import { colors } from '../constants/theme'
import type { Track, TrackId } from '../types'

const PREVIEW_DURATION_MS = 15000

interface MusicPickerModalProps {
  visible: boolean
  onClose: () => void
}

export default function MusicPickerModal({ visible, onClose }: MusicPickerModalProps): React.JSX.Element {
  const { selectedTrackId, setSelectedTrack } = useSettingsStore()
  const { isPlaying, switchTrack } = useFlowMusicStore()

  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewPlayer = useAudioPlayer(null)

  const stopPreview = () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = null
    try { previewPlayer.pause() } catch (_) {}
    setPreviewingId(null)
  }

  const handlePreview = (track: Track) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (previewingId === track.id) {
      stopPreview()
      return
    }

    // Stop any in-progress preview first
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    try { previewPlayer.pause() } catch (_) {}

    try {
      previewPlayer.replace({ uri: track.url! })
      previewPlayer.volume = 1
      previewPlayer.play()
      setPreviewingId(track.id)

      previewTimerRef.current = setTimeout(() => {
        try { previewPlayer.pause() } catch (_) {}
        setPreviewingId(null)
        previewTimerRef.current = null
      }, PREVIEW_DURATION_MS)
    } catch (e) {
      console.error('❌ Preview error:', e)
      setPreviewingId(null)
    }
  }

  const handleSelect = (trackId: TrackId) => {
    stopPreview()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedTrack(trackId)
    if (isPlaying) switchTrack(trackId)
    onClose()
  }

  // Stop preview when modal closes
  useEffect(() => {
    if (!visible) stopPreview()
  }, [visible])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
      try { previewPlayer.pause() } catch (_) {}
    }
  }, [])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.title}>Music</Text>

          <View style={styles.trackList}>
            {TRACKS.map((track, index) => {
              const isSelected = selectedTrackId === track.id
              const isPreviewing = previewingId === track.id
              const isLast = index === TRACKS.length - 1

              return (
                <View key={track.id}>
                  <TouchableOpacity
                    style={[styles.trackRow, isSelected && styles.trackRowSelected]}
                    onPress={() => handleSelect(track.id)}
                    activeOpacity={0.7}
                  >
                    {/* Disc / play button area */}
                    {track.url ? (
                      <TouchableOpacity
                        style={[styles.disc, track.color && { backgroundColor: track.color }, isPreviewing && styles.discPlaying]}
                        onPress={() => handlePreview(track)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name={isPreviewing ? 'stop' : 'play'}
                          size={18}
                          color="rgba(255,255,255,0.85)"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.disc, track.color && { backgroundColor: track.color }]}>
                        <Text style={styles.discOff}>—</Text>
                      </View>
                    )}

                    {/* Track info */}
                    <View style={styles.trackInfo}>
                      <Text style={[styles.trackName, isSelected && styles.trackNameSelected]}>
                        {track.label}
                      </Text>
                      {track.artist && (
                        <Text style={styles.trackArtist}>{track.artist}</Text>
                      )}
                    </View>

                    {/* Right side: checkmark only */}
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.accent.primary}
                      />
                    )}
                  </TouchableOpacity>

                  {!isLast && <View style={styles.separator} />}
                </View>
              )
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 22,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  trackList: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  trackRowSelected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  disc: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discPlaying: {
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  discOff: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: '300',
    lineHeight: 22,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 13,
    gap: 2,
  },
  trackName: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  trackNameSelected: {
    color: '#fff',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 13,
    fontWeight: '400',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginLeft: 14 + 42 + 13, // align with track text
  },
})
