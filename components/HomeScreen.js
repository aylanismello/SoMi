import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native'
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
    <View style={styles.container}>
      {/* SoMi Logo at top */}
      <View style={styles.logoSection}>
        <Text style={styles.logoText}>SoMi</Text>
      </View>

      {/* Welcome section - vertically centered */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>hi there.{'\n'}welcome back to SoMi.</Text>
          <Text style={styles.statsText}>"Last check-in: +35%{'\n'}— Mobilized to Ventral."</Text>
        </View>
      </View>

      {/* Video carousel section */}
      <View style={styles.carouselSection}>
        <View style={styles.carouselHeader}>
          <Text style={styles.carouselTitle}>Browse Videos</Text>
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
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{video.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  logoSection: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 1,
  },
  welcomeSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 40,
    marginBottom: 30,
    textAlign: 'center',
  },
  statsText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 26,
    opacity: 0.8,
    textAlign: 'center',
  },
  carouselSection: {
    paddingBottom: 40,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  carouselTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '500',
  },
  carouselContent: {
    paddingHorizontal: 30,
    gap: 20,
  },
  videoCard: {
    width: 240,
    marginRight: 20,
  },
  thumbnail: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  videoInfo: {
    marginTop: 12,
  },
  videoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
})
