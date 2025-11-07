import { StyleSheet, Text, View, PanResponder, TouchableOpacity, ScrollView, Animated, Modal } from 'react-native'
import { useRef, useState, useEffect, useMemo } from 'react'
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'

// Polyvagal state labels (embodiment-focused, neutral/positive)
const STATE_LABELS = [
  { range: [0, 20], label: 'Withdrawn', color: '#7b68ee' },      // Dorsal Vagal - Shutdown
  { range: [20, 40], label: 'Stirring', color: '#9d7be8' },      // Dorsal → Sympathetic transition
  { range: [40, 60], label: 'Activated', color: '#b88ddc' },     // Sympathetic - Fight/Flight
  { range: [60, 80], label: 'Settling', color: '#68c9ba' },      // Sympathetic → Ventral transition
  { range: [80, 100], label: 'Connected', color: '#4ecdc4' },    // Ventral Vagal - Social Engagement
]

// Polyvagal state descriptions for tooltips
const STATE_DESCRIPTIONS = {
  withdrawn: {
    label: 'Withdrawn',
    description: 'You might feel shut down, numb, disconnected, or dissociated. Your body is in conservation mode, protecting you by reducing energy and engagement.',
    icon: '🌑',
  },
  stirring: {
    label: 'Stirring',
    description: 'You\'re beginning to feel a shift from stillness. You might notice subtle restlessness, tension, or the first hints of energy building in your body.',
    icon: '🌘',
  },
  activated: {
    label: 'Activated',
    description: 'Your nervous system is mobilized - you might feel anxious, alert, energized, or ready for action. Heart rate may be elevated and muscles engaged.',
    icon: '⚡',
  },
  settling: {
    label: 'Settling',
    description: 'You\'re transitioning toward calm. You might notice your breath deepening, tension releasing, and a growing sense of ease in your body.',
    icon: '🌤',
  },
  connected: {
    label: 'Connected',
    description: 'You feel safe, grounded, and present. Your body is relaxed yet alert, and you\'re able to connect with yourself and others with ease.',
    icon: '🌕',
  },
}

const CIRCLE_SIZE = 200
const PADDING = 20 // Extra space for handle glow
const SVG_SIZE = CIRCLE_SIZE + PADDING * 2
const STROKE_WIDTH = 16
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2
const CENTER = SVG_SIZE / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

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
}) {
  const previousValueRef = useRef(value)
  const touchStartedOnRing = useRef(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipState, setTooltipState] = useState(null)

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

  // Handle chip selection
  const handleChipPress = (stateId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (onStateChange) {
      onStateChange(stateId)
    }
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
        handleTouch(evt.nativeEvent, true)
      },
      onPanResponderMove: (evt) => {
        // Only handle if touch started on ring
        if (touchStartedOnRing.current) {
          handleTouch(evt.nativeEvent, false)
        }
      },
      onPanResponderRelease: () => {
        touchStartedOnRing.current = false
        previousValueRef.current = value
      },
    }), [value, onValueChange] // Recreate when these change
  )

  const handleTouch = (evt, isInitialTap) => {
    // Get touch position relative to circle center
    const touchX = evt.locationX - CENTER
    const touchY = evt.locationY - CENTER

    // Calculate angle from touch position
    let touchAngle = Math.atan2(touchY, touchX)

    // Convert to 0-100 value (starting from top, going clockwise)
    let newValue = ((touchAngle + Math.PI / 2) / (2 * Math.PI)) * 100

    // Normalize to 0-100 range
    if (newValue < 0) newValue += 100

    // Only prevent wrapping during continuous drag, not on initial tap
    if (!isInitialTap) {
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

      {showStateLabel && (
        <View style={styles.stateLabelContainer}>
          <View style={[styles.stateLabelBadge, { backgroundColor: currentState.color + '30' }]}>
            <View style={[styles.stateIndicator, { backgroundColor: currentState.color }]} />
            <Text style={[styles.stateLabel, { color: currentState.color }]}>
              {currentState.label}
            </Text>
          </View>
        </View>
      )}

      <View
        style={styles.circularSliderContainer}
        {...panResponder.panHandlers}
      >
        <Svg width={SVG_SIZE} height={SVG_SIZE}>
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7b68ee" stopOpacity="1" />
              <Stop offset="25%" stopColor="#9d7be8" stopOpacity="1" />
              <Stop offset="50%" stopColor="#b88ddc" stopOpacity="1" />
              <Stop offset="75%" stopColor="#68c9ba" stopOpacity="1" />
              <Stop offset="100%" stopColor="#4ecdc4" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Background track */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="rgba(255, 255, 255, 0.1)"
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

        {/* Centered percentage display */}
        {showChips && (
          <View style={styles.centeredPercentageContainer}>
            <Text style={styles.centeredPercentageText}>{Math.round(value)}%</Text>
          </View>
        )}
      </View>

      {/* Polyvagal state chips carousel */}
      {showChips && states.length > 0 && (
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={140}
            snapToAlignment="center"
            contentContainerStyle={styles.carouselContent}
            style={styles.carousel}
          >
            {states.map((state) => (
              <TouchableOpacity
                key={state.id}
                onPress={() => handleChipPress(state.id)}
                activeOpacity={0.7}
                style={[
                  styles.carouselChip,
                  selectedStateId === state.id && styles.carouselChipSelected,
                  { borderColor: state.color }
                ]}
              >
                <View style={styles.carouselChipContent}>
                  <Text style={styles.carouselChipIcon}>{STATE_DESCRIPTIONS[state.id]?.icon}</Text>
                  <Text style={[
                    styles.carouselChipLabel,
                    selectedStateId === state.id && { color: state.color }
                  ]}>
                    {state.label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleInfoPress(state.id)}
                    style={styles.carouselChipInfoButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.carouselChipInfoIcon}>ⓘ</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tooltip Modal */}
      <Modal
        visible={tooltipVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTooltip}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeTooltip}
        >
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
        </TouchableOpacity>
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
    color: '#f7f9fb',
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'left',
    lineHeight: 28,
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
    marginVertical: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
  centeredPercentageContainer: {
    position: 'absolute',
    top: CENTER - 30,
    left: 0,
    width: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredPercentageText: {
    color: '#f7f9fb',
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  carouselContainer: {
    marginTop: 24,
    width: '100%',
    height: 72,
  },
  carousel: {
    flexGrow: 0,
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
  carouselChipSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 3,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
    color: 'rgba(247, 249, 251, 0.85)',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#f7f9fb',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tooltipDescription: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  tooltipCloseButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderWidth: 2,
    borderColor: '#4ecdc4',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  tooltipCloseText: {
    color: '#4ecdc4',
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
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
})
