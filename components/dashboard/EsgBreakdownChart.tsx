'use client'
import {
  BarChart, Bar, XAxis, YAxis, Cell,
  ResponsiveContainer, LabelList,
} from 'recharts'
import { useSwarmStore } from '@/store/useSwarmStore'

const BREAKDOWN_CONFIG = [
  { key: 'environmental' as const, label: 'Environmental', color: '#16A37A' },
  { key: 'social'        as const, label: 'Social',        color: '#A855F7' },
  { key: 'governance'    as const, label: 'Governance',    color: '#D97706' },
]

export default function EsgBreakdownChart() {
  const esgBreakdown = useSwarmStore((s) => s.esgBreakdown)

  if (!esgBreakdown) {
    return (
      <div className="card flex items-center justify-center min-h-[240px]">
        <p className="text-[#6B7280] text-sm">Awaiting ESG analysis...</p>
      </div>
    )
  }

  const data = BREAKDOWN_CONFIG.map(({ key, label, color }) => ({
    label,
    value: esgBreakdown[key] as number,
    color,
  }))

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[#EAEAEA] text-sm font-semibold">ESG Breakdown</p>
        <span
          className="font-mono font-bold text-sm"
          style={{ color: '#16A37A' }}
        >
          {esgBreakdown.total_score}
          <span className="text-[#3E414D] font-normal text-xs"> / 100</span>
        </span>
      </div>

      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 44, bottom: 0, left: 0 }}
            barCategoryGap={16}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={90}
              tick={{ fill: '#71747D', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              background={{ fill: '#1C1E26', radius: 6 } as any}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fill: '#C8CACD', fontSize: 11, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[#3E414D] text-xs leading-relaxed" style={{ borderTop: '1px solid #1C1E2660', paddingTop: 12 }}>
        {esgBreakdown.explanation}
      </p>
    </div>
  )
}
