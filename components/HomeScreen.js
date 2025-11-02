import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'

export default function HomeScreen({ navigation }) {
  // Sample video data - using the provided thumbnail URL
  const videos = [
    {
      id: '1',
      title: 'Deep Breathing Exercise',
      thumbnail: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/video_thumbnail.png',
      url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/test.mov',
      type: 'video',
    },
    {
      id: '2',
      title: 'Vagus Nerve Activation',
      thumbnail: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/video_thumbnail.png',
      url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/test.mov',
      type: 'video',
    },
    {
      id: '3',
      title: 'Calming Breath Work',
      thumbnail: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/video_thumbnail.png',
      url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/test.mov',
      type: 'video',
    },
  ]

  const handleVideoPress = (video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate('Player', { media: video })
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      {/* SoMi Logo at top */}
      <View style={styles.logoSection}>
        <Text style={styles.logoText}>SoMi</Text>
      </View>

      {/* Welcome section - vertically centered */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>Hi there.</Text>
          <Text style={styles.welcomeSubtext}>Welcome back</Text>

          <BlurView intensity={20} tint="dark" style={styles.statsCard}>
            <View style={styles.statsContent}>
              <Text style={styles.statsLabel}>Last check-in</Text>
              <View style={styles.statRow}>
                <LinearGradient
                  colors={['#4ecdc4', '#44a08d']}
                  style={styles.progressIndicator}
                >
                  <Text style={styles.statsChange}>+35%</Text>
                </LinearGradient>
              </View>
              <Text style={styles.statsDetail}>Mobilized → Ventral</Text>
            </View>
          </BlurView>
        </View>
      </View>

      {/* Video carousel section */}
      <View style={styles.carouselSection}>
        <View style={styles.carouselHeader}>
          <Text style={styles.carouselTitle}>Regulation Practices</Text>
          <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          decelerationRate="fast"
          snapToInterval={260}
        >
          {videos.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.videoCard}
              onPress={() => handleVideoPress(video)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: video.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.thumbnailOverlay}
              />
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{video.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoSection: {
    paddingTop: 70,
    paddingBottom: 30,
    alignItems: 'center',
  },
  logoText: {
    color: '#f7f9fb',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  logoSubtext: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  welcomeSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeContent: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    color: '#f7f9fb',
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtext: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  statsContent: {
    padding: 24,
    alignItems: 'center',
  },
  statsLabel: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  statsChange: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsDetail: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  carouselSection: {
    paddingBottom: 20,
    paddingTop: 30,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  carouselTitle: {
    color: '#f7f9fb',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  seeAllText: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  carouselContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  videoCard: {
    width: 260,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    color: '#f7f9fb',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})
