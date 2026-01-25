import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'

export default function CollapsibleCategorySelector({ blocks, selectedBlockId, onBlockSelect }) {
  const handleBlockPress = (block) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onBlockSelect(block)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>choose a different block:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {blocks.map((block) => {
          const isSelected = selectedBlockId === block.id

          return (
            <TouchableOpacity
              key={block.id}
              onPress={() => handleBlockPress(block)}
              style={[
                styles.blockCard,
                isSelected && styles.blockCardSelected,
              ]}
              activeOpacity={0.8}
            >
              <BlurView intensity={10} tint="dark" style={styles.blockCardBlur}>
                <Text style={styles.blockName} numberOfLines={2}>
                  {block.name}
                </Text>
              </BlurView>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  blockCard: {
    width: 140,
    height: 70,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  blockCardSelected: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
  },
  blockCardBlur: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockName: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
})
