import { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import SoMiHeader from './SoMiHeader'
import { WATER_BG_URI } from '../constants/media'
import { useAuthStore } from '../stores/authStore'

const EXPLORE_BETA_EMAIL = 'francescoflows@gmail.com'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.52)
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.52)

// Based on actual block types in DB: vagal_toning (16 blocks)
// Future categories shown as aspirational pills
const CATEGORY_ROWS = [
  [
    { id: 'vagal_toning', label: 'Vagal Toning', emoji: '🫀' },
    { id: 'havening', label: 'Havening', emoji: '🤲' },
    { id: 'humming', label: 'Humming', emoji: '🎵' },
    { id: 'movement', label: 'Movement', emoji: '🤸' },
    { id: 'gaze_work', label: 'Gaze Work', emoji: '👁️' },
  ],
  [
    { id: 'calm', label: 'Calm Down', emoji: '⛅' },
    { id: 'release', label: 'Release', emoji: '🌪️' },
    { id: 'energize', label: 'Energize', emoji: '☀️' },
    { id: 'rest', label: 'Rest', emoji: '🌦' },
    { id: 'grounding', label: 'Ground', emoji: '🌱' },
  ],
]

// Real vagal toning blocks from DB, fake durations for visual
const FEATURED_BLOCKS = [
  { id: 1, name: 'Vagus Reset', emoji: '🫀', duration: '2 min', tag: 'Calming' },
  { id: 2, name: 'Self Havening', emoji: '🤲', duration: '3 min', tag: 'Soothing' },
  { id: 3, name: 'Heart Opener', emoji: '💚', duration: '2 min', tag: 'Connecting' },
  { id: 4, name: 'Humming', emoji: '🎵', duration: '4 min', tag: 'Regulating' },
  { id: 5, name: 'Brain Hold', emoji: '🧠', duration: '2 min', tag: 'Settling' },
  { id: 6, name: 'Body Tapping', emoji: '✋', duration: '3 min', tag: 'Energizing' },
  { id: 7, name: 'Ear Stretch', emoji: '👂', duration: '2 min', tag: 'Calming' },
  { id: 8, name: 'Shaking', emoji: '💥', duration: '3 min', tag: 'Releasing' },
]

const DAILY_FLOWS = [
  {
    id: 'morning_5',
    title: 'Wake\nUp',
    duration: '5 mins',
    gradientColors: ['#6B3F1E', '#1C0E08'],
    emoji: '☀️',
  },
  {
    id: 'night_5',
    title: 'Wind\nDown',
    duration: '5 mins',
    gradientColors: ['#1B2A4A', '#090F1E'],
    emoji: '🌙',
  },
  {
    id: 'morning_10',
    title: 'Morning\nFlow',
    duration: '10 mins',
    gradientColors: ['#7B3F00', '#2A1000'],
    emoji: '🌅',
  },
  {
    id: 'night_10',
    title: 'Deep\nRest',
    duration: '10 mins',
    gradientColors: ['#1A244A', '#060D1A'],
    emoji: '🌌',
  },
  {
    id: 'morning_15',
    title: 'Full\nMorning',
    duration: '15 mins',
    gradientColors: ['#6B3A00', '#1A0900'],
    emoji: '🌄',
  },
  {
    id: 'night_15',
    title: 'Night\nRestore',
    duration: '15 mins',
    gradientColors: ['#122035', '#050C18'],
    emoji: '🌠',
  },
]

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

function ComingSoonScreen() {
  return (
    <View style={styles.container}>
      <Image source={{ uri: WATER_BG_URI }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(10,20,34,0.75)', 'rgba(15,27,45,0.82)', 'rgba(10,20,34,0.75)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonEmoji}>🛠</Text>
        <Text style={styles.comingSoonHeading}>Still wippin'</Text>
        <Text style={styles.comingSoonSub}>Come back soon.</Text>
      </View>
    </View>
  )
}

export default function ExploreScreen() {
  const [searchText, setSearchText] = useState('')
  const user = useAuthStore((state) => state.user)

  const userEmail = user?.email || user?.user_metadata?.email
  if (userEmail !== EXPLORE_BETA_EMAIL) return <ComingSoonScreen />

  return (
    <View style={styles.container}>
      <Image source={{ uri: WATER_BG_URI }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(10,20,34,0.75)', 'rgba(15,27,45,0.82)', 'rgba(10,20,34,0.75)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Fixed header — same as Home + Profile */}
      <SoMiHeader style={styles.header} onRightPress={tap} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.38)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search practices"
            placeholderTextColor="rgba(255,255,255,0.38)"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* ── Somatic Practices ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Somatic Practices</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={tap}>
            <Text style={styles.viewAllText}>view all</Text>
          </TouchableOpacity>
        </View>

        {CATEGORY_ROWS.map((row, rowIdx) => (
          <ScrollView
            key={rowIdx}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
            style={rowIdx > 0 ? styles.pillRowSpacing : undefined}
          >
            {row.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={tap}
                activeOpacity={0.75}
                style={styles.pill}
              >
                <Text style={styles.pillEmoji}>{cat.emoji}</Text>
                <Text style={styles.pillLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ))}

        {/* ── Featured Practices ────────────────────────────────── */}
        <View style={styles.sectionHeader2}>
          <Text style={styles.sectionTitle}>Featured Practices</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={tap}>
            <Text style={styles.viewAllText}>view all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredRow}
        >
          {FEATURED_BLOCKS.map((block) => (
            <TouchableOpacity
              key={block.id}
              onPress={tap}
              activeOpacity={0.8}
              style={styles.featuredCard}
            >
              <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.featuredCardBorder} />
              <Text style={styles.featuredEmoji}>{block.emoji}</Text>
              <Text style={styles.featuredName}>{block.name}</Text>
              <View style={styles.featuredMeta}>
                <Text style={styles.featuredDuration}>{block.duration}</Text>
                <View style={styles.featuredTag}>
                  <Text style={styles.featuredTagText}>{block.tag}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Daily Flows ───────────────────────────────────────── */}
        <View style={styles.sectionHeader2}>
          <Text style={styles.sectionTitle}>Daily Flows</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flowCardsRow}
        >
          {DAILY_FLOWS.map((flow) => (
            <TouchableOpacity
              key={flow.id}
              onPress={tap}
              activeOpacity={0.85}
              style={[styles.flowCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
            >
              <LinearGradient
                colors={flow.gradientColors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />

              {/* NEW badge */}
              <View style={styles.newBadgeWrap}>
                <BlurView intensity={30} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>

              {/* Center emoji */}
              <Text style={styles.flowEmoji}>{flow.emoji}</Text>

              {/* Bottom: title + play */}
              <View style={styles.flowCardBottom}>
                <View style={styles.flowTitleBlock}>
                  <Text style={styles.flowTitle}>{flow.title}</Text>
                  <Text style={styles.flowDuration}>{flow.duration}</Text>
                </View>
                <View style={styles.playBtnWrap}>
                  <BlurView intensity={32} tint="systemUltraThinMaterialDark" style={StyleSheet.absoluteFill} />
                  <Text style={styles.playBtnText}>Play</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1422',
  },
  header: {
    paddingTop: 58,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },

  // ── Search ────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 32,
    height: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 18,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // ── Section headers ───────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 32,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  viewAllText: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Category pills ─────────────────────────────────────────────
  pillRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  pillRowSpacing: {
    marginTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.13)',
    gap: 9,
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // ── Featured blocks ────────────────────────────────────────────
  featuredRow: {
    paddingLeft: 20,
    paddingRight: 8,
    gap: 12,
  },
  featuredCard: {
    width: 140,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'space-between',
  },
  featuredCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  featuredEmoji: {
    fontSize: 32,
  },
  featuredName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    flex: 1,
    marginTop: 8,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredDuration: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  featuredTag: {
    backgroundColor: 'rgba(0,217,163,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  featuredTagText: {
    color: '#00D9A3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Daily Flows cards ──────────────────────────────────────────
  flowCardsRow: {
    paddingLeft: 20,
    paddingRight: 8,
    gap: 12,
  },
  flowCard: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newBadgeWrap: {
    height: 26,
    paddingHorizontal: 14,
    borderRadius: 13,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  newBadgeText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  flowEmoji: {
    fontSize: 42,
    textAlign: 'center',
  },
  flowCardBottom: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  flowTitleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  flowTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 33,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  flowDuration: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    fontWeight: '500',
  },
  playBtnWrap: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 40,
  },

  // ── Coming soon gate ──────────────────────────────────────────
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  comingSoonEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  comingSoonHeading: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  comingSoonSub: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 16,
    fontWeight: '500',
  },
})
