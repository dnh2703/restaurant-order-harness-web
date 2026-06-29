// src/routes/api/qr.$qrToken.stream.ts
import { createFileRoute } from '@tanstack/react-router'
import { API_BASE_URL } from '@/shared/config'

export const Route = createFileRoute('/api/qr/$qrToken/stream')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let upstream: Response
        try {
          upstream = await fetch(
            `${API_BASE_URL}/api/qr/${encodeURIComponent(params.qrToken)}/stream`,
            { headers: { accept: 'text/event-stream' } },
          )
        } catch {
          return new Response('stream unavailable', { status: 502 })
        }
        if (!upstream.ok || !upstream.body) {
          return new Response('stream unavailable', { status: upstream.status || 502 })
        }
        // Stream the BE Server-Sent Events straight through to the browser.
        return new Response(upstream.body, {
          status: 200,
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache, no-transform',
            'x-accel-buffering': 'no',
          },
        })
      },
    },
  },
})
