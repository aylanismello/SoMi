import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useWeeklyFlows } from '../hooks/useSupabaseQueries'

function computeStreak(chains) {
  if (!chains || chains.length === 0) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayOfWeek = today.getDay()
  let streak = 0
  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const has = chains.some(c => {
      const cd = new Date(c.created_at)
      cd.setHours(0, 0, 0, 0)
      return cd.getTime() === d.getTime()
    })
    if (has) streak++
    else break
  }
  return streak
}

// style prop allows each screen to control positioning (absolute for Home, padding for others)
export default function SoMiHeader({ onRightPress, rightIcon = 'heart', style }) {
  const { data: weeklyChains = [] } = useWeeklyFlows()
  const streak = computeStreak(weeklyChains)

  const handleRight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onRightPress?.()
  }

  return (
    <View style={style}>
      <View style={styles.row}>
        <View style={styles.streakPill}>
          <Ionicons name="flame" size={15} color="#FF6B35" />
          <Text style={styles.streakText}>{streak}</Text>
        </View>

        <Text style={styles.logoText}>SoMi</Text>

        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={handleRight}>
          <Ionicons
            name={rightIcon === 'settings' ? 'settings-outline' : 'heart'}
            size={17}
            color="rgba(255,255,255,0.82)"
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    height: 44,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  streakText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  logoText: {
    fontSize: 21,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1.8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
