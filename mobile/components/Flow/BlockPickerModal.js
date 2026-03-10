import { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { colors } from '../../constants/theme'
import { deriveStateFromDeltas } from '../../constants/polyvagalStates'
import BlockDeltaViz from './BlockDeltaViz'
import { supabase } from '../../supabase'

const STATE_COLORS = {
  shutdown: '#4A5A72',
  restful:  '#4ECDC4',
  wired:    '#8B5CF6',
  glowing:  '#F4B942',
  steady:   '#7DBCE7',
}

const STATE_LABELS = {
  shutdown: 'Shutdown',
  restful:  'Restful',
  wired:    'Wired',
  glowing:  'Glowing',
  steady:   'Steady',
}

export default function BlockPickerModal({ visible, onClose, onSelect }) {
  const [libraryBlocks, setLibraryBlocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visible) return
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('somi_blocks')
        .select('id, name, description, energy_delta, safety_delta, canonical_name, media_url')
        .eq('media_type', 'video')
        .eq('active', true)
        .eq('block_type', 'vagal_toning')
        .not('media_url', 'is', null)
      setLibraryBlocks(data || [])
      setLoading(false)
    }
    load()
  }, [visible])

  const handleSelect = (block) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSelect({
      somi_block_id:  block.id,
      name:           block.name,
      canonical_name: block.canonical_name,
      url:            block.media_url,
      type:           'somi_block',
      description:    block.description,
      energy_delta:   block.energy_delta,
      safety_delta:   block.safety_delta,
    })
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Exercise</Text>
          {!loading && (
            <Text style={styles.subtitle}>{libraryBlocks.length} exercises available</Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.accent.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(STATE_COLORS).map(([stateId, stateColor], si) => {
              const blocksForState = libraryBlocks.filter(b => {
                const s = deriveStateFromDeltas(b.energy_delta, b.safety_delta)
                return s?.name === stateId
              })
              if (blocksForState.length === 0) return null

              return (
                <View key={stateId}>
                  <View style={[styles.stateHeader, si === 0 && { marginTop: 0 }]}>
                    <View style={styles.stateHeaderLine} />
                    <Text style={[styles.stateHeaderText, { color: stateColor }]}>
                      {STATE_LABELS[stateId]}
                    </Text>
                    <View style={styles.stateHeaderLine} />
                  </View>

                  {blocksForState.map((block) => (
                    <TouchableOpacity
                      key={block.id}
                      onPress={() => handleSelect(block)}
                      style={[styles.blockRow, { borderColor: `${stateColor}40` }]}
                      activeOpacity={0.85}
                    >
                      <BlockDeltaViz
                        energyDelta={block.energy_delta}
                        safetyDelta={block.safety_delta}
                        size={36}
                      />
                      <View style={styles.blockInfo}>
                        <Text style={styles.blockName}>{block.name}</Text>
                        {block.description && (
                          <Text style={styles.blockDesc} numberOfLines={2}>{block.description}</Text>
                        )}
                      </View>
                      <View style={[styles.selectBtn, { backgroundColor: `${stateColor}20`, borderColor: `${stateColor}50` }]}>
                        <Text style={[styles.selectBtnText, { color: stateColor }]}>+</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.95)',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 26, fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 16, marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, fontWeight: '500',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24, marginBottom: 12,
    gap: 12,
  },
  stateHeaderLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stateHeaderText: {
    fontSize: 12, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  blockRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
  },
  blockInfo: { flex: 1, gap: 4 },
  blockName: {
    color: '#fff', fontSize: 16, fontWeight: '600',
  },
  blockDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, lineHeight: 18,
  },
  selectBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  selectBtnText: { fontSize: 22, fontWeight: '300', lineHeight: 26 },
})
