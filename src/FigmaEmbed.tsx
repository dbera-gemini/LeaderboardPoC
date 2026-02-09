import React from 'react'

const EMBED_URL =
  'https://embed.figma.com/design/OVBbXsRocQQHqnWeQeZRgn/Quant-Trading-Competition?node-id=42-25551&embed-host=share'

export default function FigmaEmbed() {
  return (
    <div style={{ marginTop: 20 }}>
      <h2>Figma Wireframe Preview</h2>
      <div style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
        <iframe
          title="Figma Embed"
          style={{ border: '1px solid rgba(0, 0, 0, 0.1)' }}
          width="100%"
          height={720}
          src={EMBED_URL}
          allowFullScreen
        />
      </div>
      <p style={{ marginTop: 8 }}>
        Note: you may need to sign in to Figma or make the file public for the embed to display.
      </p>
    </div>
  )
}
