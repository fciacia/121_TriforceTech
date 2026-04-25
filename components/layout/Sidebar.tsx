'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  LayoutDashboard,
  Network,
  FileText,
  SlidersHorizontal,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: LayoutDashboard,   label: 'Overview',      href: '/dashboard',              tab: null },
  { icon: Network,           label: 'Supply Chain',  href: '/dashboard?tab=graph',    tab: 'graph' },
  { icon: FileText,          label: 'Reports',       href: '/report',                 tab: null },
  { icon: SlidersHorizontal, label: 'What-If',       href: '/dashboard?tab=whatif',   tab: 'whatif' },
  { icon: Settings,          label: 'Settings',      href: '/dashboard?tab=settings', tab: 'settings' },
]

function SidebarNav() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const activeTab    = searchParams.get('tab')

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV_ITEMS.map(({ icon: Icon, label, href, tab }) => {
        let isActive: boolean
        if (href === '/report') {
          isActive = pathname === '/report'
        } else if (tab === null) {
          isActive = pathname === '/dashboard' && !activeTab
        } else {
          isActive = pathname === '/dashboard' && activeTab === tab
        }

        return (
          <Link
            key={label}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative group',
              isActive
                ? 'text-[#EAEAEA]'
                : 'text-[#71747D] hover:text-[#EAEAEA]'
            )}
            style={isActive ? {
              background: 'linear-gradient(90deg, #16A37A18 0%, #16A37A08 100%)',
              border: '1px solid #16A37A22',
            } : undefined}
          >
            {/* Active left accent bar */}
            {isActive && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                style={{ background: '#16A37A' }}
              />
            )}
            <Icon
              size={14}
              style={{ color: isActive ? '#16A37A' : undefined }}
            />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-[52px] bottom-0 w-56 flex flex-col pt-5 z-40"
      style={{
        background: 'rgba(5,6,10,0.95)',
        borderRight: '1px solid #1C1E26',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Brand section */}
      <div className="px-4 mb-5">
        <p className="text-[9px] font-semibold tracking-[0.12em] uppercase text-[#3E414D]">Navigation</p>
      </div>
      <Suspense>
        <SidebarNav />
      </Suspense>

      {/* Bottom: version badge */}
      <div className="mt-auto px-4 pb-5">
        <div
          className="px-3 py-2 rounded-xl"
          style={{ background: '#0D0E14', border: '1px solid #1C1E26' }}
        >
          <p className="text-[10px] font-semibold text-[#16A37A]">GreenTrust Pulse</p>
          <p className="text-[9px] text-[#3E414D] mt-0.5">v1.0 · GLM-4 + GraphRAG</p>
        </div>
      </div>
    </aside>
  )
}
