import Svg, { Line, Circle, Rect } from 'react-native-svg'
import { deriveStateFromDeltas, STATE_COLORS } from '../../constants/polyvagalStates'

/**
 * BlockDeltaViz — mini SVG chart showing where a somi_block pushes
 * the user on the 2D energy × safety graph.
 *
 * energyDelta: positive = energises, negative = calms
 * safetyDelta: positive = grounds, negative = activates/destabilises
 * A dot + arrow from centre → delta direction, coloured by derived state.
 */
export default function BlockDeltaViz({ energyDelta, safetyDelta, size = 28 }) {
  const e = energyDelta ?? 0
  const s = safetyDelta ?? 0
  const half = size / 2
  const maxPx = half - 4
  const maxDelta = 3

  const dx = Math.max(-maxPx, Math.min(maxPx, (e / maxDelta) * maxPx))
  // invert Y: positive safety → upward on screen (lower Y value)
  const dy = Math.max(-maxPx, Math.min(maxPx, -(s / maxDelta) * maxPx))

  const state = deriveStateFromDeltas(e, s)
  const color = STATE_COLORS[state?.name] || '#7DBCE7'
  const isCenter = e === 0 && s === 0

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background tile */}
      <Rect
        x={0.5} y={0.5}
        width={size - 1} height={size - 1}
        rx={6} ry={6}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={0.75}
      />
      {/* Crosshair */}
      <Line x1={half} y1={3}        x2={half}      y2={size - 3} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      <Line x1={3}    y1={half}     x2={size - 3}  y2={half}      stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      {/* Arrow from centre to delta point */}
      {!isCenter && (
        <Line
          x1={half} y1={half}
          x2={half + dx} y2={half + dy}
          stroke={color} strokeWidth={1.5} strokeLinecap="round"
        />
      )}
      {/* Dot */}
      <Circle
        cx={half + dx} cy={half + dy}
        r={isCenter ? 2 : 3}
        fill={color}
      />
    </Svg>
  )
}
