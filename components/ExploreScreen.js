import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'

const CATEGORIES = [
  {
    id: 'vagal_toning',
    name: 'Vagal Toning',
    colors: ['#FF6B6B', '#FF8E53'],
    emoji: '✨',
  },
  {
    id: 'qigong',
    name: 'Qigong',
    colors: ['#4ECDC4', '#44A08D'],
    emoji: '🍃',
  },
  {
    id: 'felt_sense',
    name: 'Felt Sense',
    colors: ['#A8DADC', '#457B9D'],
    emoji: '💫',
  },
  {
    id: 'meditation',
    name: 'Meditation',
    colors: ['#9D84B7', '#7B68A6'],
    emoji: '🌙',
  },
]

export default function ExploreScreen({ navigation }) {
  const handleCategoryPress = (category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    navigation.navigate('CategoryDetail', {
      categoryId: category.id,
      categoryName: category.name,
      categoryColors: category.colors,
    })
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      {/* Sticky Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Choose your practice</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Grid */}
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category, index) => (
            <TouchableOpacity
              key={category.id}
              activeOpacity={0.85}
              onPress={() => handleCategoryPress(category)}
              style={styles.categoryWrapper}
            >
              <LinearGradient
                colors={category.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.categoryCard}
              >
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    color: '#f7f9fb',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  categoryGrid: {
    gap: 16,
  },
  categoryWrapper: {
    width: '100%',
    aspectRatio: 2.5,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryCard: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  categoryEmoji: {
    fontSize: 40,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
})
