import { StyleSheet, View, Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { colors } from '../constants/theme'

export default function ExploreScreen() {
  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <View style={styles.card}>
        <BlurView intensity={40} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
        <View style={styles.borderOverlay} />
        <Text style={styles.icon}>🚧</Text>
        <Text style={styles.title}>Under Construction</Text>
        <Text style={styles.subtitle}>Something interesting is coming here.</Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 36,
    width: '100%',
  },
  borderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
})
