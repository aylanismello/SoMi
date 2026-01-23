import { StyleSheet, Text, View, PanResponder, TouchableOpacity, ScrollView, Animated, Modal } from 'react-native'
import { useRef, useState, useEffect, useMemo } from 'react'
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { colors } from '../constants/theme'

// New polyvagal state system using codes (0-5)
const POLYVAGAL_STATE_MAP = {
  0: { id: 0, label: 'SOS', color: '#ff6b9d', icon: '🆘' },
  1: { id: 1, label: 'Drained', color: '#4A5F8C', icon: '🌧' },
  2: { id: 2, label: 'Foggy', color: '#5B7BB4', icon: '🌫' },
  3: { id: 3, label: 'Wired', color: '#6B9BD1', icon: '🌪' },
  4: { id: 4, label: 'Steady', color: '#7DBCE7', icon: '🌤' },
  5: { id: 5, label: 'Glowing', color: '#90DDF0', icon: '☀️' },
}

// Polyvagal state descriptions for tooltips
const STATE_DESCRIPTIONS = {
  0: {
    label: 'SOS',
    description: 'Emergency state - immediate support needed.',
    icon: '🆘',
  },
  1: {
    label: 'Drained',
    description: 'Heavy. Low energy. Hard to move or care.',
    icon: '🌧',
  },
  2: {
    label: 'Foggy',
    description: 'Unclear. Hard to focus. Numb or frozen.',
    icon: '🌫',
  },
  3: {
    label: 'Wired',
    description: 'Tense. On edge. Restless energy in the body.',
    icon: '🌪',
  },
  4: {
    label: 'Steady',
    description: 'Grounded. Clear. Breathing feels even and easy.',
    icon: '🌤',
  },
  5: {
    label: 'Glowing',
    description: 'Open. Warm. Connected to self and surroundings.',
    icon: '☀️',
  },
}

// Old system (deprecated - kept for backwards compatibility with old data)
const STATE_LABELS = [
  { range: [0, 20], label: 'Withdrawn', color: '#4A5F8C' },
  { range: [20, 40], label: 'Stirring', color: '#5B7BB4' },
  { range: [40, 60], label: 'Activated', color: '#6B9BD1' },
  { range: [60, 80], label: 'Settling', color: '#7DBCE7' },
  { range: [80, 100], label: 'Connected', color: '#90DDF0' },
]

const CIRCLE_SIZE = 200
const PADDING = 20 // Extra space for handle glow
const SVG_SIZE = CIRCLE_SIZE + PADDING * 2
const STROKE_WIDTH = 16
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2
const CENTER = SVG_SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CHIP_RING_SIZE = 320 // Larger container for chip ring to prevent overlap

export default function EmbodimentSlider({
  value,
  onValueChange,
  showLabels = true,
  showStateLabel = true,
  question = null,
  showCheckButton = false,
  isChecked = false,
  onCheckToggle = null,
  canCheck = true,
  // New chip-based props
  showChips = false,
  states = [],
  selectedStateId = null,
  onStateChange = null,
  isConfirmed = false,
  onConfirm = null,
  resetKey = 0, // New prop to force carousel reset
  helpMode = false, // New prop for help mode
}) {
  const previousValueRef = useRef(value)
  const touchStartedOnRing = useRef(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipState, setTooltipState] = useState(null)

  // Animation values for circular ring layout
  const chipAnimations = useRef({})

  // Initialize animations for each state
  useEffect(() => {
    states.forEach(state => {
      if (!chipAnimations.current[state.id]) {
        chipAnimations.current[state.id] = {
          opacity: new Animated.Value(1),
          scale: new Animated.Value(1),
        }
      }
    })
  }, [states])

  // Reset animations when resetKey changes
  useEffect(() => {
    states.forEach(state => {
      if (chipAnimations.current[state.id]) {
        chipAnimations.current[state.id].opacity.setValue(1)
        chipAnimations.current[state.id].scale.setValue(1)
      }
    })
  }, [resetKey])

  // Get current state label and color based on slider value
  const getCurrentState = () => {
    const currentState = STATE_LABELS.find(state =>
      value >= state.range[0] && value < state.range[1]
    )
    return currentState || STATE_LABELS[STATE_LABELS.length - 1]
  }

  const currentState = getCurrentState()

  // Convert value (0-100) to angle in radians
  // Start from top (270 degrees / -90) and go clockwise
  const angle = (value / 100) * 2 * Math.PI - Math.PI / 2

  // Calculate handle position
  const handleX = CENTER + RADIUS * Math.cos(angle)
  const handleY = CENTER + RADIUS * Math.sin(angle)

  // Calculate stroke dash offset for progress arc
  const progress = value / 100
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  // Handle chip selection with fade animation
  const handleChipPress = (stateId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // If in help mode, show info instead of selecting
    if (helpMode) {
      handleInfoPress(stateId)
      return
    }

    // Fade out all chips except the selected one
    const animations = states.map(state => {
      if (state.id === stateId) {
        // Selected chip stays visible
        return Animated.parallel([
          Animated.timing(chipAnimations.current[state.id].opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(chipAnimations.current[state.id].scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      } else {
        // Other chips fade out
        return Animated.parallel([
          Animated.timing(chipAnimations.current[state.id].opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(chipAnimations.current[state.id].scale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      }
    })

    Animated.parallel(animations).start(() => {
      if (onStateChange) {
        onStateChange(stateId)
      }
    })
  }

  // Handle chip deselection (X button) - fade chips back in
  const handleDeselectChip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (onStateChange) {
      onStateChange(null)
    }

    // Fade all chips back in
    const animations = states.map(state => {
      return Animated.parallel([
        Animated.timing(chipAnimations.current[state.id].opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(chipAnimations.current[state.id].scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    })

    Animated.parallel(animations).start()
  }

  // Handle info button press
  const handleInfoPress = (stateId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTooltipState(stateId)
    setTooltipVisible(true)
  }

  // Close tooltip
  const closeTooltip = () => {
    setTooltipVisible(false)
    setTimeout(() => setTooltipState(null), 300)
  }

  // Helper function to check if touch is on the ring
  const isTouchOnRing = (evt) => {
    const touchX = evt.nativeEvent.locationX - CENTER
    const touchY = evt.nativeEvent.locationY - CENTER
    const distanceFromCenter = Math.sqrt(touchX * touchX + touchY * touchY)

    // The actual ring is drawn at RADIUS (92px from center) with STROKE_WIDTH (16px)
    // So the ring spans from 84px to 100px from center
    const innerBound = RADIUS - STROKE_WIDTH / 2 - 5 // 92 - 8 - 5 = 79px (with 5px tolerance)
    const outerBound = RADIUS + STROKE_WIDTH / 2 + 5 // 92 + 8 + 5 = 105px (with 5px tolerance)

    const isOnRing = distanceFromCenter >= innerBound && distanceFromCenter <= outerBound
    return isOnRing
  }

  // PanResponder for handling touch
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only respond if touch starts on the ring
        const shouldRespond = isTouchOnRing(evt)
        if (shouldRespond) {
          touchStartedOnRing.current = true
        } else {
          touchStartedOnRing.current = false
        }
        return shouldRespond
      },
      onMoveShouldSetPanResponder: () => {
        // NEVER claim responder on move - only if we claimed it on start
        // This prevents center touches from being claimed mid-gesture
        return false
      },
      onPanResponderGrant: (evt) => {
        // Don't update value on initial touch - only on drag
        // This prevents jumping to tapped position
      },
      onPanResponderMove: (evt) => {
        // Only handle if touch started on ring
        if (touchStartedOnRing.current) {
          handleTouch(evt.nativeEvent)
        }
      },
      onPanResponderRelease: () => {
        touchStartedOnRing.current = false
        previousValueRef.current = value
      },
    }), [value, onValueChange] // Recreate when these change
  )

  const handleTouch = (evt) => {
    // Get touch position relative to circle center
    const touchX = evt.locationX - CENTER
    const touchY = evt.locationY - CENTER

    // Calculate angle from touch position
    let touchAngle = Math.atan2(touchY, touchX)

    // Convert to 0-100 value (starting from top, going clockwise)
    let newValue = ((touchAngle + Math.PI / 2) / (2 * Math.PI)) * 100

    // Normalize to 0-100 range
    if (newValue < 0) newValue += 100

    // Prevent wrapping - only allow dragging, no jumping
    const previousValue = previousValueRef.current
    const valueDiff = Math.abs(newValue - previousValue)

    // If the value change is too large (> 50%), we're likely wrapping around
    // Clamp to 0 or 100 based on which side we're coming from
    if (valueDiff > 50) {
      if (previousValue < 50) {
        // Coming from the left side (0% side), clamp to 0
        newValue = 0
      } else {
        // Coming from the right side (100% side), clamp to 100
        newValue = 100
      }
    }

    previousValueRef.current = newValue
    onValueChange(newValue)
  }

  return (
    <View style={styles.container}>
      {question && (
        <Text style={styles.question}>
          {question}
        </Text>
      )}

      {showStateLabel && !showChips && (
        <View style={styles.stateLabelContainer}>
          <View style={[styles.stateLabelBadge, { backgroundColor: currentState.color + '30' }]}>
            <View style={[styles.stateIndicator, { backgroundColor: currentState.color }]} />
            <Text style={[styles.stateLabel, { color: currentState.color }]}>
              {currentState.label}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.circularSliderContainer}>
        {selectedStateId ? (
          // State 2: Show circular slider with chip in center
          <View {...panResponder.panHandlers}>
            <Svg width={SVG_SIZE} height={SVG_SIZE}>
              <Defs>
                <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#4A5F8C" stopOpacity="1" />
                  <Stop offset="25%" stopColor="#5B7BB4" stopOpacity="1" />
                  <Stop offset="50%" stopColor="#6B9BD1" stopOpacity="1" />
                  <Stop offset="75%" stopColor="#7DBCE7" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#90DDF0" stopOpacity="1" />
                </LinearGradient>
              </Defs>

              {/* Background track */}
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                stroke={colors.border.subtle}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />

              {/* Progress arc */}
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                stroke="url(#gradient)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${CENTER}, ${CENTER}`}
              />

              {/* Handle with glow effect */}
              <G>
                {/* Outer glow */}
                <Circle
                  cx={handleX}
                  cy={handleY}
                  r={18}
                  fill="#ffffff"
                  opacity={0.15}
                />
                <Circle
                  cx={handleX}
                  cy={handleY}
                  r={14}
                  fill="#ffffff"
                  opacity={0.25}
                />
                {/* Main handle */}
                <Circle
                  cx={handleX}
                  cy={handleY}
                  r={11}
                  fill="#ffffff"
                  opacity={1}
                />
              </G>
            </Svg>

            {/* Selected chip in center with opacity based on slider */}
            <View style={styles.centerChipContainer}>
              <View
                style={[
                  styles.centerChip,
                  {
                    backgroundColor: states.find(s => s.id === selectedStateId)?.color,
                    opacity: 0.3 + (value / 100) * 0.7, // Opacity ranges from 0.3 to 1.0
                  }
                ]}
              >
                <Text style={styles.centerChipIcon}>
                  {STATE_DESCRIPTIONS[selectedStateId]?.icon}
                </Text>
              </View>

              {/* X button to deselect */}
              <TouchableOpacity
                onPress={handleDeselectChip}
                style={styles.centerDeselectButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.centerDeselectButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showChips && states.length > 0 ? (
          // Simple grid layout
          <View style={styles.gridWrapper}>
            {states.map((state) => {
              const animations = chipAnimations.current[state.id] || { opacity: new Animated.Value(1), scale: new Animated.Value(1) }

              return (
                <Animated.View
                  key={state.id}
                  style={[
                    styles.gridChip,
                    {
                      transform: [{ scale: animations.scale }],
                      opacity: animations.opacity,
                    }
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleChipPress(state.id)}
                    activeOpacity={0.7}
                    style={[
                      styles.gridChipButton,
                      {
                        borderColor: state.color,
                        backgroundColor: helpMode ? state.color + '30' : state.color + '15',
                        borderWidth: helpMode ? 3 : 2.5,
                      }
                    ]}
                  >
                    <Text style={styles.gridChipIcon}>{STATE_DESCRIPTIONS[state.id]?.icon}</Text>
                    <Text style={styles.gridChipLabel}>{state.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )
            })}
          </View>
        ) : null}

        {/* Check button in center */}
        {showCheckButton && (
          <TouchableOpacity
            style={styles.checkButton}
            onPress={canCheck ? onCheckToggle : null}
            activeOpacity={0.7}
            disabled={!canCheck}
          >
            <View style={[
              styles.checkButtonInner,
              isChecked && styles.checkButtonChecked,
              !canCheck && styles.checkButtonDisabled
            ]}>
              {isChecked && (
                <Svg width={32} height={32} viewBox="0 0 24 24">
                  <Path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    fill="#ffffff"
                  />
                </Svg>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Tooltip Modal */}
      <Modal
        visible={tooltipVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.tooltipContainer}>
            <View style={styles.tooltipContent}>
              {tooltipState && STATE_DESCRIPTIONS[tooltipState] && (
                <>
                  <Text style={styles.tooltipIcon}>{STATE_DESCRIPTIONS[tooltipState].icon}</Text>
                  <Text style={styles.tooltipTitle}>{STATE_DESCRIPTIONS[tooltipState].label}</Text>
                  <Text style={styles.tooltipDescription}>{STATE_DESCRIPTIONS[tooltipState].description}</Text>
                  <TouchableOpacity
                    onPress={closeTooltip}
                    style={styles.tooltipCloseButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tooltipCloseText}>Got it</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  question: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'left',
    lineHeight: 26,
    letterSpacing: 0.3,
    width: '100%',
  },
  stateLabelContainer: {
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 8,
  },
  stateIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  circularSliderContainer: {
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  checkButton: {
    position: 'absolute',
    top: CENTER - 35,
    left: CENTER - 35,
    zIndex: 10,
  },
  checkButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 3,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonChecked: {
    backgroundColor: '#4ecdc4',
    borderColor: '#4ecdc4',
  },
  checkButtonDisabled: {
    opacity: 0.3,
  },
  centerChipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerChip: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  centerChipIcon: {
    fontSize: 48,
  },
  centerDeselectButton: {
    position: 'absolute',
    top: CENTER - 60,
    right: CENTER - 60,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1.5,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDeselectButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  carouselCenterWrapper: {
    width: '100%',
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselContainer: {
    marginTop: 24,
    width: '100%',
    height: 72,
  },
  carousel: {
    flexGrow: 0,
    width: '100%',
  },
  carouselContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  carouselChip: {
    borderRadius: 24,
    borderWidth: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 128,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  focusedChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  focusedChip: {
    borderRadius: 24,
    borderWidth: 3,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  focusedChipIcon: {
    fontSize: 22,
  },
  focusedChipLabel: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  focusedChipInfoButton: {
    marginLeft: 3,
  },
  focusedChipInfoIcon: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '600',
  },
  deselectButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deselectButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '600',
  },
  carouselChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  carouselChipIcon: {
    fontSize: 22,
  },
  carouselChipLabel: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  carouselChipInfoButton: {
    marginLeft: 3,
  },
  carouselChipInfoIcon: {
    color: 'rgba(247, 249, 251, 0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tooltipContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    maxWidth: 340,
    width: '100%',
  },
  tooltipContent: {
    padding: 24,
    alignItems: 'center',
  },
  tooltipIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  tooltipTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tooltipDescription: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  tooltipCloseButton: {
    backgroundColor: colors.surface.secondary,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  tooltipCloseText: {
    color: colors.accent.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 5,
    width: '100%',
  },
  label: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // Simple grid layout styles
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    gap: 12,
  },
  gridChip: {
    width: '47%',
  },
  gridChipButton: {
    borderRadius: 18,
    borderWidth: 2.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    minHeight: 95,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  gridChipIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  gridChipLabel: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})

export { POLYVAGAL_STATE_MAP, STATE_DESCRIPTIONS }
