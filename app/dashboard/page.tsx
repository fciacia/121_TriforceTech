'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import DashboardNavbar from '@/components/layout/DashboardNavbar'
import Sidebar from '@/components/layout/Sidebar'
import EsgScoreMeter from '@/components/dashboard/EsgScoreMeter'
import EarlyWarningCard from '@/components/dashboard/EarlyWarningCard'
import LoanDecisionCard from '@/components/dashboard/LoanDecisionCard'
import GreenwashRiskBadge from '@/components/dashboard/GreenwashRiskBadge'
import AgentDebatePanel from '@/components/dashboard/AgentDebatePanel'
import EsgBreakdownChart from '@/components/dashboard/EsgBreakdownChart'
import SupplyChainGraph from '@/components/dashboard/SupplyChainGraph'
import ImpactForecastTimeline from '@/components/dashboard/ImpactForecastTimeline'
import FinancingRecommendation from '@/components/dashboard/FinancingRecommendation'
import WhatIfSlider from '@/components/dashboard/WhatIfSlider'
import EconomicEmpowermentCard from '@/components/dashboard/EconomicEmpowermentCard'
import ExecutePivotButton from '@/components/dashboard/ExecutePivotButton'
import ExportPdfButton from '@/components/dashboard/ExportPdfButton'
import ExecutiveSummaryPanel from '@/components/dashboard/ExecutiveSummaryPanel'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useSwarmStore } from '@/store/useSwarmStore'

const rowVariants   = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }
const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

// Module-level flag — survives HMR and component remounts
let _alertSent = false

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewView() {
  return (
    <motion.div className="px-8 py-6 flex flex-col gap-5" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="grid grid-cols-[1fr_1.4fr_1fr] gap-5">
        <EsgScoreMeter />
        <EarlyWarningCard />
        <LoanDecisionCard />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }}>
        <GreenwashRiskBadge />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }}>
        <AgentDebatePanel />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="grid grid-cols-2 gap-5">
        <EsgBreakdownChart />
        <SupplyChainGraph />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="grid grid-cols-2 gap-5">
        <ImpactForecastTimeline />
        <FinancingRecommendation />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }}>
        <WhatIfSlider />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }}>
        <ExecutiveSummaryPanel />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="grid grid-cols-3 gap-5">
        <EconomicEmpowermentCard />
        <ExecutePivotButton />
        <ExportPdfButton />
      </motion.div>
    </motion.div>
  )
}

// ── Supply Chain ──────────────────────────────────────────────────────────────
function SupplyChainView() {
  return (
    <motion.div className="px-8 py-6 flex flex-col gap-5" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }}>
        <SupplyChainGraph height={560} />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="grid grid-cols-[1fr_1.4fr_1fr] gap-5">
        <EsgScoreMeter />
        <EarlyWarningCard />
        <GreenwashRiskBadge />
      </motion.div>
    </motion.div>
  )
}

// ── What-If ───────────────────────────────────────────────────────────────────
function WhatIfView() {
  return (
    <motion.div className="px-8 py-6 flex flex-col gap-5" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }}>
        <WhatIfSlider />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="grid grid-cols-2 gap-5">
        <ImpactForecastTimeline />
        <FinancingRecommendation />
      </motion.div>
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="grid grid-cols-2 gap-5">
        <EconomicEmpowermentCard />
        <ExecutePivotButton />
      </motion.div>
    </motion.div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsView() {
  const esgThreshold    = useSwarmStore(s => s.esgThreshold)
  const emailAlerts     = useSwarmStore(s => s.emailAlerts)
  const autoRefresh     = useSwarmStore(s => s.autoRefresh)
  const refreshInterval = useSwarmStore(s => s.refreshInterval)
  const settingsSmeName   = useSwarmStore(s => s.settingsSmeName)
  const settingsIndustry  = useSwarmStore(s => s.settingsIndustry)
  const basicInfo       = useSwarmStore(s => s.basicInfo)
  const setSettings     = useSwarmStore(s => s.setSettings)

  // Local draft state — committed to store on Save
  const [draftSmeName,        setDraftSmeName]        = useState(settingsSmeName  || basicInfo?.sme_name || "Ahmad's Packaging Sdn Bhd")
  const [draftIndustry,       setDraftIndustry]       = useState(settingsIndustry || basicInfo?.sector   || 'Manufacturing')
  const [draftEsgThreshold,   setDraftEsgThreshold]   = useState(esgThreshold)
  const [draftEmailAlerts,    setDraftEmailAlerts]    = useState(emailAlerts)
  const [draftAutoRefresh,    setDraftAutoRefresh]    = useState(autoRefresh)
  const [draftRefreshInterval,setDraftRefreshInterval]= useState(refreshInterval)
  const [isSaved, setIsSaved] = useState(false)

  function handleSave() {
    setSettings({
      esgThreshold:     draftEsgThreshold,
      emailAlerts:      draftEmailAlerts,
      autoRefresh:      draftAutoRefresh,
      refreshInterval:  draftRefreshInterval,
      settingsSmeName:  draftSmeName,
      settingsIndustry: draftIndustry,
    })
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  return (
    <motion.div className="px-8 py-6 flex flex-col gap-5 max-w-2xl" initial="hidden" animate="visible" variants={containerVariants}>

      {/* Company Profile */}
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="card flex flex-col gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#3E414D] font-semibold mb-1">Company Profile</p>
          <p className="text-[#71747D] text-xs">Basic information about your SME.</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#71747D]">Company Name</label>
            <input
              className="bg-[#161820] border border-[#1C1E26] rounded-xl px-3 py-2 text-sm text-[#EAEAEA] focus:outline-none focus:border-[#16A37A] transition-colors"
              value={draftSmeName}
              onChange={(e) => setDraftSmeName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#71747D]">Industry</label>
            <select
              className="bg-[#161820] border border-[#1C1E26] rounded-xl px-3 py-2 text-sm text-[#EAEAEA] focus:outline-none focus:border-[#16A37A] transition-colors appearance-none"
              value={draftIndustry}
              onChange={(e) => setDraftIndustry(e.target.value)}
            >
              {['Manufacturing','Logistics','Agriculture','Retail','Technology'].map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* ESG Thresholds */}
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="card flex flex-col gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#3E414D] font-semibold mb-1">ESG Thresholds</p>
          <p className="text-[#71747D] text-xs">Trigger alerts when your ESG score falls below this value.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#71747D]">Minimum ESG Score</span>
            <span className="font-mono text-sm font-semibold text-[#EAEAEA]">{draftEsgThreshold}</span>
          </div>
          <input
            type="range" min={0} max={100} step={1}
            value={draftEsgThreshold}
            onChange={(e) => setDraftEsgThreshold(Number(e.target.value))}
            className="w-full h-px appearance-none bg-[#1C1E26] accent-[#16A37A] cursor-pointer"
          />
          <div className="flex justify-between">
            <span className="font-mono text-[10px] text-[#3E414D]">0</span>
            <span className="font-mono text-[10px] text-[#3E414D]">100</span>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="card flex flex-col gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#3E414D] font-semibold mb-1">Notifications</p>
          <p className="text-[#71747D] text-xs">Control how and when you receive alerts.</p>
        </div>
        <div className="flex flex-col divide-y divide-[#1C1E26]">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-[#EAEAEA]">Email Alerts</p>
              <p className="text-xs text-[#71747D]">Receive ESG risk alerts via email</p>
            </div>
            <button
              onClick={() => setDraftEmailAlerts(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${draftEmailAlerts ? 'bg-[#16A37A]' : 'bg-[#1C1E26]'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${draftEmailAlerts ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-[#EAEAEA]">Auto-Refresh Data</p>
              <p className="text-xs text-[#71747D]">Automatically poll for new agent results</p>
            </div>
            <button
              onClick={() => setDraftAutoRefresh(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${draftAutoRefresh ? 'bg-[#16A37A]' : 'bg-[#1C1E26]'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${draftAutoRefresh ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {draftAutoRefresh && (
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-[#EAEAEA]">Refresh Interval</p>
                <p className="text-xs text-[#71747D]">How often to poll for updates</p>
              </div>
              <select
                className="bg-[#161820] border border-[#1C1E26] rounded-lg px-3 py-1.5 text-xs text-[#EAEAEA] focus:outline-none focus:border-[#16A37A] transition-colors"
                value={draftRefreshInterval}
                onChange={(e) => setDraftRefreshInterval(Number(e.target.value))}
              >
                {[15, 30, 60, 120].map(s => <option key={s} value={s}>{s}s</option>)}
              </select>
            </div>
          )}
        </div>
      </motion.div>

      {/* Save */}
      <motion.div variants={rowVariants} transition={{ duration: 0.4 }} className="flex items-center justify-end gap-3">
        {isSaved && (
          <span className="text-xs text-[#16A37A] font-medium">Settings saved</span>
        )}
        <button
          onClick={handleSave}
          className={`btn-primary text-sm px-6 py-2 rounded-xl transition-all ${isSaved ? 'opacity-60' : ''}`}
        >
          {isSaved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Tab router ────────────────────────────────────────────────────────────────
function DashboardContent() {
  useWebSocket()
  const params   = useSearchParams()
  const tab      = params.get('tab')
  const loadData = useSwarmStore((s) => s.loadData)
  const esgBreakdown    = useSwarmStore((s) => s.esgBreakdown)
  const esgThreshold    = useSwarmStore((s) => s.esgThreshold)
  const emailAlerts     = useSwarmStore((s) => s.emailAlerts)
  const autoRefresh     = useSwarmStore((s) => s.autoRefresh)
  const refreshInterval = useSwarmStore((s) => s.refreshInterval)

  // Pre-load backend data on mount so all panels (incl. What-If) are populated
  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => { loadData() }, refreshInterval * 1000)
    return () => clearInterval(id)
  }, [autoRefresh, refreshInterval, loadData])

  // Email Alert Trigger
  useEffect(() => {
    if (!esgBreakdown || !emailAlerts || _alertSent) return
    
    // In our backend output, the score is total_score, though UI uses esgBreakdown.total_score or base_score
    const currentScore = esgBreakdown.total_score
    
    if (currentScore < esgThreshold) {
      _alertSent = true // Prevent spam
      fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Hardcode TriforceTech Logistic based on the backend default running this demo. 
        // In real app, fetch from auth context.
        body: JSON.stringify({ sme_name: 'TriforceTech Logistic', score: currentScore, threshold: esgThreshold })
      })
      .then(r => r.json())
      .then(d => {
        if (d.preview) console.log("Email sent! Preview link:", d.preview)
      })
      .catch(e => console.error("Alert err:", e))
    }
  }, [esgBreakdown, esgThreshold, emailAlerts])

  return (
    <>
      {tab === 'graph'    && <SupplyChainView />}
      {tab === 'whatif'   && <WhatIfView />}
      {tab === 'settings' && <SettingsView />}
      {(!tab || tab === 'overview') && <OverviewView />}
    </>
  )
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ background: '#05060A' }}>
      <DashboardNavbar />
      <Sidebar />
      <main className="pl-56 pt-[52px]">
        <Suspense>
          <DashboardContent />
        </Suspense>
      </main>
    </div>
  )
}
