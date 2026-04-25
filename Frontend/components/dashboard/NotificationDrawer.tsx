'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCheck } from 'lucide-react'
import { useSwarmStore } from '@/store/useSwarmStore'
import type { AppNotification } from '@/types'

const TYPE_CONFIG: Record<AppNotification['type'], { label: string; color: string }> = {
  alert_sent:        { label: 'Alert',    color: '#D97706' },
  pivot_executed:    { label: 'Pivot',    color: '#16A37A' },
  analysis_complete: { label: 'Analysis', color: '#3B82F6' },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return isToday ? time : d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) + ' ' + time
}

export default function NotificationDrawer() {
  const [open, setOpen] = useState(false)
  const notifications        = useSwarmStore((s) => s.notifications)
  const markNotificationsRead = useSwarmStore((s) => s.markNotificationsRead)
  const clearNotifications   = useSwarmStore((s) => s.clearNotifications)

  const unread = notifications.filter((n) => !n.read).length

  function handleOpen() {
    setOpen((o) => !o)
    if (unread > 0) markNotificationsRead()
  }

  return (
    <div className="relative">
      {/* Bell trigger */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-[#71747D] hover:text-[#EAEAEA] hover:bg-[#1C1E26] transition-all duration-200"
        title="Notifications"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ background: '#DC2626' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 w-80 rounded-2xl z-50 overflow-hidden"
              style={{
                background: '#0D0E14',
                border: '1px solid #1C1E26',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #1C1E26' }}
              >
                <p className="text-xs font-semibold text-[#EAEAEA]">Notifications</p>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[10px] text-[#3E414D] hover:text-[#71747D] transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setOpen(false)}>
                    <X size={13} className="text-[#3E414D]" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <CheckCheck size={22} style={{ color: '#2A2D38' }} />
                    <p className="text-xs text-[#3E414D]">All caught up</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {[...notifications].reverse().map((n) => {
                      const cfg = TYPE_CONFIG[n.type]
                      return (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 px-4 py-3"
                          style={{
                            borderBottom: '1px solid #0F1018',
                            background: n.read ? 'transparent' : '#16A37A04',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: n.read ? '#2A2D38' : cfg.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                                style={{
                                  background: `${cfg.color}15`,
                                  color:      cfg.color,
                                  border:     `1px solid ${cfg.color}30`,
                                }}
                              >
                                {cfg.label}
                              </span>
                              <span className="text-[9px] text-[#2A2D38]">{formatTime(n.timestamp)}</span>
                            </div>
                            <p className="text-xs text-[#C8CACD] leading-snug">{n.message}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
