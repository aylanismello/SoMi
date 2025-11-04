import { StyleSheet, Text, View, PanResponder, TouchableOpacity, ScrollView, Animated } from 'react-native'
import { useRef, useState, useEffect } from 'react'
import Svg, { Circle, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg'
import * as Haptics from 'expo-haptics'

// Polyvagal state labels (embodiment-focused, neutral/positive)
const STATE_LABELS = [
  { range: [0, 20], label: 'Withdrawn', color: '#7b68ee' },      // Dorsal Vagal - Shutdown
  { range: [20, 40], label: 'Stirring', color: '#9d7be8' },      // Dorsal → Sympathetic transition
  { range: [40, 60], label: 'Activated', color: '#b88ddc' },     // Sympathetic - Fight/Flight
  { range: [60, 80], label: 'Settling', color: '#68c9ba' },      // Sympathetic → Ventral transition
  { range: [80, 100], label: 'Connected', color: '#4ecdc4' },    // Ventral Vagal - Social Engagement
]

const CIRCLE_SIZE = 200
const STROKE_WIDTH = 16
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2
const CENTER = CIRCLE_SIZE / 2
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
  // New carousel props
  showCarousel = false,
  states = [],
  selectedStateId = null,
  onStateChange = null,
  isConfirmed = false,
  onConfirm = null,
}) {
  const previousValueRef = useRef(value)
  const scrollViewRef = useRef(null)
  const hasInitialized = useRef(false)
  const touchStartedOnRing = useRef(false)

  // Get current selected state index
  const selectedIndex = states.findIndex(s => s.id === selectedStateId)
  const CHIP_WIDTH = 100

  // Initialize scroll position to middle set of states
  useEffect(() => {
    if (showCarousel && states.length > 0 && scrollViewRef.current && !hasInitialized.current) {
      // Wait a bit for layout to complete
      setTimeout(() => {
        if (scrollViewRef.current) {
          const middleSetOffset = states.length * CHIP_WIDTH
          const selectedOffset = selectedIndex * CHIP_WIDTH
          scrollViewRef.current.scrollTo({ x: middleSetOffset + selectedOffset, animated: false })
          hasInitialized.current = true
        }
      }, 100)
    }
  }, [showCarousel, states.length, selectedIndex])

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

    console.log('Touch check:', {
      touchX,
      touchY,
      distanceFromCenter,
      innerBound,
      outerBound,
      isOnRing
    })

    return isOnRing
  }

  // PanResponder for handling touch
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only respond if touch starts on the ring
        const shouldRespond = isTouchOnRing(evt)
        if (shouldRespond) {
          touchStartedOnRing.current = true
          console.log('✓ Touch STARTED on ring - claiming responder')
        } else {
          touchStartedOnRing.current = false
          console.log('✗ Touch started OUTSIDE ring - rejecting')
        }
        return shouldRespond
      },
      onMoveShouldSetPanResponder: (evt) => {
        // NEVER claim responder on move - only if we claimed it on start
        // This prevents center touches from being claimed mid-gesture
        console.log('onMoveShouldSetPanResponder - returning false to prevent mid-gesture claim')
        return false
      },
      onPanResponderGrant: (evt) => {
        console.log('onPanResponderGrant called')
        handleTouch(evt.nativeEvent, true)
      },
      onPanResponderMove: (evt) => {
        // Only handle if touch started on ring
        if (touchStartedOnRing.current) {
          console.log('Move: touch started on ring, handling')
          handleTouch(evt.nativeEvent, false)
        } else {
          console.log('Move: REJECTED - touch did not start on ring')
        }
      },
      onPanResponderRelease: () => {
        console.log('Touch released')
        touchStartedOnRing.current = false
        previousValueRef.current = value
      },
    })
  ).current

  const handleTouch = (evt, isInitialTap) => {
    console.log('handleTouch called')
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

  // Handle carousel scroll to update current visible state
  const handleScroll = (event) => {
    if (!states.length || !onStateChange) return

    const scrollPosition = event.nativeEvent.contentOffset.x
    const containerWidth = 120
    const centerPosition = scrollPosition + (containerWidth / 2)

    // Calculate which chip is at center (accounting for padding)
    const paddingOffset = (containerWidth - CHIP_WIDTH) / 2
    const relativePosition = centerPosition - paddingOffset

    // Find the index in the tripled array
    const rawIndex = Math.round(relativePosition / CHIP_WIDTH)
    const actualIndex = rawIndex % states.length

    if (actualIndex !== selectedIndex && actualIndex >= 0 && actualIndex < states.length) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      onStateChange(states[actualIndex].id)
    }
  }

  // Handle tap on centered chip to confirm
  const handleChipTap = () => {
    if (onConfirm && selectedStateId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      onConfirm()
    }
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
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
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

        {/* Center touch blocker - blocks all touches in the center */}
        <View
          style={{
            position: 'absolute',
            top: CENTER - 70,
            left: CENTER - 70,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: 'rgba(255, 0, 0, 0.1)', // Red tint for debugging
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={() => console.log('Center blocked a touch')}
        />

        {/* State carousel in center - TEMPORARILY DISABLED FOR DEBUGGING */}
        {false && showCarousel && states.length > 0 && (
          <View
            style={styles.carouselContainer}
            onStartShouldSetResponderCapture={() => true}
            onMoveShouldSetResponderCapture={() => true}
          >
            {/* Circular blocker for center area */}
            <View
              style={styles.carouselBlocker}
              onStartShouldSetResponderCapture={() => true}
            />

            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={100}
              decelerationRate="fast"
              onMomentumScrollEnd={handleScroll}
              contentContainerStyle={styles.carouselContent}
              style={styles.carouselScrollView}
            >
              {/* Render states multiple times for infinite loop effect */}
              {[...states, ...states, ...states].map((state, idx) => {
                const actualIndex = idx % states.length
                const isCentered = selectedIndex === actualIndex

                return (
                  <TouchableOpacity
                    key={`${state.id}-${idx}`}
                    onPress={isCentered ? handleChipTap : null}
                    activeOpacity={isCentered ? 0.7 : 1}
                    style={styles.carouselChip}
                    disabled={!isCentered}
                  >
                    <View style={[
                      styles.carouselChipInner,
                      isCentered && styles.carouselChipCentered,
                      isCentered && isConfirmed && styles.carouselChipConfirmed,
                      isCentered && isConfirmed && { backgroundColor: state.color + '40', borderColor: state.color },
                      !isCentered && styles.carouselChipGhost
                    ]}>
                      <Text style={[
                        styles.carouselChipText,
                        isCentered && { color: isConfirmed ? state.color : '#f7f9fb' },
                        !isCentered && styles.carouselChipTextGhost
                      ]}>
                        {state.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {showLabels && (
        <View style={styles.labelsContainer}>
          <Text style={styles.label}>Dysregulated</Text>
          <Text style={styles.label}>Regulated</Text>
        </View>
      )}
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
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
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
  carouselContainer: {
    position: 'absolute',
    top: CENTER - 60,  // Center the 120px container
    left: CENTER - 60,
    width: 120,  // Only cover center area
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',  // Allow ScrollView to be visible
  },
  carouselBlocker: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
  },
  carouselScrollView: {
    zIndex: 10,
  },
  carouselContent: {
    alignItems: 'center',
    paddingHorizontal: (120 - 100) / 2,  // Adjust for smaller container
  },
  carouselChip: {
    width: 100,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselChipInner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselChipCentered: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ scale: 1.1 }],
  },
  carouselChipConfirmed: {
    borderWidth: 2,
  },
  carouselChipGhost: {
    opacity: 0.3,
    transform: [{ scale: 0.85 }],
  },
  carouselChipText: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  carouselChipTextGhost: {
    color: 'rgba(247, 249, 251, 0.4)',
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
