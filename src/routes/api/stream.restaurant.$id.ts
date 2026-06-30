import { createFileRoute } from '@tanstack/react-router'
import { API_BASE_URL } from '@/shared/config'
import { cookieTokenStore } from '@/shared/lib/staff-auth.server'

export const Route = createFileRoute('/api/stream/restaurant/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = cookieTokenStore.getAccess()
        if (!token) return new Response('unauthorized', { status: 401 })
        let upstream: Response
        try {
          upstream = await fetch(
            `${API_BASE_URL}/api/stream/restaurant/${encodeURIComponent(params.id)}`,
            { headers: { accept: 'text/event-stream', authorization: `Bearer ${token}` } },
          )
        } catch {
          return new Response('stream unavailable', { status: 502 })
        }
        if (!upstream.ok || !upstream.body) {
          return new Response('stream unavailable', { status: upstream.status || 502 })
        }
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
