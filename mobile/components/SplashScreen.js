import { View, Text, StyleSheet, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import { useVideoPlayer, VideoView } from 'expo-video'
import { colors } from '../constants/theme'

const OCEAN_VIDEO_URI = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20videos/ocean_loop_final.mp4'

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current

  const oceanPlayer = useVideoPlayer(OCEAN_VIDEO_URI, (player) => {
    player.loop = true
    player.muted = true
    player.play()
  })

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()
  }, [])

  return (
    <View style={styles.container}>
      <VideoView
        player={oceanPlayer}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.overlay} />
      <Animated.View style={[styles.content, { opacity }]}>
        <Text style={styles.logo}>SoMi</Text>
        <Text style={styles.tagline}>your embodiment practice guide</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,15,30,0.72)',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 4,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text.secondary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
})
