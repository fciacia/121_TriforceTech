'use client'
import dynamic from 'next/dynamic'

const FlowInner = dynamic(() => import('./_SupplyChainFlow'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 rounded-full border-2 border-[#1C1E26] border-t-[#16A37A] animate-spin" />
    </div>
  ),
})

export default function SupplyChainGraph({ height = 320 }: { height?: number }) {
  return (
    <div className="card flex flex-col gap-3">
      <p className="text-[#EAEAEA] text-sm font-semibold">Supply Chain Graph</p>
      <div style={{ height }}>
        <FlowInner />
      </div>
    </div>
  )
}
