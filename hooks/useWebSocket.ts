'use client'
import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useSwarmStore } from '@/store/useSwarmStore'

export function useWebSocket() {
  const updateFromSocket  = useSwarmStore((s) => s.updateFromSocket)
  const updateAgentStream = useSwarmStore((s) => s.updateAgentStream)
  const setIsStreaming    = useSwarmStore((s) => s.setIsStreaming)
  const loadData          = useSwarmStore((s) => s.loadData)
  const set               = useSwarmStore.setState

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
    let active = true

    const socket = io(apiUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: false   // prevent React Strict Mode double-invoke from closing mid-handshake
    })

    // Handle connection errors gracefully
    socket.on('connect_error', (error) => {
      console.warn('[WebSocket] Connection error:', error)
    })

    socket.on('error', (error) => {
      console.warn('[WebSocket] Error:', error)
    })

    socket.on('disconnect', (reason) => {
      // 'io client disconnect' is the expected reason when we call socket.disconnect()
      // in cleanup — don't log it as a warning
      if (reason !== 'io client disconnect') {
        console.warn('[WebSocket] Disconnected:', reason)
      }
    })

    // Legacy full-state update
    socket.on('swarm_update', updateFromSocket)

    // Pipeline starting — show debating badge
    socket.on('swarm_status', ({ status }: { status: string }) => {
      if (status === 'starting') {
        set({ isDebating: true, isStreaming: true })
      }
    })

    // One agent just finished — reveal its message in the panel
    socket.on('agent_update', ({ node, message }: { node: string; message: string }) => {
      updateAgentStream(node, message)
    })

    // All agents done — reload data from the freshly written JSON
    socket.on('swarm_complete', async () => {
      setIsStreaming(false)
      set({ isDebating: false })
      await loadData()
    })

    socket.on('swarm_error', ({ message }: { message: string }) => {
      console.error('[swarm_error]', message)
      setIsStreaming(false)
      set({ isDebating: false })
    })

    // Defer connect so Strict Mode cleanup (unmount) fires before the socket handshake begins
    const t = setTimeout(() => { if (active) socket.connect() }, 0)

    return () => {
      active = false
      clearTimeout(t)
      socket.disconnect()
    }
  }, [updateFromSocket, updateAgentStream, setIsStreaming, loadData, set])
}
