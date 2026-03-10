import { useState, useEffect, useRef, useCallback } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Animated } from 'react-native'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { colors } from '../../constants/theme'
import { useEditFlowStore } from '../../stores/editFlowStore'
import { api } from '../../services/api'
import BlockDeltaViz from './BlockDeltaViz'

const SECTION_LABELS = {
  warm_up: 'WARM UP',
  main: 'MAIN',
  integration: 'INTEGRATION',
}

function getSectionLabel(name) {
  return SECTION_LABELS[name] || name.toUpperCase()
}

export default function EditFlowScreen() {
  const segments = useEditFlowStore((s) => s.segments)
  const swapBlock = useEditFlowStore((s) => s.swapBlock)

  const [allBlocks, setAllBlocks] = useState([])
  const [pickerVisible, setPickerVisible] = useState(false)
  const [pickerBlockIndex, setPickerBlockIndex] = useState(-1)
  const [searchQuery, setSearchQuery] = useState('')
  const [swappedIndex, setSwappedIndex] = useState(-1)
  const swappedTimer = useRef(null)

  // Fetch all blocks on mount
  useEffect(() => {
    let cancelled = false
    api.getAllBlocks().then((res) => {
      if (!cancelled && res.blocks) setAllBlocks(res.blocks)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const queue = segments.filter((s) => s.type === 'somi_block')
  const totalSecs = queue.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0)
  const displayMin = Math.ceil(totalSecs / 60)

  const openPicker = (blockIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setPickerBlockIndex(blockIndex)
    setSearchQuery('')
    setPickerVisible(true)
  }

  const handleSwap = (newBlock) => {
    swapBlock(pickerBlockIndex, newBlock)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setPickerVisible(false)
    setSwappedIndex(pickerBlockIndex)
    clearTimeout(swappedTimer.current)
    swappedTimer.current = setTimeout(() => setSwappedIndex(-1), 1200)
  }

  // Filter & group blocks for picker
  const filteredBlocks = searchQuery.trim()
    ? allBlocks.filter((b) => b.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allBlocks

  const groupedBlocks = (() => {
    const hasSections = filteredBlocks.some((b) => b.section)
    if (!hasSections) return [{ name: null, items: filteredBlocks }]
    const groups = {}
    const order = ['warm_up', 'main', 'integration']
    filteredBlocks.forEach((b) => {
      const s = b.section || 'main'
      if (!groups[s]) groups[s] = []
      groups[s].push(b)
    })
    return order
      .filter((s) => groups[s])
      .map((s) => ({ name: s, items: groups[s] }))
  })()

  const currentBlock = pickerBlockIndex >= 0 ? queue[pickerBlockIndex] : null

  // ── Render block rows ──────────────────────────────────────────────────────
  const renderBlockList = () => {
    const hasSections = queue.some((b) => b.section)

    if (hasSections) {
      const groups = []
      let curSection = null
      queue.forEach((block, i) => {
        const name = block.section || 'main'
        if (name !== curSection) { curSection = name; groups.push({ name, items: [] }) }
        groups[groups.length - 1].items.push({ block, globalIndex: i })
      })

      return groups.map((group) => (
        <View key={group.name}>
          <Text style={styles.sectionHeader}>{getSectionLabel(group.name)}</Text>
          {group.items.map(({ block, globalIndex }) => renderBlockRow(block, globalIndex))}
        </View>
      ))
    }

    return queue.map((block, index) => renderBlockRow(block, index))
  }

  const renderBodyScanRows = () => {
    const rows = []
    if (segments.length > 0 && segments[0]?.type === 'body_scan') {
      rows.push(
        <View key="bs-start" style={[styles.planItem, styles.bodyScanItem]}>
          <View style={[styles.planItemNumber, styles.bodyScanNumber]}>
            <Text style={styles.bodyScanNumberText}>~</Text>
          </View>
          <Text style={[styles.planItemName, styles.planItemNameDimmed]}>Body Scan</Text>
          <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.35)" />
        </View>
      )
    }
    return rows
  }

  const renderBodyScanEnd = () => {
    const last = segments[segments.length - 1]
    if (last?.type === 'body_scan' && last?.section === 'integration') {
      return (
        <View style={[styles.planItem, styles.bodyScanItem]}>
          <View style={[styles.planItemNumber, styles.bodyScanNumber]}>
            <Text style={styles.bodyScanNumberText}>~</Text>
          </View>
          <Text style={[styles.planItemName, styles.planItemNameDimmed]}>Body Scan</Text>
          <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.35)" />
        </View>
      )
    }
    return null
  }

  const renderBlockRow = (block, globalIndex) => {
    const isSwapped = swappedIndex === globalIndex
    return (
      <TouchableOpacity
        key={`${block.canonical_name ?? block.name}-${globalIndex}`}
        style={[styles.planItem, isSwapped && styles.planItemSwapped]}
        onPress={() => openPicker(globalIndex)}
        activeOpacity={0.7}
      >
        <View style={styles.planItemNumber}>
          <Text style={styles.planItemNumberText}>{globalIndex + 1}</Text>
        </View>

        <Text style={styles.planItemName} numberOfLines={1}>
          {block.name}
        </Text>

        {isSwapped && (
          <Text style={styles.swappedLabel}>Swapped ✓</Text>
        )}

        <BlockDeltaViz energyDelta={block.energy_delta} safetyDelta={block.safety_delta} />

        <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.35)" />
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Flow</Text>
          <Text style={styles.headerSubtitle}>{queue.length} blocks · {displayMin} min</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Block list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderBodyScanRows()}
        {renderBlockList()}
        {renderBodyScanEnd()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.88}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Block Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={{ flex: 1 }}>
          <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.pickerContainer}>
            {/* Picker header */}
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choose a Block</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.pickerClose} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search blocks..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Block list */}
            <ScrollView
              style={styles.pickerScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {groupedBlocks.map((group) => (
                <View key={group.name || 'all'}>
                  {group.name && (
                    <Text style={styles.pickerSectionHeader}>{getSectionLabel(group.name)}</Text>
                  )}
                  {group.items.map((block, i) => {
                    const isSelected = currentBlock?.canonical_name === block.canonical_name
                    return (
                      <TouchableOpacity
                        key={block.canonical_name || block.id || i}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => handleSwap(block)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pickerItemName, isSelected && styles.pickerItemNameSelected]} numberOfLines={1}>
                          {block.name}
                        </Text>
                        <BlockDeltaViz energyDelta={block.energy_delta} safetyDelta={block.safety_delta} />
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ))}
              {filteredBlocks.length === 0 && (
                <Text style={styles.emptyText}>No blocks found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '500', marginTop: 2,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },

  // ── Section header ──────────────────────────────────────────────────────────
  sectionHeader: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 16, marginBottom: 4,
    paddingHorizontal: 12,
  },

  // ── Block row ───────────────────────────────────────────────────────────────
  planItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 4, gap: 12,
  },
  planItemSwapped: {
    backgroundColor: 'rgba(0,217,163,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,217,163,0.25)',
  },
  planItemNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  planItemNumberText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13, fontWeight: '600',
  },
  planItemName: {
    flex: 1, color: '#fff',
    fontSize: 15, fontWeight: '500',
  },
  planItemNameDimmed: { color: 'rgba(255,255,255,0.35)' },
  swappedLabel: {
    color: colors.accent.primary,
    fontSize: 11, fontWeight: '600', letterSpacing: 0.3,
  },

  // ── Body scan ───────────────────────────────────────────────────────────────
  bodyScanItem: { opacity: 0.85 },
  bodyScanNumber: { backgroundColor: 'rgba(255,255,255,0.07)' },
  bodyScanNumberText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, fontWeight: '600',
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 42,
    backgroundColor: colors.background.primary + 'F0',
  },
  doneBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '600', letterSpacing: 0.2 },

  // ── Picker modal ────────────────────────────────────────────────────────────
  pickerContainer: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerTitle: {
    color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 0.5,
  },
  pickerClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1, color: '#fff',
    fontSize: 15, fontWeight: '400',
    padding: 0,
  },

  // ── Picker scroll ───────────────────────────────────────────────────────────
  pickerScroll: { flex: 1 },
  pickerSectionHeader: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 16, marginBottom: 4,
    paddingHorizontal: 12,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 4,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(0,217,163,0.08)',
    borderWidth: 1, borderColor: colors.accent.primary,
  },
  pickerItemName: {
    flex: 1, color: '#fff',
    fontSize: 15, fontWeight: '500',
  },
  pickerItemNameSelected: { color: colors.accent.primary, fontWeight: '600' },
  emptyText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14, textAlign: 'center',
    marginTop: 40,
  },
})
