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

const NAV_ITEMS = [
  { icon: LayoutDashboard,   label: 'Overview',  href: '/dashboard',              tab: null },
  { icon: Network,           label: 'Chain',     href: '/dashboard?tab=graph',    tab: 'graph' },
  { icon: FileText,          label: 'Report',    href: '/report',                 tab: null },
  { icon: SlidersHorizontal, label: 'What-If',   href: '/dashboard?tab=whatif',   tab: 'whatif' },
  { icon: Settings,          label: 'Settings',  href: '/dashboard?tab=settings', tab: 'settings' },
]

function MobileNavInner() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const activeTab    = searchParams.get('tab')

  return (
    <nav className="flex items-center justify-around w-full h-full">
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
            className="flex flex-col items-center gap-1 px-3 py-2"
          >
            <Icon
              size={19}
              style={{ color: isActive ? '#16A37A' : '#71747D' }}
            />
            <span
              className="text-[9px] font-medium"
              style={{ color: isActive ? '#EAEAEA' : '#71747D' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function MobileNav() {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 h-16 md:hidden"
      style={{
        background: 'rgba(5,6,10,0.97)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid #1C1E26',
      }}
    >
      <Suspense>
        <MobileNavInner />
      </Suspense>
    </div>
  )
}
