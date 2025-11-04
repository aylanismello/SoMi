import { StyleSheet, Text, View, PanResponder, TouchableOpacity } from 'react-native'
import { useRef } from 'react'
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
}) {
  const sliderRef = useRef(null)
  const previousValueRef = useRef(value)
  const isDraggingRef = useRef(false)

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

  // PanResponder for handling touch
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = false
        handleTouch(evt.nativeEvent, true)
      },
      onPanResponderMove: (evt) => {
        isDraggingRef.current = true
        handleTouch(evt.nativeEvent, false)
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false
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
            onPress={onCheckToggle}
            activeOpacity={0.7}
          >
            <View style={[styles.checkButtonInner, isChecked && styles.checkButtonChecked]}>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  checkButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -35,
    marginLeft: -35,
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
