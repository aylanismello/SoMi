import { StyleSheet, Text, View, PanResponder, TouchableOpacity, ScrollView, Animated } from 'react-native'
import { useRef, useState, useEffect, useMemo } from 'react'
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
  const touchStartedOnRing = useRef(false)

  // Get current selected state index
  const selectedIndex = states.findIndex(s => s.id === selectedStateId)

  // Create PanResponder for carousel swipes - use useMemo to recreate when dependencies change
  const carouselPanResponder = useMemo(() => {
    if (!showCarousel) return null

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState

        // Swipe threshold
        if (Math.abs(dx) > 30) {
          if (dx > 0) {
            // Swiped right - go to previous state
            const newIndex = (selectedIndex - 1 + states.length) % states.length
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            if (onStateChange) {
              onStateChange(states[newIndex].id)
            }
          } else {
            // Swiped left - go to next state
            const newIndex = (selectedIndex + 1) % states.length
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            if (onStateChange) {
              onStateChange(states[newIndex].id)
            }
          }
        }
      },
    })
  }, [showCarousel, selectedIndex, states, onStateChange])

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
    })
  ).current

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

        {/* State carousel in center - simple swipeable */}
        {showCarousel && states.length > 0 && carouselPanResponder && (
          <View
            style={styles.carouselContainer}
            {...carouselPanResponder.panHandlers}
          >
            {/* Show current state centered */}
            <TouchableOpacity
              onPress={handleChipTap}
              activeOpacity={0.7}
              style={styles.carouselChipContainer}
            >
              <View style={[
                styles.carouselChipInner,
                styles.carouselChipCentered,
                isConfirmed && styles.carouselChipConfirmed,
                isConfirmed && {
                  backgroundColor: states[selectedIndex]?.color + '40',
                  borderColor: states[selectedIndex]?.color
                }
              ]}>
                <Text style={[
                  styles.carouselChipText,
                  { color: isConfirmed ? states[selectedIndex]?.color : '#f7f9fb' }
                ]}>
                  {states[selectedIndex]?.label}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Swipe hint - show ghost states on sides (only when not confirmed) */}
            {!isConfirmed && (
              <>
                <View style={styles.carouselGhostLeft}>
                  <View style={[styles.carouselChipInner, styles.carouselChipGhost]}>
                    <Text style={[styles.carouselChipText, styles.carouselChipTextGhost]}>
                      {states[(selectedIndex - 1 + states.length) % states.length]?.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.carouselGhostRight}>
                  <View style={[styles.carouselChipInner, styles.carouselChipGhost]}>
                    <Text style={[styles.carouselChipText, styles.carouselChipTextGhost]}>
                      {states[(selectedIndex + 1) % states.length]?.label}
                    </Text>
                  </View>
                </View>
              </>
            )}
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
    top: CENTER - 30,
    left: 0,
    width: CIRCLE_SIZE,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  carouselChipContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  carouselGhostLeft: {
    position: 'absolute',
    left: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselGhostRight: {
    position: 'absolute',
    right: 20,
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
    opacity: 0.25,
    transform: [{ scale: 0.8 }],
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
