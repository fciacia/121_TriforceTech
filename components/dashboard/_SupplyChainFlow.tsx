'use client'
import { useEffect, useState, useMemo } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  Background,
  MiniMap,
  Controls,
  Panel,
  BaseEdge,
  getSmoothStepPath,
  type Node,
  type Edge,
  type EdgeProps,
  Handle,
  Position,
  type NodeProps,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwarmStore } from '@/store/useSwarmStore'
import esgData from '../../../Backend/TriforceTech_Logistic_esg_output.json'

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW'
interface Supplier { name: string; riskLevel: RiskLevel; violations: number; certStatus: string }

const RISK_CFG: Record<RiskLevel, { color: string; glow: string; badge: string; border: string }> = {
  HIGH: { color: '#EF4444', glow: '#EF444428', badge: '#EF444415', border: '#EF444440' },
  MEDIUM: { color: '#F59E0B', glow: '#F59E0B20', badge: '#F59E0B15', border: '#F59E0B38' },
  LOW: { color: '#10B981', glow: '#10B98118', badge: '#10B98115', border: '#10B98132' },
}

const hs = (c: string): React.CSSProperties => ({
  width: 5, height: 5, background: c, border: 'none', borderRadius: '50%', opacity: 0.7,
})

// ─── Custom Edge: GlowEdge ───────────────────────────────────────────────────
function GlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  })

  const isRisk = label === 'penalizes' || (style.stroke as string)?.includes('#EF4444')

  return (
    <>
      {/* Background Glow Path */}
      <path
        id={id}
        style={{ ...style, strokeWidth: (style.strokeWidth as number || 1.5) + 4, opacity: 0.08, filter: 'blur(3px)' }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* Main Path */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, opacity: 0.8 }} />

      {/* Pulse Animation */}
      <path
        d={edgePath}
        fill="none"
        stroke={isRisk ? '#EF4444' : (style.stroke as string || '#F59E0B')}
        strokeWidth={2}
        strokeLinecap="round"
        initial-opacity="0"
        style={{
          strokeDasharray: '8, 20',
          opacity: 0.6,
        }}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="100"
          to="0"
          dur={isRisk ? "2s" : "4s"}
          repeatCount="indefinite"
        />
      </path>

      {/* Label */}
      {label && (
        <g transform={`translate(${labelX - 40}, ${labelY - 10})`}>
          <rect
            width={80}
            height={20}
            rx={labelBgBorderRadius as number || 4}
            fill={labelBgStyle?.fill as string || '#0A1120'}
            fillOpacity={0.9}
            stroke={(style.stroke as string) + '40'}
            strokeWidth={1}
          />
          <text
            x={40}
            y={13}
            textAnchor="middle"
            style={{
              fill: (labelStyle?.fill as string || '#94A3B8'),
              fontSize: 8,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {label}
          </text>
        </g>
      )}
    </>
  )
}

function AH({ c }: { c: string }) {
  const s = hs(c)
  return (
    <>
      <Handle type="target" position={Position.Top} id="t" style={{ ...s, top: -2 }} />
      <Handle type="target" position={Position.Bottom} id="b" style={{ ...s, bottom: -2 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ ...s, left: -2 }} />
      <Handle type="target" position={Position.Right} id="r" style={{ ...s, right: -2 }} />
      <Handle type="source" position={Position.Top} id="t" style={{ ...s, top: -2 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ ...s, bottom: -2 }} />
      <Handle type="source" position={Position.Left} id="l" style={{ ...s, left: -2 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ ...s, right: -2 }} />
    </>
  )
}

// ─── Node: SME Hub ────────────────────────────────────────────────────────────
function SmeNode({ data }: NodeProps) {
  const sc: string = data.score >= 60 ? '#10B981' : data.score >= 40 ? '#F59E0B' : '#EF4444'
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative"
      style={{
        background: 'linear-gradient(140deg, #064E3B 0%, #022C22 100%)',
        border: '2px solid #10B98158',
        borderRadius: 16,
        padding: '16px 24px',
        minWidth: 180,
        textAlign: 'center',
        boxShadow: '0 0 40px #10B98120, 0 8px 32px rgba(0,0,0,0.8), inset 0 0 20px #10B98110',
      }}
    >
      <div
        className="absolute inset-0 rounded-[16px] pointer-events-none"
        style={{ border: '1px solid #10B98130', margin: -4 }}
      />
      <AH c="#10B981" />
      <div style={{ fontSize: 7.5, letterSpacing: '0.14em', color: '#6EE7B7', fontWeight: 800, marginBottom: 6, textTransform: 'uppercase' }}>
        Central SME Hub
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#ECFDF5', lineHeight: 1.3 }}>
        {data.label}
      </div>
      {data.sector && (
        <div style={{ fontSize: 7.5, color: '#6EE7B755', marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {data.sector}
        </div>
      )}
      {data.score != null && (
        <div style={{
          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
          background: `${sc}15`, border: `1px solid ${sc}35`,
          borderRadius: 20, padding: '3px 12px',
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: sc, boxShadow: `0 0 6px ${sc}` }} />
          <span style={{ fontSize: 8, color: '#6EE7B7', fontWeight: 700 }}>ESG </span>
          <span style={{ fontSize: 19, color: '#ECFDF5', fontWeight: 900, lineHeight: 1 }}>{data.score}</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Node: Supplier ───────────────────────────────────────────────────────────
function SupplierNode({ data }: NodeProps) {
  const cfg = RISK_CFG[data.riskLevel as RiskLevel] ?? RISK_CFG.MEDIUM
  return (
    <motion.div
      whileHover={{ scale: 1.05, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        background: '#080F1C',
        border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 180,
        maxWidth: 240,
        boxShadow: `0 4px 20px ${cfg.glow}, 0 0 10px rgba(0,0,0,0.5)`,
      }}
    >
      <AH c={cfg.color} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
        <span style={{
          fontSize: 7, fontWeight: 800, letterSpacing: '0.1em', color: cfg.color,
          background: cfg.badge, border: `1px solid ${cfg.border}`,
          borderRadius: 4, padding: '1.5px 5px', whiteSpace: 'nowrap',
        }}>
          {data.riskLevel}
        </span>
        {data.violations > 0 && (
          <span style={{ fontSize: 7.5, color: '#EF4444', fontWeight: 700, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            ⚠ {data.violations}v
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#ECFDF5', marginBottom: 6, lineHeight: 1.2 }}>
        {data.label}
      </div>
      <div style={{
        fontSize: 8.5,
        color: data.riskLevel === 'HIGH' ? '#FCA5A5' : '#6EE7B7',
        fontWeight: 600,
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 4
      }}>
        <span style={{ marginTop: 1 }}>{data.riskLevel === 'HIGH' ? '🚨' : '✓'}</span>
        <span>{data.certStatus}</span>
      </div>
    </motion.div>
  )
}

// ─── Node: Loan Facility ──────────────────────────────────────────────────────
function LoanNode({ data }: NodeProps) {
  return (
    <motion.div
      animate={{
        boxShadow: ['0 0 20px #F59E0B10', '0 0 32px #F59E0B25', '0 0 20px #F59E0B10'],
      }}
      transition={{ duration: 3, repeat: Infinity }}
      style={{
        background: 'linear-gradient(140deg, #1C1000 0%, #120B00 100%)',
        border: '1.5px solid #F59E0B58',
        borderRadius: 14,
        padding: '12px 20px',
        minWidth: 160,
        textAlign: 'center',
      }}
    >
      <AH c="#F59E0B" />
      <div style={{ fontSize: 7.5, color: '#FCD34D', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 5, textTransform: 'uppercase' }}>
        Green Finance
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#FEF3C7' }}>Loan Facility</div>
      <div style={{ marginTop: 6, display: 'inline-flex', background: '#F59E0B15', border: '1px solid #F59E0B30', borderRadius: 20, padding: '2px 10px' }}>
        <span style={{ fontSize: 8.5, color: '#F59E0B', fontWeight: 600 }}>{data.product}</span>
      </div>
    </motion.div>
  )
}

// ─── Node: Risk Event ─────────────────────────────────────────────────────────
function EventNode({ data }: NodeProps) {
  return (
    <motion.div
      animate={data.atRisk ? {
        borderColor: ['#EF444440', '#EF444490', '#EF444440'],
        scale: [1, 1.02, 1],
      } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
      style={{
        background: 'linear-gradient(140deg, #1A0000 0%, #0F0000 100%)',
        border: `1.5px solid ${data.atRisk ? '#EF444478' : '#EF444428'}`,
        borderRadius: 14,
        padding: '12px 20px',
        minWidth: 160,
        textAlign: 'center',
        boxShadow: data.atRisk ? '0 0 40px #EF444430, 0 0 80px #EF444415' : 'none',
      }}
    >
      <AH c="#EF4444" />
      <div style={{ fontSize: 7.5, color: '#FCA5A5', fontWeight: 800, letterSpacing: '0.12em', marginBottom: 5, textTransform: 'uppercase' }}>
        {data.atRisk ? '🚨 Active Risk' : 'Risk Event'}
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#FEE2E2' }}>{data.label}</div>
      {data.severity && (
        <div style={{ marginTop: 6, display: 'inline-flex', background: '#EF444415', border: '1px solid #EF444430', borderRadius: 20, padding: '2px 8px' }}>
          <span style={{ fontSize: 8, color: '#EF4444', fontWeight: 700 }}>{data.severity} SEVERITY</span>
        </div>
      )}
    </motion.div>
  )
}

const nodeTypes = { sme: SmeNode, supplier: SupplierNode, loan: LoanNode, event: EventNode }
const edgeTypes = { glow: GlowEdge }

// ─────────────────────────────────────────────────────────────────────────────
export default function SupplyChainFlowInner() {
  const stableNodeTypes = useMemo(() => nodeTypes, [])
  const [dbSuppliers, setDbSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 1. FETCH DATABASE CONTRACTS
  useEffect(() => {
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(d => {
        setDbSuppliers(d.suppliers || [])
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#060B15] rounded-xl">
        <div className="w-8 h-8 border-4 border-[#10B98120] border-t-[#10B981] rounded-full animate-spin" />
      </div>
    )
  }

  // 2. CORE DATA & RISK LOGIC
  const smeName = esgData.basic_info.sme_name
  const sector = esgData.basic_info.sector
  const esgScore = esgData.esg_breakdown.total_score
  const atRisk = esgData.early_warning.loan_at_risk
  const riskTitle = esgData.early_warning.headline
  const loanUnit = esgData.financing.product
  const severity = esgData.early_warning.severity

  // PARSE RISK FROM JSON
  const dirtyText = esgData.greenwash_report.dirty_chain_risk
  const dirtyParse = dirtyText.split('. ').filter(Boolean).map(sentence => {
    const rawId = sentence.match(/SUP_[A-Z]/)?.[0] || ""
    const reason = sentence.split(' has ')[1] || "Compliance risk detected"
    const violations = sentence.match(/violations \((\d+)\)/)?.[1] || "1"
    return { id: rawId, reason, violations: parseInt(violations) }
  })

  const NODES: Node[] = []
  const EDGES: Edge[] = []

  // 3. MAP DATABASE SUPPLIERS TO NODES
  // Rule: If in Dirty JSON -> RED, Else -> GREEN
  const suppliersToRender = dbSuppliers.map((s, i) => {
    const riskData = dirtyParse.find(dp => s.id.includes(dp.id) || dp.id.includes(s.id))
    if (riskData) {
      return {
        ...s,
        riskLevel: 'HIGH' as const,
        certStatus: riskData.reason,
        violations: riskData.violations
      }
    }
    return {
      ...s,
      riskLevel: 'LOW' as const,
      violations: 0
    }
  })

  // Layout: Red on left, Green on Bottom, Loan/Risk on Right
  const T_RED = 20, T_SME = 450, T_RIGHT = 920
  const smeY = 250, loanY = 80, riskY = 420

  // SME Hub
  NODES.push({
    id: 'sme', type: 'sme',
    position: { x: T_SME, y: smeY },
    data: { label: smeName, score: esgScore, sector }
  })

  // Loan Facility - Connect to SME Right
  NODES.push({
    id: 'loan', type: 'loan',
    position: { x: T_RIGHT, y: loanY },
    data: { product: loanUnit }
  })
  EDGES.push({
    id: 'e-sme-loan', source: 'sme', target: 'loan', label: 'eligible_for', type: 'glow',
    sourceHandle: 'r', targetHandle: 'l',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#F59E0B' },
    style: { stroke: '#F59E0B', strokeWidth: 1.5 },
  })

  // Risk Event - Connect to SME Right
  NODES.push({
    id: 'risk', type: 'event',
    position: { x: T_RIGHT, y: riskY },
    data: { label: riskTitle, atRisk, severity }
  })
  EDGES.push({
    id: 'e-risk-sme', source: 'risk', target: 'sme', label: 'penalizes', type: 'glow',
    sourceHandle: 'l', targetHandle: 'r',
    animated: atRisk,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#EF4444' },
    style: { stroke: '#EF4444', strokeWidth: atRisk ? 2.5 : 1.5 },
  })

  // RENDERING ALL DATABASE CONTRACTS
  const dirtyNodes = suppliersToRender.filter(s => s.riskLevel === 'HIGH')
  const cleanNodes = suppliersToRender.filter(s => s.riskLevel === 'LOW')

  // Red Suppliers - Connect to SME Left
  dirtyNodes.forEach((sup, i) => {
    const y = smeY + (i - (dirtyNodes.length - 1) / 2) * 160
    NODES.push({
      id: sup.id, type: 'supplier',
      position: { x: T_RED, y },
      data: { label: sup.name, riskLevel: 'HIGH', violations: sup.violations, certStatus: sup.certStatus }
    })
    EDGES.push({
      id: `e-${sup.id}`, source: sup.id, target: 'sme', label: 'contracts_with', type: 'glow',
      sourceHandle: 'r', targetHandle: 'l',
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#EF4444' },
      style: { stroke: '#EF4444', strokeWidth: 1.5 },
    })
  })

  // NODES: Green (Clean/Certified) Suppliers
  cleanNodes.forEach((sup, i) => {
    const x = T_SME + (i - (cleanNodes.length - 1) / 2) * 180
    NODES.push({
      id: sup.id, type: 'supplier',
      position: { x, y: 580 },
      data: { label: sup.name, riskLevel: 'LOW', violations: 0, certStatus: sup.certStatus }
    })
    EDGES.push({
      id: `e-${sup.id}`, source: 'sme', target: sup.id, label: 'Collaborate with', type: 'glow',
      sourceHandle: 'b', targetHandle: 't',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' },
      style: { stroke: '#10B981', strokeWidth: 1.2 },
    })
  })

  // UPDATE LEGEND COUNTS
  const highCount = dirtyNodes.length
  const lowCount = cleanNodes.length

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={NODES}
        edges={EDGES}
        nodeTypes={stableNodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        style={{ background: '#060B15', borderRadius: 12 }}
      >
        <Background color="#0D1929" gap={28} size={0.8} />

        {/* ── Supplier risk legend (HUD Design) ── */}
        <Panel position="top-left">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            style={{
              background: 'rgba(10, 17, 32, 0.85)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              borderLeft: '4px solid #3B82F6',
              borderRadius: '0 12px 12px 0', padding: '12px 18px',
              display: 'flex', flexDirection: 'column', gap: 6,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 10, height: 2, background: '#3B82F6' }} />
              <div style={{ fontSize: 9, color: '#3B82F6', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Inventory Swarm
              </div>
            </div>

            <table style={{ borderSpacing: '0 4px', borderCollapse: 'separate' }}>
              <tbody>
                {(['HIGH', 'MEDIUM', 'LOW'] as RiskLevel[]).map((r) => {
                  const count = r === 'HIGH' ? highCount : r === 'LOW' ? lowCount : 0
                  const { color } = RISK_CFG[r]
                  return (
                    <tr key={r}>
                      <td style={{ paddingRight: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                          <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, fontFamily: 'monospace' }}>{r}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: color, fontWeight: 900, fontFamily: 'monospace' }}>
                        {count.toString().padStart(2, '0')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#475569', fontWeight: 800, letterSpacing: '0.05em' }}>TOTAL NODES</span>
              <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 900, fontFamily: 'monospace' }}>
                {(highCount + lowCount).toString().padStart(3, '0')}
              </span>
            </div>
          </motion.div>
        </Panel>

        {/* ── Loan-at-risk alert badge ── */}
        {atRisk && (
          <Panel position="top-right">
            <div style={{
              background: '#1A000090', border: '1px solid #EF444442',
              borderRadius: 8, padding: '6px 12px',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px #EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: 8.5, color: '#FCA5A5', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Loan At Risk
              </span>
            </div>
          </Panel>
        )}

        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'sme') return '#10B981'
            if (n.type === 'loan') return '#F59E0B'
            if (n.type === 'event') return '#EF4444'
            return RISK_CFG[(n.data as { riskLevel?: RiskLevel })?.riskLevel ?? 'LOW']?.color ?? '#4B5563'
          }}
          style={{ background: '#060B15', border: '1px solid #1A2840', borderRadius: 8 }}
          maskColor="#060B1590"
        />
        <Controls
          style={{ background: '#0A1120', border: '1px solid #1A2840', borderRadius: 8 }}
          showInteractive={false}
        />
      </ReactFlow>
    </ReactFlowProvider>
  )
}

