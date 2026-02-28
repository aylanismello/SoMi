export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>SoMi API Server</h1>
      <p>Backend API for SoMi mobile app</p>
      <h2>Available Endpoints:</h2>
      <ul>
        <li>POST /api/flows/generate - Generate flow segments</li>
        <li>GET /api/chains - Get all chains</li>
        <li>GET /api/chains/latest - Get latest chain</li>
        <li>POST /api/chains - Create new chain</li>
        <li>POST /api/embodiment-checks - Save embodiment check</li>
        <li>POST /api/chain-entries - Save completed block</li>
        <li>GET /api/blocks - Get blocks by canonical names</li>
      </ul>
    </div>
  )
}
